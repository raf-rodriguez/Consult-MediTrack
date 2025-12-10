import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from twilio.rest import Client

from ambulance.models import InventoryItem, StockAlert

# Nota: Ya no importamos RecommendedInventory aquí porque eso lo maneja views.py
log = logging.getLogger("ambulance")


def send_low_stock_sms(item):
    """Envía un SMS al administrador cuando un ítem está bajo en inventario."""
    
    if not (
        getattr(settings, "TWILIO_ACCOUNT_SID", None)
        and getattr(settings, "TWILIO_AUTH_TOKEN", None)
        and getattr(settings, "TWILIO_FROM_NUMBER", None)
        and getattr(settings, "ADMIN_PHONE", None)
    ):
        # Si no hay config de Twilio, solo logueamos error y salimos sin romper nada
        log.warning("Twilio no configurado. No se envió SMS para %s", item.name)
        return

    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        message = client.messages.create(
            body=f"⚠️ ALERTA: '{item.name}' está bajo en inventario. Cantidad actual: {item.quantity}",
            from_=settings.TWILIO_FROM_NUMBER,
            to=settings.ADMIN_PHONE
        )

        log.info(
            "sms.sent.low_stock",
            extra_info={"item": item.name, "sid": message.sid}
        )

    except Exception as e:
        log.exception(
            "sms.error.low_stock",
            extra_info={"item": item.name, "error": str(e)}
        )


@receiver(post_save, sender=InventoryItem)
def low_stock_alert(sender, instance, created, **kwargs):
    """
    Maneja alertas internas y SMS cuando un ítem baja de inventario.
    """
    # Usamos el min_stock del item, o 1 por defecto
    min_threshold = getattr(instance, 'min_stock', 1)

    existing_alert = (
        StockAlert.objects.filter(item=instance, viewed=False)
        .order_by('-date')
        .first()
    )

    # ----------------------------------------------------
    #   CASO 1 — El ítem está en nivel bajo
    # ----------------------------------------------------
    if instance.quantity <= min_threshold:

        message = (
            f"El ítem '{instance.name}' está bajo en inventario. "
            f"Cantidad actual: {instance.quantity}/{min_threshold}"
        )

        if existing_alert:
            # Actualizar mensaje existente si cambió
            if existing_alert.message != message:
                existing_alert.message = message
                existing_alert.save(update_fields=["message"])
        else:
            # Crear nueva alerta
            StockAlert.objects.create(item=instance, message=message)
            
            # Enviar SMS
            send_low_stock_sms(instance)

        return

    # ----------------------------------------------------
    #   CASO 2 — El stock volvió a normalidad
    # ----------------------------------------------------
    # Si ya hay suficiente stock, borramos las alertas pendientes
    StockAlert.objects.filter(item=instance).delete()

    # ❌ SE ELIMINÓ LA CREACIÓN DE RECOMMENDED INVENTORY AQUÍ
    # Esa lógica ahora vive segura en views.py