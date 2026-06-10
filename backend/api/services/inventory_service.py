from django.db import transaction
from django.core.exceptions import ValidationError
from ..models import Product, InventoryBalance, ProductSize, ProductOperation, Operation

def create_product_with_operations_and_stock(product_data, operations_data, sizes_data=None):
    """
    Creates a product and assigns operations.
    """
    with transaction.atomic():
        # 1. Create the Product
        product = Product.objects.create(**product_data)
        
        # 2. Link Operations
        if operations_data:
            seen_ops = set()
            for op_data in operations_data:
                op_id = op_data['operation_id']
                if op_id and op_id not in seen_ops:
                    seen_ops.add(op_id)
                    ProductOperation.objects.create(
                        product=product,
                        operation_id=op_id,
                        piece_rate=op_data['piece_rate']
                    )
        # 3. Create Master Stock Configuration
        if sizes_data:
            from ..models import MasterStock
            for size_data in sizes_data:
                MasterStock.objects.create(
                    product=product,
                    size_id=size_data['size_id'],
                    total_quantity=size_data.get('total_quantity', 0)
                )

        return product, None
