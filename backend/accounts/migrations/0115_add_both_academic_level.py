# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0114_academicyear_curriculumstandard_lessonplan_question_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='systemsetting',
            name='academic_level',
            field=models.CharField(
                choices=[
                    ('jhs', 'Junior High School (Grades 7-10)'),
                    ('shs', 'Senior High School (Grades 11-12)'),
                    ('both', 'Both JHS and SHS (Grades 7-12)'),
                ],
                default='both',
                max_length=4,
            ),
        ),
    ]
