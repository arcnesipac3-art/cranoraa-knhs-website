from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0132_add_cancelled_enrollment_status'),
    ]

    operations = [
        migrations.AlterField(
            model_name='enrollmentapplication',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('under_review', 'Under Review'),
                    ('pending_requirements', 'Pending Requirements'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                    ('cancelled', 'Cancelled'),
                    ('enrolled', 'Enrolled'),
                    ('withdrawn', 'Withdrawn'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='enrollmentstatushistory',
            name='to_status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('under_review', 'Under Review'),
                    ('pending_requirements', 'Pending Requirements'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                    ('cancelled', 'Cancelled'),
                    ('enrolled', 'Enrolled'),
                    ('withdrawn', 'Withdrawn'),
                ],
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='enrollmentstatushistory',
            name='from_status',
            field=models.CharField(
                blank=True,
                choices=[
                    ('pending', 'Pending'),
                    ('under_review', 'Under Review'),
                    ('pending_requirements', 'Pending Requirements'),
                    ('approved', 'Approved'),
                    ('rejected', 'Rejected'),
                    ('cancelled', 'Cancelled'),
                    ('enrolled', 'Enrolled'),
                    ('withdrawn', 'Withdrawn'),
                ],
                max_length=20,
                null=True,
            ),
        ),
    ]
