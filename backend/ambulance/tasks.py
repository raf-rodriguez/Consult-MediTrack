# med_inventory/tasks.py

from celery import shared_task
# Importar TODOS los modelos que deseas limpiar
from .models import AmbulanceCheck, Transfer, MedicationExpense, AmbulanceRequisition, ActivityLog

@shared_task
def clear_monthly_records():
    """
    Elimina todos los registros de las tablas de Logs y Chequeos (cada 30 días).
    """
    
    deleted_counts = {}

    # Lista de modelos a limpiar
    models_to_clear = {
        "AmbulanceCheck": AmbulanceCheck,
        "Transfer": Transfer,
        "MedicationExpense": MedicationExpense,
        "AmbulanceRequisition": AmbulanceRequisition,
        "ActivityLog": ActivityLog,
    }

    print("🚀 Iniciando tarea de limpieza mensual...")

    for model_name, ModelClass in models_to_clear.items():
        try:
            # Contar y eliminar todos los registros
            count = ModelClass.objects.count()
            ModelClass.objects.all().delete()
            
            deleted_counts[model_name] = count
            print(f"✅ Limpieza de {model_name}: {count} registros eliminados.")
            
        except Exception as e:
            deleted_counts[model_name] = f"FALLO: {e}"
            print(f"❌ Error al limpiar {model_name}: {e}")

    # Devolver un resumen de la ejecución para Celery
    print("✨ Tarea de limpieza completada.")
    return deleted_counts