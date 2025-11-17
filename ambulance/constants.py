import unicodedata

CATEGORY_NORMALIZATION_MAP = {
    "Inmovilizacion": "Inmovilizacion",
    "Canalizacion": "Canalizacion",
    "Airway / Oxigeno": "Airway / Oxigeno",
    "Miscelaneos": "Miscelaneos",
    "Medicamentos": "Medicamentos",
    "Ventilacion & Monitor": "Ventilacion & Monitor",
    "Equipo / Vitales": "Equipo / Vitales",
    "Bulto de trauma": "Bulto de trauma",
    "Entubacion": "Entubacion",
}


def remove_accents(text: str) -> str:
    """Elimina tildes y caracteres especiales, dejando ASCII limpio."""
    return ''.join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )


def normalize_category(category: str) -> str:
    """Normaliza categorías eliminando acentos, espacios y variaciones."""
    if not category:
        return "Miscelaneos"

    # Limpieza inicial
    cat = category.strip()

    # Eliminar acentos y estandarizar todo
    simplified = remove_accents(cat).lower()

    # Normalizar espacios y separadores
    simplified = simplified.replace("  ", " ").replace("/", " / ")

    # Normalizar claves del mapa
    for key, normalized in CATEGORY_NORMALIZATION_MAP.items():
        key_simplified = remove_accents(key).lower()

        if simplified == key_simplified:
            return normalized
    
    # fallback → si no se reconoce, se devuelve tal cual pero sin acentos
    return remove_accents(cat)
