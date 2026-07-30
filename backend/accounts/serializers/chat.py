from rest_framework import serializers
from django.utils import timezone

from ..models import (
    ChatRoom, ChatMessage, MessageReaction, ChatMember, Mention,
    ReportedMessage, UserBlock, EmergencyMessage,
)
from ._base import full_name


class MessageReactionSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = MessageReaction
        fields = ['id', 'user', 'user_name', 'emoji', 'created_at']

    def get_user_name(self, obj):
        return full_name(obj.user)


class ChatMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_profile_picture = serializers.SerializerMethodField()
    user_role = serializers.CharField(source='user.role', read_only=True)
    user_staff_title = serializers.SerializerMethodField()
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = ChatMember
        fields = ['id', 'chat_room', 'user', 'user_name', 'user_profile_picture',
                  'user_role', 'user_staff_title', 'role', 'nickname', 'muted', 'is_online', 'joined_at']
        read_only_fields = ['joined_at']

    def get_user_name(self, obj):
        return full_name(obj.user)

    def get_user_profile_picture(self, obj):
        try:
            return obj.user.profile.profile_picture or None
        except Exception:
            return None

    def get_user_staff_title(self, obj):
        return getattr(obj.user, 'staff_title', None)

    def get_is_online(self, obj):
        if hasattr(obj.user, 'last_activity') and obj.user.last_activity:
            diff = timezone.now() - obj.user.last_activity
            return diff.total_seconds() < 300
        return False


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_profile_picture = serializers.SerializerMethodField()
    reactions = serializers.SerializerMethodField()
    parent_message_details = serializers.SerializerMethodField()
    attachment_is_image = serializers.SerializerMethodField()
    mentions = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'room', 'sender', 'sender_name', 'sender_profile_picture', 'content', 'timestamp',
            'is_read', 'is_delivered', 'is_pinned', 'is_edited',
            'parent_message', 'parent_message_details', 'reactions', 'mentions',
            'message_type', 'attachment_url', 'attachment_filename',
            'attachment_content_type', 'file_size_bytes', 'attachment_is_image',
        ]

    def get_attachment_is_image(self, obj):
        if obj.message_type == 'image':
            return True
        ct = obj.attachment_content_type or ''
        return ct.startswith('image/')

    def get_sender_name(self, obj):
        return full_name(obj.sender)

    def get_sender_profile_picture(self, obj):
        try:
            return obj.sender.profile.profile_picture or None
        except Exception:
            return None

    def get_reactions(self, obj):
        reactions = obj.reactions.all()
        result = {}
        for r in reactions:
            if r.emoji not in result:
                result[r.emoji] = []
            result[r.emoji].append({
                'id': r.id,
                'user_id': r.user.id,
                'user_name': full_name(r.user)
            })
        return result

    def get_parent_message_details(self, obj):
        if obj.parent_message:
            parent = obj.parent_message
            preview = (parent.content or '').strip()
            if not preview:
                if parent.message_type == 'image':
                    preview = 'Photo'
                elif parent.message_type == 'file':
                    preview = f'{parent.attachment_filename or "File"}'
            return {
                'id': parent.id,
                'content': preview,
                'sender_name': full_name(parent.sender),
                'sender_id': parent.sender.id,
                'message_type': parent.message_type,
            }
        return None

    def get_mentions(self, obj):
        mentions = obj.mentions.all()
        return [{
            'id': m.id,
            'user_id': m.mentioned_user.id,
            'user_name': full_name(m.mentioned_user),
        } for m in mentions]


class ChatRoomSerializer(serializers.ModelSerializer):
    from .user import UserSerializer

    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    participants_details = UserSerializer(source='participants', many=True, read_only=True)
    is_pinned = serializers.SerializerMethodField()
    last_action_sender_name = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    online_count = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    owner_details = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'name', 'description', 'avatar', 'is_group', 'is_archived',
                  'participants', 'participants_details',
                  'created_by', 'owner', 'owner_name', 'owner_details',
                  'created_at', 'updated_at', 'last_message', 'unread_count', 'is_pinned',
                  'last_action_type', 'last_action_sender', 'last_action_sender_name', 'last_action_content',
                  'member_count', 'online_count']

    def get_last_action_sender_name(self, obj):
        if obj.last_action_sender:
            return full_name(obj.last_action_sender)
        return ''

    def get_owner_name(self, obj):
        if obj.owner:
            return full_name(obj.owner)
        return ''

    def get_owner_details(self, obj):
        if obj.owner:
            return UserSerializer(obj.owner).data
        return None

    def get_last_message(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'messages' in obj._prefetched_objects_cache:
            msgs = sorted(obj._prefetched_objects_cache['messages'], key=lambda m: m.timestamp, reverse=True)
            msg = msgs[0] if msgs else None
        else:
            msg = obj.messages.select_related('sender', 'sender__profile').last()
        if msg:
            return ChatMessageSerializer(msg).data
        return None

    def get_participants_details(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'participants' in obj._prefetched_objects_cache:
            participants = obj._prefetched_objects_cache['participants']
        else:
            participants = obj.participants.select_related('profile').all()
        return UserSerializer(participants, many=True).data

    def get_is_pinned(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if hasattr(obj, '_prefetched_objects_cache') and 'pinned_by' in obj._prefetched_objects_cache:
                return any(u.id == request.user.id for u in obj._prefetched_objects_cache['pinned_by'])
            return obj.pinned_by.filter(id=request.user.id).exists()
        return False

    def get_member_count(self, obj):
        return obj.participants.count()

    def get_online_count(self, obj):
        from django.utils import timezone as tz
        from datetime import timedelta
        cutoff = tz.now() - timedelta(seconds=300)
        return obj.participants.filter(last_activity__gte=cutoff).count()

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if hasattr(obj, '_prefetched_objects_cache') and 'messages' in obj._prefetched_objects_cache:
                return sum(1 for m in obj._prefetched_objects_cache['messages'] if not m.is_read and m.sender_id != request.user.id)
            return obj.messages.filter(
                is_read=False
            ).exclude(sender=request.user).count()
        return 0


class ReportedMessageSerializer(serializers.ModelSerializer):
    reporter_name = serializers.ReadOnlyField(source='reporter.get_full_name')
    message_content = serializers.ReadOnlyField(source='message.content')
    message_sender = serializers.ReadOnlyField(source='message.sender.username')
    resolved_by_name = serializers.ReadOnlyField(source='resolved_by.get_full_name')
    sender_is_muted = serializers.SerializerMethodField()
    sender_is_suspended = serializers.SerializerMethodField()

    class Meta:
        model = ReportedMessage
        fields = ['id', 'message', 'message_content', 'message_sender', 'reporter', 'reporter_name',
                  'reason', 'status', 'moderator_note', 'resolved_by', 'resolved_by_name', 'created_at', 'resolved_at',
                  'sender_is_muted', 'sender_is_suspended']
        read_only_fields = ['reporter', 'status', 'resolved_at', 'resolved_by']

    def get_sender_is_muted(self, obj):
        user = obj.reported_user or (obj.message.sender if obj.message else None)
        if user and hasattr(user, 'profile'):
            mute_until = user.profile.mute_until
            return mute_until is not None and mute_until > timezone.now()
        return False

    def get_sender_is_suspended(self, obj):
        user = obj.reported_user or (obj.message.sender if obj.message else None)
        if user:
            return user.account_status == 'suspended' or not user.is_active
        return False


class UserBlockSerializer(serializers.ModelSerializer):
    blocked_name = serializers.SerializerMethodField()

    class Meta:
        model = UserBlock
        fields = ['id', 'blocked', 'blocked_name', 'created_at']
        read_only_fields = ['blocker', 'created_at']

    def get_blocked_name(self, obj): return full_name(obj.blocked)


class EmergencyMessageSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EmergencyMessage
        fields = ['id', 'title', 'message', 'priority', 'target_audience',
                  'sent_by', 'sent_by_name', 'is_active', 'sent_at', 'expires_at']
        read_only_fields = ['sent_by', 'is_active']

    def get_sent_by_name(self, obj): return full_name(obj.sent_by) if obj.sent_by else ''
