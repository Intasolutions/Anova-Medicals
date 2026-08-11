from rest_framework import viewsets, permissions
from .models import DoctorNote
from .serializers import DoctorNoteSerializer


class IsDoctor(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and getattr(request.user, "role", None) in ["DOCTOR", "ADMIN", "PHARMACY", "RECEPTION"])


from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

class DoctorNoteViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorNoteSerializer
    permission_classes = [IsDoctor]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    # Added visit__patient__id to support explicit ID filtering
    filterset_fields = ['visit', 'visit__id', 'visit__patient', 'visit__patient__id', 'visit__doctor']
    search_fields = ['diagnosis', 'notes']
    ordering_fields = ['created_at']

    def get_queryset(self):
        return DoctorNote.objects.all().order_by('-created_at')
        
    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_page') == 'true':
            return None
        return super().paginate_queryset(queryset)
