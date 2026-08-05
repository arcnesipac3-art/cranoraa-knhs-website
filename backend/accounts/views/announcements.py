from rest_framework import viewsets, status, parsers, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Count
from django.db.models import Q
from rest_framework.permissions import AllowAny
from rest_framework.decorators import throttle_classes
from django.contrib.auth import get_user_model

from ..models import (
    Announcement,
    AnnouncementAttachment,
    AnnouncementComment,
    Notification,
)
from ..serializers import (
    AnnouncementSerializer,
    AnnouncementCommentSerializer,
)
from ..serializers import full_name
from rest_framework.permissions import IsAuthenticated
from ..throttles import PublicReadRateThrottle
from ..storage import upload_file, StorageValidationError
from ..utils import log_audit_action

import logging

logger = logging.getLogger(__name__)


AUDIENCE_TO_ROLE = {
    'admins': 'admin',
    'students': 'student',
    'teachers': 'staff',
    'parents': 'parent',
}


def _invalidate_public_announcements_cache():
    from django.core.cache import cache
    cache.delete('public_announcements:v1')


class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'content']
    
    def get_queryset(self):
        from django.utils import timezone
        category = self.request.query_params.get('category')
        status_filter = self.request.query_params.get('status')
        queryset = Announcement.objects.select_related(
            'author', 'author__profile'
        ).prefetch_related(
            'read_by', 'attachments', 'comments'
        ).all()

        user = self.request.user

        # RBAC and Targeting logic
        if user.role == 'student':
            # Students see live announcements targeted at 'all', 'students', or their classroom
            queryset = queryset.filter(status='live')
            queryset = queryset.filter(
                Q(target_audience__in=['all', 'students']) | 
                Q(target_classrooms__enrollments__student=user)
            ).distinct()
            queryset = queryset.exclude(event_date__lt=timezone.now())

        elif user.role == 'parent':
            # Parents see live announcements targeted at 'all', 'parents', or their linked students' classrooms
            profile = getattr(user, 'profile', None)
            linked_student_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            queryset = queryset.filter(status='live')
            queryset = queryset.filter(
                Q(target_audience__in=['all', 'parents']) |
                Q(target_classrooms__enrollments__student_id__in=linked_student_ids)
            ).distinct()
            queryset = queryset.exclude(event_date__lt=timezone.now())

        elif user.role == 'staff':
            # Teachers see live announcements targeted at 'all', 'teachers', or their own drafts
            queryset = queryset.filter(
                Q(status='live', target_audience__in=['all', 'teachers']) | 
                Q(author=user)
            ).distinct()
            queryset = queryset.exclude(event_date__lt=timezone.now())

        elif user.role == 'admin':
            # Admins see everything
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            else:
                queryset = queryset.exclude(
                    event_date__lt=timezone.now(),
                    status='expired'
                )

        if category and category != 'all':
            queryset = queryset.filter(category=category)

        return queryset.annotate(comment_count_annotated=Count('comments')).order_by('-is_pinned', '-created_at')
    
    def perform_create(self, serializer):
        if self.request.user.role not in ('admin', 'staff'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Only teachers and admins can create announcements.')
        try:
            announcement = serializer.save(author=self.request.user)
            logger.info(f"Announcement created: {announcement.title}")

            # Save multiple attachments to Supabase 'announcements' bucket
            files = self.request.FILES.getlist('attachments')
            logger.info(f"Found {len(files)} attachment(s)")
            for f in files:
                try:
                    url, err = upload_file(f, bucket_key='announcements', folder='attachments')
                    if url:
                        AnnouncementAttachment.objects.create(
                            announcement=announcement,
                            file=url,
                            filename=f.name,
                            file_size_bytes=f.size,
                            content_type=getattr(f, 'content_type', '') or '',
                        )
                        logger.info(f"Uploaded announcement attachment: {f.name}")
                    else:
                        logger.error(f"Failed to upload attachment {f.name}: {err}")
                except Exception as e:
                    logger.error(f"Error uploading attachment {f.name}: {str(e)}")

            # Log announcement creation
            log_audit_action(
                user=self.request.user,
                action='create',
                model_name='Announcement',
                object_id=announcement.id,
                object_repr=announcement.title,
                description=f'Created announcement: {announcement.title}',
                request=self.request
            )

            # Create notifications for target audience
            User = get_user_model()
            
            # Filter users based on target audience and classrooms
            target_users = User.objects.filter(is_active=True, is_verified=True)
            
            if announcement.target_audience != 'all':
                role = AUDIENCE_TO_ROLE.get(announcement.target_audience, announcement.target_audience)
                target_users = target_users.filter(role=role)
            
            if announcement.target_classrooms.exists():
                target_users = target_users.filter(enrollments__classroom__in=announcement.target_classrooms.all()).distinct()
            
            notifications_to_create = []
            for target_user in target_users:
                if target_user != self.request.user:
                    notifications_to_create.append(
                        Notification(
                            recipient=target_user,
                            notification_type='announcement',
                            title=f'New Announcement: {announcement.title}',
                            message=announcement.content[:200] + '...' if len(announcement.content) > 200 else announcement.content,
                            link='/announcements'
                        )
                    )
            if notifications_to_create:
                # Use individual creates so the post_save signal fires for each,
                # triggering real-time WS broadcast to connected users.
                # For large audiences this is slightly slower but ensures live delivery.
                for notif in notifications_to_create:
                    notif.save()
            _invalidate_public_announcements_cache()
        except Exception as e:
            logger.error(f"Error in perform_create: {str(e)}")
            raise

    def destroy(self, request, *args, **kwargs):
        response = super().destroy(request, *args, **kwargs)
        _invalidate_public_announcements_cache()
        return response

    @action(detail=False, methods=['post', 'delete'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({"error": "No IDs provided"}, status=400)
        
        # Only admins and the author (teachers) can delete
        queryset = Announcement.objects.filter(id__in=ids)
        if request.user.role != 'admin':
            queryset = queryset.filter(author=request.user)
            
        count = queryset.count()
        queryset.delete()
        
        # Log bulk deletion
        log_audit_action(
            user=request.user,
            action='delete',
            model_name='Announcement',
            object_id=None,
            object_repr=f"Bulk delete {count} announcements",
            description=f'Deleted {count} announcements with IDs: {ids}',
            request=request
        )
        
        _invalidate_public_announcements_cache()
        return Response({"message": f"Successfully deleted {count} announcements"}, status=200)

    @action(detail=False, methods=['post'])
    def delete_all(self, request):
        # Only admins can delete ALL
        if request.user.role != 'admin':
            return Response({"error": "Unauthorized"}, status=403)
            
        queryset = Announcement.objects.all()
        count = queryset.count()
        queryset.delete()
        
        # Log action
        log_audit_action(
            user=request.user,
            action='delete',
            model_name='Announcement',
            object_id=None,
            object_repr="Delete all announcements",
            description=f'Deleted all {count} announcements from the system',
            request=request
        )
        
        _invalidate_public_announcements_cache()
        return Response({"message": f"Successfully deleted all {count} announcements"}, status=200)

    def perform_update(self, serializer):
        announcement = serializer.save()
        # Append any new attachments to Supabase (don't delete existing ones)
        files = self.request.FILES.getlist('attachments')
        for f in files:
            url, err = upload_file(f, bucket_key='announcements', folder='attachments')
            if url:
                AnnouncementAttachment.objects.create(
                    announcement=announcement,
                    file=url,
                    filename=f.name,
                    file_size_bytes=f.size,
                    content_type=getattr(f, 'content_type', '') or '',
                )
            else:
                logger.error(f"Failed to upload attachment {f.name}: {err}")
        log_audit_action(
            user=self.request.user,
            action='update',
            model_name='Announcement',
            object_id=announcement.id,
            object_repr=announcement.title,
            description=f'Updated announcement: {announcement.title}',
            request=self.request
        )
        
        # Create notifications for target audience
        User = get_user_model()
        
        users = User.objects.filter(is_active=True, is_verified=True)
        
        # Filter by target audience
        if announcement.target_audience != 'all':
            role = AUDIENCE_TO_ROLE.get(announcement.target_audience, announcement.target_audience)
            users = users.filter(role=role)
        
        # Filter by target classrooms
        if announcement.target_classrooms.exists():
            users = users.filter(
                enrollments__classroom__in=announcement.target_classrooms.all()
            ).distinct()
        
        # Find users who already have an unread notification for this announcement
        existing_recipients = set(
            Notification.objects.filter(
                notification_type='announcement',
                link='/announcements',
                is_read=False,
                title__contains=announcement.title,
            ).values_list('recipient_id', flat=True)
        )
        
        count = 0
        for user in users:
            if user != self.request.user and user.id not in existing_recipients:
                Notification.objects.create(
                    recipient=user,
                    notification_type='announcement',
                    title=f'Updated Announcement: {announcement.title}',
                    message=announcement.content[:200] + '...' if len(announcement.content) > 200 else announcement.content,
                    link='/announcements'
                )
                count += 1
        
        logger.info(f"Created {count} update notifications for announcement {announcement.id}")
        _invalidate_public_announcements_cache()
    
    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """Mark announcement as read by current user"""
        announcement = self.get_object()
        announcement.read_by.add(request.user)
        return Response({'status': 'marked as read'})

    def perform_destroy(self, instance):
        """Delete announcement and remove its related notifications"""
        Notification.objects.filter(
            notification_type='announcement',
            link='/announcements',
            title__icontains=instance.title[:30]
        ).delete()
        log_audit_action(
            user=self.request.user,
            action='delete',
            model_name='Announcement',
            object_id=instance.id,
            object_repr=instance.title,
            description=f'Deleted announcement: {instance.title}',
            request=self.request
        )
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def pin(self, request, pk=None):
        """Pin or unpin announcement"""
        announcement = self.get_object()
        announcement.is_pinned = not announcement.is_pinned
        announcement.save()
        return Response({'is_pinned': announcement.is_pinned})
    
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish announcement (change status to live)"""
        announcement = self.get_object()
        announcement.status = 'live'
        announcement.save()
        _invalidate_public_announcements_cache()
        return Response({'status': 'published'})
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive announcement (change status to expired) and remove its notifications"""
        announcement = self.get_object()
        announcement.status = 'expired'
        announcement.save()
        # Remove related notifications since announcement is no longer active
        Notification.objects.filter(
            notification_type='announcement',
            link='/announcements',
            title__icontains=announcement.title[:30]
        ).delete()
        _invalidate_public_announcements_cache()
        return Response({'status': 'archived'})

    @action(detail=True, methods=['post'], url_path='delete-attachment')
    def delete_attachment(self, request, pk=None):
        """Delete a specific attachment from an announcement"""
        announcement = self.get_object()
        attachment_id = request.data.get('attachment_id')
        try:
            attachment = announcement.attachments.get(id=attachment_id)
            attachment.delete()
            return Response({'status': 'attachment deleted'})
        except AnnouncementAttachment.DoesNotExist:
            return Response({'error': 'Attachment not found'}, status=status.HTTP_404_NOT_FOUND)

    def _can_comment_on(self, user, announcement):
        if user.role not in ('student', 'staff', 'admin'):
            return False
        if user.role == 'student':
            return announcement.status == 'live'
        return True

    @action(detail=True, methods=['get', 'post'], url_path='comments')
    def comments(self, request, pk=None):
        """List or create comments on an announcement."""
        announcement = self.get_object()
        if request.method == 'GET':
            qs = announcement.comments.select_related('author').order_by('created_at')
            return Response(AnnouncementCommentSerializer(qs, many=True).data)

        if not self._can_comment_on(request.user, announcement):
            return Response({'error': 'You cannot comment on this post.'}, status=status.HTTP_403_FORBIDDEN)

        content = (request.data.get('content') or '').strip()
        if not content:
            return Response({'error': 'Comment cannot be empty.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(content) > 2000:
            return Response({'error': 'Comment is too long (max 2000 characters).'}, status=status.HTTP_400_BAD_REQUEST)

        comment = AnnouncementComment.objects.create(
            announcement=announcement,
            author=request.user,
            content=content,
        )
        return Response(
            AnnouncementCommentSerializer(comment).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['delete'], url_path=r'comments/(?P<comment_id>[^/.]+)')
    def delete_comment(self, request, pk=None, comment_id=None):
        """Delete a comment (author or admin)."""
        announcement = self.get_object()
        try:
            comment = announcement.comments.get(id=comment_id)
        except AnnouncementComment.DoesNotExist:
            return Response({'error': 'Comment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role != 'admin' and comment.author_id != request.user.id:
            return Response({'error': 'Not allowed to delete this comment.'}, status=status.HTTP_403_FORBIDDEN)

        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([PublicReadRateThrottle])
def public_announcements_view(request):
    """Public endpoint to fetch all public announcements for the school website"""
    from django.core.cache import cache
    cache_key = 'public_announcements:v1'
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    queryset = Announcement.objects.filter(is_public=True, status='live').order_by('-is_pinned', '-created_at')
    serializer = AnnouncementSerializer(queryset, many=True, context={'request': request})
    cache.set(cache_key, serializer.data, timeout=60)
    return Response(serializer.data)
