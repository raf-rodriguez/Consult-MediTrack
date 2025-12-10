from rest_framework import viewsets, filters, status, generics
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from .models import AmbulanceCheck, InventoryItem, Transfer, MedicationExpense, AmbulanceInventory, AmbulanceRequisition, RecommendedInventory
from .serializers import (AmbulanceCheckSerializer, InventoryItemSerializer,
                          TransferSerializer, MedicationExpenseSerializer, AmbulanceInventorySerializer, AmbulanceRequisitionSerializer, RecommendedInventorySerializer, InventoryItemWithMetaSerializer)
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
from rest_framework.permissions import SAFE_METHODS, BasePermission
from django.db.models import Q
from django.db import transaction

log = logging.getLogger("ambulance")

# -----------------------------------
#           Ambulance Check
#------------------------------------

class AmbulanceCheckViewSet(viewsets.ModelViewSet):
    queryset = AmbulanceCheck.objects.all()
    serializer_class = AmbulanceCheckSerializer
    permission_classes = [AllowPostAnyOtherwiseAuth]

    def get_queryset(self):
        # ... tu código de filtrado existente ...
        queryset = super().get_queryset()
        ambulance = self.request.query_params.get('ambulance')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if ambulance:
            queryset = queryset.filter(ambulance__iexact=ambulance)
        if date_from and date_to:
            queryset = queryset.filter(date__range=[date_from, date_to])
        return queryset

    # ✅ SOBREESCRIBIMOS EL CREATE
    # views.py (Dentro de AmbulanceCheckViewSet)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        missing_items = data.pop('missing_items', [])
        
        # Guardar Chequeo
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        checklist = serializer.save()

        # Lista para devolver al Frontend en el Pop-up final
        requisitioned_details = [] 

        if missing_items:
            ambulance_name = checklist.ambulance
            responsible = checklist.staff.split(',')[0] if checklist.staff else "Sistema"
            
            for item in missing_items:
                item_name = item.get('name', '').strip()
                qty_needed = int(item.get('quantity', 0))

                if qty_needed <= 0: continue

                # Lógica de Búsqueda Inteligente (Exacta -> Contiene -> Inversa)
                warehouse_item = InventoryItem.objects.filter(name__iexact=item_name, location__iexact="Almacén").first()
                if not warehouse_item:
                    warehouse_item = InventoryItem.objects.filter(name__icontains=item_name, location__iexact="Almacén").first()
                if not warehouse_item:
                     all_storage = InventoryItem.objects.filter(location__iexact="Almacén")
                     for prod in all_storage:
                        if prod.name.lower() in item_name.lower():
                            warehouse_item = prod
                            break
                
                if not warehouse_item:
                    continue # No se encontró, se salta
                
                # Movimiento de Inventario
                warehouse_item.quantity -= qty_needed
                warehouse_item.save()

                amb_inv_item, _ = AmbulanceInventory.objects.get_or_create(
                    ambulance=ambulance_name,
                    name=warehouse_item.name,
                    defaults={'category': warehouse_item.category, 'unit': warehouse_item.unit, 'quantity': 0}
                )
                amb_inv_item.quantity += qty_needed
                amb_inv_item.save()

                # Logs
                AmbulanceRequisition.objects.create(paramedic=responsible, ambulance=ambulance_name, item=warehouse_item, quantity=qty_needed)
                Transfer.objects.create(item=warehouse_item, from_location="Almacén", to_location=ambulance_name, quantity=qty_needed, performed_by=responsible)
                
                # ✅ GUARDAMOS LO QUE SÍ SE MOVIÓ PARA EL POP-UP
                requisitioned_details.append({
                    "name": warehouse_item.name,
                    "quantity": qty_needed,
                    "unit": warehouse_item.unit
                })

        # Retornamos la lista de lo que se requisó junto con el success
        return Response({
            "status": "success",
            "data": serializer.data,
            "requisition_summary": requisitioned_details # <--- ESTO ES NUEVO
        }, status=status.HTTP_201_CREATED)

        # Retornamos éxito
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

# -------------------------------
#           Inventory
#--------------------------------
@extend_schema_view(
    list=extend_schema(summary="Listar inventario", tags=["Inventario"]),
    create=extend_schema(summary="Crear ítem", tags=["Inventario"]),
    update=extend_schema(summary="Actualizar ítem", tags=["Inventario"]),
    destroy=extend_schema(summary="Eliminar ítem", tags=["Inventario"]),
)
class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all().order_by("name")
    serializer_class = InventoryItemSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "location", "category"]
    permission_classes = [IsAdminOrReadOnly]

    def create(self, request, *args, **kwargs):
        # 1. Crear Item en Almacén
        response = super().create(request, *args, **kwargs)

        item_id = response.data.get("id")
        name = response.data.get("name")
        meta_quantity = int(request.data.get("meta", 1)) # Capturar Meta

        # 2. Log
        if request.user.is_authenticated:
            ActivityLog.objects.create(
                user=request.user.username, action='CREATE', entity='InventoryItem',
                description=f"Se creó '{name}' en Almacén."
            )

        # 3. Crear Recomendación (Meta)
        try:
            item_obj = InventoryItem.objects.get(id=item_id)
            
            # ✅ CORREGIDO: Ya no usamos 'ambulance=None' porque el campo no existe.
            # Buscamos por 'item' (item_id) y creamos si no existe.
            RecommendedInventory.objects.get_or_create(
                item=item_obj,
                defaults={
                    'item_name': item_obj.name,
                    'category': item_obj.category,
                    'recommended_quantity': meta_quantity
                }
            )
            print(f"✅ Meta de {meta_quantity} creada para {name}")
            
        except Exception as e:
            print(f"⚠️ Error creando meta para {name}: {e}")

        return response

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_qty = instance.quantity
        response = super().update(request, *args, **kwargs)
        
        new_qty = int(response.data.get("quantity", 0))
        if new_qty != old_qty and request.user.is_authenticated:
            diff = new_qty - old_qty
            action = "añadieron" if diff > 0 else "retiraron"
            ActivityLog.objects.create(
                action="UPDATE", entity="InventoryItem", user=request.user.username,
                description=f"{instance.name}: Se {action} {abs(diff)}. Total: {new_qty}."
            )
        return response

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        name = instance.name
        response = super().destroy(request, *args, **kwargs)
        if request.user.is_authenticated:
            ActivityLog.objects.create(
                action="DELETE", entity="InventoryItem", user=request.user.username,
                description=f"Se eliminó '{name}'."
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
    permission_classes = [AllowPostAnyOtherwiseAuth]

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
    permission_classes = [AllowPostAnyOtherwiseAuth]

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

#-------------------------------------------
#             Recomendaciones
#-------------------------------------------
class RecommendedInventoryViewSet(viewsets.ModelViewSet):
    queryset = RecommendedInventory.objects.all()
    serializer_class = RecommendedInventorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]  

#-------------------------------------------
#             Permisos
#-------------------------------------------
class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True  # <-- permite GET sin token
        return bool(request.user and request.user.is_staff)
