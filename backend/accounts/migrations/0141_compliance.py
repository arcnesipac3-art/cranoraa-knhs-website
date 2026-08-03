from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0140_school_calendar'),
    ]

    operations = [
        migrations.CreateModel(
            name='ComplianceType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('slug', models.SlugField(unique=True)),
                ('description', models.TextField(blank=True)),
                ('frequency', models.CharField(choices=[('weekly', 'Weekly'), ('monthly', 'Monthly'), ('quarterly', 'Quarterly'), ('yearly', 'Yearly')], max_length=10)),
                ('deadline_day', models.PositiveIntegerField(default=5, help_text='Day of period: 5=Friday for weekly, 15 for monthly')),
                ('max_file_size_mb', models.PositiveIntegerField(default=50)),
                ('is_active', models.BooleanField(default=True)),
                ('order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='ComplianceSubmission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('period_number', models.PositiveIntegerField(help_text='Auto-calculated: week/month/term number')),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('submitted', 'Submitted'), ('reviewed', 'Reviewed'), ('rejected', 'Rejected'), ('overdue', 'Overdue')], default='draft', max_length=10)),
                ('submitted_at', models.DateTimeField(blank=True, null=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('remarks', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('teacher', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='compliance_submissions', to=settings.AUTH_USER_MODEL)),
                ('compliance_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='submissions', to='accounts.compliancetype')),
                ('academic_year', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='compliance_submissions', to='accounts.academicyear')),
                ('semester', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='compliance_submissions', to='accounts.semester')),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='compliance_reviews', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['status', 'compliance_type'], name='compliance_status_type_idx'),
                    models.Index(fields=['teacher', 'status'], name='compliance_teacher_status_idx'),
                    models.Index(fields=['academic_year', 'semester'], name='compliance_year_semester_idx'),
                ],
                'unique_together': {('teacher', 'compliance_type', 'academic_year', 'semester', 'period_number')},
            },
        ),
        migrations.CreateModel(
            name='ComplianceFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file_url', models.URLField(max_length=1000)),
                ('original_filename', models.CharField(max_length=255)),
                ('file_size_bytes', models.PositiveBigIntegerField(default=0)),
                ('content_type', models.CharField(blank=True, max_length=100)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('submission', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='files', to='accounts.compliancesubmission')),
            ],
            options={
                'ordering': ['uploaded_at'],
            },
        ),
        migrations.CreateModel(
            name='ComplianceComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('submission', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='accounts.compliancesubmission')),
                ('author', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='compliance_comments', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
    ]
