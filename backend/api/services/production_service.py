from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from ..models import Product, Operation, ProductOperation, Employee, InventoryBalance, ProductionLog, MasterStock, ProductSize

def create_production_log(employee_id, product_id, operation_id, size_id, quantity, work_date=None):
    """
    Service to handle the creation of a production log and inventory addition.
    """
    if work_date is None:
        work_date = timezone.now().date()

    try:
        with transaction.atomic():
            # 1. Validation Gate
            if quantity <= 0:
                raise ValidationError("Quantity must be greater than zero.")

            # 2. Fetch ProductOperation for piece rate calculation
            try:
                product_op = ProductOperation.objects.get(product_id=product_id, operation_id=operation_id)
            except ProductOperation.DoesNotExist:
                raise ValidationError("This operation is not assigned to the selected product.")

            amount_earned = product_op.piece_rate * quantity

            # 3. Create Production Log Entry (for payroll)
            log = ProductionLog.objects.create(
                work_date=work_date,
                employee_id=employee_id,
                product_id=product_id,
                operation_id=operation_id,
                size_id=size_id,
                quantity=quantity,
                amount_earned=amount_earned
            )

            # 4. Fetch Master Stock and validate depletion logic
            try:
                master_stock = MasterStock.objects.get(product_id=product_id, size_id=size_id)
            except MasterStock.DoesNotExist:
                raise ValidationError("Initial stock (Master Stock) for this product and size has not been configured.")

            wip, created = InventoryBalance.objects.select_for_update().get_or_create(
                product_id=product_id,
                size_id=size_id,
                operation_id=operation_id,
                defaults={'balance_qty': 0}
            )

            if wip.balance_qty + quantity > master_stock.total_quantity:
                available = master_stock.total_quantity - wip.balance_qty
                raise ValidationError(f"Validation Failed: You cannot enter a quantity higher than what is available. (Available: {available})")

            wip.balance_qty += quantity
            wip.save()

            # 5. Calculate "Finished Goods" (Bottleneck Logic)
            # Find all operations that are REQUIRED for this product
            required_ops = ProductOperation.objects.filter(product_id=product_id).values_list('operation_id', flat=True)
            
            if not required_ops:
                # If no operations defined, we can't have finished goods
                finished_qty = 0
            else:
                # Get current WIP balances for all required operations for this product/size
                balances = InventoryBalance.objects.filter(
                    product_id=product_id,
                    size_id=size_id,
                    operation_id__in=required_ops
                )
                balance_map = {b.operation_id: b.balance_qty for b in balances}
                
                # Finished quantity is the minimum of all required stages
                # If a stage has no balance record yet, its balance is implicitly 0
                finished_qty = min(balance_map.get(op_id, 0) for op_id in required_ops)

            # 6. Update/Create the "Finished Goods" record (where operation is None)
            finished_inventory, _ = InventoryBalance.objects.select_for_update().get_or_create(
                product_id=product_id,
                size_id=size_id,
                operation=None,
                defaults={'balance_qty': 0}
            )
            
            old_finished_qty = finished_inventory.balance_qty
            finished_inventory.balance_qty = finished_qty
            finished_inventory.save()

            return log, {
                "finished_increased": finished_qty > old_finished_qty,
                "increase_amount": finished_qty - old_finished_qty,
                "total_finished": finished_qty
            }

    except Exception as e:
        # Re-raise validation errors or handle specific database errors
        err_str = str(e).lower()
        if "unique_production_log_entry" in err_str or ("unique constraint failed" in err_str and "api_productionlog" in err_str):
            try:
                op_name = Operation.objects.get(id=operation_id).operation_name
                size_name = ProductSize.objects.get(id=size_id).size_name
                raise ValidationError(f"The {op_name.lower()} of size {size_name} is already completed for today.")
            except Exception:
                raise ValidationError("This operation of this size is already completed for today.")
        raise e
