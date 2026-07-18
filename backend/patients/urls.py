from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, VisitViewSet, ReferringDoctorViewSet

router = DefaultRouter()
router.register(r'patients', PatientViewSet)
router.register(r'visits', VisitViewSet)
router.register(r'referring-doctors', ReferringDoctorViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
