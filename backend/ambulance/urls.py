from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (AmbulanceCheckViewSet, InventoryItemViewSet, TransferViewSet, 
                    MedicationExpenseViewSet, AmbulanceInventoryViewSet, AmbulanceRequisitionListAPIView,
                    AmbulanceRequisitionViewSet, RecommendedInventoryViewSet, StockAlertViewSet, ActivityLogViewSet)
from .views import get_logged_in_user, secure_login

router = DefaultRouter()
router.register(r'checks', AmbulanceCheckViewSet, basename='check')
router.register(r'inventory', InventoryItemViewSet, basename='inventory')
router.register(r'transfers', TransferViewSet, basename='transfer')
router.register(r'medexpenses', MedicationExpenseViewSet, basename='medexpense')
router.register(r'ambulance-checks', AmbulanceCheckViewSet, basename='ambulancecheck')
router.register(r'ambulance-inventory', AmbulanceInventoryViewSet, basename='ambulance-inventory')
router.register(r"ambulance-requisitions", AmbulanceRequisitionViewSet, basename="ambulance-requisition")
router.register(r'alerts', StockAlertViewSet, basename='stockalert')
router.register(r'activity-log', ActivityLogViewSet, basename='activity-log')
router.register(r"recommended-inventory", RecommendedInventoryViewSet, basename="recommended-inventory")

urlpatterns = [
    path('', include(router.urls)),
    path('ambulance-requisitions/', AmbulanceRequisitionListAPIView.as_view(), name='ambulance-requisitions'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path("me/", get_logged_in_user, name="get_logged_in_user"),
    path('secure-login/', secure_login, name='secure-login'),
]
