from rest_framework import serializers

from ..models import Notification, NotificationPreference
from ._base import full_name


class NotificationSerializer(serializers.ModelSerializer):
    recipient_name = serializers.SerializerMethodField()
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'recipient_name', 'sender', 'sender_name',
                  'notification_type', 'title', 'message', 'is_read', 'link',
                  'message_count', 'created_at']
        read_only_fields = ['recipient', 'created_at']

    def get_recipient_name(self, obj): return full_name(obj.recipient)
    def get_sender_name(self, obj): return full_name(obj.sender) if obj.sender else None


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'announcement', 'grade', 'attendance', 'fee',
            'message', 'friend_request', 'system',
            'push_announcement', 'push_grade', 'push_attendance',
            'push_fee', 'push_message', 'push_friend_request', 'push_system',
            'push_enabled', 'in_app_enabled',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']
