from django.db.models import Sum, Count
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets, views, status
from rest_framework.response import Response

from rest_framework.decorators import action
from .models import Product, Operation, ProductOperation, Employee, InventoryBalance, ProductionLog, ProductSize, Designation, StockOut, MasterStock
from .serializers import (
    ProductSerializer, OperationSerializer, ProductOperationSerializer, EmployeeSerializer, 
    InventoryBalanceSerializer, ProductionLogSerializer,
    ProductSizeSerializer, DesignationSerializer, StockOutSerializer, MasterStockSerializer
)

class MasterStockViewSet(viewsets.ModelViewSet):
    queryset = MasterStock.objects.all().order_by('product__name', 'size__size_name')
    serializer_class = MasterStockSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        product_id = self.request.query_params.get('product')
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs

class ProductSizeViewSet(viewsets.ModelViewSet):
    queryset = ProductSize.objects.all().order_by('display_order', 'size_name')
    serializer_class = ProductSizeSerializer

class DesignationViewSet(viewsets.ModelViewSet):
    queryset = Designation.objects.all().order_by('name')
    serializer_class = DesignationSerializer

from .services.inventory_service import create_product_with_operations_and_stock

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('name')
    serializer_class = ProductSerializer

    def get_queryset(self):
        queryset = Product.objects.all().order_by('name')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        return queryset

    def create(self, request, *args, **kwargs):
        operations_data = request.data.get('operations')
        sizes_data = request.data.get('sizes')
        
        try:
            product_data = {
                'product_code': request.data.get('product_code'),
                'model_number': request.data.get('model_number'),
                'name': request.data.get('name'),
                'price_per_unit': request.data.get('price_per_unit'),
            }
            product, balance = create_product_with_operations_and_stock(product_data, operations_data, sizes_data)
            return Response(self.get_serializer(product).data, status=status.HTTP_201_CREATED)
        except DjangoValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, *args, **kwargs):
        product = self.get_object()
        operations_data = request.data.get('operations')
        sizes_data = request.data.get('sizes')

        with transaction.atomic():
            serializer = self.get_serializer(product, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()

            if operations_data is not None:
                seen_ops = set()
                unique_ops = []
                for op_data in operations_data:
                    if op_data['operation_id'] not in seen_ops:
                        seen_ops.add(op_data['operation_id'])
                        unique_ops.append(op_data)
                
                product.product_operations.all().delete()
                for op_data in unique_ops:
                    ProductOperation.objects.create(
                        product=product,
                        operation_id=op_data['operation_id'],
                        piece_rate=op_data['piece_rate']
                    )

            if sizes_data is not None:
                from .models import MasterStock
                seen_sizes = set()
                for sz_data in sizes_data:
                    size_id = sz_data['size_id']
                    if size_id not in seen_sizes:
                        seen_sizes.add(size_id)
                        obj, created = MasterStock.objects.get_or_create(
                            product=product,
                            size_id=size_id,
                            defaults={'total_quantity': sz_data.get('total_quantity', 0)}
                        )
                        if not created:
                            obj.total_quantity = sz_data.get('total_quantity', 0)
                            obj.save()

        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def operations(self, request, pk=None):
        product = self.get_object()
        operations = product.product_operations.all()
        serializer = ProductOperationSerializer(operations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def master_stocks(self, request, pk=None):
        product = self.get_object()
        stocks = product.master_stocks.all()
        serializer = MasterStockSerializer(stocks, many=True)
        return Response(serializer.data)

class OperationViewSet(viewsets.ModelViewSet):
    queryset = Operation.objects.all().order_by('operation_code')
    serializer_class = OperationSerializer

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all().order_by('name')
    serializer_class = EmployeeSerializer

class InventoryBalanceViewSet(viewsets.ModelViewSet):
    queryset = InventoryBalance.objects.all().order_by('product__name')
    serializer_class = InventoryBalanceSerializer

class ProductionLogViewSet(viewsets.ModelViewSet):
    queryset = ProductionLog.objects.all().order_by('-work_date', '-updated_at', '-created_at')
    serializer_class = ProductionLogSerializer

    def get_queryset(self):
        queryset = ProductionLog.objects.all().order_by('-work_date', '-updated_at', '-created_at')
        employee_code = self.request.query_params.get('employee')
        employee_id = self.request.query_params.get('employee_id')
        product = self.request.query_params.get('product')
        operation = self.request.query_params.get('operation')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        model_number = self.request.query_params.get('model_number')
        
        if employee_code:
            queryset = queryset.filter(employee__employee_code=employee_code)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        if product:
            queryset = queryset.filter(product__product_code=product)
        if operation:
            queryset = queryset.filter(operation__operation_code=operation)
        if start_date:
            queryset = queryset.filter(work_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(work_date__lte=end_date)
        if model_number:
            queryset = queryset.filter(product__model_number__icontains=model_number)
        return queryset

    def update(self, request, *args, **kwargs):
        log = self.get_object()
        employee_id = request.data.get('employee_id', log.employee_id)
        product_id = request.data.get('product_id', log.product_id)
        operation_id = request.data.get('operation_id', log.operation_id)
        size_id = request.data.get('size_id', log.size_id) or request.data.get('size', log.size_id)
        quantity = request.data.get('quantity', log.quantity)
        work_date = request.data.get('work_date', log.work_date)
        amount = request.data.get('amount_earned', None)

        try:
            updated_log = update_production_log(
                log_id=log.id,
                employee_id=employee_id,
                product_id=product_id,
                operation_id=operation_id,
                size_id=size_id,
                quantity=quantity,
                work_date=work_date,
                amount=amount
            )
            serializer = self.get_serializer(updated_log)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except DjangoValidationError as e:
            msg = e.message if hasattr(e, 'message') else str(e)
            return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        log = self.get_object()
        try:
            delete_production_log(log.id)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

from .services.production_service import create_production_log, update_production_log, delete_production_log

class SubmitProductionLogView(views.APIView):
    def post(self, request):
        employee_id = request.data.get('employee_id')
        product_id = request.data.get('product_id')
        operation_id = request.data.get('operation_id')
        size_id = request.data.get('size_id') or request.data.get('size')
        quantity = request.data.get('quantity')
        work_date = request.data.get('work_date')

        try:
            log, meta = create_production_log(
                employee_id=employee_id,
                product_id=product_id,
                operation_id=operation_id,
                size_id=size_id,
                quantity=quantity,
                work_date=work_date
            )
            response_data = ProductionLogSerializer(log).data
            response_data['meta'] = meta
            
            return Response(
                response_data,
                status=status.HTTP_201_CREATED
            )
        except DjangoValidationError as e:
            msg = e.message if hasattr(e, 'message') else str(e)
            return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

from django.contrib.auth.models import User

class ResetPasswordView(views.APIView):
    def post(self, request):
        email = request.data.get('email')
        new_password = request.data.get('new_password')
        
        if not email or not new_password:
            return Response({"error": "Email and new password are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = User.objects.get(email=email)
            user.set_password(new_password)
            user.save()
            return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User with this email does not exist."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SalaryHistoryView(views.APIView):
    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        employee_id = request.query_params.get('employee_id')

        queryset = ProductionLog.objects.all()
        if start_date:
            queryset = queryset.filter(work_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(work_date__lte=end_date)
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        report = queryset.values(
            'employee_id',
            'employee__name', 
            'employee__employee_code'
        ).annotate(
            total_pieces=Sum('quantity'),
            total_payout=Sum('amount_earned'),
            present_days=Count('work_date', distinct=True)
        ).order_by('employee__name')

        return Response(report, status=status.HTTP_200_OK)

from .services.inventory_out_service import record_stock_out

class StockOutViewSet(viewsets.ModelViewSet):
    queryset = StockOut.objects.all().order_by('-out_date')
    serializer_class = StockOutSerializer

    def create(self, request, *args, **kwargs):
        product_id = request.data.get('product')
        size_id = request.data.get('size')
        quantity = request.data.get('quantity')
        recipient = request.data.get('recipient')
        remarks = request.data.get('remarks')

        try:
            stock_out = record_stock_out(
                product_id=product_id,
                size_id=size_id,
                quantity=quantity,
                recipient=recipient,
                remarks=remarks
            )
            serializer = self.get_serializer(stock_out)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except DjangoValidationError as e:
            msg = e.message if hasattr(e, 'message') else str(e)
            return Response({"error": msg}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

from decimal import Decimal
from django.db import transaction
from django.utils import timezone

class CustomSalaryView(views.APIView):
    def post(self, request):
        employee_id = request.data.get('employee_id')
        work_date = request.data.get('work_date')
        amount = request.data.get('amount')
        remarks = request.data.get('remarks', 'Custom Salary / Daily Wage')

        if not employee_id or not work_date or amount is None:
            return Response(
                {"error": "Employee, work date, and amount are required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                operation, _ = Operation.objects.get_or_create(
                    operation_code="SALARY-DAY",
                    defaults={"operation_name": "Day Salary / Custom Allowance"}
                )
                product, _ = Product.objects.get_or_create(
                    product_code="SALARY-PROD",
                    defaults={
                        "name": "Custom Salary Allocation",
                        "price_per_unit": 0,
                        "model_number": "SALARY-BATCH"
                    }
                )
                size, _ = ProductSize.objects.get_or_create(
                    size_name="DAY-WAGE",
                    defaults={"display_order": 999}
                )

                existing_log = ProductionLog.objects.filter(
                    work_date=work_date,
                    employee_id=employee_id,
                    product=product,
                    operation=operation,
                    size=size
                ).exists()

                if existing_log:
                    return Response({"error": "This employee already has a custom salary assigned for this date. Please edit the existing entry instead."}, status=status.HTTP_400_BAD_REQUEST)

                now = timezone.now()
                log = ProductionLog.objects.create(
                    work_date=work_date,
                    employee_id=employee_id,
                    product=product,
                    operation=operation,
                    size=size,
                    quantity=1,
                    amount_earned=Decimal(str(amount)),
                    created_at=now,
                    updated_at=now
                )

            return Response({
                "message": f"Custom salary of ₹{amount} recorded successfully for {log.employee.name}.",
                "log_id": log.id
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
