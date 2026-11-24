from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from billing.models import Invoice
from .models import PharmacyStock
from .serializers import price_per_tab


def _batch(name, batch_no, expiry, qty, mrp, tps=10):
    return PharmacyStock.objects.create(
        name=name, batch_no=batch_no, expiry_date=expiry, qty_available=qty,
        mrp=Decimal(mrp), selling_price=Decimal(mrp), tablets_per_strip=tps, gst_percent=Decimal('5'),
    )


class PricePerTabTests(APITestCase):
    def test_rounds_like_the_screens(self):
        # Same results as JavaScript (mrp / tps).toFixed(2), which the screens use.
        cases = [('110.85', 10, '11.08'), ('1.25', 10, '0.13'), ('73.41', 10, '7.34'),
                 ('124.88', 5, '24.98'), ('127.00', 5, '25.40'), ('0.21', 2, '0.10')]
        for mrp, tps, expected in cases:
            stock = PharmacyStock(mrp=Decimal(mrp), tablets_per_strip=tps)
            self.assertEqual(price_per_tab(stock), Decimal(expected), (mrp, tps))


class SalePricingTests(APITestCase):
    """The patient pays the MRP of the batch each tablet comes from."""

    def setUp(self):
        user = get_user_model().objects.create_user(username='pharma', password='x', role='PHARMACY')
        self.client.force_authenticate(user)
        # An empty old batch (different MRP), then two batches with stock.
        self.empty = _batch('CIPZEN FORTE', 'OLD-EMPTY', date(2027, 1, 1), 0, '50.00')
        self.old = _batch('CIPZEN FORTE', 'A', date(2028, 1, 1), 5, '73.41')
        self.new = _batch('CIPZEN FORTE', 'B', date(2028, 3, 1), 50, '110.85')

    def _sell(self, med_stock, qty, unit_price):
        return self.client.post('/api/pharmacy/sales/', {
            'visit': None, 'patient': None, 'walkin_name': 'Walk In', 'walkin_phone': '',
            'payment_status': 'PENDING',
            'items': [{'med_stock': med_stock.id, 'qty': qty, 'unit_price': unit_price, 'gst_percent': 0}],
        }, format='json')

    def test_split_sale_charges_each_batch_its_own_mrp(self):
        # The screen named the empty batch and sent its price; neither decides
        # the charge any more.
        response = self._sell(self.empty, 10, '5.00')
        self.assertEqual(response.status_code, 201, response.data)

        parts = sorted((i['batch_no'], i['qty'], Decimal(i['unit_price']), Decimal(i['amount']))
                       for i in response.data['items'])
        self.assertEqual(parts, [
            ('A', 5, Decimal('7.34'), Decimal('36.70')),
            ('B', 5, Decimal('11.08'), Decimal('55.40')),
        ])
        self.assertEqual(Decimal(response.data['total_amount']), Decimal('92.10'))

        self.old.refresh_from_db()
        self.new.refresh_from_db()
        self.assertEqual((self.old.qty_available, self.new.qty_available), (0, 45))

    def test_walk_in_bill_has_one_row_per_medicine(self):
        self._sell(self.old, 10, '7.34')
        invoice = Invoice.objects.get(patient_name__startswith='Walk In')
        rows = list(invoice.items.all())
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row.description, 'CIPZEN FORTE')
        self.assertEqual(row.qty, 10)
        self.assertEqual(row.amount, Decimal('92.10'))      # 5 x 7.34 + 5 x 11.08
        self.assertEqual(row.unit_price, Decimal('9.21'))   # that amount per tablet
        self.assertEqual(row.batch, 'A, B')
        self.assertEqual(row.deducted_qty, 10)              # stock already taken by the sale
        self.assertEqual(invoice.total_amount, Decimal('92.10'))

        # Saving the bill must not take stock again.
        self.old.refresh_from_db()
        self.new.refresh_from_db()
        self.assertEqual((self.old.qty_available, self.new.qty_available), (0, 45))

    def test_single_batch_sale_is_unchanged(self):
        response = self._sell(self.old, 3, '7.34')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual([(i['batch_no'], i['qty'], Decimal(i['unit_price'])) for i in response.data['items']],
                         [('A', 3, Decimal('7.34'))])
        self.assertEqual(Decimal(response.data['total_amount']), Decimal('22.02'))


class DoctorSearchPriceTests(APITestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username='doc', password='x', role='DOCTOR')
        self.client.force_authenticate(user)

    def test_price_comes_from_the_batch_the_patient_gets(self):
        _batch('BINAFIDE 0.5 2ML', 'RS5028', date(2027, 2, 1), 0, '124.88', tps=5)   # empty, older
        _batch('BINAFIDE 0.5 2ML', 'RS6007', date(2027, 12, 1), 15, '127.00', tps=5)  # given first
        _batch('BINAFIDE 0.5 2ML', 'RS9999', date(2029, 1, 1), 0, '130.00', tps=5)   # empty, newest
        response = self.client.get('/api/pharmacy/stock/doctor-search/?search=BINAFIDE')
        self.assertEqual(response.status_code, 200)
        [row] = response.data
        self.assertEqual(row['qty_available'], 15)
        self.assertEqual((Decimal(row['mrp']), row['tablets_per_strip']), (Decimal('127.00'), 5))
