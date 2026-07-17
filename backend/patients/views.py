from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Exists, OuterRef
from revive_cms.utils import export_to_csv

from .models import Patient, Visit
from .serializers import PatientSerializer, VisitSerializer


from core.permissions import IsHospitalStaff

from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 10000

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all().order_by('-created_at')
    serializer_class = PatientSerializer
    permission_classes = [IsHospitalStaff]
    pagination_class = StandardResultsSetPagination

    filter_backends = [filters.SearchFilter]
    search_fields = ['full_name', 'phone', 'registration_number']

    def get_queryset(self):
        active_statuses = ['OPEN', 'IN_PROGRESS', 'WAITING']
        
        active_visits_subquery = Visit.objects.filter(
            patient=OuterRef('pk'),
            status__in=active_statuses
        )
        
        qs = Patient.objects.annotate(
            has_active_visit=Exists(active_visits_subquery)
        ).order_by('has_active_visit', '-created_at')
        
        # Filter Logic: Exclude active patients if requested
        exclude_active = self.request.query_params.get('exclude_active')
        if exclude_active == 'true':
            qs = qs.filter(has_active_visit=False)
            
        # Filter Logic: Only include active patients
        only_active = self.request.query_params.get('only_active')
        if only_active == 'true':
            qs = qs.filter(has_active_visit=True)
            
        return qs

    @action(detail=False, methods=['get'], url_path='export')
    def export_csv(self, request):
        return export_to_csv(
            self.get_queryset(), 
            "patients", 
            ['id', 'full_name', 'age', 'gender', 'phone', 'created_at']
        )

    @action(detail=False, methods=['post'], url_path='register')
    def register(self, request):
        """
        Flow:
        - Search by phone
        - If exists -> return existing patient
        - Else -> create new patient
        """
        phone = (request.data.get("phone") or "").strip()
        if not phone:
            return Response({"phone": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST)

        # existing = Patient.objects.filter(phone=phone).first()
        # if existing:
        #     return Response(PatientSerializer(existing).data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        patient = serializer.save()
        return Response(PatientSerializer(patient).data, status=status.HTTP_201_CREATED)


from rest_framework.decorators import action
from rest_framework.response import Response

class VisitViewSet(viewsets.ModelViewSet):
    queryset = Visit.objects.all().order_by('-created_at')
    serializer_class = VisitSerializer
    permission_classes = [IsHospitalStaff]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'status': ['exact', 'in'],
        'patient': ['exact'], 
        'doctor': ['exact'],
        'assigned_role': ['exact', 'in']
    }
    search_fields = ['patient__full_name', 'patient__phone', 'patient__registration_number']
    ordering_fields = ['created_at', 'updated_at']

    def get_queryset(self):
        qs = super().get_queryset()
        
        # Support for Lab Queue (Patients assigned to lab OR patients in any queue with pending lab charges)
        lab_queue = self.request.query_params.get('lab_queue')
        if lab_queue == 'true':
            from django.db.models import Q
            qs = qs.filter(
                Q(assigned_role='LAB', status='OPEN') | 
                Q(lab_charges__status='PENDING')
            ).distinct()
            
        return qs

    @action(detail=False, methods=['get'])
    def casualty_history(self, request):
        """
        Returns all visits that have passed through Casualty 
        (i.e., have at least one CasualtyLog entry).
        """
        from casualty.models import CasualtyLog
        # Get distinct visits that have logs
        # We can also filter by assigned_role='CASUALTY' but that only gets CURRENT ones.
        # We want PAST history.
        # Efficient query: Visits where id is in the set of log visits.
        
        # Method 1 using distinct (might be slow on huge DBs but fine here)
        # visits = Visit.objects.filter(casualty_logs__isnull=False).distinct().order_by('-created_at')
        
        # Method 2: Reverse query
        from django.db.models import Q
        # Efficient query: Visits where id is in the set of log visits OR have casualty items.
        visits = Visit.objects.filter(
            Q(casualty_logs__isnull=False) |
            Q(casualty_medicines__isnull=False) |
            Q(casualty_services__isnull=False) |
            Q(casualty_observations__isnull=False)
        ).order_by('-created_at').distinct()
        
        page = self.paginate_queryset(visits)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(visits, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        visit = serializer.save()
        match_role = None
        
        # If lab_tests are passed, create LabCharge entries
        lab_tests = self.request.data.get('lab_tests', [])
        if lab_tests and isinstance(lab_tests, list):
            from lab.models import LabCharge, LabTest
            for test_id in lab_tests:
                try:
                    test_obj = LabTest.objects.get(id=test_id)
                    LabCharge.objects.create(
                        visit=visit,
                        test_name=test_obj.name,
                        sub_name=test_obj.sub_name,
                        amount=test_obj.price,
                        status='PENDING'
                    )
                except Exception as e:
                    print(f"Error assigning lab test {test_id} to visit {visit.id}: {e}")

            # Route to Billing first for pre-payment of lab tests
            visit.assigned_role = 'BILLING'
            visit.save()

        # If casualty_services are passed, create CasualtyService entries
        casualty_services = self.request.data.get('casualty_services', [])
        if casualty_services and isinstance(casualty_services, list):
            from casualty.models import CasualtyService, CasualtyServiceDefinition
            for srv_id in casualty_services:
                try:
                    srv_obj = CasualtyServiceDefinition.objects.get(id=srv_id)
                    CasualtyService.objects.create(
                        visit=visit,
                        service_definition=srv_obj,
                        qty=1,
                        unit_charge=srv_obj.base_charge,
                        total_charge=srv_obj.base_charge
                    )
                except Exception as e:
                    print(f"Error assigning casualty service {srv_id} to visit {visit.id}: {e}")

            # Route directly to BILLING instead of Casualty queue (User requested removal of Casualty queue phase)
            visit.assigned_role = 'BILLING'
            visit.save()

        # Determine who to notify
        if visit.assigned_role and visit.assigned_role != 'DOCTOR':
            match_role = visit.assigned_role
        elif visit.doctor:
            # Single doctor notification (legacy/specific)
            from core.models import Notification
            Notification.objects.create(
                recipient=visit.doctor,
                message=f"New patient assigned: {visit.patient.full_name}",
                type='VISIT_ASSIGNED',
                related_id=visit.id
            )
            return

        if match_role:
            from core.models import Notification
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            # Broadcast to all active users in that role
            recipients = User.objects.filter(role=match_role, is_active=True)
            notifications = [
                Notification(
                    recipient=u,
                    message=f"New Patient in Queue: {visit.patient.full_name}",
                    type='VISIT_ASSIGNED',
                    related_id=visit.id
                ) for u in recipients
            ]
            Notification.objects.bulk_create(notifications)

    def perform_update(self, serializer):
        old_doctor = serializer.instance.doctor
        old_role = serializer.instance.assigned_role
        
        # DEBUG LOGGING
        print(f"\n=== VISIT UPDATE DEBUG ===")
        print(f"Visit ID: {serializer.instance.id}")
        print(f"Request data: {self.request.data}")
        print(f"Old doctor: {old_doctor}")
        print(f"Validated data doctor: {serializer.validated_data.get('doctor')}")
        
        visit = serializer.save()
        
        print(f"After save - visit.doctor: {visit.doctor}")
        print(f"=========================\n")

        # --- Sync Lab Tests on Update ---
        lab_tests = self.request.data.get('lab_tests')
        if lab_tests is not None and isinstance(lab_tests, list):
            from lab.models import LabCharge, LabTest
            # Find existing tests for this visit
            existing_charges = LabCharge.objects.filter(visit=visit).values_list('test_name', flat=True)
            
            for test_id in lab_tests:
                try:
                    test_obj = LabTest.objects.get(id=test_id)
                    # Create only if it doesn't exist
                    if test_obj.name not in existing_charges:
                        LabCharge.objects.create(
                            visit=visit,
                            test_name=test_obj.name,
                            sub_name=test_obj.sub_name,
                            amount=test_obj.price,
                            status='PENDING'
                        )
                except Exception as e:
                    print(f"Error assigning lab test {test_id} to visit {visit.id}: {e}")

        # --- Sync Casualty Services on Update ---
        casualty_services = self.request.data.get('casualty_services')
        if casualty_services is not None and isinstance(casualty_services, list):
            from casualty.models import CasualtyService, CasualtyServiceDefinition
            # Find existing services for this visit
            existing_services = CasualtyService.objects.filter(visit=visit).values_list('service_definition_id', flat=True)
            
            for srv_id in casualty_services:
                try:
                    # Create only if it doesn't exist
                    if srv_id not in existing_services:
                        srv_obj = CasualtyServiceDefinition.objects.get(id=srv_id)
                        CasualtyService.objects.create(
                            visit=visit,
                            service_definition=srv_obj,
                            qty=1,
                            unit_charge=srv_obj.base_charge,
                            total_charge=srv_obj.base_charge
                        )
                except Exception as e:
                    print(f"Error assigning casualty service {srv_id} to visit {visit.id}: {e}")
                    
        # Check for Doctor change
        if visit.doctor and visit.doctor != old_doctor:
            from core.models import Notification
            Notification.objects.create(
                recipient=visit.doctor,
                message=f"Transferred patient: {visit.patient.full_name}",
                type='VISIT_ASSIGNED',
                related_id=visit.id
            )
            
        # Check for Role change (Referral)
        if visit.assigned_role and visit.assigned_role != old_role and visit.assigned_role != 'DOCTOR':
            from core.models import Notification
            from django.contrib.auth import get_user_model
            User = get_user_model()
            
            recipients = User.objects.filter(role=visit.assigned_role, is_active=True)
            notifications = [
                Notification(
                    recipient=u,
                    message=f"New Referral: {visit.patient.full_name} (from {old_role or 'Reception'})",
                    type='VISIT_ASSIGNED',
                    related_id=visit.id
                ) for u in recipients
            ]
            Notification.objects.bulk_create(notifications)
