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
        raise e

def _recalc_finished_goods(product_id, size_id):
    required_ops = ProductOperation.objects.filter(product_id=product_id).values_list('operation_id', flat=True)
    if not required_ops:
        finished_qty = 0
    else:
        balances = InventoryBalance.objects.filter(
            product_id=product_id,
            size_id=size_id,
            operation_id__in=required_ops
        )
        balance_map = {b.operation_id: b.balance_qty for b in balances}
        finished_qty = min(balance_map.get(op_id, 0) for op_id in required_ops)
        
    finished_inventory, _ = InventoryBalance.objects.select_for_update().get_or_create(
        product_id=product_id,
        size_id=size_id,
        operation=None,
        defaults={'balance_qty': 0}
    )
    finished_inventory.balance_qty = finished_qty
    finished_inventory.save()

def delete_production_log(log_id):
    with transaction.atomic():
        log = ProductionLog.objects.select_for_update().get(id=log_id)
        
        # If this is a custom salary log, just delete it and return
        if log.product.product_code == "SALARY-PROD":
            log.delete()
            return

        # 1. Revert Inventory
        try:
            wip = InventoryBalance.objects.select_for_update().get(
                product_id=log.product_id,
                size_id=log.size_id,
                operation_id=log.operation_id
            )
            wip.balance_qty = max(0, wip.balance_qty - log.quantity)
            wip.save()
        except InventoryBalance.DoesNotExist:
            pass
            
        # 2. Recalculate Finished Goods
        _recalc_finished_goods(log.product_id, log.size_id)
        
        # 3. Delete the log
        log.delete()

def update_production_log(log_id, employee_id, product_id, operation_id, size_id, quantity, work_date, amount=None):
    with transaction.atomic():
        log = ProductionLog.objects.select_for_update().get(id=log_id)
        
        # If this is a custom salary log, handle it separately and return
        if log.product.product_code == "SALARY-PROD":
            log.employee_id = employee_id
            log.work_date = work_date
            if amount is not None:
                log.amount_earned = amount
            log.save()
            return log

        # Validation for normal operations
        if quantity <= 0:
            raise ValidationError("Quantity must be greater than zero.")
            
        try:
            product_op = ProductOperation.objects.get(product_id=product_id, operation_id=operation_id)
        except ProductOperation.DoesNotExist:
            raise ValidationError("This operation is not assigned to the selected product.")
            
        try:
            master_stock = MasterStock.objects.get(product_id=product_id, size_id=size_id)
        except MasterStock.DoesNotExist:
            raise ValidationError("Initial stock (Master Stock) for this product and size has not been configured.")

        # Revert Old Inventory
        try:
            wip_old = InventoryBalance.objects.select_for_update().get(
                product_id=log.product_id,
                size_id=log.size_id,
                operation_id=log.operation_id
            )
            wip_old.balance_qty = max(0, wip_old.balance_qty - log.quantity)
            wip_old.save()
        except InventoryBalance.DoesNotExist:
            pass
            
        _recalc_finished_goods(log.product_id, log.size_id)
        
        # Apply New Inventory
        wip_new, _ = InventoryBalance.objects.select_for_update().get_or_create(
            product_id=product_id,
            size_id=size_id,
            operation_id=operation_id,
            defaults={'balance_qty': 0}
        )
        
        if wip_new.balance_qty + quantity > master_stock.total_quantity:
            # Must rollback the previous revert if we fail here, but we are inside atomic so it's fine.
            raise ValidationError("Validation Failed: You cannot enter a quantity higher than what is available.")
            
        wip_new.balance_qty += quantity
        wip_new.save()
        
        _recalc_finished_goods(product_id, size_id)
        
        # Update Log
        log.employee_id = employee_id
        log.product_id = product_id
        log.operation_id = operation_id
        log.size_id = size_id
        log.quantity = quantity
        log.work_date = work_date
        
        if amount is not None:
            log.amount_earned = amount
        else:
            log.amount_earned = product_op.piece_rate * quantity
            
        log.save()
        
        return log
