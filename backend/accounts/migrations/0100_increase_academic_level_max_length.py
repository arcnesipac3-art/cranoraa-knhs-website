from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0099_admin_enhancements'),
    ]

    operations = [
        migrations.AlterField(
            model_name='systemsetting',
            name='academic_level',
            field=models.CharField(
                max_length=4,
                choices=[
                    ('jhs', 'Junior High School (Grades 7-10)'),
                    ('shs', 'Senior High School (Grades 11-12)'),
                    ('both', 'Both (JHS + SHS)'),
                ],
                default='jhs',
            ),
        ),
    ]
