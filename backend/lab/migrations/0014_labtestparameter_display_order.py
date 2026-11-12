from django.db import migrations, models


def keep_current_order(apps, schema_editor):
    """Number each test's existing parameters in the order they were added."""
    LabTestParameter = apps.get_model('lab', 'LabTestParameter')

    next_position = {}
    parameters = list(LabTestParameter.objects.order_by('test_id', 'id'))
    for parameter in parameters:
        next_position[parameter.test_id] = next_position.get(parameter.test_id, 0) + 1
        parameter.display_order = next_position[parameter.test_id]
    LabTestParameter.objects.bulk_update(parameters, ['display_order'], batch_size=500)


class Migration(migrations.Migration):

    dependencies = [
        ('lab', '0013_lab_display_order'),
    ]

    operations = [
        migrations.AddField(
            model_name='labtestparameter',
            name='display_order',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterModelOptions(
            name='labtestparameter',
            options={'ordering': ['display_order', 'id']},
        ),
        migrations.RunPython(keep_current_order, migrations.RunPython.noop),
    ]
