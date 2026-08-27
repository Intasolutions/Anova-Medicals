from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LabInventoryViewSet, LabChargeViewSet, LabTestViewSet,
    LabCategoryViewSet, LabSupplierViewSet, LabPurchaseViewSet,
    LabBatchViewSet
)

router = DefaultRouter()
router.register(r'categories', LabCategoryViewSet)
router.register(r'inventory', LabInventoryViewSet)
router.register(r'charges', LabChargeViewSet)
router.register(r'tests', LabTestViewSet)
router.register(r'suppliers', LabSupplierViewSet)
router.register(r'purchases', LabPurchaseViewSet)
router.register(r'batches', LabBatchViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
