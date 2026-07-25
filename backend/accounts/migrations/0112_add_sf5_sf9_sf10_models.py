from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0111_add_school_forms_and_profile_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='SchoolForm5',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('school_year', models.CharField(db_index=True, max_length=20)),
                ('grade_level', models.CharField(db_index=True, max_length=20)),
                ('section', models.CharField(max_length=100)),
                ('total_promoted', models.PositiveIntegerField(default=0)),
                ('total_retained', models.PositiveIntegerField(default=0)),
                ('total_conditional', models.PositiveIntegerField(default=0)),
                ('total_male', models.PositiveIntegerField(default=0)),
                ('total_female', models.PositiveIntegerField(default=0)),
                ('total_learners', models.PositiveIntegerField(default=0)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('final', 'Final'), ('archived', 'Archived')], default='draft', max_length=10)),
                ('generated_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('adviser', models.ForeignKey(blank=True, limit_choices_to={'role': 'staff'}, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sf5_advised', to=settings.AUTH_USER_MODEL)),
                ('generated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sf5_generated', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-generated_at'],
                'unique_together': {('school_year', 'grade_level', 'section')},
            },
        ),
        migrations.CreateModel(
            name='SchoolForm5Student',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('general_average', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('total_subjects', models.PositiveIntegerField(default=0)),
                ('passed_subjects', models.PositiveIntegerField(default=0)),
                ('failed_subjects', models.PositiveIntegerField(default=0)),
                ('promotion_status', models.CharField(choices=[('promoted', 'Promoted'), ('conditional', 'Conditionally Promoted'), ('retained', 'Retained'), ('completed', 'Completed')], default='promoted', max_length=15)),
                ('remarks', models.TextField(blank=True, default='')),
                ('awards', models.CharField(blank=True, default='', max_length=200)),
                ('order', models.PositiveIntegerField(default=0)),
                ('enrollment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sf5_entries', to='accounts.studentclassenrollment')),
                ('sf5', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='students', to='accounts.schoolform5')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sf5_entries', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['order', 'student__last_name', 'student__first_name'],
                'unique_together': {('sf5', 'student')},
            },
        ),
        migrations.CreateModel(
            name='SchoolForm9',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('school_year', models.CharField(db_index=True, max_length=20)),
                ('grade_level', models.CharField(db_index=True, max_length=20)),
                ('section', models.CharField(max_length=100)),
                ('general_average', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('total_subjects', models.PositiveIntegerField(default=0)),
                ('passed_subjects', models.PositiveIntegerField(default=0)),
                ('failed_subjects', models.PositiveIntegerField(default=0)),
                ('promotion_status', models.CharField(blank=True, default='', max_length=20)),
                ('days_present', models.PositiveIntegerField(default=0)),
                ('days_absent', models.PositiveIntegerField(default=0)),
                ('days_tardy', models.PositiveIntegerField(default=0)),
                ('adviser_remarks', models.TextField(blank=True, default='')),
                ('principal_remarks', models.TextField(blank=True, default='')),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('final', 'Final'), ('archived', 'Archived')], default='draft', max_length=10)),
                ('generated_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('adviser', models.ForeignKey(blank=True, limit_choices_to={'role': 'staff'}, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sf9_advised', to=settings.AUTH_USER_MODEL)),
                ('generated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sf9_generated', to=settings.AUTH_USER_MODEL)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sf9_records', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-generated_at', 'student__last_name'],
                'unique_together': {('school_year', 'grade_level', 'section', 'student')},
            },
        ),
        migrations.CreateModel(
            name='SchoolForm9Subject',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('q1', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('q2', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('q3', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('q4', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('final_rating', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('remarks', models.CharField(blank=True, default='', max_length=50)),
                ('sf9', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subjects', to='accounts.schoolform9')),
                ('subject', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='accounts.subject')),
            ],
            options={
                'ordering': ['subject__name'],
                'unique_together': {('sf9', 'subject')},
            },
        ),
        migrations.CreateModel(
            name='SchoolForm10',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('school_year_from', models.CharField(blank=True, default='', max_length=20)),
                ('school_year_to', models.CharField(blank=True, default='', max_length=20)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('final', 'Final'), ('archived', 'Archived')], default='draft', max_length=10)),
                ('generated_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('generated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sf10_generated', to=settings.AUTH_USER_MODEL)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sf10_records', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-generated_at'],
                'unique_together': {('student',)},
            },
        ),
        migrations.CreateModel(
            name='SchoolForm10Record',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('school_year', models.CharField(max_length=20)),
                ('grade_level', models.CharField(max_length=20)),
                ('section', models.CharField(blank=True, default='', max_length=100)),
                ('school_name', models.CharField(blank=True, default='', max_length=200)),
                ('general_average', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('promotion_status', models.CharField(blank=True, default='', max_length=20)),
                ('total_subjects', models.PositiveIntegerField(default=0)),
                ('passed_subjects', models.PositiveIntegerField(default=0)),
                ('failed_subjects', models.PositiveIntegerField(default=0)),
                ('remarks', models.TextField(blank=True, default='')),
                ('awards', models.CharField(blank=True, default='', max_length=300)),
                ('date_of_transfer', models.DateField(blank=True, null=True)),
                ('receiving_school', models.CharField(blank=True, default='', max_length=200)),
                ('order', models.PositiveIntegerField(default=0)),
                ('sf10', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='academic_records', to='accounts.schoolform10')),
            ],
            options={
                'ordering': ['order', 'school_year'],
            },
        ),
        migrations.CreateModel(
            name='SchoolForm10Subject',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('q1', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('q2', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('q3', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('q4', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('final_rating', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('remarks', models.CharField(blank=True, default='', max_length=50)),
                ('record', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='subjects', to='accounts.schoolform10record')),
                ('subject', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='accounts.subject')),
            ],
            options={
                'ordering': ['subject__name'],
                'unique_together': {('record', 'subject')},
            },
        ),
    ]
