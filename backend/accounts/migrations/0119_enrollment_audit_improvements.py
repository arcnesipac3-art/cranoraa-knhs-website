# Generated manually for enrollment audit improvements

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0118_quiz_enhancements_integritylog_indexes'),
    ]

    operations = [
        # Phase 2: New models
        migrations.CreateModel(
            name='EnrollmentChecklist',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('documents_complete', models.BooleanField(default=False)),
                ('lrn_verified', models.BooleanField(default=False)),
                ('parent_linked', models.BooleanField(default=False)),
                ('classroom_assigned', models.BooleanField(default=False)),
                ('profile_complete', models.BooleanField(default=False)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name_plural': 'Enrollment checklists',
            },
        ),
        migrations.CreateModel(
            name='EnrollmentDocumentVersion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file_url', models.URLField(max_length=1000)),
                ('file_name', models.CharField(blank=True, max_length=255, null=True)),
                ('file_hash', models.CharField(blank=True, help_text='SHA-256 hash for deduplication', max_length=64)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name_plural': 'Enrollment document versions',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='StudentPromotionRecord',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('from_school_year', models.CharField(max_length=20)),
                ('to_school_year', models.CharField(max_length=20)),
                ('status', models.CharField(choices=[('promoted', 'Promoted'), ('retained', 'Retained'), ('conditional', 'Conditionally Promoted'), ('graduated', 'Graduated'), ('transferred', 'Transferred'), ('dropped', 'Dropped')], max_length=20)),
                ('general_average', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('decided_at', models.DateTimeField(auto_now_add=True)),
                ('remarks', models.TextField(blank=True)),
                ('is_final', models.BooleanField(default=False, help_text='True after bulk promotion confirmation')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['-decided_at'],
            },
        ),
        # Phase 1: Profile field additions
        migrations.AddField(
            model_name='profile',
            name='emergency_contact_name',
            field=models.CharField(blank=True, max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='emergency_contact_phone',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='emergency_contact_relationship',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='enrollment_status',
            field=models.CharField(choices=[('active', 'Active'), ('graduated', 'Graduated'), ('transferred', 'Transferred'), ('dropped', 'Dropped'), ('inactive', 'Inactive')], db_index=True, default='active', max_length=20),
        ),
        migrations.AddField(
            model_name='profile',
            name='graduation_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='medical_alerts',
            field=models.TextField(blank=True, help_text='Allergies, medical conditions', null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='special_education_needs',
            field=models.BooleanField(default=False),
        ),
        # Phase 1: New indexes on EnrollmentApplication
        migrations.AddIndex(
            model_name='enrollmentapplication',
            index=models.Index(fields=['lrn'], name='accounts_en_lrn_idx'),
        ),
        migrations.AddIndex(
            model_name='enrollmentapplication',
            index=models.Index(fields=['email'], name='accounts_en_email_idx'),
        ),
        migrations.AddIndex(
            model_name='enrollmentapplication',
            index=models.Index(fields=['enrollment_type', 'status'], name='accounts_en_type_status_idx'),
        ),
        migrations.AddIndex(
            model_name='enrollmentapplication',
            index=models.Index(fields=['school_year', 'status'], name='accounts_en_sy_status_idx'),
        ),
        # Foreign keys for new models
        migrations.AddField(
            model_name='enrollmentchecklist',
            name='application',
            field=models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='checklist', to='accounts.enrollmentapplication'),
        ),
        migrations.AddField(
            model_name='enrollmentchecklist',
            name='completed_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='enrollmentdocumentversion',
            name='document',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='versions', to='accounts.enrollmentdocument'),
        ),
        migrations.AddField(
            model_name='enrollmentdocumentversion',
            name='uploaded_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='studentpromotionrecord',
            name='decision_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='promotion_decisions', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='studentpromotionrecord',
            name='from_classroom',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='promotions_from', to='accounts.classroom'),
        ),
        migrations.AddField(
            model_name='studentpromotionrecord',
            name='student',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='promotion_records', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='studentpromotionrecord',
            name='to_classroom',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='promotions_to', to='accounts.classroom'),
        ),
        # Indexes for StudentPromotionRecord
        migrations.AddIndex(
            model_name='studentpromotionrecord',
            index=models.Index(fields=['student', 'from_school_year'], name='accounts_st_student_sy_idx'),
        ),
        migrations.AddIndex(
            model_name='studentpromotionrecord',
            index=models.Index(fields=['status'], name='accounts_st_status_idx'),
        ),
        migrations.AddIndex(
            model_name='studentpromotionrecord',
            index=models.Index(fields=['is_final'], name='accounts_st_is_final_idx'),
        ),
    ]
