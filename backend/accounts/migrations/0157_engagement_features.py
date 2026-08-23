from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0150_schedule_fk_to_accounts'),
    ]

    operations = [
        # Update Announcement priority choices
        migrations.AlterField(
            model_name='announcement',
            name='priority',
            field=models.CharField(
                max_length=10,
                choices=[
                    ('urgent', 'Urgent'),
                    ('high', 'High'),
                    ('normal', 'Normal'),
                    ('low', 'Low'),
                ],
                default='normal',
            ),
        ),
        # EventRSVP
        migrations.CreateModel(
            name='EventRSVP',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(
                    max_length=10,
                    choices=[('going', 'Going'), ('maybe', 'Maybe'), ('not_going', 'Not Going')],
                    default='going',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='rsvps', to='accounts.schoolevent')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='event_rsvps', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('event', 'user')},
            },
        ),
        # Badge
        migrations.CreateModel(
            name='Badge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField()),
                ('icon', models.CharField(default='🏆', max_length=10)),
                ('category', models.CharField(
                    max_length=20,
                    choices=[
                        ('academic', 'Academic'),
                        ('attendance', 'Attendance'),
                        ('engagement', 'Engagement'),
                        ('leadership', 'Leadership'),
                        ('special', 'Special'),
                    ],
                    default='academic',
                )),
                ('color', models.CharField(default='violet', max_length=20)),
                ('points', models.PositiveIntegerField(default=10)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['category', 'name'],
            },
        ),
        # StudentBadge
        migrations.CreateModel(
            name='StudentBadge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reason', models.TextField(blank=True)),
                ('awarded_at', models.DateTimeField(auto_now_add=True)),
                ('awarded_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='awarded_badges', to=settings.AUTH_USER_MODEL)),
                ('badge', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='awarded_to', to='accounts.badge')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='student_badges', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-awarded_at'],
                'unique_together': {('student', 'badge')},
            },
        ),
        # StudentLeaderboard
        migrations.CreateModel(
            name='StudentLeaderboard',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('total_points', models.PositiveIntegerField(default=0)),
                ('academic_rank', models.PositiveIntegerField(blank=True, null=True)),
                ('attendance_streak', models.PositiveIntegerField(default=0)),
                ('longest_attendance_streak', models.PositiveIntegerField(default=0)),
                ('last_active_date', models.DateField(blank=True, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('student', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='leaderboard', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-total_points'],
            },
        ),
    ]
