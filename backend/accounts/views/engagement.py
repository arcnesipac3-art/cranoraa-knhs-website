from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from ..models.events import SchoolEvent, EventRSVP
from ..models.badges import Badge, StudentBadge, StudentLeaderboard
from ..serializers.engagement import (
    SchoolEventSerializer, EventRSVPSerializer,
    BadgeSerializer, StudentBadgeSerializer, StudentLeaderboardSerializer,
)


class SchoolEventViewSet(viewsets.ModelViewSet):
    serializer_class = SchoolEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SchoolEvent.objects.all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def rsvp(self, request, pk=None):
        event = self.get_object()
        status_val = request.data.get('status', 'going')
        if status_val not in ('going', 'maybe', 'not_going'):
            return Response({'error': 'Invalid status'}, status=400)

        rsvp, created = EventRSVP.objects.update_or_create(
            event=event, user=request.user,
            defaults={'status': status_val}
        )
        return Response({
            'status': rsvp.status,
            'created': created,
            'going': event.rsvp_going_count,
            'maybe': event.rsvp_maybe_count,
            'not_going': event.rsvp_not_going_count,
        })


class BadgeViewSet(viewsets.ModelViewSet):
    serializer_class = BadgeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Badge.objects.filter(is_active=True)

    def perform_create(self, serializer):
        serializer.save()


class StudentBadgeViewSet(viewsets.ModelViewSet):
    serializer_class = StudentBadgeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = StudentBadge.objects.all()
        student_id = self.request.query_params.get('student_id')
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(awarded_by=self.request.user)


class StudentLeaderboardViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StudentLeaderboardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StudentLeaderboard.objects.select_related('student', 'student__profile').all()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def award_badge(request):
    """
    POST /api/v1/engagement/award-badge/
    Body: { "student_id": 5, "badge_id": 3, "reason": "..." }
    """
    student_id = request.data.get('student_id')
    badge_id = request.data.get('badge_id')
    reason = request.data.get('reason', '')

    if not student_id or not badge_id:
        return Response({'error': 'student_id and badge_id required'}, status=400)

    try:
        student = StudentBadge._meta.get_field('student').related_model.objects.get(id=student_id)
        badge = Badge.objects.get(id=badge_id)
    except (StudentBadge._meta.get_field('student').related_model.DoesNotExist, Badge.DoesNotExist):
        return Response({'error': 'Invalid student or badge'}, status=400)

    sb, created = StudentBadge.objects.get_or_create(
        student=student, badge=badge,
        defaults={'awarded_by': request.user, 'reason': reason}
    )

    # Update leaderboard points
    lb, _ = StudentLeaderboard.objects.get_or_create(student=student)
    lb.total_points += badge.points
    lb.save(update_fields=['total_points'])

    return Response({
        'created': created,
        'total_points': lb.total_points,
        'badge': badge.name,
    }, status=201 if created else 200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def compute_leaderboard(request):
    """
    POST /api/v1/engagement/leaderboard/compute/
    Admin-only: recompute all student leaderboard entries.
    """
    if not request.user.is_staff:
        return Response({'error': 'Admin only'}, status=403)

    from django.contrib.auth import get_user_model
    from django.db.models import Sum
    from datetime import date, timedelta

    User = get_user_model()
    students = User.objects.filter(role='student').order_by('-total_points')[:100]

    for student in students:
        lb, _ = StudentLeaderboard.objects.get_or_create(student=student)
        # Sum badge points
        badge_points = student.student_badges.aggregate(
            total=Sum('badge__points')
        )['total'] or 0
        lb.total_points = badge_points
        lb.save(update_fields=['total_points'])

    return Response({'status': 'computed', 'count': students.count()})
