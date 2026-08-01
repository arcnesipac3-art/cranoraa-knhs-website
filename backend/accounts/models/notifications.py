from django.db import models
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

from .user import User

_models_logger = logging.getLogger(__name__)


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('announcement', 'Announcement'),
        ('grade', 'Grade Update'),
        ('attendance', 'Attendance'),
        ('fee', 'Fee Reminder'),
        ('message', 'Message'),
        ('system', 'System'),
    ]

    recipient = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications',
                               help_text="Who triggered this notification (for message consolidation)")
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='system')
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    link = models.CharField(max_length=500, blank=True, null=True, help_text="Relative or absolute URL to redirect user when clicked")
    message_count = models.PositiveIntegerField(default=1, help_text="Number of consolidated messages")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read'], name='notif_recipient_read_idx'),
            models.Index(fields=['recipient', 'sender', 'is_read', 'notification_type'], name='notif_consolidate_idx'),
        ]

    def __str__(self):
        return f"{self.recipient.username} - {self.title}"


class NotificationPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')

    announcement = models.BooleanField(default=True)
    grade = models.BooleanField(default=True)
    attendance = models.BooleanField(default=True)
    fee = models.BooleanField(default=True)
    message = models.BooleanField(default=True)
    friend_request = models.BooleanField(default=True)
    system = models.BooleanField(default=True)

    push_enabled = models.BooleanField(default=True, help_text="Enable browser push notifications (FCM)")
    in_app_enabled = models.BooleanField(default=True, help_text="Show in-app notification bell")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Notification Preference'
        verbose_name_plural = 'Notification Preferences'

    def __str__(self):
        return f"Notification prefs for {self.user.username}"

    def is_type_enabled(self, notification_type: str) -> bool:
        return getattr(self, notification_type, True)


class FCMToken(models.Model):
    DEVICE_CHOICES = [
        ('web', 'Web Browser'),
        ('android', 'Android'),
        ('ios', 'iOS'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='fcm_tokens')
    token = models.TextField(unique=True)
    device_type = models.CharField(max_length=10, choices=DEVICE_CHOICES, default='web')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.username} — {self.device_type} token"


@receiver(post_save, sender=Notification)
def broadcast_notification(sender, instance, created, **kwargs):
    if not instance.recipient:
        return

    prefs = getattr(instance.recipient, 'notification_preferences', None)
    notif_type = instance.notification_type
    if prefs and not prefs.is_type_enabled(notif_type):
        return

    # WebSocket broadcast — fires for both new and updated (consolidated) notifications
    if not prefs or prefs.in_app_enabled:
        try:
            channel_layer = get_channel_layer()
            if channel_layer is None:
                return

            group_name = f'notifications_{instance.recipient.id}'
            unread_count = Notification.objects.filter(recipient=instance.recipient, is_read=False).count()

            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'notification_message',
                    'data': {
                        'type': 'notification',
                        'id': instance.id,
                        'title': instance.title,
                        'message': instance.message,
                        'notification_type': instance.notification_type,
                        'link': instance.link,
                        'created_at': instance.created_at.isoformat(),
                        'unread_count': unread_count,
                        'message_count': instance.message_count,
                    }
                }
            )
        except Exception as e:
            _models_logger.error(f"Failed to broadcast notification {instance.id}: {e}")

    # FCM push — only for NEW notifications, not consolidated updates
    if created and (not prefs or prefs.push_enabled):
        try:
            from ..fcm import send_push_notification
            send_push_notification(
                user=instance.recipient,
                title=instance.title,
                body=instance.message,
                data={
                    'notification_type': instance.notification_type,
                    'link': instance.link or '',
                    'notification_id': str(instance.id),
                }
            )
        except Exception as e:
            _models_logger.warning(f"FCM push failed for notification {instance.id}: {e}")


@receiver(post_save, sender=User)
def ensure_notification_preferences(sender, instance, created, **kwargs):
    """Auto-create a NotificationPreference row whenever a new User is saved.
    This ensures the broadcast_notification signal always finds valid prefs
    instead of falling through with no preferences row (which would treat
    every notification type as enabled — correct default, but prevents
    per-user opt-outs from working on first notification)."""
    if created:
        NotificationPreference.objects.get_or_create(user=instance)


def consolidate_message_notification(recipient, sender, room_label, preview):
    """
    Create or update a notification for a chat message.

    If there's an existing unread message notification from the same sender
    to the same recipient, update it (increment count, update preview) instead
    of creating a new one. This prevents notification spam when someone sends
    multiple messages in quick succession.

    Returns the Notification instance (created or updated).
    """
    from django.utils import timezone

    existing = Notification.objects.filter(
        recipient=recipient,
        sender=sender,
        notification_type='message',
        is_read=False,
    ).first()

    if existing:
        existing.message_count += 1
        existing.message = f'{room_label}: {preview}'
        existing.title = f'{existing.message_count} new messages from {sender.get_full_name() or sender.username}'
        existing.save(update_fields=['message_count', 'message', 'title', 'updated_at'])
        return existing

    sender_name = sender.get_full_name() or sender.username
    return Notification.objects.create(
        recipient=recipient,
        sender=sender,
        notification_type='message',
        title=f'New message from {sender_name}',
        message=f'{room_label}: {preview}',
        link='/communication-center',
    )
