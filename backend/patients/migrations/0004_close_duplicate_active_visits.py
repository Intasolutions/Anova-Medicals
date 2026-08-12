from django.db import migrations


def close_duplicate_active_visits(apps, schema_editor):
    """
    For each patient with more than one OPEN/IN_PROGRESS visit, keep only the
    most recently updated one active and mark the rest CLOSED.

    This is a one-time cleanup of visits created by the double-click /
    concurrent-submit bug in Reception, required before the DB can enforce
    "one active visit per patient" going forward. No rows are deleted.
    """
    Visit = apps.get_model('patients', 'Visit')

    patient_ids = (
        Visit.objects.filter(status__in=['OPEN', 'IN_PROGRESS'])
        .values_list('patient_id', flat=True)
        .distinct()
    )

    for patient_id in patient_ids:
        active_visits = list(
            Visit.objects.filter(
                patient_id=patient_id, status__in=['OPEN', 'IN_PROGRESS']
            ).order_by('-updated_at', '-created_at', '-id')
        )
        if len(active_visits) <= 1:
            continue

        # Keep the most recently updated visit active; close the rest.
        stale = active_visits[1:]
        for visit in stale:
            visit.status = 'CLOSED'
            visit.save(update_fields=['status'])


def noop_reverse(apps, schema_editor):
    # Not reversible: we don't know which visits were auto-closed by this
    # migration versus closed normally by staff, so reversing would risk
    # reopening visits that were legitimately closed for other reasons.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0003_referringdoctor'),
    ]

    operations = [
        migrations.RunPython(close_duplicate_active_visits, noop_reverse),
    ]
