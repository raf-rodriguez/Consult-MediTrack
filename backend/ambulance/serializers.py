from rest_framework import serializers
from .models import AmbulanceCheck, InventoryItem, Transfer, MedicationExpense, AmbulanceInventory, AmbulanceRequisition, RecommendedInventory, InventoryItem
from django.contrib.auth.models import User
from .models import StockAlert

# -----------------------------------
#           Ambulance Check
#------------------------------------
class AmbulanceCheckSerializer(serializers.ModelSerializer):
    # Campo de escritura para recibir los faltantes desde React
    missing_items = serializers.ListField(
        child=serializers.DictField(), 
        write_only=True, 
        required=False
    )

    class Meta:
        model = AmbulanceCheck
        fields = '__all__'

# -----------------------------------
#           Inventory
#------------------------------------
class InventoryItemSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = InventoryItem
        fields = '__all__'

# -----------------------------------
#             Transfer
#------------------------------------
class TransferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transfer
        fields = '__all__'

# -----------------------------------
#        Medication Expenses
#------------------------------------
class MedicationExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationExpense
        fields = '__all__'

# -----------------------------------
#        Ambulance Inventory
#------------------------------------
class AmbulanceInventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AmbulanceInventory
        fields = '__all__'

# -----------------------------------
#        Ambulance Requisition
#------------------------------------
class AmbulanceRequisitionSerializer(serializers.ModelSerializer):
    item = InventoryItemSerializer()

    class Meta:
        model = AmbulanceRequisition
        fields = ['id', 'created_at', 'paramedic', 'ambulance', 'item', 'quantity']

# -----------------------------------
#           Stock Alert
#------------------------------------
class StockAlertSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = StockAlert
        fields = ['id', 'item', 'item_name', 'message', 'viewed', 'date']


# -----------------------------------
#           Recomendaciones 
#------------------------------------
# En serializers.py
class RecommendedInventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RecommendedInventory
        fields = '__all__'
        extra_kwargs = {
            'item': {'required': False, 'allow_null': True}
        }

#-----------------------------------
class InventoryItemWithMetaSerializer(serializers.Serializer):
    name = serializers.CharField()
    quantity = serializers.IntegerField()
    category = serializers.CharField()
    min_stock = serializers.IntegerField(default=1)
    unit = serializers.CharField(default="unidades")
    recommended_quantity = serializers.IntegerField()
    ambulance = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    def create(self, validated_data):
        from .models import InventoryItem, RecommendedInventory

        # Crear inventario de almacén
        item = InventoryItem.objects.create(
            name=validated_data["name"],
            quantity=validated_data["quantity"],
            category=validated_data["category"],
            min_stock=validated_data["min_stock"],
            unit=validated_data["unit"],
        )

        # Crear meta de hoja de chequeo
        RecommendedInventory.objects.create(
            item=item,
            item_name=item.name,
            category=item.category,
            ambulance=validated_data.get("ambulance", None),
            recommended_quantity=validated_data["recommended_quantity"],
        )

        return item
