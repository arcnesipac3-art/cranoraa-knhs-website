from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0110_switch_cascade_to_set_null_for_data_preservation'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='mother_tongue',
            field=models.CharField(blank=True, help_text='Mother tongue / primary language', max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='indigenous_people',
            field=models.CharField(blank=True, help_text='Indigenous People affiliation, if any', max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='religion',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='extension_name',
            field=models.CharField(blank=True, help_text='Name extension (e.g., Jr., Sr., III)', max_length=20, null=True),
        ),
        migrations.CreateModel(
            name='SchoolForm1',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('school_year', models.CharField(db_index=True, max_length=20)),
                ('grade_level', models.CharField(db_index=True, max_length=20)),
                ('section', models.CharField(max_length=100)),
                ('total_male', models.PositiveIntegerField(default=0)),
                ('total_female', models.PositiveIntegerField(default=0)),
                ('total_learners', models.PositiveIntegerField(default=0)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('final', 'Final'), ('archived', 'Archived')], default='draft', max_length=10)),
                ('generated_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('adviser', models.ForeignKey(blank=True, limit_choices_to={'role': 'staff'}, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sf1_advised', to=settings.AUTH_USER_MODEL)),
                ('generated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sf1_generated', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-generated_at'],
                'unique_together': {('school_year', 'grade_level', 'section')},
            },
        ),
        migrations.CreateModel(
            name='SchoolForm1Student',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('remarks', models.TextField(blank=True, default='')),
                ('order', models.PositiveIntegerField(default=0)),
                ('enrollment', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sf1_entries', to='accounts.studentclassenrollment')),
                ('sf1', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='students', to='accounts.schoolform1')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sf1_entries', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['order', 'student__last_name', 'student__first_name'],
                'unique_together': {('sf1', 'student')},
            },
        ),
    ]
