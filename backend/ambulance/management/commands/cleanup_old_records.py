from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from ambulance.models import (
    AmbulanceCheck,
    MedicationExpense,
    AmbulanceRequisition,
    ActivityLog
)

import logging
log = logging.getLogger("ambulance")


class Command(BaseCommand):
    help = "Elimina registros mayores de 30 días: chequeos, requisiciones, gastos y activity logs"

    def handle(self, *args, **kwargs):
        limit_date = timezone.now() - timedelta(days=30)

        self.stdout.write(self.style.WARNING("🔍 Iniciando limpieza de registros >30 días..."))
        log.info("cleanup.started")

        # 1. Hojas de chequeo
        checks_deleted, _ = AmbulanceCheck.objects.filter(
            date__lt=limit_date.date()
        ).delete()

        # 2. Requisiciones
        req_deleted, _ = AmbulanceRequisition.objects.filter(
            created_at__lt=limit_date
        ).delete()

        # 3. Gastos
        exp_deleted, _ = MedicationExpense.objects.filter(
            created_at__lt=limit_date
        ).delete()

        # 4. Activity Log
        logs_deleted, _ = ActivityLog.objects.filter(
            created_at__lt=limit_date
        ).delete()

        self.stdout.write(self.style.SUCCESS(
            f"✅ Limpieza completada:\n"
            f"   - Hojas de chequeo eliminadas: {checks_deleted}\n"
            f"   - Requisiciones eliminadas: {req_deleted}\n"
            f"   - Gastos eliminados: {exp_deleted}\n"
            f"   - Activity Logs eliminados: {logs_deleted}\n"
        ))
