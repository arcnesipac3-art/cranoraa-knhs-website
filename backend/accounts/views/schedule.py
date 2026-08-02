from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models import User, Room, TimeSlot, Schedule, StudentClassEnrollment, Notification
from ..serializers import (
    RoomSerializer,
    TimeSlotSerializer,
    ScheduleSerializer,
    full_name,
)
from ..permissions import IsAdmin
from ..utils import log_audit_action


class RoomViewSet(viewsets.ModelViewSet):
    """Manage physical rooms/locations. Admin-only writes; all authenticated users can read."""
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'building', 'room_type']

    def get_queryset(self):
        qs = Room.objects.all()
        active_only = self.request.query_params.get('active_only')
        if active_only and active_only.lower() == 'true':
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can create rooms.")
        serializer.save()

    def perform_update(self, serializer):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can update rooms.")
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can delete rooms.")
        instance.delete()


class TimeSlotViewSet(viewsets.ModelViewSet):
    """Manage time slots scoped to classroom sections. Admin-only writes."""
    serializer_class = TimeSlotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = TimeSlot.objects.select_related('classroom').all()
        day = self.request.query_params.get('day')
        classroom = self.request.query_params.get('classroom')
        if day:
            qs = qs.filter(day=day)
        if classroom:
            qs = qs.filter(classroom_id=classroom)
        return qs

    def perform_create(self, serializer):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can create time slots.")
        serializer.save()

    def perform_update(self, serializer):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can update time slots.")
        serializer.save()

    def perform_destroy(self, instance):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can delete time slots.")
        instance.delete()


class ScheduleViewSet(viewsets.ModelViewSet):
    """
    Full schedule management.
    - Admin: full CRUD
    - Teacher: read own schedules
    - Student/Parent: read schedules for their classroom(s)
    """
    serializer_class = ScheduleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['classroom__name', 'subject__name', 'teacher__first_name', 'teacher__last_name', 'room__name']
    ordering_fields = ['time_slot__day', 'time_slot__start_time', 'classroom__name']
    ordering = ['time_slot__day', 'time_slot__start_time']

    def get_queryset(self):
        user = self.request.user
        qs = Schedule.objects.select_related(
            'classroom', 'subject', 'teacher', 'room', 'time_slot', 'academic_year', 'semester'
        ).filter(is_active=True)

        # Filter params
        classroom_id = self.request.query_params.get('classroom')
        teacher_id = self.request.query_params.get('teacher')
        academic_year_id = self.request.query_params.get('academic_year')
        semester_id = self.request.query_params.get('semester')
        day = self.request.query_params.get('day')
        student_id = self.request.query_params.get('student')

        if user.role == 'staff':
            qs = qs.filter(teacher=user)
        elif user.role == 'student':
            enrolled = StudentClassEnrollment.objects.filter(student=user).values_list('classroom_id', flat=True)
            qs = qs.filter(classroom_id__in=enrolled)
        elif user.role == 'parent':
            profile = getattr(user, 'profile', None)
            linked_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            # If a specific student is requested, verify they are linked
            if student_id:
                if int(student_id) not in list(linked_ids):
                    return Schedule.objects.none()
                enrolled = StudentClassEnrollment.objects.filter(student_id=student_id).values_list('classroom_id', flat=True)
            else:
                enrolled = StudentClassEnrollment.objects.filter(student_id__in=linked_ids).values_list('classroom_id', flat=True)
            qs = qs.filter(classroom_id__in=enrolled)
        # admin sees all

        if classroom_id:
            qs = qs.filter(classroom_id=classroom_id)
        if teacher_id and user.role == 'admin':
            qs = qs.filter(teacher_id=teacher_id)
        if academic_year_id:
            qs = qs.filter(academic_year_id=academic_year_id)
        if semester_id:
            qs = qs.filter(semester_id=semester_id)
        if day:
            qs = qs.filter(time_slot__day=day)

        return qs

    def perform_create(self, serializer):
        if self.request.user.role not in ['admin', 'staff']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can create schedules.")

        # Auto-fill academic_year from active year if not provided
        if not serializer.validated_data.get('academic_year'):
            from portal.models import AcademicYear
            active_ay = AcademicYear.objects.filter(is_active=True).first()
            if active_ay:
                serializer.validated_data['academic_year'] = active_ay

        schedule = serializer.save()
        log_audit_action(
            user=self.request.user,
            action='create',
            model_name='Schedule',
            object_id=schedule.id,
            object_repr=str(schedule),
            description=f'Created schedule: {schedule}',
            request=self.request
        )
        # Notify teacher only if a teacher is assigned (not vacant)
        if schedule.teacher and schedule.subject:
            try:
                Notification.objects.create(
                    recipient=schedule.teacher,
                    notification_type='system',
                    title='New Schedule Assigned',
                    message=(
                        f'You have been assigned to teach {schedule.subject.name} '
                        f'for {schedule.classroom.name} on '
                        f'{schedule.time_slot.get_day_display()} '
                        f'{schedule.time_slot.start_time.strftime("%I:%M %p")}.'
                    ),
                    link='/schedule'
                )
            except Exception:
                pass  # Notification failure should not block schedule creation

    def perform_update(self, serializer):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can update schedules.")
        schedule = serializer.save()
        log_audit_action(
            user=self.request.user,
            action='update',
            model_name='Schedule',
            object_id=schedule.id,
            object_repr=str(schedule),
            description=f'Updated schedule: {schedule}',
            request=self.request
        )

    def perform_destroy(self, instance):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can delete schedules.")
        log_audit_action(
            user=self.request.user,
            action='delete',
            model_name='Schedule',
            object_id=instance.id,
            object_repr=str(instance),
            description=f'Deleted schedule: {instance}',
            request=self.request
        )
        instance.delete()

    @action(detail=False, methods=['get'])
    def my_schedule(self, request):
        """Returns the current user's schedule (teacher or student view)."""
        user = request.user
        if user.role == 'staff':
            qs = Schedule.objects.filter(teacher=user, is_active=True).select_related(
                'classroom', 'subject', 'room', 'time_slot', 'academic_year'
            ).order_by('time_slot__day', 'time_slot__start_time')
        elif user.role == 'student':
            enrolled = StudentClassEnrollment.objects.filter(student=user).values_list('classroom_id', flat=True)
            qs = Schedule.objects.filter(classroom_id__in=enrolled, is_active=True).select_related(
                'classroom', 'subject', 'teacher', 'room', 'time_slot', 'academic_year'
            ).order_by('time_slot__day', 'time_slot__start_time')
        else:
            return Response({'error': 'This endpoint is for teachers and students only.'}, status=403)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Returns today's schedule for the current user."""
        import datetime
        today_name = datetime.date.today().strftime('%A').lower()
        user = request.user

        if user.role == 'staff':
            qs = Schedule.objects.filter(
                teacher=user, is_active=True, time_slot__day=today_name
            ).select_related('classroom', 'subject', 'room', 'time_slot').order_by('time_slot__start_time')
        elif user.role == 'student':
            enrolled = StudentClassEnrollment.objects.filter(student=user).values_list('classroom_id', flat=True)
            qs = Schedule.objects.filter(
                classroom_id__in=enrolled, is_active=True, time_slot__day=today_name
            ).select_related('classroom', 'subject', 'teacher', 'room', 'time_slot').order_by('time_slot__start_time')
        elif user.role == 'parent':
            profile = getattr(user, 'profile', None)
            linked_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            student_id = request.query_params.get('student')
            if student_id and int(student_id) in list(linked_ids):
                enrolled = StudentClassEnrollment.objects.filter(student_id=student_id).values_list('classroom_id', flat=True)
            else:
                enrolled = StudentClassEnrollment.objects.filter(student_id__in=linked_ids).values_list('classroom_id', flat=True)
            qs = Schedule.objects.filter(
                classroom_id__in=enrolled, is_active=True, time_slot__day=today_name
            ).select_related('classroom', 'subject', 'teacher', 'room', 'time_slot').order_by('time_slot__start_time')
        else:
            return Response({'error': 'Unauthorized'}, status=403)

        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def conflict_check(self, request):
        """Admin utility: check for scheduling conflicts in a given academic year."""
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)

        academic_year_id = request.query_params.get('academic_year')
        if not academic_year_id:
            return Response({'error': 'academic_year parameter required'}, status=400)

        from django.db.models import Count
        conflicts = []

        # Teacher double-booking
        teacher_conflicts = (
            Schedule.objects.filter(academic_year_id=academic_year_id, is_active=True)
            .values('teacher', 'time_slot')
            .annotate(count=Count('id'))
            .filter(count__gt=1)
        )
        for c in teacher_conflicts:
            teacher = User.objects.filter(id=c['teacher']).first()
            ts = TimeSlot.objects.filter(id=c['time_slot']).first()
            conflicts.append({
                'type': 'teacher_conflict',
                'description': f"Teacher {full_name(teacher)} has {c['count']} classes at {ts}",
                'teacher_id': c['teacher'],
                'time_slot_id': c['time_slot'],
            })

        # Room double-booking
        room_conflicts = (
            Schedule.objects.filter(academic_year_id=academic_year_id, is_active=True, room__isnull=False)
            .values('room', 'time_slot')
            .annotate(count=Count('id'))
            .filter(count__gt=1)
        )
        for c in room_conflicts:
            room = Room.objects.filter(id=c['room']).first()
            ts = TimeSlot.objects.filter(id=c['time_slot']).first()
            conflicts.append({
                'type': 'room_conflict',
                'description': f"Room {room.name} has {c['count']} classes at {ts}",
                'room_id': c['room'],
                'time_slot_id': c['time_slot'],
            })

        return Response({'conflicts': conflicts, 'total': len(conflicts)})
