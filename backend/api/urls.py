from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductViewSet, 
    OperationViewSet,
    EmployeeViewSet, 
    InventoryBalanceViewSet, 
    ProductionLogViewSet,
    ProductSizeViewSet,
    DesignationViewSet,
    SubmitProductionLogView,
    SalaryHistoryView,
    ResetPasswordView,
    StockOutViewSet,
    MasterStockViewSet,
    CustomSalaryView
)

router = DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'operations', OperationViewSet)
router.register(r'employees', EmployeeViewSet)
router.register(r'inventory-balances', InventoryBalanceViewSet)
router.register(r'production-logs', ProductionLogViewSet)
router.register(r'product-sizes', ProductSizeViewSet)
router.register(r'designations', DesignationViewSet)
router.register(r'stock-outs', StockOutViewSet)
router.register(r'master-stocks', MasterStockViewSet)

urlpatterns = [
    path('production-log/', SubmitProductionLogView.as_view(), name='production-log-submit'),
    path('salary-history/', SalaryHistoryView.as_view(), name='salary-history'),
    path('custom-salary/', CustomSalaryView.as_view(), name='custom-salary'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('', include(router.urls)),
]
