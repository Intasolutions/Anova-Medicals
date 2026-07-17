from rest_framework import serializers
from .models import (
    CasualtyLog, CasualtyServiceDefinition, 
    CasualtyService, CasualtyMedicine, CasualtyObservation
)

class CasualtyLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CasualtyLog
        fields = '__all__'
        extra_kwargs = {
            'treatment_notes': {'required': False, 'allow_blank': True},
            'transfer_path': {'required': False, 'allow_blank': True},
        }

class CasualtyServiceDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CasualtyServiceDefinition
        fields = '__all__'

class CasualtyServiceSerializer(serializers.ModelSerializer):
    name = serializers.ReadOnlyField(source='service_definition.name')
    total_charge = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    patient_name = serializers.ReadOnlyField(source='visit.patient.full_name')
    patient_age = serializers.ReadOnlyField(source='visit.patient.age')
    patient_gender = serializers.ReadOnlyField(source='visit.patient.gender')
    patient_reg_no = serializers.ReadOnlyField(source='visit.patient.registration_number')

    class Meta:
        model = CasualtyService
        fields = '__all__'

class CasualtyMedicineSerializer(serializers.ModelSerializer):
    name = serializers.ReadOnlyField(source='med_stock.name')
    batch = serializers.ReadOnlyField(source='med_stock.batch_no')
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CasualtyMedicine
        fields = '__all__'

class CasualtyObservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CasualtyObservation
        fields = '__all__'
