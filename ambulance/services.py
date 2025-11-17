from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import InventoryItem, AmbulanceInventory, Transfer, AmbulanceRequisition
import logging

log = logging.getLogger("ambulance")

@transaction.atomic
def transfer_from_storage_to_ambulance(ambulance: str, paramedic: str, items: list):
    """
    items = [ { "item_id": X, "quantity": X }, ... ]
    Transfiere items del almacén hacia una ambulancia.
    """
    results = []

    for entry in items:
        item_id = entry.get("item_id")
        qty = int(entry.get("quantity", 0))

        # Validar item
        item = get_object_or_404(InventoryItem, pk=item_id)

        if item.quantity < qty:
            raise ValueError(f"Stock insuficiente para {item.name}")

        # 1) Descontar del almacén
        item.quantity -= qty
        item.save()

        # 2) Agregar a inventario de ambulancia
        dest_item, _ = AmbulanceInventory.objects.get_or_create(
            name=item.name,
            ambulance=ambulance,
            defaults={
                "quantity": 0,
                "unit": item.unit,
                "category": item.category
            }
        )
        dest_item.quantity += qty
        dest_item.save()

        # 3) Registrar transferencia
        Transfer.objects.create(
            item=item,
            from_location="Almacén",
            to_location=ambulance,
            quantity=qty,
            performed_by=paramedic,
        )

        # 4) Registrar requisición
        AmbulanceRequisition.objects.create(
            paramedic=paramedic,
            ambulance=ambulance,
            item=item,
            quantity=qty,
        )

        results.append({
            "item": item.name,
            "quantity": qty,
            "ambulance": ambulance
        })

    # ✅ FIX DEL ERROR
    log.info(f"transfer.completed → ambulance={ambulance}, items={len(results)}")

    return results
