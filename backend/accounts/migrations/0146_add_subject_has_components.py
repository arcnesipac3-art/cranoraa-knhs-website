from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0145_compliance_audit_log'),
    ]

    operations = [
        migrations.AddField(
            model_name='subject',
            name='has_components',
            field=models.BooleanField(default=False, help_text='True for composite subjects like MAPEH that have sub-components (music_arts, pe_health)'),
        ),
    ]
