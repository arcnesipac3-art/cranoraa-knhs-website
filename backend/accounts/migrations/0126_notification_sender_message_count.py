from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0125_add_timeslot_slot_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='sender',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='sent_notifications',
                to='accounts.user',
                help_text='Who triggered this notification (for message consolidation)',
            ),
        ),
        migrations.AddField(
            model_name='notification',
            name='message_count',
            field=models.PositiveIntegerField(
                default=1,
                help_text='Number of consolidated messages',
            ),
        ),
        migrations.AddField(
            model_name='notification',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(
                fields=['recipient', 'sender', 'is_read', 'notification_type'],
                name='notif_consolidate_idx',
            ),
        ),
    ]
