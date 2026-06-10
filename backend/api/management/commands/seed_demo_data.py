import uuid
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from api.models import (
    ProductSize, Designation, Product, Operation, 
    ProductOperation, Employee, InventoryBalance, 
    ProductionLog, StockOut, MasterStock
)
from api.services.production_service import create_production_log
from api.services.inventory_out_service import record_stock_out

class Command(BaseCommand):
    help = 'Clears the database tables and seeds it with clean, realistic garment manufacturing demo data.'

    def handle(self, *args, **options):
        self.stdout.write("Starting database reset...")

        try:
            with transaction.atomic():
                # 1. Clear existing business data (in dependency order)
                ProductionLog.objects.all().delete()
                StockOut.objects.all().delete()
                InventoryBalance.objects.all().delete()
                MasterStock.objects.all().delete()
                ProductOperation.objects.all().delete()
                Employee.objects.all().delete()
                Product.objects.all().delete()
                Operation.objects.all().delete()
                Designation.objects.all().delete()
                ProductSize.objects.all().delete()
                
                self.stdout.write(self.style.SUCCESS("Existing business tables purged successfully."))

                # 2. Seed Product Sizes
                sizes = []
                size_names = ['S', 'M', 'L', 'XL', 'XXL']
                for idx, name in enumerate(size_names):
                    sizes.append(ProductSize.objects.create(size_name=name, display_order=idx+1))
                sizes_map = {s.size_name: s for s in sizes}
                self.stdout.write(f"Seeded {len(sizes)} product sizes.")

                # 3. Seed Designations
                designation_names = ['Cutter', 'Stitcher', 'Finisher', 'Quality Inspector']
                designations = {}
                for name in designation_names:
                    designations[name] = Designation.objects.create(name=name)
                self.stdout.write(f"Seeded {len(designations)} designations.")

                # 4. Seed Operations (codes automatically generated as OP-001, OP-002, OP-003)
                op_cutting = Operation.objects.create(operation_name="Fabric Cutting")
                op_stitching = Operation.objects.create(operation_name="Garment Stitching")
                op_finishing = Operation.objects.create(operation_name="Ironing & Packing")
                self.stdout.write("Seeded operations: OP-001 (Cutting), OP-002 (Stitching), OP-003 (Finishing).")

                # 5. Seed Products
                p_tshirt = Product.objects.create(
                    product_code="PROD-001",
                    model_number="TS-100",
                    name="Premium Crewneck T-Shirt",
                    price_per_unit=15.00
                )
                p_jeans = Product.objects.create(
                    product_code="PROD-002",
                    model_number="DN-200",
                    name="Classic Slim Denim Jeans",
                    price_per_unit=35.00
                )
                p_polo = Product.objects.create(
                    product_code="PROD-003",
                    model_number="PL-300",
                    name="Polo Sport Shirt",
                    price_per_unit=22.50
                )
                self.stdout.write("Seeded 3 products (Premium T-Shirt, Classic Denim Jeans, Polo Sport Shirt).")

                # 6. Seed Product Operations (Assign Piece Rates)
                # T-Shirt piece rates
                ProductOperation.objects.create(product=p_tshirt, operation=op_cutting, piece_rate=1.50)
                ProductOperation.objects.create(product=p_tshirt, operation=op_stitching, piece_rate=3.50)
                ProductOperation.objects.create(product=p_tshirt, operation=op_finishing, piece_rate=1.00)

                # Denim Jeans piece rates
                ProductOperation.objects.create(product=p_jeans, operation=op_cutting, piece_rate=2.50)
                ProductOperation.objects.create(product=p_jeans, operation=op_stitching, piece_rate=7.00)
                ProductOperation.objects.create(product=p_jeans, operation=op_finishing, piece_rate=2.00)

                # Polo Shirt piece rates
                ProductOperation.objects.create(product=p_polo, operation=op_cutting, piece_rate=2.00)
                ProductOperation.objects.create(product=p_polo, operation=op_stitching, piece_rate=4.50)
                ProductOperation.objects.create(product=p_polo, operation=op_finishing, piece_rate=1.50)
                self.stdout.write("Seeded product piece-rate operations.")

                # 7. Seed Employees
                emp_stitcher1 = Employee.objects.create(
                    employee_code="EMP-001",
                    name="Arun Kumar",
                    designation=designations['Stitcher'],
                    address="123, Main Road, Tiruppur",
                    contact_number="9876543210",
                    date_of_birth=date(1995, 5, 12),
                    date_of_joining=date(2026, 1, 10)
                )
                emp_cutter = Employee.objects.create(
                    employee_code="EMP-002",
                    name="Manoj Singh",
                    designation=designations['Cutter'],
                    address="45, Gandhi Street, Tiruppur",
                    contact_number="9876543211",
                    date_of_birth=date(1990, 8, 22),
                    date_of_joining=date(2026, 2, 15)
                )
                emp_finisher = Employee.objects.create(
                    employee_code="EMP-003",
                    name="Priya Sharma",
                    designation=designations['Finisher'],
                    address="78, Nehru Nagar, Tiruppur",
                    contact_number="9876543212",
                    date_of_birth=date(1998, 11, 3),
                    date_of_joining=date(2026, 3, 1)
                )
                emp_stitcher2 = Employee.objects.create(
                    employee_code="EMP-004",
                    name="Deepak Patel",
                    designation=designations['Stitcher'],
                    address="12, Patel Chowk, Ahmedabad",
                    contact_number="9876543213",
                    date_of_birth=date(1993, 2, 28),
                    date_of_joining=date(2026, 1, 20)
                )
                Employee.objects.create(
                    employee_code="EMP-005",
                    name="Sunita Rao",
                    designation=designations['Quality Inspector'],
                    address="56, Subhash Colony, Tiruppur",
                    contact_number="9876543214",
                    date_of_birth=date(1996, 7, 15),
                    date_of_joining=date(2026, 4, 10)
                )
                self.stdout.write("Seeded 5 employee profiles.")

                # 8. Seed Master Stocks (Initial targets per product size)
                master_stock_data = [
                    # T-Shirt
                    (p_tshirt, 'S', 500),
                    (p_tshirt, 'M', 800),
                    (p_tshirt, 'L', 800),
                    (p_tshirt, 'XL', 500),
                    # Jeans
                    (p_jeans, 'S', 300),
                    (p_jeans, 'M', 500),
                    (p_jeans, 'L', 500),
                    (p_jeans, 'XL', 300),
                    # Polo
                    (p_polo, 'S', 400),
                    (p_polo, 'M', 600),
                    (p_polo, 'L', 600),
                    (p_polo, 'XL', 400),
                ]
                for prod, sz_name, total_qty in master_stock_data:
                    MasterStock.objects.create(
                        product=prod,
                        size=sizes_map[sz_name],
                        total_quantity=total_qty
                    )
                self.stdout.write("Seeded master stock configurations.")

                # 9. Seed Production Logs (Simulated historical logs over the past 7 days)
                # We use the service create_production_log to automatically invoke 
                # validation logic, calculate earnings, and update Inventory Balances/Bottlenecks correctly.
                
                today = timezone.now().date()
                days = [today - timedelta(days=i) for i in range(6, -1, -1)]

                # Log entries definition: (day_index, employee, product, operation, size_name, qty)
                log_definitions = [
                    # Day 0 (today - 6 days): Manoj cuts initial fabrics
                    (0, emp_cutter, p_tshirt, op_cutting, 'M', 100),
                    (0, emp_cutter, p_jeans, op_cutting, 'L', 80),
                    (0, emp_cutter, p_polo, op_cutting, 'M', 90),

                    # Day 1 (today - 5 days): Manoj cuts more, Arun & Deepak start stitching
                    (1, emp_cutter, p_tshirt, op_cutting, 'L', 120),
                    (1, emp_cutter, p_jeans, op_cutting, 'M', 70),
                    (1, emp_cutter, p_polo, op_cutting, 'L', 80),
                    (1, emp_stitcher1, p_tshirt, op_stitching, 'M', 60),
                    (1, emp_stitcher1, p_polo, op_stitching, 'M', 40),
                    (1, emp_stitcher2, p_jeans, op_stitching, 'L', 50),

                    # Day 2 (today - 4 days): Cutting, Stitching, and Priya starts Finishing
                    (2, emp_cutter, p_tshirt, op_cutting, 'S', 80),
                    (2, emp_cutter, p_jeans, op_cutting, 'S', 60),
                    (2, emp_cutter, p_polo, op_cutting, 'S', 70),
                    (2, emp_stitcher1, p_tshirt, op_stitching, 'L', 50),
                    (2, emp_stitcher1, p_polo, op_stitching, 'L', 50),
                    (2, emp_stitcher2, p_jeans, op_stitching, 'M', 40),
                    (2, emp_finisher, p_tshirt, op_finishing, 'M', 30),
                    (2, emp_finisher, p_polo, op_finishing, 'M', 20),

                    # Day 3 (today - 3 days): More stitching and finishing
                    (3, emp_stitcher1, p_tshirt, op_stitching, 'M', 40),
                    (3, emp_stitcher1, p_polo, op_stitching, 'M', 30),
                    (3, emp_stitcher2, p_jeans, op_stitching, 'L', 30),
                    (3, emp_finisher, p_tshirt, op_finishing, 'L', 40),
                    (3, emp_finisher, p_jeans, op_finishing, 'L', 30),
                    (3, emp_finisher, p_polo, op_finishing, 'L', 30),

                    # Day 4 (today - 2 days): Manoj cuts XLs, stitchers work on smalls, finisher works on Ms
                    (4, emp_cutter, p_tshirt, op_cutting, 'XL', 100),
                    (4, emp_cutter, p_jeans, op_cutting, 'XL', 80),
                    (4, emp_cutter, p_polo, op_cutting, 'XL', 90),
                    (4, emp_stitcher1, p_tshirt, op_stitching, 'S', 60),
                    (4, emp_stitcher1, p_polo, op_stitching, 'S', 40),
                    (4, emp_stitcher2, p_jeans, op_stitching, 'S', 40),
                    (4, emp_finisher, p_tshirt, op_finishing, 'M', 30),
                    (4, emp_finisher, p_polo, op_finishing, 'M', 20),

                    # Day 5 (today - 1 day): Stitchers work on XLs, finisher works on S
                    (5, emp_stitcher1, p_tshirt, op_stitching, 'XL', 80),
                    (5, emp_stitcher1, p_polo, op_stitching, 'XL', 60),
                    (5, emp_stitcher2, p_jeans, op_stitching, 'XL', 50),
                    (5, emp_finisher, p_tshirt, op_finishing, 'S', 50),
                    (5, emp_finisher, p_jeans, op_finishing, 'S', 30),
                    (5, emp_finisher, p_polo, op_finishing, 'S', 30),

                    # Day 6 (today): Finishers work on XLs
                    (6, emp_finisher, p_tshirt, op_finishing, 'XL', 60),
                    (6, emp_finisher, p_jeans, op_finishing, 'XL', 40),
                    (6, emp_finisher, p_polo, op_finishing, 'XL', 40),
                ]

                logged_count = 0
                for day_idx, emp, prod, op, sz_name, qty in log_definitions:
                    work_date = days[day_idx]
                    size_obj = sizes_map[sz_name]
                    # We invoke create_production_log to execute service validation and trigger
                    # correct inventory and finished goods increments.
                    create_production_log(
                        employee_id=emp.id,
                        product_id=prod.id,
                        operation_id=op.id,
                        size_id=size_obj.id,
                        quantity=qty,
                        work_date=work_date
                    )
                    logged_count += 1
                
                self.stdout.write(f"Created {logged_count} simulated production logs and updated inventory states.")

                # 10. Seed Stock Outs (Dispatches)
                # We use the record_stock_out service to safely record and decrement inventory
                stock_outs = [
                    (p_tshirt, 'M', 20, "Global Apparel Distributors", "Initial batch shipment"),
                    (p_jeans, 'L', 15, "Retail Hub Inc", "Store order dispatch"),
                    (p_polo, 'M', 10, "Fashion Plaza", "Sample delivery")
                ]

                stock_out_count = 0
                for prod, sz_name, qty, recipient, remarks in stock_outs:
                    size_obj = sizes_map[sz_name]
                    record_stock_out(
                        product_id=prod.id,
                        size_id=size_obj.id,
                        quantity=qty,
                        recipient=recipient,
                        remarks=remarks
                    )
                    stock_out_count += 1

                self.stdout.write(f"Successfully recorded {stock_out_count} dispatches (stock outs).")
                self.stdout.write(self.style.SUCCESS("Database reset and seeding completed successfully!"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error during seeding: {e}"))
            raise e
