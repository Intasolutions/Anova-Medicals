from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from billing.models import Invoice
from patients.models import Patient, Visit


class BillingQueueTests(APITestCase):
    """The "Action Required" queue on the Billing screen is built from these two endpoints."""

    INVOICES_URL = '/api/billing/invoices/?unpaid=true&page_size=10000'
    VISITS_URL = '/api/reception/visits/?billing_queue=true&page_size=10000'

    def setUp(self):
        user = get_user_model().objects.create_user(
            username='frontdesk', password='x', role='RECEPTION'
        )
        self.client.force_authenticate(user)

    def _patient(self):
        # A patient can only have one open visit, so each visit gets its own.
        return Patient.objects.create(
            full_name='Test Patient', age=30, gender='M', phone='9000000000', address='Somewhere'
        )

    def _invoice(self, status, visit=None):
        return Invoice.objects.create(
            visit=visit,
            patient_name='Test Patient',
            total_amount=Decimal('100.00'),
            payment_status=status,
        )

    def _parked_visit(self):
        return Visit.objects.create(patient=self._patient(), assigned_role='BILLING', status='OPEN')

    def _ids(self, url):
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        return {row['id'] for row in response.data['results']}

    def test_unpaid_returns_every_open_invoice_past_the_default_page_size(self):
        open_ids = {self._invoice('DRAFT').id for _ in range(25)}
        self.assertEqual(self._ids(self.INVOICES_URL), open_ids)

    def test_unpaid_includes_open_statuses_only(self):
        expected = {self._invoice(s).id for s in ('DRAFT', 'PENDING', 'PARTIAL')}
        self._invoice('PAID')
        self._invoice('CANCELLED')
        self.assertEqual(self._ids(self.INVOICES_URL), expected)

    def test_parked_visit_with_open_invoice_is_left_to_the_invoice_list(self):
        for status in ('DRAFT', 'PENDING', 'PARTIAL'):
            self._invoice(status, visit=self._parked_visit())
        self.assertEqual(self._ids(self.VISITS_URL), set())

    def test_parked_visit_without_an_open_invoice_stays_in_the_queue(self):
        no_invoice = self._parked_visit()
        prepaid = self._parked_visit()
        self._invoice('PAID', visit=prepaid)
        cancelled = self._parked_visit()
        self._invoice('CANCELLED', visit=cancelled)
        # Settling an invoice closes its visit; these patients were then sent
        # back to the billing desk.
        Visit.objects.filter(id__in=[prepaid.id, cancelled.id]).update(status='OPEN')
        self.assertEqual(self._ids(self.VISITS_URL), {no_invoice.id, prepaid.id, cancelled.id})

    def test_parked_visit_past_the_default_page_size_is_returned(self):
        expected = {self._parked_visit().id for _ in range(15)}
        self.assertEqual(self._ids(self.VISITS_URL), expected)

    def test_visit_not_at_billing_is_excluded(self):
        Visit.objects.create(patient=self._patient(), assigned_role='DOCTOR', status='OPEN')
        Visit.objects.create(patient=self._patient(), assigned_role='BILLING', status='CLOSED')
        self.assertEqual(self._ids(self.VISITS_URL), set())

    def _stock(self, batch_no, qty, mrp):
        from datetime import date
        from pharmacy.models import PharmacyStock
        return PharmacyStock.objects.create(
            name='CIPZEN FORTE', batch_no=batch_no, expiry_date=date(2028, 1, 1), qty_available=qty,
            mrp=Decimal(mrp), selling_price=Decimal(mrp), tablets_per_strip=10,
        )

    def _bill(self, items):
        response = self.client.post('/api/billing/invoices/', {
            'patient_name': 'Test Patient', 'payment_status': 'PENDING',
            'total_amount': '0.00', 'discount_amount': '0.00', 'items': items,
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return Invoice.objects.get(id=response.data['id'])

    def test_combining_rows_does_not_take_stock_twice(self):
        # One medicine sold from two batches: the sale already took both from stock.
        a = self._stock('A', 10, '73.41')
        b = self._stock('B', 10, '110.85')
        row = dict(dept='PHARMACY', description='CIPZEN FORTE', stock_deducted=True)
        invoice = self._bill([
            {**row, 'qty': 5, 'unit_price': '7.34', 'amount': '36.70', 'batch': 'A', 'deducted_qty': 5},
            {**row, 'qty': 5, 'unit_price': '11.08', 'amount': '55.40', 'batch': 'B', 'deducted_qty': 5},
        ])
        [line] = invoice.items.all()
        self.assertEqual((line.qty, line.amount, line.deducted_qty, line.batch), (10, Decimal('92.10'), 10, 'A, B'))
        a.refresh_from_db()
        b.refresh_from_db()
        self.assertEqual((a.qty_available, b.qty_available), (10, 10))

    def test_combining_manual_row_with_sold_row_takes_only_the_manual_part(self):
        a = self._stock('A', 10, '73.41')
        invoice = self._bill([
            {'dept': 'PHARMACY', 'description': 'CIPZEN FORTE', 'qty': 2, 'unit_price': '7.34', 'amount': '14.68',
             'batch': 'A', 'stock_deducted': False, 'deducted_qty': 0},
            {'dept': 'PHARMACY', 'description': 'CIPZEN FORTE', 'qty': 5, 'unit_price': '7.34', 'amount': '36.70',
             'batch': 'A', 'stock_deducted': True, 'deducted_qty': 5},
        ])
        [line] = invoice.items.all()
        self.assertEqual((line.qty, line.deducted_qty), (7, 7))
        a.refresh_from_db()
        self.assertEqual(a.qty_available, 8)  # only the 2 added at the billing desk

    def test_unpaid_query_count_does_not_grow_with_invoices(self):
        visit = self._parked_visit()
        self._invoice('DRAFT', visit=visit)
        with self.assertNumQueries(4):  # count, invoices + joins, items, payments
            self.client.get(self.INVOICES_URL)
        for _ in range(5):
            self._invoice('DRAFT', visit=self._parked_visit())
        with self.assertNumQueries(4):
            self.client.get(self.INVOICES_URL)
