from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0115_sync_academic_year_data'),
    ]

    operations = [
        # State-only: tell Django the field exists
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='profile',
                    name='enrollment_status',
                    field=models.CharField(
                        blank=True,
                        choices=[
                            ('enrolled', 'Enrolled'),
                            ('withdrawn', 'Withdrawn'),
                            ('transferred', 'Transferred Out'),
                            ('dropped', 'Dropped'),
                            ('graduated', 'Graduated'),
                        ],
                        default='enrolled',
                        max_length=20,
                        null=True,
                    ),
                ),
                migrations.AddField(
                    model_name='profile',
                    name='enrollment_status_reason',
                    field=models.TextField(
                        blank=True,
                        help_text='Reason for status change (e.g. transfer out)',
                        null=True,
                    ),
                ),
            ],
            # No database operations — column already exists in Supabase
            database_operations=[],
        ),
    ]
