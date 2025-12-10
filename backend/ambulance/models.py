from django.db import models
from django.contrib.auth.models import User

#-----------------------------------------
#            Ambulance Check
#-----------------------------------------

class AmbulanceCheck(models.Model):
    date = models.DateField()
    ambulance = models.CharField(max_length=10)
    staff = models.CharField(max_length=100)
    shift = models.CharField(max_length=20)

     # ✅ Añadir estos campos (base64 de firmas)
    firma_staff1 = models.TextField(blank=True, null=True)
    staff2 = models.CharField(max_length=100, blank=True, null=True)
    firma_staff2 = models.TextField(blank=True, null=True)

    millage = models.IntegerField(default=0)
    combustible = models.CharField(
        max_length=10,
        choices=[
            ("Full", "Full"),
            ("3/4", "3/4"),
            ("1/2", "1/2"),
            ("1/4", "1/4"),
            ("Empty", "Empty"),
        ],
        default="Full"
    )

    oxigeno_m = models.IntegerField(default=0)
    oxigeno_d = models.IntegerField(default=0)
    observaciones = models.TextField(blank=True, null=True)

    # Secciones del inventario
    seccion_vehiculo = models.JSONField(default=dict)
    seccion_medical_equipment = models.JSONField(default=dict)
    seccion_inmovilizacion = models.JSONField(default=dict)
    seccion_canalizacion = models.JSONField(default=dict)
    seccion_oxigeno_airway = models.JSONField(default=dict)
    seccion_medicamentos = models.JSONField(default=dict)
    seccion_miscelaneos = models.JSONField(default=dict)
    seccion_entubacion = models.JSONField(default=dict)
    seccion_equipo = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # ✅ Evita duplicar mismo turno+ambulancia+fecha
        unique_together = ('date', 'ambulance', 'shift')
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"Chequeo {self.ambulance} - {self.date} ({self.shift})"

#-----------------------------------------
#               Inventory 
#-----------------------------------------
class InventoryItem(models.Model):
    CATEGORY_CHOICES = [
        ('Inmovilización', 'Inmovilización'),
        ('Canalización', 'Canalización'),
        ('Airway / Oxígeno', 'Airway / Oxígeno'),
        ('Medicamentos', 'Medicamentos'),
        ('Misceláneos', 'Misceláneos'),
        ('Entubación', 'Entubación'),
        ('Equipo', 'Equipo'),
    ]

    name = models.CharField(max_length=200)
    sku = models.CharField(max_length=100, blank=True, null=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='Misceláneos')
    quantity = models.IntegerField(default=0)
    min_stock = models.IntegerField(default=1)
    unit = models.CharField(max_length=50, blank=True, default='unidades')
    location = models.CharField(max_length=100, default='Almacén')

    def is_low_stock(self):
        return self.quantity <= self.min_stock

    def save(self, *args, **kwargs):
        from .constants import normalize_category

        if self.category:
            self.category = normalize_category(self.category)

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.category}) - {self.quantity}"

class StockAlert(models.Model):
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE)
    message = models.CharField(max_length=255)
    date = models.DateTimeField(auto_now_add=True)
    viewed = models.BooleanField(default=False)

    def __str__(self):
        return f"⚠️ {self.item.name} - Bajo stock"

#-----------------------------------------
#               Transfer
#-----------------------------------------
class Transfer(models.Model):
    # Transfer from storage to ambulance
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE)
    from_location = models.CharField(max_length=100, default='Almacén')
    to_location = models.CharField(max_length=100)
    quantity = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    performed_by = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.quantity} {self.item.name} to {self.to_location}"

#-----------------------------------------
#          Medication Expense
#-----------------------------------------
class MedicationExpense(models.Model):
    patient_name = models.CharField(max_length=200)
    paramedic = models.CharField(max_length=100)
    ambulance = models.CharField(max_length=50)
    shift = models.CharField(max_length=20, blank=True)
    medicine = models.CharField(max_length=200)
    quantity = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.medicine} - {self.quantity} ({self.ambulance})"
    
#-----------------------------------------
#          Ambulance Inventory
#-----------------------------------------
class AmbulanceInventory(models.Model):
    AMBULANCE_CHOICES = [
        ('CM1', 'CM1'),
        ('CM2', 'CM2'),
        ('CM3', 'CM3'),
        ('S56', 'S56'),
    ]

    CATEGORY_CHOICES = [
        ('Inmovilización', 'Inmovilización'),
        ('Canalización', 'Canalización'),
        ('Airway / Oxígeno', 'Airway / Oxígeno'),
        ('Medicamentos', 'Medicamentos'),
        ('Misceláneos', 'Misceláneos'),
        ('Ventilacion & Monitor', 'Ventilacion & Monitor'),
        ('Equipo / Vitales', 'Equipo / Vitales'),
        ('Bulto de trauma', 'Bulto de trauma'),
        ('Entubación', 'Entubación'),
    ]

    name = models.CharField(max_length=200)
    quantity = models.IntegerField(default=0)
    unit = models.CharField(max_length=50, blank=True)
    ambulance = models.CharField(max_length=10, choices=AMBULANCE_CHOICES)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.ambulance}) - {self.category}"
    
    def save(self, *args, **kwargs):
        from .constants import normalize_category
        if self.category:
            self.category = normalize_category(self.category)
        super().save(*args, **kwargs)

#-----------------------------------------
#         Ambulance Requisition
#-----------------------------------------
class AmbulanceRequisition(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    paramedic = models.CharField(max_length=100)
    ambulance = models.CharField(max_length=10, choices=AmbulanceInventory.AMBULANCE_CHOICES)
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    
    def __str__(self):
        return f"{self.item.name} → {self.ambulance} ({self.quantity})"
    
# -----------------------------------------
#         Registro de Actividades
# -----------------------------------------
class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('CREATE', 'Creación'),
        ('UPDATE', 'Actualización'),
        ('DELETE', 'Eliminación'),
        ('TRANSFER', 'Transferencia'),
    ]

    user = models.CharField(max_length=100, blank=True, null=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    entity = models.CharField(max_length=100)  # Ej: "InventoryItem" o "Transfer"
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_action_display()}] {self.entity} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

# -----------------------------------------
#         Recomendaciones 
# -----------------------------------------
class RecommendedInventory(models.Model):
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, null=True, blank=True)
    item_name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    recommended_quantity = models.IntegerField(default=0)

    class Meta:
        db_table = 'recommended_inventory'

    def __str__(self):
        return f"{self.item_name} - {self.category}"
