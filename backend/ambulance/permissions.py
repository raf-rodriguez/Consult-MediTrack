from rest_framework.permissions import BasePermission, SAFE_METHODS

# ----------------------------------------------------
# ✅ PERMISO 1: Permitir POST sin autenticación
# ----------------------------------------------------
class AllowPostAnyOtherwiseAuth(BasePermission):
    """
    Permite POST sin autenticación.
    OPTIONS y HEAD siempre permitidos.
    GET/PUT/PATCH/DELETE requieren usuario autenticado.
    """

    def has_permission(self, request, view):
        # Permitir OPTIONS/HEAD (Swagger, navegadores)
        if request.method in ("OPTIONS", "HEAD"):
            return True

        # Permitir POST sin autenticación
        if request.method == "POST":
            return True

        # GET/PUT/PATCH/DELETE requieren login
        return bool(request.user and request.user.is_authenticated)


# ----------------------------------------------------
# ✅ PERMISO 2: Only Admin Modify, others ReadOnly
# ----------------------------------------------------
class IsAdminOrReadOnly(BasePermission):
    """
    SAFE_METHODS (GET, HEAD, OPTIONS): permitido para cualquier usuario.
    Escritura (POST, PUT, PATCH, DELETE): solo admin/staff autenticados.
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


# ----------------------------------------------------
# ✅ PERMISO 3: DELETE solo admin
# ----------------------------------------------------
class IsAdminForDelete(BasePermission):
    """
    DELETE: solo admin/staff
    Otros métodos: permitidos (se combinan con otros permisos).
    """
    def has_permission(self, request, view):
        if request.method == "DELETE":
            return bool(request.user and request.user.is_staff)
        return True


# ----------------------------------------------------
# ✅ PERMISO 4: Solo paramédicos pueden crear operaciones sensibles
# ----------------------------------------------------
class IsParamedic(BasePermission):
    """
    Verifica si el usuario tiene el rol 'paramedic'.
    Requiere que tu User tenga un campo 'role'.
    """
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated 
            and getattr(request.user, "role", "") == "paramedic"
        )
