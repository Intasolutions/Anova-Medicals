from django.db import migrations, models


def start_alphabetically(apps, schema_editor):
    """Give existing rows a stable starting order: A-Z, numbered per category for tests."""
    LabCategory = apps.get_model('lab', 'LabCategory')
    LabTest = apps.get_model('lab', 'LabTest')

    categories = list(LabCategory.objects.order_by('name'))
    for position, category in enumerate(categories, start=1):
        category.display_order = position
    LabCategory.objects.bulk_update(categories, ['display_order'])

    next_position = {}
    tests = list(LabTest.objects.order_by('name', 'id'))
    for test in tests:
        key = (test.category or '').lower()
        next_position[key] = next_position.get(key, 0) + 1
        test.display_order = next_position[key]
    LabTest.objects.bulk_update(tests, ['display_order'])


class Migration(migrations.Migration):

    dependencies = [
        ('lab', '0012_labbatch_lab_labbatc_invento_7a951b_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='labcategory',
            name='display_order',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='labtest',
            name='display_order',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(start_alphabetically, migrations.RunPython.noop),
    ]
