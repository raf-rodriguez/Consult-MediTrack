import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from twilio.rest import Client
from ambulance.models import InventoryItem, StockAlert

log = logging.getLogger("ambulance")


def send_low_stock_sms(item):
    """Envía un SMS al administrador cuando un ítem está bajo en inventario."""
    
    if not (
        getattr(settings, "TWILIO_ACCOUNT_SID", None)
        and getattr(settings, "TWILIO_AUTH_TOKEN", None)
        and getattr(settings, "TWILIO_FROM_NUMBER", None)
        and getattr(settings, "ADMIN_PHONE", None)
    ):
        log.error(
            "twilio.not_configured",
            extra_info={"item": item.name}
        )
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
def low_stock_alert(sender, instance, **kwargs):
    """
    Maneja alertas internas y SMS cuando un ítem baja de inventario.
    """
    existing_alert = (
        StockAlert.objects.filter(item=instance, viewed=False)
        .order_by('-date')
        .first()
    )

    # ----------------------------------------------------
    #   CASO 1 — El ítem está en nivel bajo
    # ----------------------------------------------------
    if instance.quantity <= instance.min_stock:

        message = (
            f"El ítem '{instance.name}' está bajo en inventario. "
            f"Cantidad actual: {instance.quantity}/{instance.min_stock}"
        )

        if existing_alert:
            # Actualizar mensaje existente
            if existing_alert.message != message:
                existing_alert.message = message
                existing_alert.save(update_fields=["message"])

                log.warning(
                    "stock.alert.updated",
                    extra_info={
                        "item": instance.name,
                        "quantity": instance.quantity
                    }
                )
        else:
            # Crear nueva alerta
            StockAlert.objects.create(item=instance, message=message)

            log.warning(
                "stock.alert.created",
                extra_info={
                    "item": instance.name,
                    "quantity": instance.quantity
                }
            )

            send_low_stock_sms(instance)

        return  # finaliza aquí porque sigue estando bajo

    # ----------------------------------------------------
    #   CASO 2 — El stock volvió a normalidad
    # ----------------------------------------------------
    deleted_count, _ = StockAlert.objects.filter(item=instance).delete()

    if deleted_count > 0:
        log.info(
            "stock.alert.cleared",
            extra_info={'item': instance.name, 'deleted': deleted_count}
        )
