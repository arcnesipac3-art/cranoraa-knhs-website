from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone

from ..models import (
    Announcement,
    ParentTeacherMeeting,
    BehavioralRecord,
    SchoolEvent,
    EventRSVP,
    EmergencyMessage,
    Department,
    StaffPerformance,
    Notification,
)
from ..serializers import (
    ParentTeacherMeetingSerializer,
    BehavioralRecordSerializer,
    SchoolEventSerializer,
    EmergencyMessageSerializer,
    DepartmentSerializer,
    StaffPerformanceSerializer,
    full_name,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def student_calendar_view(request):
    """
    Returns events for the school calendar.
    Merges announcements (with event_date) and dedicated SchoolEvents.
    """
    year = request.query_params.get('year')
    month = request.query_params.get('month')
    
    if not year or not month:
        return Response({"error": "Year and month are required"}, status=400)
    
    try:
        year = int(year)
        month = int(month)
    except ValueError:
        return Response({"error": "Invalid year or month"}, status=400)
    
    from datetime import date
    import calendar as py_calendar
    
    first_day = date(year, month, 1)
    last_day_num = py_calendar.monthrange(year, month)[1]
    last_day = date(year, month, last_day_num)

    public_only = request.query_params.get('public_only') == 'true'
    user = request.user if request.user and request.user.is_authenticated else None

    # ── Announcements with event_date ──
    announcements = Announcement.objects.filter(
        status='live'
    ).filter(
        Q(event_date__date__lte=last_day) & 
        (Q(end_date__date__gte=first_day) | Q(end_date__isnull=True, event_date__date__gte=first_day))
    )
    
    if public_only or not user:
        announcements = announcements.filter(is_public=True)
    else:
        if user.role == 'student':
            announcements = announcements.filter(target_audience__in=['all', 'students'])
        elif user.role == 'staff':
            announcements = announcements.filter(target_audience__in=['all', 'teachers'])
    
    events = []
    for a in announcements:
        events.append({
            'id': f"ann-{a.id}",
            'title': a.title,
            'description': a.content[:100] + '...' if len(a.content) > 100 else a.content,
            'date': a.event_date.isoformat(),
            'end_date': a.end_date.isoformat() if a.end_date else None,
            'type': 'announcement',
            'category': a.category,
            'location': '',
            'start_time': None,
            'end_time': None,
            'is_all_day': True,
        })

    # ── Dedicated SchoolEvents ──
    if not public_only and user:
        school_events = SchoolEvent.objects.filter(
            Q(start_date__lte=last_day) &
            (Q(end_date__gte=first_day) | Q(end_date__isnull=True, start_date__gte=first_day))
        )
        if user.role == 'student':
            school_events = school_events.filter(target_audience__in=['all', 'students'])
        elif user.role == 'staff':
            school_events = school_events.filter(target_audience__in=['all', 'teachers', 'staff'])
        elif user.role == 'parent':
            school_events = school_events.filter(target_audience__in=['all', 'parents'])
    elif public_only:
        school_events = SchoolEvent.objects.filter(
            target_audience='all',
            start_date__lte=last_day,
        ).filter(Q(end_date__gte=first_day) | Q(end_date__isnull=True, start_date__gte=first_day))
    else:
        school_events = SchoolEvent.objects.none()

    for e in school_events:
        import datetime as _dt
        date_str = _dt.datetime.combine(e.start_date, e.start_time or _dt.time.min).isoformat() if e.start_time else _dt.datetime.combine(e.start_date, _dt.time.min).isoformat()
        end_str = None
        if e.end_date:
            end_str = _dt.datetime.combine(e.end_date, e.end_time or _dt.time.max).isoformat()
        events.append({
            'id': f"event-{e.id}",
            'title': e.title,
            'description': e.description[:100] + '...' if e.description and len(e.description) > 100 else e.description,
            'date': date_str,
            'end_date': end_str,
            'type': 'event',
            'category': e.category,
            'location': e.location or '',
            'start_time': e.start_time.isoformat() if e.start_time else None,
            'end_time': e.end_time.isoformat() if e.end_time else None,
            'is_all_day': e.is_all_day,
            'rsvp_going_count': EventRSVP.objects.filter(event=e, status='going').count(),
            'rsvp_maybe_count': EventRSVP.objects.filter(event=e, status='maybe').count(),
            'rsvp_not_going_count': EventRSVP.objects.filter(event=e, status='not_going').count(),
            'my_rsvp': EventRSVP.objects.filter(event=e, user=user).values_list('status', flat=True).first() if user else None,
        })
    
    return Response(events)


class ParentTeacherMeetingViewSet(viewsets.ModelViewSet):
    serializer_class = ParentTeacherMeetingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return ParentTeacherMeeting.objects.select_related('teacher', 'parent', 'student', 'classroom')
        if user.role == 'staff':
            return ParentTeacherMeeting.objects.select_related('teacher', 'parent', 'student', 'classroom').filter(
                Q(teacher=user) | Q(classroom__teacher=user)
            ).distinct()
        if user.role == 'parent':
            return ParentTeacherMeeting.objects.select_related('teacher', 'parent', 'student', 'classroom').filter(parent=user)
        if user.role == 'student':
            return ParentTeacherMeeting.objects.select_related('teacher', 'parent', 'student', 'classroom').filter(student=user)
        return ParentTeacherMeeting.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'parent':
            serializer.save(parent=user)
        elif user.role == 'staff':
            serializer.save(teacher=user)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)
        meeting = self.get_object()
        meeting.status = 'completed'
        meeting.notes = request.data.get('notes', meeting.notes)
        meeting.save(update_fields=['status', 'notes', 'updated_at'])
        return Response(ParentTeacherMeetingSerializer(meeting).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        if request.user.role not in ['admin', 'staff', 'parent']:
            return Response({'error': 'Unauthorized'}, status=403)
        meeting = self.get_object()
        meeting.status = 'cancelled'
        meeting.save(update_fields=['status', 'updated_at'])
        return Response(ParentTeacherMeetingSerializer(meeting).data)


class BehavioralRecordViewSet(viewsets.ModelViewSet):
    serializer_class = BehavioralRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return BehavioralRecord.objects.select_related('student', 'classroom', 'recorded_by')
        if user.role == 'staff':
            return BehavioralRecord.objects.select_related('student', 'classroom', 'recorded_by').filter(
                Q(classroom__teacher=user) | Q(recorded_by=user)
            ).distinct()
        if user.role == 'parent':
            profile = getattr(user, 'profile', None)
            child_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            return BehavioralRecord.objects.select_related('student', 'classroom', 'recorded_by').filter(student_id__in=child_ids)
        if user.role == 'student':
            return BehavioralRecord.objects.select_related('student', 'classroom', 'recorded_by').filter(student=user)
        return BehavioralRecord.objects.none()

    def perform_create(self, serializer):
        record = serializer.save(recorded_by=self.request.user)
        if record.severity in ['major', 'critical']:
            for profile in record.student.parent_profiles.all():
                Notification.objects.create(
                    recipient=profile.user,
                    notification_type='system',
                    title='Behavioral Record',
                    message=f'{full_name(record.student)} has a {record.get_severity_display()} incident: {record.get_incident_type_display()}',
                    link='/dashboard',
                )
                record.parent_notified = True
                record.parent_notified_at = timezone.now()
                record.save(update_fields=['parent_notified', 'parent_notified_at'])


class SchoolEventViewSet(viewsets.ModelViewSet):
    serializer_class = SchoolEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'staff']:
            return SchoolEvent.objects.select_related('created_by')
        if user.role == 'parent':
            return SchoolEvent.objects.select_related('created_by').filter(
                Q(target_audience__in=['all', 'parents'])
            )
        if user.role == 'student':
            return SchoolEvent.objects.select_related('created_by').filter(
                Q(target_audience__in=['all', 'students'])
            )
        return SchoolEvent.objects.select_related('created_by').filter(
            Q(target_audience__in=['all', user.role + 's'])
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class EmergencyMessageViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for emergency messages."""
    serializer_class = EmergencyMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return EmergencyMessage.objects.all()
        audience_map = {
            'student': 'students',
            'parent': 'parents',
            'staff': 'staff',
        }
        audience = audience_map.get(user.role, user.role + 's')
        return EmergencyMessage.objects.filter(
            Q(is_active=True) & Q(target_audience__in=['all', audience])
        )


class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role in ['admin', 'staff']:
            return Department.objects.all()
        return Department.objects.filter(is_active=True)

    def perform_create(self, serializer):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can create departments")
        serializer.save()

    def perform_update(self, serializer):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can update departments")
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can delete departments")
        instance.delete()


class StaffPerformanceViewSet(viewsets.ModelViewSet):
    serializer_class = StaffPerformanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return StaffPerformance.objects.select_related('staff', 'evaluated_by')
        if user.role == 'staff':
            return StaffPerformance.objects.select_related('staff', 'evaluated_by').filter(staff=user)
        return StaffPerformance.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can create performance records")
        perf = serializer.save(evaluated_by=self.request.user)
        perf.compute_overall_rating()

    def perform_update(self, serializer):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can update performance records")
        perf = serializer.save()
        perf.compute_overall_rating()

    def perform_destroy(self, instance):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can delete performance records")
        instance.delete()
