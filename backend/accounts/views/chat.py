import datetime
import logging

from django.utils import timezone
from rest_framework import parsers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import (
    ChatMessage,
    ChatRoom,
    ChatMember,
    Mention,
    Classroom,
    EmergencyMessage,
    Notification,
    ReportedMessage,
    StudentClassEnrollment,
    User,
    UserBlock,
)
from ..permissions import IsAdmin
from ..serializers import (
    ChatMemberSerializer,
    ChatMessageSerializer,
    ChatRoomSerializer,
    EmergencyMessageSerializer,
    ReportedMessageSerializer,
    UserBlockSerializer,
    UserSerializer,
    full_name,
)
from ..storage import upload_file
from ..utils import check_user_moderation
from ._helpers import (
    _broadcast_new_chat_message,
    _broadcast_room_update,
    _notify_user_of_new_room,
)

logger = logging.getLogger(__name__)


class ChatRoomViewSet(viewsets.ModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            return self.request.user.chat_rooms.select_related(
                'last_action_sender', 'last_action_sender__profile'
            ).prefetch_related(
                'participants', 'participants__profile',
                'pinned_by', 'messages'
            ).order_by('-updated_at')
        except Exception as e:
            logger.error(f"ChatRoom queryset error: {str(e)}")
            return ChatRoom.objects.none()

    def perform_create(self, serializer):
        # Check if user is muted or suspended
        is_allowed, reason = check_user_moderation(self.request.user)
        if not is_allowed:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(reason)

        room = serializer.save(created_by=self.request.user, owner=self.request.user)
        room.participants.add(self.request.user)

        # Create owner ChatMember for group chats
        if room.is_group:
            ChatMember.objects.create(
                chat_room=room,
                user=self.request.user,
                role='owner',
            )

        # If participants were provided in the request, add them and notify them
        participant_ids = self.request.data.get('participants', [])
        if participant_ids:
            # Filter out the creator if they were included
            participant_ids = [pid for pid in participant_ids if int(pid) != self.request.user.id]
            if participant_ids:
                users = User.objects.filter(id__in=participant_ids)
                room.participants.add(*users)

                # Create ChatMember entries for group chats
                if room.is_group:
                    members_to_create = [
                        ChatMember(chat_room=room, user=u, role='member')
                        for u in users
                    ]
                    ChatMember.objects.bulk_create(members_to_create, ignore_conflicts=True)

                serialized = ChatRoomSerializer(room, context={'request': self.request}).data
                # Notify ALL participants about the new room
                for participant in room.participants.all():
                    _notify_user_of_new_room(participant.id, serialized)
        else:
            # Just notify the creator (to sync across tabs)
            serialized = ChatRoomSerializer(room, context={'request': self.request}).data
            _notify_user_of_new_room(self.request.user.id, serialized)

    @action(detail=False, methods=['post'])
    def get_or_create_private_chat(self, request):
        # Check if user is muted or suspended
        is_allowed, reason = check_user_moderation(request.user)
        if not is_allowed:
            return Response({'error': reason}, status=status.HTTP_403_FORBIDDEN)

        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            other_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        # Look for existing private chat between these two users
        room = ChatRoom.objects.filter(is_group=False, participants=request.user).filter(participants=other_user).first()

        if not room:
            room = ChatRoom.objects.create(is_group=False)
            room.participants.add(request.user, other_user)
            # Notify the other user about this new chat room live
            serialized = ChatRoomSerializer(room, context={'request': request}).data
            _notify_user_of_new_room(other_user.id, serialized)

        return Response(ChatRoomSerializer(room, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def add_participants(self, request, pk=None):
        room = self.get_object()
        if not room.is_group:
            return Response({'error': 'Cannot add participants to private chat'}, status=status.HTTP_400_BAD_REQUEST)

        user_ids = request.data.get('user_ids', [])
        if not user_ids:
            return Response({'error': 'user_ids is required'}, status=status.HTTP_400_BAD_REQUEST)

        users = User.objects.filter(id__in=user_ids)
        # Filter out already-members
        existing_ids = set(room.participants.values_list('id', flat=True))
        new_users = [u for u in users if u.id not in existing_ids]
        if new_users:
            room.participants.add(*new_users)
            # Create ChatMember entries
            members_to_create = [
                ChatMember(chat_room=room, user=u, role='member')
                for u in new_users
            ]
            ChatMember.objects.bulk_create(members_to_create, ignore_conflicts=True)

        serialized = ChatRoomSerializer(room, context={'request': request}).data
        # Notify existing members of update
        _broadcast_room_update(room.id, serialized)
        # Notify NEW members about the new room live
        for user in (new_users if new_users else users):
            _notify_user_of_new_room(user.id, serialized)

        return Response(serialized)

    @action(detail=True, methods=['post'])
    def pin(self, request, pk=None):
        room = self.get_object()
        room.pinned_by.add(request.user)
        # Broadcast pin state change to self (sync across tabs)
        _notify_user_of_new_room(request.user.id, ChatRoomSerializer(room, context={'request': request}).data)
        return Response({'status': 'pinned'})

    @action(detail=True, methods=['post'])
    def unpin(self, request, pk=None):
        room = self.get_object()
        room.pinned_by.remove(request.user)
        # Broadcast pin state change to self (sync across tabs)
        _notify_user_of_new_room(request.user.id, ChatRoomSerializer(room, context={'request': request}).data)
        return Response({'status': 'unpinned'})

    @action(detail=True, methods=['patch'])
    def rename(self, request, pk=None):
        room = self.get_object()
        name = request.data.get('name')
        if not name:
            return Response({'error': 'name is required'}, status=400)
        room.name = name
        room.save()
        serialized = ChatRoomSerializer(room, context={'request': request}).data
        _broadcast_room_update(room.id, serialized)
        return Response(serialized)

    @action(detail=True, methods=['post'])
    def remove_participant(self, request, pk=None):
        """Remove a member from a group (owner/admin only)"""
        room = self.get_object()
        if not room.is_group:
            return Response({'error': 'Not a group chat'}, status=status.HTTP_400_BAD_REQUEST)

        # Check permissions: owner or admin
        is_owner = room.owner == request.user or room.created_by == request.user
        is_admin = ChatMember.objects.filter(
            chat_room=room, user=request.user, role__in=['owner', 'admin']
        ).exists()
        if not is_owner and not is_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the group owner or admin can remove members")

        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        if int(user_id) == request.user.id:
            return Response({'error': 'Cannot remove yourself'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        room.participants.remove(target)
        ChatMember.objects.filter(chat_room=room, user=target).delete()

        serialized = ChatRoomSerializer(room, context={'request': request}).data
        _broadcast_room_update(room.id, serialized)

        # Notify removed user
        _notify_user_of_new_room(target.id, {'id': room.id, 'removed': True})

        return Response(serialized)

    @action(detail=True, methods=['delete'])
    def delete_group(self, request, pk=None):
        """Permanently delete a group and all its messages (owner only)"""
        room = self.get_object()
        if not room.is_group:
            return Response({'error': 'Not a group chat'}, status=status.HTTP_400_BAD_REQUEST)
        is_owner = room.owner == request.user or room.created_by == request.user
        if not is_owner:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the group owner can delete the group")
        room_id = room.id
        ChatMember.objects.filter(chat_room=room).delete()
        room.delete()
        # Notify all connected members the group is gone
        _broadcast_room_update(room_id, None, event_type='group_deleted')
        return Response({'status': 'group deleted'})

    @action(detail=True, methods=['post'])
    def leave_group(self, request, pk=None):
        """Leave a group chat"""
        room = self.get_object()
        if not room.is_group:
            return Response({'error': 'Not a group chat'}, status=status.HTTP_400_BAD_REQUEST)

        # Owner cannot leave — must transfer ownership first
        if room.owner == request.user:
            return Response({'error': 'Owner cannot leave. Transfer ownership first.'}, status=status.HTTP_400_BAD_REQUEST)

        room.participants.remove(request.user)
        ChatMember.objects.filter(chat_room=room, user=request.user).delete()

        serialized = ChatRoomSerializer(room, context={'request': request}).data
        _broadcast_room_update(room.id, serialized)
        return Response({'status': 'left group'})

    @action(detail=True, methods=['patch'])
    def update_description(self, request, pk=None):
        """Update group description (owner/admin only)"""
        room = self.get_object()
        if not room.is_group:
            return Response({'error': 'Not a group chat'}, status=status.HTTP_400_BAD_REQUEST)

        is_owner = room.owner == request.user or room.created_by == request.user
        is_admin = ChatMember.objects.filter(
            chat_room=room, user=request.user, role__in=['owner', 'admin']
        ).exists()
        if not is_owner and not is_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only owner or admin can update description")

        description = request.data.get('description', '')
        room.description = description
        room.save()
        serialized = ChatRoomSerializer(room, context={'request': request}).data
        _broadcast_room_update(room.id, serialized)
        return Response(serialized)

    @action(detail=True, methods=['post'], parser_classes=[parsers.MultiPartParser, parsers.FormParser])
    def change_avatar(self, request, pk=None):
        """Change group avatar (owner/admin only)"""
        room = self.get_object()
        if not room.is_group:
            return Response({'error': 'Not a group chat'}, status=status.HTTP_400_BAD_REQUEST)

        is_owner = room.owner == request.user or room.created_by == request.user
        is_admin = ChatMember.objects.filter(
            chat_room=room, user=request.user, role__in=['owner', 'admin']
        ).exists()
        if not is_owner and not is_admin:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only owner or admin can change avatar")

        avatar_file = request.FILES.get('avatar')
        if not avatar_file:
            return Response({'error': 'avatar file is required'}, status=status.HTTP_400_BAD_REQUEST)

        url, err = upload_file(avatar_file, bucket_key='chat-avatars', folder=f'room-{room.id}')
        if err:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

        room.avatar = url
        room.save()
        serialized = ChatRoomSerializer(room, context={'request': request}).data
        _broadcast_room_update(room.id, serialized)
        return Response(serialized)

    @action(detail=True, methods=['get', 'patch'])
    def members(self, request, pk=None):
        """List or update member roles"""
        room = self.get_object()
        if not room.is_group:
            return Response({'error': 'Not a group chat'}, status=status.HTTP_400_BAD_REQUEST)

        if request.method == 'GET':
            members = ChatMember.objects.filter(chat_room=room).select_related(
                'user', 'user__profile', 'last_read_message'
            )
            return Response(ChatMemberSerializer(members, many=True).data)

        # PATCH: update member role
        is_owner = room.owner == request.user or room.created_by == request.user
        if not is_owner:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only owner can update member roles")

        user_id = request.data.get('user_id')
        new_role = request.data.get('role')
        if not user_id or new_role not in ['admin', 'member']:
            return Response({'error': 'user_id and valid role (admin/member) are required'}, status=status.HTTP_400_BAD_REQUEST)

        member = ChatMember.objects.filter(chat_room=room, user_id=user_id).first()
        if not member:
            return Response({'error': 'Member not found'}, status=status.HTTP_404_NOT_FOUND)

        member.role = new_role
        member.save()

        serialized = ChatMemberSerializer(member).data
        _broadcast_room_update(room.id, ChatRoomSerializer(room, context={'request': request}).data)
        return Response(serialized)

    @action(detail=True, methods=['post'])
    def transfer_ownership(self, request, pk=None):
        """Transfer group ownership (owner only)"""
        room = self.get_object()
        if not room.is_group:
            return Response({'error': 'Not a group chat'}, status=status.HTTP_400_BAD_REQUEST)

        if room.owner != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the owner can transfer ownership")

        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_owner = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        if not room.participants.filter(id=new_owner.id).exists():
            return Response({'error': 'User must be a member'}, status=status.HTTP_400_BAD_REQUEST)

        # Demote old owner
        ChatMember.objects.filter(chat_room=room, user=request.user).update(role='admin')
        # Promote new owner
        ChatMember.objects.filter(chat_room=room, user=new_owner).update(role='owner')
        room.owner = new_owner
        room.save()

        serialized = ChatRoomSerializer(room, context={'request': request}).data
        _broadcast_room_update(room.id, serialized)
        return Response(serialized)

    @action(detail=True, methods=['post'])
    def toggle_mute(self, request, pk=None):
        """Toggle mute for a member"""
        room = self.get_object()
        if not room.is_group:
            return Response({'error': 'Not a group chat'}, status=status.HTTP_400_BAD_REQUEST)

        member = ChatMember.objects.filter(chat_room=room, user=request.user).first()
        if not member:
            return Response({'error': 'Not a member'}, status=status.HTTP_404_NOT_FOUND)

        member.muted = not member.muted
        member.save()
        return Response({'muted': member.muted})

    @action(detail=True, methods=['post'])
    def update_nickname(self, request, pk=None):
        """Update own nickname in a group"""
        room = self.get_object()
        if not room.is_group:
            return Response({'error': 'Not a group chat'}, status=status.HTTP_400_BAD_REQUEST)

        member = ChatMember.objects.filter(chat_room=room, user=request.user).first()
        if not member:
            return Response({'error': 'Not a member'}, status=status.HTTP_404_NOT_FOUND)

        nickname = request.data.get('nickname', '')
        member.nickname = nickname if nickname else None
        member.save()
        return Response({'nickname': member.nickname})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark all messages in a room as read"""
        room = self.get_object()
        message_id = request.data.get('message_id')
        if message_id:
            try:
                last_msg = ChatMessage.objects.get(id=message_id, room=room)
                ChatMessage.objects.filter(
                    room=room, timestamp__lte=last_msg.timestamp
                ).exclude(sender=request.user).update(is_read=True, is_delivered=True)
                # Update ChatMember last_read_message
                ChatMember.objects.filter(
                    chat_room=room, user=request.user
                ).update(last_read_message=last_msg)
            except ChatMessage.DoesNotExist:
                pass
        return Response({'status': 'marked as read'})

    @action(detail=True, methods=['get'])
    def files(self, request, pk=None):
        """Get all file attachments in a room"""
        room = self.get_object()
        messages = ChatMessage.objects.filter(
            room=room, message_type='file', attachment_url__isnull=False
        ).select_related('sender').order_by('-timestamp')[:50]
        return Response(ChatMessageSerializer(messages, many=True).data)

    @action(detail=True, methods=['get'])
    def media(self, request, pk=None):
        """Get all media (images) in a room"""
        room = self.get_object()
        messages = ChatMessage.objects.filter(
            room=room, message_type='image', attachment_url__isnull=False
        ).select_related('sender').order_by('-timestamp')[:50]
        return Response(ChatMessageSerializer(messages, many=True).data)

    @action(detail=True, methods=['delete'])
    def delete_conversation(self, request, pk=None):
        """Delete all messages in a conversation for this user (or delete the room if group admin)"""
        room = self.get_object()
        # Delete all messages in the room
        ChatMessage.objects.filter(room=room).delete()
        # Remove user from room (for private chats, this effectively deletes it)
        room.participants.remove(request.user)
        if room.participants.count() == 0:
            room.delete()
        return Response({'status': 'conversation deleted'})

    @action(detail=False, methods=['post'])
    def create_class_chat(self, request):
        """Create or get a class-level chat room for a classroom."""
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)
        classroom_id = request.data.get('classroom_id')
        if not classroom_id:
            return Response({'error': 'classroom_id is required'}, status=400)
        try:
            classroom = Classroom.objects.get(id=classroom_id)
        except Classroom.DoesNotExist:
            return Response({'error': 'Classroom not found'}, status=404)
        # Check if class chat already exists
        room = ChatRoom.objects.filter(
            is_group=True, name=f"Class: {classroom.name}"
        ).first()
        if room:
            return Response(ChatRoomSerializer(room, context={'request': request}).data)
        # Create room and add all enrolled students + advisers
        room = ChatRoom.objects.create(
            is_group=True,
            name=f"Class: {classroom.name}",
            created_by=request.user,
        )
        enrolled_students = StudentClassEnrollment.objects.filter(classroom=classroom).values_list('student_id', flat=True)
        participant_ids = list(enrolled_students)
        if classroom.teacher_id:
            participant_ids.append(classroom.teacher_id)
        participant_ids = list(set(participant_ids))
        if participant_ids:
            room.participants.add(*User.objects.filter(id__in=participant_ids))
        serialized = ChatRoomSerializer(room, context={'request': request}).data
        for p in room.participants.all():
            _notify_user_of_new_room(p.id, serialized)
        return Response(serialized)

    @action(detail=False, methods=['post'])
    def emergency_broadcast(self, request):
        """Send an emergency message broadcast to all users of a target audience."""
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can send emergency broadcasts'}, status=403)
        title = request.data.get('title', '').strip()
        message_text = request.data.get('message', '').strip()
        priority = request.data.get('priority', 'warning')
        target_audience = request.data.get('target_audience', 'all')
        if not all([title, message_text]):
            return Response({'error': 'title and message are required'}, status=400)
        # Create the emergency message record
        em = EmergencyMessage.objects.create(
            title=title,
            message=message_text,
            priority=priority,
            target_audience=target_audience,
            sent_by=request.user,
        )
        # Create notifications for all matching users
        target_roles = {
            'all': ['student', 'parent', 'staff'],
            'students': ['student'],
            'parents': ['parent'],
            'teachers': ['staff'],
            'staff': ['staff'],
        }
        roles = target_roles.get(target_audience, ['student', 'parent', 'staff'])
        recipients = User.objects.filter(role__in=roles, is_active=True)
        count = 0
        for user in recipients[:500]:  # batch limit
            Notification.objects.create(
                recipient=user,
                notification_type='system',
                title=f'[{priority.upper()}] {title}',
                message=message_text,
                link='/dashboard',
            )
            count += 1
        # Broadcast via WebSocket
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'emergency_broadcast',
            {
                'type': 'emergency_alert',
                'emergency': EmergencyMessageSerializer(em).data,
            }
        )
        return Response({'message': f'Emergency broadcast sent to {count} users', 'emergency_id': em.id})


class ChatMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base_qs = ChatMessage.objects.select_related(
            'sender', 'parent_message', 'parent_message__sender'
        ).prefetch_related(
            'reactions', 'reactions__user'
        )

        # For detail actions (retrieve, update, destroy, custom actions),
        # return all messages in rooms the user belongs to so get_object() works.
        if self.action in ('retrieve', 'update', 'partial_update', 'destroy', 'edit', 'pin', 'unpin'):
            return base_qs.filter(room__participants=user)

        # For list action, require room_id param
        room_id = self.request.query_params.get('room_id')
        if not room_id:
            return base_qs.none()
        if not user.chat_rooms.filter(id=room_id).exists():
            return base_qs.none()
        return base_qs.filter(room_id=room_id).order_by('timestamp')

    def perform_destroy(self, instance):
        # Only sender can delete their own message
        if instance.sender != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only delete your own messages")

        room_id = instance.room_id
        message_id = instance.id
        
        # Update room last action before deleting
        room = instance.room
        room.last_action_type = 'unsend'
        room.last_action_sender = self.request.user
        room.save()
        
        instance.delete()

        # Broadcast deletion to all room participants via WebSocket
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        
        broadcast_data = {
            'type': 'message_deleted',
            'message_id': message_id,
            'deleted_by': self.request.user.id,
            'deleted_by_name': self.request.user.first_name or self.request.user.username,
            'room_id': room_id,
        }
        
        # Room broadcast
        async_to_sync(channel_layer.group_send)(f'chat_{room_id}', broadcast_data)
        
        # Personal channel broadcasts for room list updates (including sender)
        participants = room.participants.all()
        for p in participants:
            async_to_sync(channel_layer.group_send)(f'user_{p.id}', broadcast_data)

    @action(detail=True, methods=['patch'])
    def edit(self, request, pk=None):
        """Edit a message (sender only)"""
        message = self.get_object()
        if message.sender != request.user:
            return Response({'error': 'You can only edit your own messages'}, status=status.HTTP_403_FORBIDDEN)
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Content cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
        message.content = content
        message.is_edited = True
        message.save()

        # Update room last action
        room = message.room
        room.last_action_type = 'edit'
        room.last_action_sender = request.user
        room.last_action_content = content
        room.save()

        # Broadcast edit to all room participants
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        
        broadcast_data = {
            'type': 'message_edited',
            'message_id': message.id,
            'content': content,
            'edited_by': request.user.id,
            'edited_by_name': request.user.first_name or request.user.username,
            'room_id': message.room_id,
        }
        
        # Room broadcast
        async_to_sync(channel_layer.group_send)(f'chat_{message.room_id}', broadcast_data)
        
        # Personal channel broadcasts (including sender)
        participants = message.room.participants.all()
        for p in participants:
            async_to_sync(channel_layer.group_send)(f'user_{p.id}', broadcast_data)

        serializer = self.get_serializer(message)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def pin(self, request, pk=None):
        message = self.get_object()
        message.is_pinned = True
        message.save()

        # Broadcast pin to all room participants
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_{message.room_id}',
            {
                'type': 'message_pinned',
                'message_id': message.id,
                'is_pinned': True,
            }
        )
        return Response({'status': 'pinned'})

    @action(detail=True, methods=['post'])
    def unpin(self, request, pk=None):
        message = self.get_object()
        message.is_pinned = False
        message.save()

        # Broadcast unpin to all room participants
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_{message.room_id}',
            {
                'type': 'message_pinned',
                'message_id': message.id,
                'is_pinned': False,
            }
        )
        return Response({'status': 'unpinned'})

    @action(detail=False, methods=['post'], parser_classes=[parsers.MultiPartParser, parsers.FormParser])
    def send_media(self, request):
        """Upload an image or file and send it as a chat message."""
        is_allowed, reason = check_user_moderation(request.user)
        if not is_allowed:
            return Response({'error': reason}, status=status.HTTP_403_FORBIDDEN)

        room_id = request.data.get('room_id')
        if not room_id:
            return Response({'error': 'room_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            room = ChatRoom.objects.get(id=room_id, participants=request.user)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Chat room not found'}, status=status.HTTP_404_NOT_FOUND)

        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'error': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)

        caption = (request.data.get('caption') or '').strip()
        parent_id = request.data.get('parent_id')

        url, err = upload_file(uploaded, bucket_key='chat-attachments', folder=f'room-{room_id}')
        if err:
            return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

        content_type = uploaded.content_type or ''
        message_type = 'image' if content_type.startswith('image/') else 'file'
        preview = caption or ('📷 Photo' if message_type == 'image' else f'📎 {uploaded.name}')

        parent = None
        if parent_id:
            try:
                parent = ChatMessage.objects.get(id=parent_id, room=room)
            except ChatMessage.DoesNotExist:
                pass

        room.last_action_type = 'message'
        room.last_action_sender = request.user
        room.last_action_content = preview
        room.save()

        message = ChatMessage.objects.create(
            room=room,
            sender=request.user,
            content=caption,
            message_type=message_type,
            attachment_url=url,
            attachment_filename=uploaded.name,
            attachment_content_type=content_type,
            file_size_bytes=uploaded.size,
            parent_message=parent,
        )

        serialized = self.get_serializer(message).data
        _broadcast_new_chat_message(message, serialized, request.user)
        return Response(serialized, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search messages across all rooms the user belongs to."""
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'error': 'q parameter is required'}, status=400)
        room_id = request.query_params.get('room_id')
        qs = ChatMessage.objects.filter(
            room__participants=request.user
        ).select_related('sender', 'room')
        if room_id:
            qs = qs.filter(room_id=room_id)
        qs = qs.filter(content__icontains=query).order_by('-timestamp')[:50]
        return Response(ChatMessageSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def pinned(self, request):
        """Get all pinned messages across user's rooms."""
        room_id = request.query_params.get('room_id')
        qs = ChatMessage.objects.filter(
            room__participants=request.user, is_pinned=True
        ).select_related('sender', 'room')
        if room_id:
            qs = qs.filter(room_id=room_id)
        qs = qs.order_by('-timestamp')[:50]
        return Response(ChatMessageSerializer(qs, many=True).data)


class ReportedMessageViewSet(viewsets.ModelViewSet):
    serializer_class = ReportedMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ReportedMessage.objects.select_related(
            'message', 'message__sender', 'reporter', 'reported_user'
        )
        if self.request.user.role != 'admin':
            queryset = queryset.filter(reporter=self.request.user)
            
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            queryset = queryset.filter(status=status_filter)
            
        return queryset

    def perform_create(self, serializer):
        report = serializer.save(reporter=self.request.user)
        
        # Send realtime alert to admins
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'moderation_alerts',
            {
                'type': 'moderation_alert',
                'data': {
                    'id': report.id,
                    'reporter': report.reporter.username,
                    'reason': report.reason[:100],
                    'message_sender': report.message.sender.username
                }
            }
        )

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
        report = self.get_object()
        report.status = 'resolved'
        report.moderator_note = request.data.get('note', '')
        report.resolved_by = request.user
        report.resolved_at = timezone.now()
        report.save()
        return Response({'status': 'Report resolved'})

    @action(detail=True, methods=['post'], url_path='delete-message')
    def delete_message(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
        
        report = self.get_object()
        message = report.message
        note = request.data.get('note', 'Message deleted by moderator.')

        if not message:
            # If message is already gone, just resolve the report
            report.status = 'resolved'
            report.moderator_note = f"{note} (Note: Message was already removed)"
            report.resolved_by = request.user
            report.resolved_at = timezone.now()
            report.save()
            return Response({'status': 'Report resolved (message was already deleted)'})
        
        sender = message.sender
        room = message.room
        room_name = room.name if room and room.is_group else "a chat room"
        room_id = message.room_id
        message_id = message.id
        
        # Broadcast before deletion
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        
        broadcast_data = {
            'type': 'message_deleted',
            'message_id': message_id,
            'deleted_by': request.user.id,
            'deleted_by_name': "Moderator",
            'room_id': room_id,
        }
        
        # Room broadcast
        async_to_sync(channel_layer.group_send)(f'chat_{room_id}', broadcast_data)
        
        # Personal channel broadcasts
        if room:
            participants = room.participants.all()
            for p in participants:
                async_to_sync(channel_layer.group_send)(f'user_{p.id}', broadcast_data)
            
        message.delete()
        
        # Notify the sender
        Notification.objects.create(
            recipient=sender,
            notification_type='system',
            title='Message Removed',
            message=f'Your message in "{room_name}" was removed by a moderator. Reason: {note}'
        )
        
        # Notify the reporter
        Notification.objects.create(
            recipient=report.reporter,
            notification_type='system',
            title='Report Resolved',
            message=f'Your report regarding a message has been resolved. The message was removed.'
        )
        
        report.status = 'resolved'
        report.moderator_note = note
        report.resolved_by = request.user
        report.resolved_at = timezone.now()
        report.save()
        
        return Response({'status': 'Message deleted and report resolved'})

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
        report = self.get_object()
        note = request.data.get('note', 'Report dismissed by moderator.')
        
        # Notify the reporter
        Notification.objects.create(
            recipient=report.reporter,
            notification_type='system',
            title='Report Dismissed',
            message=f'Your report has been reviewed and dismissed. No action was taken at this time.'
        )
        
        report.status = 'dismissed'
        report.moderator_note = note
        report.resolved_by = request.user
        report.resolved_at = timezone.now()
        report.save()
        return Response({'status': 'Report dismissed'})

    @action(detail=True, methods=['post'], url_path='suspend-user')
    def suspend_user(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
        report = self.get_object()
        user_to_suspend = report.reported_user
        
        if not user_to_suspend:
            return Response({'error': 'Reported user not found'}, status=404)
            
        note = request.data.get('note', f'User {user_to_suspend.username} suspended.')
        
        # Suspend user
        user_to_suspend.account_status = 'suspended'
        user_to_suspend.is_active = False # Hard disable
        user_to_suspend.save()
        
        # Also update profile
        if hasattr(user_to_suspend, 'profile'):
            user_to_suspend.profile.is_suspended = True
            user_to_suspend.profile.save()
            
        # Force logout if online via WebSocket
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{user_to_suspend.id}',
            {
                'type': 'forced_logout',
                'message': 'Your account has been suspended by a moderator.'
            }
        )

        # Notify the suspended user
        Notification.objects.create(
            recipient=user_to_suspend,
            notification_type='system',
            title='Account Suspended',
            message=f'Your account has been suspended by a moderator. Reason: {note}'
        )

        # Notify the reporter
        Notification.objects.create(
            recipient=report.reporter,
            notification_type='system',
            title='Report Resolved',
            message=f'Action has been taken against the user you reported. They have been suspended.'
        )
            
        report.status = 'resolved'
        report.moderator_note = note
        report.resolved_by = request.user
        report.resolved_at = timezone.now()
        report.save()
        
        return Response({'status': f'User {user_to_suspend.username} suspended and report resolved'})

    @action(detail=True, methods=['post'], url_path='unsuspend-user')
    def unsuspend_user(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
        report = self.get_object()
        user_to_unsuspend = report.reported_user
        
        if not user_to_unsuspend:
            return Response({'error': 'Reported user not found'}, status=404)
            
        # Unsuspend user
        user_to_unsuspend.account_status = 'active'
        user_to_unsuspend.is_active = True
        user_to_unsuspend.save()
        
        if hasattr(user_to_unsuspend, 'profile'):
            user_to_unsuspend.profile.is_suspended = False
            user_to_unsuspend.profile.save()
            
        return Response({'status': f'User {user_to_unsuspend.username} unsuspended'})

    @action(detail=True, methods=['post'], url_path='mute-user')
    def mute_user(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
        report = self.get_object()
        user_to_mute = report.reported_user
        
        if not user_to_mute:
            return Response({'error': 'Reported user not found'}, status=404)
            
        hours = int(request.data.get('hours', 24))
        note = request.data.get('note', f'User {user_to_mute.username} muted for {hours} hours.')
        
        if hasattr(user_to_mute, 'profile'):
            user_to_mute.profile.mute_until = timezone.now() + datetime.timedelta(hours=hours)
            user_to_mute.profile.save()
            
        # Notify the muted user
        Notification.objects.create(
            recipient=user_to_mute,
            notification_type='system',
            title='Messaging Muted',
            message=f'Your messaging privileges have been suspended for {hours} hours. Reason: {note}'
        )

        # Notify the reporter
        Notification.objects.create(
            recipient=report.reporter,
            notification_type='system',
            title='Report Resolved',
            message=f'Action has been taken against the user you reported. They have been muted for {hours} hours.'
        )
            
        report.status = 'resolved'
        report.moderator_note = note
        report.resolved_by = request.user
        report.resolved_at = timezone.now()
        report.save()
        
        return Response({'status': f'User {user_to_mute.username} muted and report resolved'})

    @action(detail=True, methods=['post'], url_path='unmute-user')
    def unmute_user(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
        report = self.get_object()
        user_to_unmute = report.reported_user
        
        if not user_to_unmute:
            return Response({'error': 'Reported user not found'}, status=404)
        
        if hasattr(user_to_unmute, 'profile'):
            user_to_unmute.profile.mute_until = None
            user_to_unmute.profile.save()
            
        # Notify the user
        Notification.objects.create(
            recipient=user_to_unmute,
            notification_type='system',
            title='Messaging Restored',
            message=f'Your messaging privileges have been restored by a moderator.'
        )
        
        return Response({'status': f'User {user_to_unmute.username} unmuted'})

    @action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
    def bulk_delete(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No reports selected'}, status=400)
        
        deleted_count, _ = ReportedMessage.objects.filter(id__in=ids).delete()
        return Response({'status': f'Successfully deleted {deleted_count} reports'})


class UserBlockViewSet(viewsets.ModelViewSet):
    serializer_class = UserBlockSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserBlock.objects.filter(blocker=self.request.user).select_related('blocked')

    def perform_create(self, serializer):
        blocked_user = serializer.validated_data['blocked']
        if blocked_user.id == self.request.user.id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Cannot block yourself")
        serializer.save(blocker=self.request.user)

    @action(detail=True, methods=['delete'])
    def unblock(self, request, pk=None):
        block = self.get_object()
        block.delete()
        return Response({'status': 'unblocked'})

    @action(detail=False, methods=['get'])
    def check_blocked(self, request):
        """Check if a specific user is blocked by the current user or vice versa."""
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=400)
        blocked_by_me = UserBlock.objects.filter(blocker=request.user, blocked_id=user_id).exists()
        blocked_by_them = UserBlock.objects.filter(blocker_id=user_id, blocked=request.user).exists()
        return Response({
            'blocked_by_me': blocked_by_me,
            'blocked_by_them': blocked_by_them,
            'is_blocked': blocked_by_me or blocked_by_them,
        })
