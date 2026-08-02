import datetime
import logging
from django.db import transaction, IntegrityError
from django.db.models import Q, Count, Case, When, IntegerField
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import (
    User, Profile, Classroom, StudentClassEnrollment, Attendance, LearningMaterial,
    Subject, ClassroomSubject, Notification, AbsenceExcuse, Schedule, Room,
    AttendanceDeadline, AttendanceAuditLog,
)
from ..serializers import (
    AttendanceSerializer, AbsenceExcuseSerializer, full_name,
)
from ..utils import log_audit_action

logger = logging.getLogger(__name__)


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['student__username', 'student__email']
    
    def get_queryset(self):
        user = self.request.user
        queryset = Attendance.objects.all().select_related('student', 'classroom')
        classroom_id = self.request.query_params.get('classroom')
        date = self.request.query_params.get('date')
        status = self.request.query_params.get('status')
        academic_year = self.request.query_params.get('academic_year')

        if user.role == 'student':
            queryset = queryset.filter(student=user)
        elif user.role == 'parent':
            profile = getattr(user, 'profile', None)
            linked_student_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            queryset = queryset.filter(student_id__in=linked_student_ids)
        elif user.role == 'staff':
            assigned_classrooms = ClassroomSubject.objects.filter(teacher=user).values_list('classroom_id', flat=True)
            queryset = queryset.filter(Q(classroom__teacher=user) | Q(classroom_id__in=assigned_classrooms))

        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)
        if date:
            queryset = queryset.filter(date=date)
        if status:
            queryset = queryset.filter(status=status)
        if academic_year:
            queryset = queryset.filter(
                classroom__academic_year__name=academic_year
            )
        return queryset

    @action(detail=False, methods=['get'])
    def summary(self, request):
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        now = timezone.localtime(timezone.now())
        today = now.date()

        classroom_id = request.query_params.get('classroom')
        timeframe = request.query_params.get('timeframe', 'all')
        academic_year_name = request.query_params.get('academic_year')

        base_att = Attendance.objects.all()

        if academic_year_name:
            base_att = base_att.filter(
                classroom__academic_year__name=academic_year_name
            )

        if timeframe == 'today':
            base_att = base_att.filter(date=today)
        elif timeframe == 'weekly':
            week_ago = today - datetime.timedelta(days=7)
            base_att = base_att.filter(date__gte=week_ago).exclude(date__week_day__in=[1, 7])
        else:
            base_att = base_att.exclude(date__week_day__in=[1, 7])

        chart_att = base_att
        if timeframe == 'all':
            last_30_days = today - datetime.timedelta(days=30)
            chart_att = chart_att.filter(date__gte=last_30_days)

        if classroom_id:
            chart_att = chart_att.filter(classroom_id=classroom_id)

        daily_data = []
        for day_dict in chart_att.values('date').annotate(
            present=Count(Case(When(status='present', then=1), output_field=IntegerField())),
            late=Count(Case(When(status='late', then=1), output_field=IntegerField())),
            excused=Count(Case(When(status='excused', then=1), output_field=IntegerField())),
            total_count=Count('id')
        ).order_by('date'):
            day_total = day_dict['total_count']
            daily_data.append({
                'date': day_dict['date'].strftime('%Y-%m-%d'),
                'present': day_dict['present'],
                'late': day_dict['late'],
                'excused': day_dict['excused'],
                'rate': round(((day_dict['present'] + day_dict['late'] + day_dict['excused']) / day_total * 100), 1) if day_total > 0 else 0,
                'total': day_total
            })

        overall_status = chart_att.aggregate(
            present=Count(Case(When(status='present', then=1), output_field=IntegerField())),
            absent=Count(Case(When(status='absent', then=1), output_field=IntegerField())),
            late=Count(Case(When(status='late', then=1), output_field=IntegerField())),
            excused=Count(Case(When(status='excused', then=1), output_field=IntegerField())),
        )
        pie_data = [
            {'name': 'Present', 'value': overall_status['present'] or 0},
            {'name': 'Late', 'value': overall_status['late'] or 0},
            {'name': 'Absent', 'value': overall_status['absent'] or 0},
            {'name': 'Excused', 'value': overall_status['excused'] or 0},
        ]

        grade_data = []
        grade_levels = chart_att.values('student__profile__grade_level').annotate(
            present=Count(Case(When(status__in=['present', 'late', 'excused'], then=1), output_field=IntegerField())),
            total=Count('id')
        ).order_by('student__profile__grade_level')

        for g in grade_levels:
            level = g['student__profile__grade_level'] or 'Unassigned'
            grade_data.append({
                'level': level,
                'rate': round(g['present'] / g['total'] * 100, 1) if g['total'] > 0 else 0
            })

        rankings = []
        if request.user.role in ['admin', 'staff']:
            classrooms = Classroom.objects.all()
            if academic_year_name:
                classrooms = classrooms.filter(
                    Q(academic_year__name=academic_year_name) |
                    Q(academic_year__isnull=True)
                )

            classroom_stats = base_att.values('classroom__id').annotate(
                total=Count('id'),
                present=Count(Case(When(status__in=['present', 'late', 'excused'], then=1), output_field=IntegerField()))
            )
            stats_map = {r['classroom__id']: r for r in classroom_stats}

            for c in classrooms:
                r = stats_map.get(c.id, {'total': 0, 'present': 0})
                rate = round(r['present'] / r['total'] * 100, 1) if r['total'] > 0 else 0
                rankings.append({
                    'id': c.id,
                    'name': c.name,
                    'rate': rate,
                    'total_records': r['total']
                })
            rankings = sorted(rankings, key=lambda x: (-x['rate'], x['name']))

        return Response({
            'daily_trends': daily_data,
            'pie_data': pie_data,
            'grade_trends': grade_data,
            'section_rankings': rankings,
            'period': timeframe.capitalize()
        })

    @action(detail=False, methods=['get'])
    def today_schedules(self, request):
        if request.user.role not in ['staff', 'admin']:
            return Response({'error': 'Unauthorized'}, status=403)

        today_name = datetime.date.today().strftime('%A').lower()

        schedules = Schedule.objects.filter(
            teacher=request.user,
            is_active=True,
            time_slot__day=today_name,
        ).select_related('classroom', 'subject', 'room', 'time_slot').order_by('time_slot__start_time')

        data = []
        schedule_classroom_ids = [sch.classroom_id for sch in schedules]
        enrollment_counts = dict(
            StudentClassEnrollment.objects.filter(classroom_id__in=schedule_classroom_ids)
            .values('classroom_id')
            .annotate(cnt=Count('id'))
            .values_list('classroom_id', 'cnt')
        )
        for sch in schedules:
            data.append({
                'id': sch.id,
                'classroom': sch.classroom.id,
                'classroom_name': sch.classroom.name,
                'subject': sch.subject.id,
                'subject_name': sch.subject.name,
                'subject_code': sch.subject.code,
                'room': sch.room.name if sch.room else None,
                'start_time': sch.time_slot.start_time.strftime('%I:%M %p'),
                'end_time': sch.time_slot.end_time.strftime('%I:%M %p'),
                'student_count': enrollment_counts.get(sch.classroom_id, 0),
            })

        return Response(data)

    @action(detail=False, methods=['get'])
    def by_schedule(self, request):
        if request.user.role not in ['staff', 'admin']:
            return Response({'error': 'Unauthorized'}, status=403)

        schedule_id = request.query_params.get('schedule')
        date_str = request.query_params.get('date')

        if not schedule_id or not date_str:
            return Response({'error': 'schedule and date parameters are required'}, status=400)

        try:
            sch = Schedule.objects.select_related('classroom', 'subject', 'time_slot').get(id=schedule_id)
        except Schedule.DoesNotExist:
            return Response({'error': 'Schedule not found'}, status=404)

        if sch.teacher != request.user and request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)

        try:
            att_date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)

        enrollments = StudentClassEnrollment.objects.filter(
            classroom=sch.classroom
        ).select_related('student', 'student__profile').order_by('student__username')

        existing = Attendance.objects.filter(
            schedule=sch,
            date=att_date,
        ).values('student_id', 'status', 'remarks', 'id')

        existing_map = {r['student_id']: r for r in existing}

        students = []
        for enrollment in enrollments:
            student = enrollment.student
            att = existing_map.get(student.id)
            students.append({
                'student_id': student.id,
                'student_name': full_name(student),
                'student_email': student.email,
                'lrn': getattr(getattr(student, 'profile', None), 'lrn', None),
                'sex': getattr(getattr(student, 'profile', None), 'sex', None),
                'attendance_id': att['id'] if att else None,
                'status': att['status'] if att else None,
                'remarks': att['remarks'] if att else None,
            })

        return Response({
            'schedule': {
                'id': sch.id,
                'classroom_name': sch.classroom.name,
                'subject_name': sch.subject.name,
                'subject_code': sch.subject.code,
                'time_slot': f"{sch.time_slot.start_time.strftime('%I:%M %p')} - {sch.time_slot.end_time.strftime('%I:%M %p')}",
            },
            'date': date_str,
            'students': students,
        })

    @action(detail=False, methods=['post'])
    def bulk_save(self, request):
        if request.user.role not in ['staff', 'admin']:
            return Response({'error': 'Unauthorized'}, status=403)

        schedule_id = request.query_params.get('schedule') or request.data.get('schedule')
        date_str = request.query_params.get('date') or request.data.get('date')
        records = request.data.get('records', [])

        if not schedule_id or not date_str:
            return Response({'error': 'schedule and date are required'}, status=400)
        if not records:
            return Response({'error': 'records array is required'}, status=400)

        try:
            sch = Schedule.objects.select_related('classroom', 'subject').get(id=schedule_id)
        except Schedule.DoesNotExist:
            return Response({'error': 'Schedule not found'}, status=404)

        if sch.teacher != request.user and request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)

        try:
            att_date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)

        created_count = 0
        updated_count = 0
        errors = []

        with transaction.atomic():
            for rec in records:
                student_id = rec.get('student_id')
                status_val = rec.get('status')
                remarks = rec.get('remarks', '')

                if not student_id or not status_val:
                    errors.append(f'Missing student_id or status for record: {rec}')
                    continue

                if status_val not in ['present', 'absent', 'late', 'excused', 'school_activity', 'medical_leave']:
                    errors.append(f'Invalid status "{status_val}" for student {student_id}')
                    continue

                att, created = Attendance.objects.update_or_create(
                    student_id=student_id,
                    schedule=sch,
                    date=att_date,
                    defaults={
                        'status': status_val,
                        'remarks': remarks,
                        'classroom': sch.classroom,
                        'subject': sch.subject,
                        'time_slot': sch.time_slot,
                        'marked_by': request.user,
                    }
                )
                if created:
                    created_count += 1
                else:
                    updated_count += 1

        try:
            log_audit_action(
                user=request.user,
                action='create',
                model_name='Attendance',
                object_id=None,
                object_repr=f'Bulk {sch.classroom.name} on {date_str}',
                description=f'{request.user.username} bulk-saved {created_count} created, {updated_count} updated attendance records for {sch.classroom.name} on {date_str}',
                request=request
            )
        except Exception as audit_err:
            logger.warning(f"Audit log failed on bulk_save: {audit_err}")

        return Response({
            'created': created_count,
            'updated': updated_count,
            'errors': errors,
        })

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except IntegrityError:
            return Response(
                {'error': 'Attendance record already exists for this student on this date.'},
                status=status.HTTP_409_CONFLICT,
            )

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except IntegrityError:
            return Response(
                {'error': 'Attendance record already exists for this student on this date.'},
                status=status.HTTP_409_CONFLICT,
            )

    def perform_create(self, serializer):
        if self.request.user.role not in ['staff', 'admin']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers and admins can mark attendance")
        attendance = serializer.save(marked_by=self.request.user)
        log_audit_action(
            user=self.request.user,
            action='create',
            model_name='Attendance',
            object_id=attendance.id,
            object_repr=str(attendance),
            description=f'Marked attendance for {attendance.student.username} on {attendance.date}',
            request=self.request
        )
        if attendance.status in ['absent', 'late']:
            from ..fcm import send_push_notification
            for profile in attendance.student.parent_profiles.all():
                try:
                    status_display = 'absent' if attendance.status == 'absent' else f'late ({attendance.minutes_late} min)'
                    send_push_notification(
                        user=profile.user,
                        title='Attendance Alert',
                        body=f'{full_name(attendance.student)} was marked {status_display} on {attendance.date}',
                    )
                except Exception:
                    pass

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request):
        from django.http import HttpResponse
        import csv
        qs = self.get_queryset()
        classroom_id = request.query_params.get('classroom')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        schedule_id = request.query_params.get('schedule')
        if classroom_id:
            qs = qs.filter(classroom_id=classroom_id)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if schedule_id:
            qs = qs.filter(schedule_id=schedule_id)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="attendance_{timezone.now().strftime("%Y%m%d")}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Student', 'Classroom', 'Date', 'Status', 'Minutes Late',
                         'Subject', 'Schedule', 'Remarks', 'Marked By'])
        for a in qs.select_related('student', 'classroom', 'subject', 'schedule', 'marked_by'):
            writer.writerow([
                a.student.username,
                a.classroom.name,
                a.date,
                a.status,
                a.minutes_late,
                a.subject.code if a.subject else '',
                str(a.schedule) if a.schedule else '',
                a.remarks or '',
                a.marked_by.username if a.marked_by else '',
            ])
        return response

    @action(detail=False, methods=['get'], url_path='teacher-dashboard')
    def teacher_dashboard(self, request):
        """Teacher's daily attendance dashboard — shows today's classes with completion status."""
        if request.user.role not in ['staff', 'admin']:
            return Response({'error': 'Unauthorized'}, status=403)

        today = datetime.date.today()
        today_name = today.strftime('%A').lower()

        schedules = Schedule.objects.filter(
            teacher=request.user,
            is_active=True,
            time_slot__day=today_name,
        ).select_related('classroom', 'subject', 'room', 'time_slot').order_by('time_slot__start_time')

        schedule_ids = [s.id for s in schedules]
        classroom_ids = [s.classroom_id for s in schedules]

        enrollment_counts = dict(
            StudentClassEnrollment.objects.filter(classroom_id__in=classroom_ids)
            .values('classroom_id')
            .annotate(cnt=Count('id'))
            .values_list('classroom_id', 'cnt')
        )

        # Schedule-based attendance counts
        attendance_counts = dict(
            Attendance.objects.filter(
                schedule_id__in=schedule_ids,
                date=today,
            ).values('schedule_id')
            .annotate(
                total=Count('id'),
                present=Count(Case(When(status__in=['present', 'excused', 'school_activity', 'medical_leave'], then=1), output_field=IntegerField())),
                absent=Count(Case(When(status='absent', then=1), output_field=IntegerField())),
                late=Count(Case(When(status='late', then=1), output_field=IntegerField())),
            ).values_list('schedule_id', 'total', 'present', 'absent', 'late')
        )
        att_map = {}
        for sid, total, present, absent, late in attendance_counts:
            att_map[sid] = {'total': total, 'present': present, 'absent': absent, 'late': late}

        # Classroom-based attendance counts (schedule=null)
        classroom_att_counts = dict(
            Attendance.objects.filter(
                classroom_id__in=classroom_ids,
                schedule__isnull=True,
                date=today,
            ).values('classroom_id')
            .annotate(
                total=Count('id'),
                present=Count(Case(When(status__in=['present', 'excused', 'school_activity', 'medical_leave'], then=1), output_field=IntegerField())),
                absent=Count(Case(When(status='absent', then=1), output_field=IntegerField())),
                late=Count(Case(When(status='late', then=1), output_field=IntegerField())),
            ).values_list('classroom_id', 'total', 'present', 'absent', 'late')
        )
        class_att_map = {}
        for cid, total, present, absent, late in classroom_att_counts:
            class_att_map[cid] = {'total': total, 'present': present, 'absent': absent, 'late': late}

        data = []
        for sch in schedules:
            student_count = enrollment_counts.get(sch.classroom_id, 0)
            # Merge schedule-based and classroom-based attendance
            sch_att = att_map.get(sch.id, {'total': 0, 'present': 0, 'absent': 0, 'late': 0})
            cls_att = class_att_map.get(sch.classroom_id, {'total': 0, 'present': 0, 'absent': 0, 'late': 0})
            att = {
                'total': sch_att['total'] or cls_att['total'],
                'present': sch_att['present'] or cls_att['present'],
                'absent': sch_att['absent'] or cls_att['absent'],
                'late': sch_att['late'] or cls_att['late'],
            }
            completion = round((att['total'] / student_count * 100), 0) if student_count > 0 else 0

            data.append({
                'schedule_id': sch.id,
                'classroom_id': sch.classroom_id,
                'classroom_name': sch.classroom.name,
                'subject_id': sch.subject_id,
                'subject_name': sch.subject.name,
                'subject_code': sch.subject.code,
                'room': sch.room.name if sch.room else None,
                'start_time': sch.time_slot.start_time.strftime('%I:%M %p'),
                'end_time': sch.time_slot.end_time.strftime('%I:%M %p'),
                'student_count': student_count,
                'recorded': att['total'],
                'present': att['present'],
                'absent': att['absent'],
                'late': att['late'],
                'completion': completion,
                'status': 'completed' if att['total'] >= student_count and student_count > 0 else 'pending',
            })

        return Response(data)

    @action(detail=False, methods=['get'], url_path='admin-monitoring')
    def admin_monitoring(self, request):
        """Admin attendance monitoring — today's overview with charts."""
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)

        today = datetime.date.today()
        today_name = today.strftime('%A').lower()

        all_schedules = Schedule.objects.filter(
            is_active=True,
            time_slot__day=today_name,
        ).select_related('classroom', 'teacher', 'subject', 'time_slot').order_by('time_slot__start_time')

        total_classes = all_schedules.count()

        schedule_ids = list(all_schedules.values_list('id', flat=True))
        classroom_ids = list(all_schedules.values_list('classroom_id', flat=True))

        enrollment_counts = dict(
            StudentClassEnrollment.objects.filter(classroom_id__in=classroom_ids)
            .values('classroom_id')
            .annotate(cnt=Count('id'))
            .values_list('classroom_id', 'cnt')
        )
        total_students = sum(enrollment_counts.values()) if enrollment_counts else 0

        attendance_agg = Attendance.objects.filter(
            Q(schedule_id__in=schedule_ids) | Q(classroom_id__in=classroom_ids, schedule__isnull=True),
            date=today,
        ).aggregate(
            total_records=Count('id'),
            present=Count(Case(When(status__in=['present', 'excused', 'school_activity', 'medical_leave'], then=1), output_field=IntegerField())),
            absent=Count(Case(When(status='absent', then=1), output_field=IntegerField())),
            late=Count(Case(When(status='late', then=1), output_field=IntegerField())),
        )

        # Get attendance counts by schedule_id (for schedule-based attendance)
        attended_schedules = Attendance.objects.filter(
            schedule_id__in=schedule_ids,
            date=today,
        ).values('schedule_id').annotate(cnt=Count('id')).values_list('schedule_id', 'cnt')
        attended_map = dict(attended_schedules)

        # Get attendance counts by classroom_id (for classroom-based attendance, schedule=null)
        classroom_attendance = Attendance.objects.filter(
            classroom_id__in=classroom_ids,
            schedule__isnull=True,
            date=today,
        ).values('classroom_id').annotate(cnt=Count('id')).values_list('classroom_id', 'cnt')
        classroom_attendance_map = dict(classroom_attendance)

        completed_count = 0
        pending_count = 0
        late_submissions = 0
        teacher_stats = {}

        for sch in all_schedules:
            teacher_id = sch.teacher_id
            teacher_name = full_name(sch.teacher)
            if teacher_id not in teacher_stats:
                teacher_stats[teacher_id] = {
                    'teacher_id': teacher_id,
                    'teacher_name': teacher_name,
                    'classes_today': 0,
                    'submitted': 0,
                    'pending': 0,
                }
            teacher_stats[teacher_id]['classes_today'] += 1

            stu_count = enrollment_counts.get(sch.classroom_id, 0)
            # Check both schedule-based and classroom-based attendance
            recorded = attended_map.get(sch.id, 0) or classroom_attendance_map.get(sch.classroom_id, 0)

            if recorded >= stu_count and stu_count > 0:
                completed_count += 1
                teacher_stats[teacher_id]['submitted'] += 1
            else:
                pending_count += 1
                teacher_stats[teacher_id]['pending'] += 1

        overall_rate = round(
            (attendance_agg['present'] / attendance_agg['total_records'] * 100)
            if attendance_agg['total_records'] > 0 else 0, 1
        )

        daily_trends = []
        for day_offset in range(6, -1, -1):
            d = today - datetime.timedelta(days=day_offset)
            day_att = Attendance.objects.filter(date=d).aggregate(
                total=Count('id'),
                present=Count(Case(When(status__in=['present', 'excused', 'school_activity', 'medical_leave'], then=1), output_field=IntegerField())),
            )
            daily_trends.append({
                'date': d.strftime('%Y-%m-%d'),
                'day': d.strftime('%a'),
                'rate': round(day_att['present'] / day_att['total'] * 100, 1) if day_att['total'] > 0 else 0,
                'total': day_att['total'],
            })

        grade_rates = []
        grade_data = Attendance.objects.filter(date=today).values(
            'student__profile__grade_level'
        ).annotate(
            total=Count('id'),
            present=Count(Case(When(status__in=['present', 'excused', 'school_activity', 'medical_leave'], then=1), output_field=IntegerField())),
        ).order_by('student__profile__grade_level')
        for g in grade_data:
            level = g['student__profile__grade_level'] or 'N/A'
            grade_rates.append({
                'grade': str(level),
                'rate': round(g['present'] / g['total'] * 100, 1) if g['total'] > 0 else 0,
                'total': g['total'],
            })

        return Response({
            'summary': {
                'total_classes': total_classes,
                'completed': completed_count,
                'pending': pending_count,
                'total_students': total_students,
                'total_records': attendance_agg['total_records'],
                'present': attendance_agg['present'],
                'absent': attendance_agg['absent'],
                'late': attendance_agg['late'],
                'overall_rate': overall_rate,
            },
            'teacher_stats': list(teacher_stats.values()),
            'daily_trends': daily_trends,
            'grade_rates': grade_rates,
        })

    @action(detail=False, methods=['post'], url_path='submit')
    def submit_attendance(self, request):
        """Mark attendance records as submitted for a classroom+date."""
        if request.user.role not in ['staff', 'admin']:
            return Response({'error': 'Unauthorized'}, status=403)

        classroom_id = request.data.get('classroom_id')
        date_str = request.data.get('date')

        if not classroom_id or not date_str:
            return Response({'error': 'classroom_id and date are required'}, status=400)

        try:
            att_date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=400)

        updated = Attendance.objects.filter(
            classroom_id=classroom_id,
            date=att_date,
            workflow_status='draft',
        ).update(
            workflow_status='submitted',
            submitted_at=timezone.now(),
        )

        AttendanceAuditLog.objects.create(
            user=request.user,
            action='submit',
            classroom_id=classroom_id,
            date=att_date,
            description=f'Submitted {updated} attendance records',
            metadata={'classroom_id': classroom_id, 'count': updated},
        )

        return Response({'submitted': updated})

    @action(detail=False, methods=['post'], url_path='reopen')
    def reopen_attendance(self, request):
        """Teacher or admin reopens submitted attendance for editing."""
        if request.user.role not in ['staff', 'admin']:
            return Response({'error': 'Unauthorized'}, status=403)

        classroom_id = request.data.get('classroom_id')
        date_str = request.data.get('date')
        reason = request.data.get('reason', '')

        if not classroom_id or not date_str:
            return Response({'error': 'classroom_id and date are required'}, status=400)

        try:
            att_date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=400)

        updated = Attendance.objects.filter(
            classroom_id=classroom_id,
            date=att_date,
            workflow_status__in=['submitted', 'locked'],
        ).update(
            workflow_status='draft',
            submitted_at=None,
            locked_at=None,
        )

        AttendanceAuditLog.objects.create(
            user=request.user,
            action='reopen',
            classroom_id=classroom_id,
            date=att_date,
            description=f'Reopened {updated} attendance records. Reason: {reason}',
            metadata={'classroom_id': classroom_id, 'count': updated, 'reason': reason},
        )

        return Response({'reopened': updated})

    @action(detail=False, methods=['get'], url_path='student-history')
    def student_history(self, request):
        """Student's own attendance history with stats."""
        user = request.user
        if user.role == 'student':
            student_id = user.id
        elif user.role in ['admin', 'staff']:
            student_id = request.query_params.get('student')
            if not student_id:
                return Response({'error': 'student parameter required'}, status=400)
        elif user.role == 'parent':
            profile = getattr(user, 'profile', None)
            student_id = request.query_params.get('student')
            if not student_id and profile:
                student_id = profile.linked_students.values_list('id', flat=True).first()
            if not student_id:
                return Response({'error': 'student parameter required'}, status=400)
        else:
            return Response({'error': 'Unauthorized'}, status=403)

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        month = request.query_params.get('month')

        qs = Attendance.objects.filter(student_id=student_id).select_related('classroom', 'subject')

        if month:
            # month is YYYY-MM format
            year, mon = month.split('-')
            qs = qs.filter(date__year=int(year), date__month=int(mon))
        elif date_from:
            qs = qs.filter(date__gte=date_from)
        elif date_to:
            qs = qs.filter(date__lte=date_to)

        records = list(qs.values(
            'id', 'date', 'status', 'remarks', 'classroom__name', 'subject__name',
            'subject__code', 'minutes_late', 'has_excuse', 'excuse_verified',
            'workflow_status',
        ))

        stats = qs.aggregate(
            total=Count('id'),
            present=Count(Case(When(status='present', then=1), output_field=IntegerField())),
            absent=Count(Case(When(status='absent', then=1), output_field=IntegerField())),
            late=Count(Case(When(status='late', then=1), output_field=IntegerField())),
            excused=Count(Case(When(status='excused', then=1), output_field=IntegerField())),
            school_activity=Count(Case(When(status='school_activity', then=1), output_field=IntegerField())),
            medical_leave=Count(Case(When(status='medical_leave', then=1), output_field=IntegerField())),
        )
        total = stats['total']
        attended = (stats['present'] or 0) + (stats['late'] or 0) + (stats['excused'] or 0) + (stats['school_activity'] or 0) + (stats['medical_leave'] or 0)
        rate = round(attended / total * 100, 1) if total > 0 else 0

        return Response({
            'student_id': student_id,
            'stats': {**stats, 'rate': rate},
            'records': records,
        })

    @action(detail=False, methods=['get'], url_path='audit-trail')
    def audit_trail(self, request):
        """Attendance audit trail for admin."""
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)

        classroom_id = request.query_params.get('classroom')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        qs = AttendanceAuditLog.objects.select_related('user', 'classroom').all()

        if classroom_id:
            qs = qs.filter(classroom_id=classroom_id)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        logs = list(qs[:100].values(
            'id', 'user__username', 'action', 'date', 'previous_status',
            'new_status', 'description', 'metadata', 'created_at',
        ))

        return Response(logs)


class AbsenceExcuseViewSet(viewsets.ModelViewSet):
    serializer_class = AbsenceExcuseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return AbsenceExcuse.objects.select_related('student', 'attendance', 'reviewed_by')
        if user.role == 'staff':
            return AbsenceExcuse.objects.select_related('student', 'attendance', 'reviewed_by').filter(
                attendance__classroom__subject__teacher=user
            ).distinct()
        if user.role == 'parent':
            profile = getattr(user, 'profile', None)
            child_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            return AbsenceExcuse.objects.select_related('student', 'attendance', 'reviewed_by').filter(
                student_id__in=child_ids
            )
        return AbsenceExcuse.objects.select_related('student', 'attendance', 'reviewed_by').filter(
            student=user
        )

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

    @action(detail=True, methods=['post'], url_path='review')
    def review(self, request, pk=None):
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)
        excuse = self.get_object()
        action_val = request.data.get('action')
        if action_val not in ['approve', 'reject']:
            return Response({'error': 'action must be approve or reject'}, status=400)
        excuse.status = 'approved' if action_val == 'approve' else 'rejected'
        excuse.reviewed_by = request.user
        excuse.reviewed_at = timezone.now()
        excuse.reviewer_notes = request.data.get('notes', '')
        excuse.save()
        if excuse.status == 'approved':
            attendance = excuse.attendance
            attendance.status = 'excused'
            attendance.has_excuse = True
            attendance.excuse_verified = True
            attendance.save()
        try:
            log_audit_action(
                user=request.user,
                action='update',
                model_name='AbsenceExcuse',
                object_id=excuse.id,
                object_repr=str(excuse),
                description=f'{request.user.role.capitalize()} {action_val}d absence excuse for {excuse.student.username} on {excuse.attendance.date}',
                request=request
            )
        except Exception as audit_err:
            logger.warning(f"Audit log failed on excuse review: {audit_err}")
        return Response(AbsenceExcuseSerializer(excuse).data)
