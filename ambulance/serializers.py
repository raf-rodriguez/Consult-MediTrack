from rest_framework import serializers
from .models import AmbulanceCheck, InventoryItem, Transfer, MedicationExpense, AmbulanceInventory, AmbulanceRequisition
from django.contrib.auth.models import User
from .models import StockAlert

# -----------------------------------
#           Ambulance Check
#------------------------------------
class AmbulanceCheckSerializer(serializers.ModelSerializer):
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
#           Inventory <----> por el momento no se esta usando 
#------------------------------------
#class InventoryItemSerializer(serializers.ModelSerializer):
#    class Meta:
#        model = InventoryItem
#        fields = ['id', 'name', 'unit', 'quantity', 'location', 'category']

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
