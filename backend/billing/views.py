from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction, models
from django.db.models import Sum, F
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from patients.models import Visit
from patients.serializers import VisitSerializer
from .models import Invoice, PaymentTransaction
from .serializers import InvoiceSerializer, PaymentTransactionSerializer
from pharmacy.models import PharmacyStock

class IsAdminOrReception(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (request.user.role in ['ADMIN', 'RECEPTION', 'PHARMACY'] or request.user.is_superuser)

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().order_by('-created_at')
    serializer_class = InvoiceSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = {
        'visit__patient': ['exact'],
        'payment_status': ['exact'],
        'visit': ['exact'],
        'created_at': ['date', 'gte', 'lte', 'exact']
    }
    search_fields = ['id', 'invoice_number', 'visit__patient__full_name', 'visit__patient__phone', 'visit__patient__registration_number', 'patient_name']

    def get_queryset(self):
        queryset = Invoice.objects.all().order_by('-created_at')
        
        date_str = self.request.query_params.get('date')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        
        if self.request.query_params.get('unpaid') == 'true':
            queryset = queryset.exclude(payment_status='PAID')
            
        if date_str:
            try:
                queryset = queryset.filter(created_at__date=date_str)
            except ValueError:
                pass
        elif month and year:
            try:
                queryset = queryset.filter(created_at__month=month, created_at__year=year)
            except ValueError:
                pass
        
        # Handle frontend date range logic
        start_date = self.request.query_params.get('created_at__date__gte')
        end_date = self.request.query_params.get('created_at__date__lte')
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
                    
        # Explicitly handle visit__patient since nested filterset_fields might fail silently without a custom FilterSet
        visit_patient = self.request.query_params.get('visit__patient')
        if visit_patient:
            queryset = queryset.filter(visit__patient_id=visit_patient)
            
        queryset = queryset.select_related('visit', 'visit__patient', 'visit__doctor')
        queryset = queryset.prefetch_related('items')
                
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save()
        # Stock deduction and visit closing are now handled by signals in signals.py

    @transaction.atomic
    def perform_update(self, serializer):
        serializer.save()
        # Stock deduction and visit closing are now handled by signals in signals.py

    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        from decimal import Decimal
        invoice = self.get_object()
        
        # Support both new list-based payload and old single-entry payload
        payments_list = request.data.get('payments', [])
        
        # If no list provided, try old format
        if not payments_list:
            amount = request.data.get('amount')
            mode = request.data.get('mode')
            if amount and mode:
                payments_list = [{'amount': amount, 'mode': mode}]
        
        if not payments_list:
            return Response({'error': 'No payment details provided'}, status=400)
            
        remarks = request.data.get('remarks', '')

        from django.db import transaction
        
        # Calculate proposed total
        proposed_total = sum(float(p.get('amount') or 0) for p in payments_list if float(p.get('amount') or 0) > 0)
        current_paid = sum(p.amount for p in invoice.payments.all())
        from decimal import Decimal

        discount = getattr(invoice, 'discount_amount', None) or Decimal('0')
        refund = getattr(invoice, 'refund_amount', None) or Decimal('0')
        balance_due = invoice.total_amount - discount - refund - current_paid

        if proposed_total <= 0:
            if balance_due <= Decimal('0'):
                # Nothing left to collect -- e.g. a discount that covers the whole
                # bill. Mark it paid AND close the visit, exactly as a real payment
                # would; otherwise the patient owes nothing but sits in the pending
                # queue forever.
                with transaction.atomic():
                    if invoice.payment_status != 'PAID':
                        invoice.payment_status = 'PAID'
                        invoice.save(update_fields=['payment_status'])
                    else:
                        # Ensure signal fires to check visit closing
                        invoice.save(update_fields=['payment_status'])
                return Response({'status': 'success', 'message': 'Invoice marked as paid'})
            return Response({'error': 'Payment amount must be greater than zero.'}, status=400)

        if (current_paid + Decimal(str(proposed_total))) > balance_due + current_paid + Decimal('0.5'):
            return Response({'error': 'Total payment exceeds invoice balance due.'}, status=400)
        
        # Recording the payments AND updating the invoice/visit off the back of them
        # must all happen in one transaction -- otherwise the money can be recorded
        # successfully while the visit-close step fails independently afterward,
        # leaving a fully-paid invoice attached to a visit that never closes.
        with transaction.atomic():
            for payment in payments_list:
                amount_val = payment.get('amount')
                mode_val = payment.get('mode')

                if not amount_val:
                    continue

                try:
                    amount_float = float(amount_val)
                    if amount_float <= 0:
                        continue
                except ValueError:
                    continue

                # Create Transaction
                PaymentTransaction.objects.create(
                    invoice=invoice,
                    amount=amount_float,
                    mode=mode_val,
                    remarks=remarks
                )

            # Recalculate Totals
            total_paid = sum(p.amount for p in invoice.payments.all())

            # Update Invoice Status
            # Allow small buffer for float errors (converted to Decimal)
            discount = getattr(invoice, 'discount_amount', None) or Decimal('0')
            refund = getattr(invoice, 'refund_amount', None) or Decimal('0')
            if total_paid >= invoice.total_amount - discount - refund - Decimal('0.5'):
                invoice.payment_status = 'PAID'
            elif total_paid > 0:
                invoice.payment_status = 'PARTIAL'
            else:
                invoice.payment_status = 'PENDING'

            invoice.save()
            # Visit closing is handled by post_save signal on Invoice
        
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        today = timezone.now().date()
        date_str = request.query_params.get('date')
        
        monthly_payments = PaymentTransaction.objects.exclude(invoice__payment_status='CANCELLED')
        # Include PARTIAL invoices too -- they still have money outstanding,
        # same as a PENDING invoice, just with some payment already recorded.
        pending_query = Invoice.objects.filter(payment_status__in=['PENDING', 'PARTIAL'])
        
        if date_str:
            try:
                monthly_payments = monthly_payments.filter(created_at__date=date_str)
                pending_query = pending_query.filter(created_at__date=date_str)
            except ValueError:
                pass
        else:
            # Get query params for month/year, default to current
            try:
                current_month = int(request.query_params.get('month', timezone.now().month))
                current_year = int(request.query_params.get('year', timezone.now().year))
            except ValueError:
                current_month = timezone.now().month
                current_year = timezone.now().year
                
            monthly_payments = monthly_payments.filter(created_at__month=current_month, created_at__year=current_year)
            pending_query = pending_query.filter(created_at__month=current_month, created_at__year=current_year)

        # 1. Total Collection
        total_monthly_collection = monthly_payments.aggregate(Sum('amount'))['amount__sum'] or 0
        
        # 2. Breakdown
        cash_monthly = monthly_payments.filter(mode__iexact='CASH').aggregate(Sum('amount'))['amount__sum'] or 0
        upi_monthly = monthly_payments.filter(mode__in=['UPI', 'Google Pay', 'Googlepe', 'Gpay', 'PhonePe', 'Amazon Pay', 'Paytm', 'Google Pay / UPI']).aggregate(Sum('amount'))['amount__sum'] or 0
        card_monthly = monthly_payments.filter(mode__iexact='CARD').aggregate(Sum('amount'))['amount__sum'] or 0
        
        # Collection Today (Actual payments received today)
        collection_today = PaymentTransaction.objects.filter(created_at__date=today).exclude(invoice__payment_status='CANCELLED').aggregate(Sum('amount'))['amount__sum'] or 0

        # total_pending needs to be calculated in python because balance_due is not a DB field.
        total_pending = 0
        for inv in pending_query.prefetch_related('payments'):
            paid = sum(p.amount for p in inv.payments.all())
            discount = inv.discount_amount or 0
            refund = inv.refund_amount or 0
            total_pending += max(0, inv.total_amount - discount - refund - paid)
        
        count = Invoice.objects.filter(created_at__date=today).exclude(payment_status='CANCELLED').count()

        return Response({
            'revenue_today': collection_today,
            'pending_amount': total_pending,
            'invoices_today': count,
            'monthly_total': total_monthly_collection,
            'monthly_breakdown': {
                'CASH': cash_monthly,
                'UPI': upi_monthly,
                'CARD': card_monthly
            }
        })

    @action(detail=False, methods=['get'])
    def pending_visits(self, request):
        from django.db.models import Q
        # Pending Billing: Visits that have unbilled pharmacy sales OR casualty items
        # And no invoice yet
        visits = Visit.objects.filter(
            invoices__isnull=True  # No invoice yet
        ).filter(
            Q(pharmacy_sales__isnull=False) |
            Q(casualty_medicines__isnull=False) |
            Q(casualty_services__isnull=False)
        ).distinct().order_by('-updated_at')
        serializer = VisitSerializer(visits, many=True)
        return Response(serializer.data)
