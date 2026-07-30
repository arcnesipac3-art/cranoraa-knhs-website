"""Shared helper functions used across view modules."""
import datetime
import logging

from django.conf import settings
from django.utils import timezone
from rest_framework.response import Response

logger = logging.getLogger(__name__)


# ─── Cookie helpers ───────────────────────────────────────────────────────────

def _set_refresh_cookie(response, refresh_token: str):
    """
    Store the JWT refresh token in an httpOnly, Secure, SameSite cookie.
    httpOnly prevents JavaScript from reading it, which eliminates XSS token theft.
    The access token (short-lived, 15 min) stays in memory on the frontend.
    """
    from django.conf import settings as _settings
    is_prod = not _settings.DEBUG
    response.set_cookie(
        key='refresh_token',
        value=refresh_token,
        httponly=True,
        secure=is_prod,          # HTTPS-only in production
        samesite='None' if is_prod else 'Lax',  # None for cross-origin (Vercel→Render), Lax for local dev
        max_age=7 * 24 * 60 * 60,     # 7 days — matches SIMPLE_JWT REFRESH_TOKEN_LIFETIME
        path='/api/v1/token/',        # Scoped: only sent to the refresh endpoint
    )


def _clear_refresh_cookie(response):
    """Delete the refresh token cookie on logout."""
    from django.conf import settings as _settings
    is_prod = not _settings.DEBUG
    response.delete_cookie(
        key='refresh_token',
        path='/api/v1/token/',
        samesite='None' if is_prod else 'Lax',
    )


# ─── WebSocket broadcast helpers ─────────────────────────────────────────────

def _broadcast_room_update(room_id, room_data, event_type='room_updated'):
    """Broadcast a room_updated or group_deleted event to all members in the channel group."""
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'chat_{room_id}',
        {
            'type': 'room_update',
            'event': event_type,
            'room': room_data,
            'room_id': room_id,
        }
    )


def _notify_user_of_new_room(user_id, room_data):
    """Notify a specific user via their personal channel about a new room they joined."""
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'user_{user_id}',
        {
            'type': 'room_update',
            'event': 'new_room',
            'room': room_data,
            'room_id': room_data['id'],
        }
    )


def _chat_preview_content(message):
    """Short preview for room list and push notifications."""
    content = (message.content or '').strip()
    if content:
        return content
    if message.message_type == 'image':
        return '📷 Photo'
    if message.message_type == 'file':
        return f'📎 {message.attachment_filename or "File"}'
    return ''


def _broadcast_new_chat_message(message, serialized_data, sender):
    """Broadcast a new chat message to room WebSocket groups and offline notifications."""
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    from ..models import ChatMessage
    from ..serializers import full_name

    channel_layer = get_channel_layer()
    room_id = message.room_id
    preview = _chat_preview_content(message)

    # Single broadcast to the room — all connected participants receive it.
    async_to_sync(channel_layer.group_send)(f'chat_{room_id}', {
        'type': 'chat_message',
        'message_data': serialized_data,
    })

    # Consolidated notifications: same sender → same recipient gets one
    # notification that updates its count instead of creating a new one.
    sender_name = full_name(sender)
    room = message.room
    room_label = room.name if room.is_group else sender_name
    preview_text = preview[:80] + ('…' if len(preview) > 80 else '')
    from ..models.notifications import consolidate_message_notification
    for participant in room.participants.exclude(id=sender.id):
        consolidate_message_notification(
            recipient=participant,
            sender=sender,
            room_label=room_label,
            preview=preview_text,
        )


def _get_time_ago(timestamp):
    """Helper function to get time ago string."""
    now = timezone.now()
    diff = now - timestamp

    if diff < datetime.timedelta(minutes=1):
        return 'Just now'
    elif diff < datetime.timedelta(hours=1):
        return f'{diff.seconds // 60} min ago'
    elif diff < datetime.timedelta(days=1):
        return f'{diff.seconds // 3600} hours ago'
    else:
        return f'{diff.days} days ago'


def get_latest_messages(user, limit=5):
    """
    Get latest unique-sender chat messages for a user.
    Used by teacher, student, and admin dashboard views.
    """
    from ..models import ChatMessage
    from ..serializers import full_name

    msg_objs = ChatMessage.objects.filter(
        room__participants=user
    ).exclude(sender=user).select_related('sender', 'sender__profile').order_by('-timestamp')[:50]

    latest_messages = []
    seen_senders = set()
    for m in msg_objs:
        if m.sender_id not in seen_senders:
            latest_messages.append({
                'id': m.id,
                'content': m.content,
                'timestamp': m.timestamp.isoformat() if m.timestamp else '',
                'sender': full_name(m.sender),
                'sender_profile_picture': getattr(
                    getattr(m.sender, 'profile', None) if m.sender else None,
                    'profile_picture', None
                ),
                'is_read': m.is_read
            })
            seen_senders.add(m.sender_id)
        if len(latest_messages) >= limit:
            break

    return latest_messages
