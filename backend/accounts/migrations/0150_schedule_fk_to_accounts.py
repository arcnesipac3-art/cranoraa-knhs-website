from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0149_scalability_indexes'),
    ]

    state_operations = [
        migrations.AlterField(
            model_name='schedule',
            name='academic_year',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='schedules',
                to='accounts.academicyear',
            ),
        ),
        migrations.AlterField(
            model_name='schedule',
            name='semester',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='schedules',
                to='accounts.semester',
            ),
        ),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(state_operations=state_operations),
    ]
