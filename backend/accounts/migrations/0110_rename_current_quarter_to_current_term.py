# Generated migration for 3-term curriculum update
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0109_switch_to_3_term_grading'),
    ]

    operations = [
        # Rename current_quarter to current_term
        migrations.RenameField(
            model_name='systemsetting',
            old_name='current_quarter',
            new_name='current_term',
        ),
        # Update field choices to only 3 terms
        migrations.AlterField(
            model_name='systemsetting',
            name='current_term',
            field=models.CharField(
                max_length=1,
                default='1',
                choices=[
                    ('1', 'Term 1'),
                    ('2', 'Term 2'),
                    ('3', 'Term 3')
                ],
                help_text="Current term for both JHS and SHS (3-term curriculum)"
            ),
        ),
        # Update Semester.semester_type choices to only 3 terms
        migrations.AlterField(
            model_name='semester',
            name='semester_type',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('1st Term', 'First Term'),
                    ('2nd Term', 'Second Term'),
                    ('3rd Term', 'Third Term'),
                ]
            ),
        ),
    ]
