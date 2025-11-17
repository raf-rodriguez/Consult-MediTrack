from django.apps import AppConfig


class AmbulanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ambulance'

 # 🔔 Activar señales automáticamente al iniciar el servidor
    def ready(self):
        import ambulance.signals