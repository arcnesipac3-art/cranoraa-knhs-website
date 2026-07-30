from django.db import migrations


def sync_portal_to_accounts(apps, schema_editor):
    PortalAY = apps.get_model('portal', 'AcademicYear')
    AccountsAY = apps.get_model('accounts', 'AcademicYear')

    for portal_year in PortalAY.objects.all():
        AccountsAY.objects.update_or_create(
            id=portal_year.id,
            defaults={
                'name': portal_year.name,
                'start_date': portal_year.start_date,
                'end_date': portal_year.end_date,
                'is_active': portal_year.is_active,
                'is_archived': getattr(portal_year, 'is_archived', False),
            }
        )


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0114_alter_classroom_academic_year_fk'),
        ('portal', '0008_alter_model_options'),
    ]

    operations = [
        migrations.RunPython(sync_portal_to_accounts, migrations.RunPython.noop),
    ]
