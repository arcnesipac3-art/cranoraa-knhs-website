from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0127_add_profile_enrollment_columns'),
    ]

    operations = [
        migrations.AddField(
            model_name='chatroom',
            name='description',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='chatroom',
            name='avatar',
            field=models.URLField(blank=True, max_length=1000, null=True),
        ),
        migrations.AddField(
            model_name='chatroom',
            name='is_archived',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='chatroom',
            name='owner',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='owned_chat_rooms',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.CreateModel(
            name='ChatMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('owner', 'Owner'), ('admin', 'Admin'), ('member', 'Member')], default='member', max_length=10)),
                ('nickname', models.CharField(blank=True, max_length=100, null=True)),
                ('muted', models.BooleanField(default=False)),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('chat_room', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='chat_members', to='accounts.chatroom')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='chat_memberships', to=settings.AUTH_USER_MODEL)),
                ('last_read_message', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='accounts.chatmessage')),
            ],
            options={
                'ordering': ['joined_at'],
                'unique_together': {('chat_room', 'user')},
            },
        ),
        migrations.CreateModel(
            name='Mention',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('mentioned_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='chat_mentions', to=settings.AUTH_USER_MODEL)),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mentions', to='accounts.chatmessage')),
            ],
            options={
                'unique_together': {('message', 'mentioned_user')},
            },
        ),
    ]
