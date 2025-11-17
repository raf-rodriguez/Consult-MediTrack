from rest_framework import viewsets, filters, status, generics
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from .models import AmbulanceCheck, InventoryItem, Transfer, MedicationExpense, AmbulanceInventory, AmbulanceRequisition
from .serializers import (AmbulanceCheckSerializer, InventoryItemSerializer,
                          TransferSerializer, MedicationExpenseSerializer, AmbulanceInventorySerializer, AmbulanceRequisitionSerializer)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from Crypto.Cipher import AES
import base64
from django.contrib.auth.models import User
from rest_framework import viewsets
from .models import StockAlert
from .serializers import StockAlertSerializer
from .permissions import AllowPostAnyOtherwiseAuth, IsParamedic, IsAdminOrReadOnly
from .services import transfer_from_storage_to_ambulance
from drf_spectacular.utils import extend_schema, extend_schema_view
from .models import ActivityLog
from rest_framework import serializers
import logging


log = logging.getLogger("ambulance")

# -----------------------------------
#           Ambulance Check
#------------------------------------
class AmbulanceCheckViewSet(viewsets.ModelViewSet):
    queryset = AmbulanceCheck.objects.all()
    serializer_class = AmbulanceCheckSerializer
    permission_classes = [AllowPostAnyOtherwiseAuth]

    # 💡 Filtrado por ambulancia y rango de fechas
    def get_queryset(self):
        queryset = super().get_queryset()
        ambulance = self.request.query_params.get('ambulance')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if ambulance:
            queryset = queryset.filter(ambulance__iexact=ambulance)
        if date_from and date_to:
            queryset = queryset.filter(date__range=[date_from, date_to])

        return queryset

# -------------------------------
#           Inventory
#--------------------------------
@extend_schema_view(
    list=extend_schema(
        summary="Listar ítems del inventario",
        description="Devuelve la lista completa de ítems en el inventario del almacén.",
        tags=["Inventario"]
    ),
    retrieve=extend_schema(
        summary="Obtener un ítem del inventario",
        description="Devuelve la información detallada de un ítem específico.",
        tags=["Inventario"]
    ),
    create=extend_schema(
        summary="Crear un nuevo ítem",
        description="Agrega un nuevo ítem al inventario del almacén.",
        tags=["Inventario"]
    ),
    update=extend_schema(
        summary="Actualizar un ítem (PUT)",
        description="Reemplaza por completo los datos del ítem.",
        tags=["Inventario"]
    ),
    partial_update=extend_schema(
        summary="Actualización parcial (PATCH)",
        description="Modifica uno o varios campos del ítem sin reemplazarlo todo.",
        tags=["Inventario"]
    ),
    destroy=extend_schema(
        summary="Eliminar ítem",
        description="Elimina un ítem del inventario.",
        tags=["Inventario"]
    ),
)
class InventoryItemViewSet(viewsets.ModelViewSet):
    """
    Gestiona el inventario del almacén.
    Permite crear, editar, listar, buscar y eliminar ítems.
    """
    queryset = InventoryItem.objects.all().order_by("name")
    serializer_class = InventoryItemSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "location"]
    permission_classes = [IsAdminOrReadOnly]

   # 🟢 Crear ítem con log
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        ActivityLog.objects.create(
            user=request.user.username if request.user.is_authenticated else "Anon",
            action='CREATE',
            entity='InventoryItem',
            description=f"Se agregó {request.data.get('name')} ({request.data.get('quantity')} unidades) al inventario."
        )
        return response

    # 🟡 Actualizar ítem con registro de diferencia
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_quantity = instance.quantity  # Cantidad ANTES de actualizar

        response = super().update(request, *args, **kwargs)

        # Después de guardar — nueva cantidad
        new_quantity = int(response.data.get("quantity"))
        added = new_quantity - old_quantity  # Diferencia real

        # Evitar logs raros cuando el cambio no es numérico
        if added > 0:
            change_desc = f"Se añadieron {added} unidades."
        elif added < 0:
            change_desc = f"Se retiraron {abs(added)} unidades."
        else:
            change_desc = "No hubo cambio en la cantidad."

        # 📝 Registrar en Activity Log
        ActivityLog.objects.create(
            action="UPDATE",
            entity="InventoryItem",
            user=request.user.username if request.user.is_authenticated else "Sistema",
            description=(
                f"{change_desc} → {instance.name}. "
                f"Antes: {old_quantity} unidades → Ahora: {new_quantity} unidades."
            )
        )
        return response

    # 🔴 Eliminar ítem con log
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        name = instance.name

        response = super().destroy(request, *args, **kwargs)

        ActivityLog.objects.create(
            user=request.user.username if request.user.is_authenticated else "Anon",
            action='DELETE',
            entity='InventoryItem',
            description=f"Se eliminó {name} del inventario."
        )
        return response

# ------------------------------
#            Transfer
#-------------------------------
@extend_schema_view(
    list=extend_schema(
        summary="Listar transferencias",
        tags=["Transferencias"]
    ),
    create=extend_schema(
        summary="Registrar transferencia",
        description="Mueve ítems del almacén a una ambulancia.",
        tags=["Transferencias"]
    ),
)
class TransferViewSet(viewsets.ModelViewSet):
    queryset = (
        Transfer.objects.select_related("item")
        .order_by("-created_at")
    )
    serializer_class = TransferSerializer
    permission_classes = [IsParamedic | IsAdminOrReadOnly]

    def create(self, request, *args, **kwargs):
        log.info(f"Transferencia iniciada por {request.user.username} → {request.data}")
        items = request.data.get("items", [])
        ambulance = request.data.get("ambulance")
        paramedic = request.data.get("paramedic", request.user.username if request.user.is_authenticated else "Anon")

        if not items:
            return Response({"detail": "No items provided"}, status=400)

        try:
            results = transfer_from_storage_to_ambulance(
                ambulance=ambulance,
                paramedic=paramedic,
                items=items,
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        # 🟢 Registrar la transferencia en ActivityLog solo si todo salió bien
        ActivityLog.objects.create(
            user=paramedic,
            action='TRANSFER',
            entity='Transfer',
            description=f"Se transfirieron {len(results)} ítem(s) al vehículo {ambulance}."
        )

        log.info(f"Transferencia completada: {paramedic} → {ambulance} ({len(results)} ítems)")

        return Response(
            {"success": True, "transfers": results},
            status=201
        )

# ----------------------------------
#         Medication Expenses
#-----------------------------------
@extend_schema_view(
    list=extend_schema(summary="Listar gastos", tags=["Gastos"]),
    create=extend_schema(summary="Registrar gasto", tags=["Gastos"]),
    retrieve=extend_schema(summary="Detalle de gasto", tags=["Gastos"]),
)
class MedicationExpenseViewSet(viewsets.ModelViewSet):
    queryset = (
        MedicationExpense.objects.all()
        .order_by("-created_at")
    )
    serializer_class = MedicationExpenseSerializer
    permission_classes = [IsParamedic | IsAdminOrReadOnly]

    def create(self, request, *args, **kwargs):
        data = request.data
        patient_name = data.get('patient_name')
        paramedics = data.get('paramedics', [])
        shift = data.get('shift')
        ambulance = data.get('unit')
        items = data.get('items', [])

        if not items:
            return Response({'detail': 'No hay items para registrar'}, status=status.HTTP_400_BAD_REQUEST)

        created_records = []

        for item in items:
            medicine_name = item.get('medicine', '').strip()
            qty = int(item.get('quantity', 0))
            ambulance_name = ambulance.strip()

            # 🔹 Buscar en AmbulanceInventory según unidad seleccionada
            inv_item = AmbulanceInventory.objects.filter(name__iexact=medicine_name, ambulance=ambulance_name).first()
            if not inv_item:
                return Response({
                    'detail': f'{medicine_name} no disponible en la unidad {ambulance_name}'
                }, status=status.HTTP_400_BAD_REQUEST)

            if inv_item.quantity < qty:
                return Response({
                    'detail': f'Stock insuficiente de {medicine_name} en {ambulance_name}'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Descontar stock
            inv_item.quantity -= qty
            inv_item.save()

            # Crear registro de gasto
            record_data = {
                'patient_name': patient_name,
                'paramedic': ', '.join(paramedics),
                'shift': shift,
                'ambulance': ambulance_name,
                'medicine': medicine_name,
                'quantity': qty
            }

            serializer = self.get_serializer(data=record_data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            created_records.append(serializer.data)

        return Response(created_records, status=status.HTTP_201_CREATED)
    
    
# --------------------------------------------
#             Ambulancia Inventory
#---------------------------------------------
@extend_schema_view(
    list=extend_schema(
        summary="Inventario por ambulancia",
        tags=["Ambulancias"]
    ),
    create=extend_schema(
        summary="Agregar ítem a ambulancia",
        tags=["Ambulancias"]
    )
)
class AmbulanceInventoryViewSet(viewsets.ModelViewSet):
    queryset = (
        AmbulanceInventory.objects.all()
        .only("name", "quantity", "ambulance", "category", "unit")
    )
    serializer_class = AmbulanceInventorySerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        ambulance = self.request.query_params.get('ambulance')
        if ambulance:
            queryset = queryset.filter(ambulance=ambulance)
        return queryset

    # ⬅️ ESTA ES LA CLAVE
    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True   # permite actualizar SOLO lo enviado
        return super().update(request, *args, **kwargs)

# ---------------------------------
#            Requisition
#----------------------------------
class AmbulanceRequisitionListAPIView(generics.ListAPIView):
    serializer_class = AmbulanceRequisitionSerializer

    def get_queryset(self):
        ambulance = self.request.query_params.get('ambulance')

        # ✅ Muestra solo requisiciones de la ambulancia seleccionada
        queryset = AmbulanceRequisition.objects.all().order_by('-created_at')

        if ambulance:
            queryset = queryset.filter(ambulance__iexact=ambulance)

        return queryset
    
@extend_schema_view(
    list=extend_schema(
        summary="Historial de requisiciones",
        description="Lista todas las requisiciones realizadas por una ambulancia.",
        tags=["Requisiciones"]
    ),
    create=extend_schema(
        summary="Registrar requisición",
        description="Crea una nueva requisición para una ambulancia.",
        tags=["Requisiciones"]
    ),
    retrieve=extend_schema(
        summary="Obtener una requisición específica",
        tags=["Requisiciones"]
    )
)
class AmbulanceRequisitionViewSet(viewsets.ModelViewSet):
    queryset = (
        AmbulanceRequisition.objects
        .select_related("item")
        .order_by("-created_at")
    )
    serializer_class = AmbulanceRequisitionSerializer
    permission_classes = [IsParamedic | IsAdminOrReadOnly]
 
 # ------------------------------
 #            Login
 #-------------------------------
 # Endpoint del login para el username 

# ---------------------------------------------------
# ✅ Usuario autenticado
# ---------------------------------------------------
@extend_schema(
    summary="Obtener usuario autenticado",
    tags=["Auth"],
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_logged_in_user(request):
    user = request.user
    return Response({
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "fullName": f"{user.first_name} {user.last_name}".strip(),
    })

# ---------------------------------------------------
# ✅ LOGIN SEGURO FINAL (UNICAMENTE ESTE)
# ---------------------------------------------------
@extend_schema(
    summary="Login seguro",
    description="Valida credenciales y devuelve tokens JWT (access y refresh).",
    tags=["Auth"],
)
@api_view(["POST"])
@permission_classes([AllowAny])
def secure_login(request):

    request.throttle_scope = "login"

    username_input = request.data.get("username", "").strip()
    password_input = request.data.get("password", "")

    if not username_input or not password_input:
        return Response({"error": "Usuario y contraseña son requeridos"}, status=400)

    try:
        user_obj = User.objects.get(username__iexact=username_input)
        username_exact = user_obj.username
    except User.DoesNotExist:
        return Response({"error": "Usuario no encontrado"}, status=401)

    user = authenticate(username=username_exact, password=password_input)
    if user is None:
        return Response({"error": "Credenciales inválidas"}, status=401)

    refresh = RefreshToken.for_user(user)

    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {
            "username": user.username,
            "full_name": f"{user.first_name} {user.last_name}".strip(),
        },
    })

#-------------------------------------------
#                  Stock
#-------------------------------------------
@extend_schema_view(
    list=extend_schema(
        summary="Listar alertas de bajo stock",
        description="Devuelve todas las alertas de inventario bajo generadas por el sistema.",
        tags=["Alertas"]
    ),
    retrieve=extend_schema(
        summary="Obtener alerta",
        tags=["Alertas"]
    ),
    destroy=extend_schema(
        summary="Eliminar alerta",
        tags=["Alertas"]
    )
)
class StockAlertViewSet(viewsets.ModelViewSet):
    queryset = StockAlert.objects.all().order_by('-date')
    serializer_class = StockAlertSerializer
    permission_classes = [IsAdminOrReadOnly]

#-------------------------------------------
#                  Activity
#-------------------------------------------
class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Vista de solo lectura para consultar el registro de actividades del sistema.
    Muestra quién realizó acciones en inventario, transferencias, gastos, etc.
    """
    queryset = ActivityLog.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticatedOrReadOnly]

    # ✅ Serializer interno
    class ActivityLogSerializer(serializers.ModelSerializer):
        class Meta:
            model = ActivityLog
            fields = '__all__'

    serializer_class = ActivityLogSerializer

