from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0138_add_push_type_toggles'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendance',
            name='workflow_status',
            field=models.CharField(
                choices=[('draft', 'Draft'), ('submitted', 'Submitted'), ('locked', 'Locked')],
                default='draft', help_text='Tracks attendance lifecycle: draft → submitted → locked', max_length=20
            ),
        ),
        migrations.AddField(
            model_name='attendance',
            name='submitted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='attendance',
            name='locked_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='attendance',
            name='status',
            field=models.CharField(
                choices=[
                    ('present', 'Present'),
                    ('absent', 'Absent'),
                    ('late', 'Late'),
                    ('excused', 'Excused'),
                    ('school_activity', 'School Activity'),
                    ('medical_leave', 'Medical Leave'),
                ],
                default='present', max_length=20
            ),
        ),
        migrations.AddIndex(
            model_name='attendance',
            index=models.Index(fields=['workflow_status'], name='idx_attendance_workflow'),
        ),
        migrations.CreateModel(
            name='AttendanceDeadline',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('open_time', models.TimeField(default='07:00', help_text='Time attendance becomes available')),
                ('deadline_minutes', models.PositiveIntegerField(default=30, help_text='Minutes after class start to submit attendance')),
                ('lock_minutes', models.PositiveIntegerField(default=60, help_text='Minutes after class start to auto-lock attendance')),
                ('is_locked', models.BooleanField(default=False)),
                ('locked_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('classroom', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attendance_deadlines', to='accounts.classroom')),
                ('locked_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-date'],
                'unique_together': {('classroom', 'date')},
            },
        ),
        migrations.CreateModel(
            name='AttendanceAuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[
                    ('create', 'Created'), ('update', 'Updated'), ('submit', 'Submitted'),
                    ('reopen', 'Reopened'), ('lock', 'Locked'), ('bulk_action', 'Bulk Action'),
                ], max_length=20)),
                ('date', models.DateField(blank=True, null=True)),
                ('previous_status', models.CharField(blank=True, max_length=20, null=True)),
                ('new_status', models.CharField(blank=True, max_length=20, null=True)),
                ('description', models.TextField(blank=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('attendance', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_logs', to='accounts.attendance')),
                ('classroom', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='accounts.classroom')),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='attendance_audit_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['classroom', 'date'], name='idx_audit_classroom_date'),
                ],
            },
        ),
    ]
