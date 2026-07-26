from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0116_remove_sf10_unique_together'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='attendance',
            index=models.Index(
                fields=['date', 'classroom'],
                name='idx_attendance_date_classroom',
            ),
        ),
        migrations.AddIndex(
            model_name='grade',
            index=models.Index(
                fields=['grade_type', 'quarter'],
                name='idx_grade_type_quarter',
            ),
        ),
    ]
