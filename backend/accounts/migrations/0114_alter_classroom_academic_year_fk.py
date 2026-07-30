from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0113_merge_academic_level_and_year_default'),
        ('portal', '0008_alter_model_options'),
    ]

    operations = [
        migrations.AlterField(
            model_name='classroom',
            name='academic_year',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='classrooms', to='accounts.academicyear'),
        ),
    ]
