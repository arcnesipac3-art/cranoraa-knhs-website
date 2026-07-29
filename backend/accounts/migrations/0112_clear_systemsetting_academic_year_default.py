from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0111_add_subject_component'),
    ]

    operations = [
        migrations.AlterField(
            model_name='systemsetting',
            name='academic_year',
            field=models.CharField(blank=True, default='', max_length=9),
        ),
    ]
