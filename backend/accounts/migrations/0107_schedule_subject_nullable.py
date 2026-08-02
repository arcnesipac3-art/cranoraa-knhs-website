import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0106_add_infrastructure_models'),
    ]

    operations = [
        migrations.AlterField(
            model_name='schedule',
            name='subject',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='schedules',
                to='accounts.subject',
            ),
        ),
    ]
