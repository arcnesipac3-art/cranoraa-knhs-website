from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0139_attendance_management'),
    ]

    operations = [
        migrations.CreateModel(
            name='SchoolCalendar',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(unique=True)),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True, default='')),
                ('type', models.CharField(choices=[('holiday', 'Holiday'), ('weather', 'Weather Disruption'), ('break', 'School Break'), ('other', 'Other')], default='holiday', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_holidays', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-date'],
            },
        ),
    ]
