# Generated migration for compliance subject assignment

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0142_systemsetting_school_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='ComplianceTypeSubjectAssignment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_required', models.BooleanField(default=True, help_text='Whether this compliance type is required for this subject')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('compliance_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subject_assignments', to='accounts.compliancetype')),
                ('subject', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='compliance_requirements', to='accounts.subject')),
            ],
            options={
                'verbose_name': 'Compliance Type Subject Assignment',
                'verbose_name_plural': 'Compliance Type Subject Assignments',
                'ordering': ['compliance_type', 'subject__name'],
                'unique_together': {('compliance_type', 'subject')},
            },
        ),
    ]
