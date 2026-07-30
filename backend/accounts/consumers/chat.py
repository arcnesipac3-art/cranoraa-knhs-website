import json
import time
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from ..models import ChatRoom, ChatMessage, MessageReaction, Notification
from ..serializers import ChatMessageSerializer
from ..utils import check_user_moderation
from .base import (
    _rate_limiter, PRESENCE_DEBOUNCE_SECONDS, TYPING_THROTTLE_SECONDS,
    MESSAGE_RATE_LIMIT, MESSAGE_RATE_WINDOW,
)

logger = logging.getLogger(__name__)

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        self.user = self.scope['user']

        self._last_presence_broadcast = 0
        self._last_typing_sent = 0
        self._last_read_sent = 0
        self._authenticated = False

        if self.user and not self.user.is_anonymous:
            if await self._do_auth():
                await self.accept()
            else:
                await self.close(code=4403)
        else:
            await self.accept()

    async def _do_auth(self):
        """Authenticate and join groups. Returns True on success."""
        await self.update_last_activity()

        if self.room_id != '0':
            if not await self.is_room_participant(self.room_id, self.user.id):
                return False

            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.mark_messages_delivered(self.room_id, self.user.id)
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'user_online',
                'user_id': self.user.id,
            })

        await self.channel_layer.group_add(f'user_{self.user.id}', self.channel_name)
        self._authenticated = True
        return True

    async def disconnect(self, close_code):
        if self.user and self.user.is_authenticated and self._authenticated:
            if self.room_id != '0':
                await self.channel_layer.group_send(self.room_group_name, {
                    'type': 'typing_indicator',
                    'sender_id': self.user.id,
                    'sender_name': self.user.first_name or self.user.username,
                    'is_typing': False,
                })
                await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

            await self.channel_layer.group_discard(f'user_{self.user.id}', self.channel_name)

    @database_sync_to_async
    def update_last_activity(self):
        User.objects.filter(id=self.user.id).update(last_activity=timezone.now())

    @database_sync_to_async
    def is_room_participant(self, room_id, user_id):
        return ChatRoom.objects.filter(id=room_id, participants__id=user_id).exists()

    async def peer_presence(self, event):
        await self.send(text_data=json.dumps({
            'type': 'peer_presence',
            'user_id': event['user_id'],
            'is_online': event['is_online'],
        }))

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid message format.'
            }))
            return

        # Handle first-message auth
        if not self._authenticated:
            if data.get('type') == 'auth' and data.get('token'):
                from jwt import decode as jwt_decode
                from django.conf import settings as django_settings
                try:
                    decoded = jwt_decode(
                        data['token'],
                        django_settings.SECRET_KEY,
                        algorithms=['HS256']
                    )
                    self.user = await database_sync_to_async(User.objects.get)(id=decoded['user_id'])
                    if await self._do_auth():
                        await self.send(text_data=json.dumps({
                            'type': 'auth_success',
                            'user_id': self.user.id,
                        }))
                    else:
                        await self.send(text_data=json.dumps({
                            'type': 'auth_failed',
                            'message': 'No access to this room'
                        }))
                        await self.close(code=4403)
                except Exception:
                    await self.send(text_data=json.dumps({
                        'type': 'auth_failed',
                        'message': 'Invalid token'
                    }))
                    await self.close()
            else:
                await self.close()
            return

        try:
            await self._handle_authenticated_message(data)
        except Exception as e:
            logger.error(
                f'ChatConsumer error in room {self.room_id} user {getattr(self.user, "id", "?")}: {e}',
                exc_info=True,
            )
            try:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Something went wrong. Please try again.',
                }))
            except Exception:
                pass

    async def _handle_authenticated_message(self, data):
        msg_type = data.get('type', 'message')

        if self.room_id == '0' and msg_type in {'typing', 'read', 'reaction', 'message'}:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Select a chat room before sending room actions.'
            }))
            return

        if msg_type == 'typing':
            now = time.monotonic()
            if (now - self._last_typing_sent) < TYPING_THROTTLE_SECONDS:
                return
            self._last_typing_sent = now
            await self.channel_layer.group_send(self.room_group_name, {
                'type': 'typing_indicator',
                'sender_id': self.user.id,
                'sender_name': self.user.first_name or self.user.username,
                'is_typing': data.get('is_typing', False),
            })
            return

        if msg_type == 'read':
            message_id = data.get('message_id')
            if message_id:
                await self.mark_messages_read(self.room_id, self.user.id, message_id)
                now = time.monotonic()
                if (now - self._last_read_sent) >= 10:
                    self._last_read_sent = now
                    await self.channel_layer.group_send(self.room_group_name, {
                        'type': 'read_receipt',
                        'reader_id': self.user.id,
                        'message_id': message_id,
                    })
            return

        if msg_type == 'reaction':
            reaction_key = f'reaction_{self.user.id}'
            if _rate_limiter.is_rate_limited(reaction_key, 20, 60):
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'You are reacting too quickly. Please slow down.'
                }))
                return
            await self.handle_reaction(data)
            return

        is_allowed, reason = await self.async_check_moderation()
        if not is_allowed:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': reason
            }))
            return

        rate_limit_key = f'user_{self.user.id}'
        if _rate_limiter.is_rate_limited(rate_limit_key, MESSAGE_RATE_LIMIT, MESSAGE_RATE_WINDOW):
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'You are sending messages too quickly. Please slow down.'
            }))
            return

        message = data.get('message', '').strip()
        if not message:
            return

        parent_id = data.get('parent_id')
        saved_msg = await self.save_message(self.room_id, self.user.id, message, parent_id)
        if not saved_msg:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'You do not have access to this chat room.'
            }))
            return

        serialized_msg = await self.serialize_message(saved_msg)

        # Single broadcast to the room — all connected participants receive it.
        await self.channel_layer.group_send(self.room_group_name, {
            'type': 'chat_message',
            'message_data': serialized_msg
        })

    async def handle_reaction(self, data):
        message_id = data.get('message_id')
        emoji = data.get('emoji')
        if not message_id or not emoji:
            return

        reaction_data = await self.toggle_reaction(message_id, self.user.id, emoji)
        if reaction_data is None:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'You do not have access to this message.'
            }))
            return

        broadcast_data = {
            'type': 'message_reaction',
            'message_id': message_id,
            'reactions': reaction_data,
            'user_id': self.user.id,
            'user_name': self.user.first_name or self.user.username,
            'emoji': emoji,
            'room_id': int(self.room_id)
        }

        # Single broadcast to the room — all connected participants receive it.
        await self.channel_layer.group_send(self.room_group_name, broadcast_data)

    # ── Handlers ──────────────────────────────────────────────────────────

    async def chat_message(self, event):
        msg_data = event['message_data']
        if msg_data['sender'] != self.user.id:
            await self.set_delivered(msg_data['id'], self.user.id)

        await self.send(text_data=json.dumps({
            'type': 'message',
            **msg_data,
            'room_id': int(self.room_id),
        }))

    async def message_reaction(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_reaction',
            'message_id': event['message_id'],
            'reactions': event['reactions'],
            'user_id': event.get('user_id'),
            'user_name': event.get('user_name'),
            'emoji': event.get('emoji'),
            'room_id': event.get('room_id'),
        }))

    async def typing_indicator(self, event):
        if event['sender_id'] == self.user.id:
            return
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'is_typing': event['is_typing'],
        }))

    async def delivery_receipt(self, event):
        await self.send(text_data=json.dumps({
            'type': 'delivered',
            'message_id': event['message_id'],
        }))

    async def read_receipt(self, event):
        await self.send(text_data=json.dumps({
            'type': 'read',
            'reader_id': event['reader_id'],
            'message_id': event['message_id'],
        }))

    async def user_online(self, event):
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'peer_online',
                'user_id': event['user_id'],
            }))

    async def message_deleted(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'message_id': event['message_id'],
            'deleted_by': event['deleted_by'],
            'deleted_by_name': event.get('deleted_by_name'),
            'room_id': event.get('room_id'),
        }))

    async def message_edited(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_edited',
            'message_id': event['message_id'],
            'content': event['content'],
            'edited_by': event.get('edited_by'),
            'edited_by_name': event.get('edited_by_name'),
            'room_id': event.get('room_id'),
        }))

    async def message_pinned(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_pinned',
            'message_id': event['message_id'],
            'is_pinned': event['is_pinned'],
        }))

    async def room_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'room_update',
            'event': event['event'],
            'room': event.get('room'),
            'room_id': event['room_id'],
        }))

    async def forced_logout(self, event):
        await self.send(text_data=json.dumps({
            'type': 'forced_logout',
            'message': event.get('message', 'Your account has been suspended.')
        }))
        await self.close()

    # ── DB helpers ────────────────────────────────────────────────────────

    @database_sync_to_async
    def async_check_moderation(self):
        user = User.objects.get(id=self.user.id)
        return check_user_moderation(user)

    @database_sync_to_async
    def save_message(self, room_id, sender_id, message, parent_id=None):
        room = ChatRoom.objects.filter(id=room_id, participants__id=sender_id).first()
        if not room:
            return None
        sender = User.objects.get(id=sender_id)
        parent = None
        if parent_id:
            try:
                parent = ChatMessage.objects.get(id=parent_id, room=room)
            except ChatMessage.DoesNotExist:
                pass

        room.last_action_type = 'message'
        room.last_action_sender = sender
        room.last_action_content = message
        room.save()

        msg = ChatMessage.objects.create(room=room, sender=sender, content=message, parent_message=parent)

        import datetime
        from django.utils import timezone as tz
        sender_name = sender.get_full_name() or sender.username
        room_label = room.name if room.is_group else sender_name
        preview = message[:80] + ('…' if len(message) > 80 else '')

        # Notify ALL non-sender participants — WebSocket delivers to online users,
        # FCM push delivers to backgrounded/offline users.
        offline_participants = room.participants.exclude(id=sender_id)
        notif_list = [
            Notification(
                recipient=participant,
                notification_type='message',
                title=f'New message from {sender_name}',
                message=f'{room_label}: {preview}',
                link='/communication-center',
            )
            for participant in offline_participants
        ]
        if notif_list:
            Notification.objects.bulk_create(notif_list)
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            for notif in notif_list:
                async_to_sync(channel_layer.group_send)(
                    f'notifications_{notif.recipient_id}',
                    {
                        'type': 'notification_message',
                        'data': {
                            'type': 'notification',
                            'id': notif.id,
                            'title': notif.title,
                            'message': notif.message,
                            'notification_type': notif.notification_type,
                            'link': notif.link,
                            'created_at': notif.created_at.isoformat(),
                        }
                    }
                )
            # Explicitly send FCM push — bulk_create skips post_save signal
            from ..fcm import send_push_notification
            for notif in notif_list:
                prefs = getattr(notif.recipient, 'notification_preferences', None)
                if not prefs or prefs.push_enabled:
                    send_push_notification(
                        user=notif.recipient,
                        title=notif.title,
                        body=notif.message,
                        data={'notification_type': notif.notification_type, 'link': notif.link or '', 'notification_id': str(notif.id)},
                    )

        return msg

    @database_sync_to_async
    def serialize_message(self, msg):
        return ChatMessageSerializer(msg).data

    @database_sync_to_async
    def get_room_participant_ids(self, room_id):
        room = ChatRoom.objects.filter(id=room_id, participants=self.user).first()
        if not room:
            return []
        return list(room.participants.values_list('id', flat=True))

    @database_sync_to_async
    def set_delivered(self, msg_id, user_id):
        ChatMessage.objects.filter(
            id=msg_id,
            room__participants__id=user_id
        ).update(is_delivered=True)

    @database_sync_to_async
    def mark_messages_delivered(self, room_id, user_id):
        if not ChatRoom.objects.filter(id=room_id, participants__id=user_id).exists():
            return
        ChatMessage.objects.filter(room_id=room_id).exclude(sender_id=user_id).update(is_delivered=True)

    @database_sync_to_async
    def mark_messages_read(self, room_id, user_id, last_msg_id):
        try:
            if not ChatRoom.objects.filter(id=room_id, participants__id=user_id).exists():
                return
            last_msg = ChatMessage.objects.get(id=last_msg_id, room_id=room_id)
            ChatMessage.objects.filter(
                room_id=room_id,
                timestamp__lte=last_msg.timestamp
            ).exclude(sender_id=user_id).update(is_read=True, is_delivered=True)
        except ChatMessage.DoesNotExist:
            pass

    @database_sync_to_async
    def toggle_reaction(self, message_id, user_id, emoji):
        msg = ChatMessage.objects.filter(
            id=message_id,
            room__participants__id=user_id
        ).first()
        if not msg:
            return None
        user = User.objects.get(id=user_id)

        existing_this_emoji = MessageReaction.objects.filter(message=msg, user=user, emoji=emoji)
        if existing_this_emoji.exists():
            existing_this_emoji.delete()
        else:
            MessageReaction.objects.filter(message=msg, user=user).delete()
            MessageReaction.objects.create(message=msg, user=user, emoji=emoji)

        reactions = {}
        for r in MessageReaction.objects.filter(message=msg).select_related('user'):
            if r.emoji not in reactions:
                reactions[r.emoji] = []
            reactions[r.emoji].append({
                'user_id': r.user.id,
                'user_name': r.user.first_name or r.user.username
            })
        return reactions
