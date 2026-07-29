from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0007_alter_semester_semester_type_alter_semester_start_date_and_more'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='announcement',
            options={'verbose_name': 'Announcement (Deprecated)', 'verbose_name_plural': 'Announcements (Deprecated)'},
        ),
        migrations.AlterModelOptions(
            name='schoolclass',
            options={'verbose_name': 'Class (Deprecated)', 'verbose_name_plural': 'Classes (Deprecated)'},
        ),
        migrations.AlterModelOptions(
            name='department',
            options={'verbose_name': 'Department (Deprecated)', 'verbose_name_plural': 'Departments (Deprecated)'},
        ),
        migrations.AlterModelOptions(
            name='academicyear',
            options={'verbose_name': 'Academic Year (Deprecated)', 'verbose_name_plural': 'Academic Years (Deprecated)'},
        ),
        migrations.AlterModelOptions(
            name='semester',
            options={'verbose_name': 'Semester (Deprecated)', 'verbose_name_plural': 'Semesters (Deprecated)'},
        ),
        migrations.AlterModelOptions(
            name='auditlog',
            options={'verbose_name': 'Audit Log (Deprecated)', 'verbose_name_plural': 'Audit Logs (Deprecated)'},
        ),
        migrations.AlterModelOptions(
            name='databasebackup',
            options={'verbose_name': 'Database Backup (Deprecated)', 'verbose_name_plural': 'Database Backups (Deprecated)'},
        ),
        migrations.AlterModelOptions(
            name='apirequestlog',
            options={'verbose_name': 'API Request Log (Deprecated)', 'verbose_name_plural': 'API Request Logs (Deprecated)'},
        ),
    ]
