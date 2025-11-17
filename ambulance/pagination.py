from rest_framework.pagination import PageNumberPagination

class OptionalPageNumberPagination(PageNumberPagination):
    """
    No usa paginación a menos que exista ?page=
    """
    page_size = 20
    page_size_query_param = "page_size"

    def paginate_queryset(self, queryset, request, view=None):
        # Si no mandan page -> no paginar
        if "page" not in request.query_params:
            return None
        return super().paginate_queryset(queryset, request, view)
