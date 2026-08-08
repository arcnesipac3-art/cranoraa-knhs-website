from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0146_add_subject_has_components'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='chatmessage',
            index=models.Index(fields=['room', 'timestamp'], name='msg_room_ts_idx'),
        ),
        migrations.AddIndex(
            model_name='chatmessage',
            index=models.Index(fields=['sender', 'timestamp'], name='msg_sender_ts_idx'),
        ),
        migrations.AddIndex(
            model_name='chatmessage',
            index=models.Index(fields=['room', 'is_read', 'sender'], name='msg_room_read_sender_idx'),
        ),
        migrations.AddIndex(
            model_name='chatroom',
            index=models.Index(fields=['updated_at'], name='room_updated_at_idx'),
        ),
        migrations.AddIndex(
            model_name='chatmember',
            index=models.Index(fields=['user', 'chat_room'], name='member_user_room_idx'),
        ),
    ]
