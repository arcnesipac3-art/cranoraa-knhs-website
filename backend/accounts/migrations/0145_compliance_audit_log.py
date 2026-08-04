"""
Migration 0145: Add ComplianceAuditLog model for tracking all compliance actions.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0144_add_classroom_subject_to_submission'),
    ]

    operations = [
        migrations.CreateModel(
            name='ComplianceAuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(
                    max_length=20,
                    choices=[
                        ('create',         'Created'),
                        ('submit',         'Submitted'),
                        ('review',         'Reviewed'),
                        ('approve',        'Approved'),
                        ('reject',         'Rejected'),
                        ('reopen',         'Reopened'),
                        ('reminder_sent',  'Reminder Sent'),
                        ('overdue_alert',  'Overdue Alert'),
                        ('file_upload',    'File Uploaded'),
                        ('file_delete',    'File Deleted'),
                        ('bulk_assign',    'Bulk Assigned'),
                    ],
                    db_index=True,
                )),
                ('details', models.JSONField(default=dict, blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('submission', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='audit_logs',
                    to='accounts.compliancesubmission',
                )),
                ('user', models.ForeignKey(
                    null=True, blank=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='compliance_audit_logs',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
                'verbose_name': 'Compliance Audit Log',
                'verbose_name_plural': 'Compliance Audit Logs',
            },
        ),
    ]
