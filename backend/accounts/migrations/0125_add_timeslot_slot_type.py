from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0116_add_profile_enrollment_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='timeslot',
            name='slot_type',
            field=models.CharField(
                choices=[
                    ('regular', 'Regular Period'),
                    ('recess', 'Recess'),
                    ('lunch', 'Lunch Break'),
                    ('vacant', 'Vacant'),
                ],
                default='regular',
                help_text='Type of time slot: regular, recess, lunch, or vacant.',
                max_length=10,
            ),
        ),
    ]
