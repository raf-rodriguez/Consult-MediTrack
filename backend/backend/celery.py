# meditrack/meditrack/celery.py

import os
from celery import Celery

# 1. Establece el módulo de configuración por defecto de Django
# Reemplaza 'meditrack' si tu carpeta principal tiene otro nombre
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings') 

app = Celery('meditrack')

# 2. Carga la configuración de Celery desde el archivo settings.py
app.config_from_object('django.conf:settings', namespace='CELERY')

# 3. Auto-descubre tareas en todos los archivos tasks.py de tus apps
app.autodiscover_tasks()