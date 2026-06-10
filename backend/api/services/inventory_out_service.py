from django.db import transaction
from django.core.exceptions import ValidationError
from ..models import Product, ProductSize, InventoryBalance, StockOut, ProductOperation

def record_stock_out(product_id, size_id, quantity, recipient=None, remarks=None):
    """
    Atomically reduces stock from all operations and records a StockOut entry.
    This maintains the bottleneck logic consistency.
    """
    try:
        with transaction.atomic():
            # 1. Validate quantity
            if quantity <= 0:
                raise ValidationError("Quantity must be greater than zero.")

            # 2. Check if enough "Finished Goods" exist
            finished_stock = InventoryBalance.objects.select_for_update().filter(
                product_id=product_id,
                size_id=size_id,
                operation=None
            ).first()

            if not finished_stock or finished_stock.balance_qty < quantity:
                available = finished_stock.balance_qty if finished_stock else 0
                raise ValidationError(f"Insufficient finished stock. Available: {available}, Requested: {quantity}")

            # 3. Create StockOut record
            stock_out = StockOut.objects.create(
                product_id=product_id,
                size_id=size_id,
                quantity=quantity,
                recipient=recipient,
                remarks=remarks
            )

            # 4. Reduce stock from ALL inventory balances for this product/size
            # This ensures that both the bottleneck (operation=None) and the 
            # individual operation counters are reduced, keeping the system in sync.
            balances = InventoryBalance.objects.select_for_update().filter(
                product_id=product_id,
                size_id=size_id
            )
            
            for balance in balances:
                balance.balance_qty -= quantity
                if balance.balance_qty < 0:
                    # This shouldn't happen if finished_stock check passed, 
                    # but good for safety.
                    balance.balance_qty = 0
                balance.save()

            return stock_out

    except Exception as e:
        raise e
