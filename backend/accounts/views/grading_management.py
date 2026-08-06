import csv
import logging
from datetime import date, timedelta

from django.db import transaction
from django.db.models import Q, Avg, Count, Max, Min
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import (
    GradingPeriod, GradeSubmission, GradeReopeningRequest,
    User, Classroom, Subject, ClassroomSubject, Grade,
    GradeReport, StudentClassEnrollment, Notification,
)
from ..serializers import (
    GradingPeriodSerializer, GradeSubmissionSerializer,
    GradeSubmissionSummarySerializer, GradeReopeningRequestSerializer,
    AdminMonitoringSerializer, TeacherDashboardSerializer,
)
from ..permissions import IsAdmin, IsAdminOrStaff
from ..utils import log_audit_action

logger = logging.getLogger(__name__)


class GradingPeriodViewSet(viewsets.ModelViewSet):
    serializer_class = GradingPeriodSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = GradingPeriod.objects.select_related('academic_year', 'created_by')

        academic_year = self.request.query_params.get('academic_year')
        quarter = self.request.query_params.get('quarter')
        status_filter = self.request.query_params.get('status')

        if academic_year:
            qs = qs.filter(academic_year__name=academic_year)
        if quarter:
            qs = qs.filter(quarter=quarter)
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs

    def perform_create(self, serializer):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only administrators can create grading periods")
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only administrators can update grading periods")
        serializer.save()

    @action(detail=True, methods=['post'])
    def open(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can open grading periods'}, status=403)
        period = self.get_object()
        period.is_manually_opened = True
        period.is_manually_closed = False
        period.update_status()
        log_audit_action(
            user=request.user, action='grading_period_open',
            model_name='GradingPeriod', object_id=period.id,
            object_repr=str(period),
            description=f'Manually opened grading period Q{period.quarter}',
            request=request
        )
        teachers = User.objects.filter(role='staff', is_active=True)
        for teacher in teachers:
            Notification.objects.create(
                recipient=teacher,
                notification_type='system',
                title='Grading Period Opened',
                message=f'Grading period for Q{period.quarter} ({period.academic_year.name}) is now open. Deadline: {period.submission_deadline}',
                link='/teacher-grade-dashboard',
            )
        return Response(GradingPeriodSerializer(period).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can close grading periods'}, status=403)
        period = self.get_object()
        period.is_manually_closed = True
        period.is_manually_opened = False
        period.update_status()
        log_audit_action(
            user=request.user, action='grading_period_close',
            model_name='GradingPeriod', object_id=period.id,
            object_repr=str(period),
            description=f'Manually closed grading period Q{period.quarter}',
            request=request
        )
        return Response(GradingPeriodSerializer(period).data)

    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can lock grading periods'}, status=403)
        period = self.get_object()
        period.status = 'locked'
        period.save(update_fields=['status'])
        Grade.objects.filter(
            classroom__academic_year=period.academic_year,
            quarter=period.quarter,
        ).update(is_locked=True)
        log_audit_action(
            user=request.user, action='grading_period_lock',
            model_name='GradingPeriod', object_id=period.id,
            object_repr=str(period),
            description=f'Locked grading period Q{period.quarter}',
            request=request
        )
        return Response(GradingPeriodSerializer(period).data)

    @action(detail=True, methods=['post'])
    def unlock(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can unlock grading periods'}, status=403)
        period = self.get_object()
        if period.status != 'locked':
            return Response({'error': 'Only locked grading periods can be unlocked'}, status=400)
        period.status = 'open'
        period.is_manually_opened = False
        period.is_manually_closed = False
        period.save(update_fields=['status', 'is_manually_opened', 'is_manually_closed'])
        Grade.objects.filter(
            classroom__academic_year=period.academic_year,
            quarter=period.quarter,
        ).update(is_locked=False)
        log_audit_action(
            user=request.user, action='grading_period_unlock',
            model_name='GradingPeriod', object_id=period.id,
            object_repr=str(period),
            description=f'Unlocked grading period Q{period.quarter}',
            request=request
        )
        return Response(GradingPeriodSerializer(period).data)

    @action(detail=True, methods=['post'])
    def delete_grades(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can delete period grades'}, status=403)
        period = self.get_object()
        if period.status not in ('closed', 'locked'):
            return Response({'error': 'Only closed or locked periods allow grade deletion'}, status=400)
        grades_qs = Grade.objects.filter(
            classroom__academic_year=period.academic_year,
            quarter=period.quarter,
        )
        count = grades_qs.count()
        if count == 0:
            return Response({'error': 'No grades found for this period'}, status=400)
        grades_qs.delete()
        period.status = 'closed'
        period.save(update_fields=['status'])
        log_audit_action(
            user=request.user, action='grading_period_delete_grades',
            model_name='GradingPeriod', object_id=period.id,
            object_repr=str(period),
            description=f'Deleted {count} grades for Q{period.quarter}',
            request=request
        )
        return Response({'deleted': count, 'status': 'closed'})

    @action(detail=True, methods=['post'])
    def extend_deadline(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can extend deadlines'}, status=403)
        period = self.get_object()
        days = request.data.get('days', 7)
        try:
            days = int(days)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid days value'}, status=400)
        period.submission_deadline += timedelta(days=days)
        period.save(update_fields=['submission_deadline'])
        log_audit_action(
            user=request.user, action='deadline_extend',
            model_name='GradingPeriod', object_id=period.id,
            object_repr=str(period),
            description=f'Extended deadline by {days} days for Q{period.quarter}',
            request=request
        )
        return Response(GradingPeriodSerializer(period).data)

    @action(detail=False, methods=['get'])
    def active(self, request):
        from ..models import SystemSetting
        today = date.today()

        sys_ay = SystemSetting.get_settings().academic_year
        if sys_ay:
            ay_filter = {'academic_year__name': sys_ay}
        else:
            ay_filter = {'academic_year__is_active': True}

        period = GradingPeriod.objects.filter(
            **ay_filter,
            start_date__lte=today,
            status__in=['open', 'closing_soon'],
        ).select_related('academic_year').order_by('-quarter').first()
        if period:
            return Response(GradingPeriodSerializer(period).data)
        return Response(None)

    @action(detail=False, methods=['post'])
    def bulk_update_status(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can bulk update'}, status=403)
        periods = GradingPeriod.objects.filter(status__in=['scheduled', 'open', 'closing_soon'])
        updated = 0
        for p in periods:
            old = p.status
            p.update_status()
            if p.status != old:
                updated += 1
        return Response({'updated': updated})


class GradeSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = GradeSubmissionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = GradeSubmission.objects.select_related(
            'teacher', 'classroom', 'subject', 'grading_period',
            'reviewed_by', 'approved_by',
        )

        if user.role == 'admin':
            pass
        elif user.role == 'staff':
            qs = qs.filter(teacher=user)
        else:
            return qs.none()

        grading_period = self.request.query_params.get('grading_period')
        classroom = self.request.query_params.get('classroom')
        subject = self.request.query_params.get('subject')
        quarter = self.request.query_params.get('quarter')
        sub_status = self.request.query_params.get('status')
        teacher_id = self.request.query_params.get('teacher')

        if grading_period:
            qs = qs.filter(grading_period_id=grading_period)
        if classroom:
            qs = qs.filter(classroom_id=classroom)
        if subject:
            qs = qs.filter(subject_id=subject)
        if quarter:
            qs = qs.filter(grading_period__quarter=quarter)
        if sub_status:
            qs = qs.filter(status=sub_status)
        if teacher_id and user.role == 'admin':
            qs = qs.filter(teacher_id=teacher_id)

        return qs

    def perform_create(self, serializer):
        submission = serializer.save(teacher=self.request.user)
        submission.compute_progress()

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        submission = self.get_object()
        if submission.status not in ('draft', 'in_progress'):
            return Response({'error': 'Only draft or in-progress submissions can be submitted'}, status=400)

        try:
            submission.compute_progress()
        except Exception as e:
            logger.error(f"compute_progress failed for submission {pk}: {e}")

        try:
            warnings = submission.validate_grades()
        except Exception as e:
            logger.error(f"validate_grades failed for submission {pk}: {e}")
            warnings = []

        if warnings and not request.data.get('force'):
            return Response({
                'error': 'Validation warnings detected',
                'warnings': warnings[:20],
                'warning_count': len(warnings),
            }, status=400)

        submission.status = 'submitted'
        submission.submitted_at = timezone.now()
        submission.save(update_fields=['status', 'submitted_at'])

        admins = User.objects.filter(role='admin', is_active=True)
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                notification_type='grade',
                title='Grade Submission Received',
                message=f'{submission.teacher.get_full_name()} submitted grades for {submission.classroom.name} - {submission.subject.name} (Q{submission.grading_period.quarter})',
                link='/admin-grade-monitor',
            )

        log_audit_action(
            user=request.user, action='grade_submit',
            model_name='GradeSubmission', object_id=submission.id,
            object_repr=str(submission),
            description=f'Submitted grades for {submission.classroom.name} - {submission.subject.name}',
            request=request
        )
        return Response(GradeSubmissionSerializer(submission).data)

    @action(detail=True, methods=['delete'])
    def remove(self, request, pk=None):
        submission = self.get_object()
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can delete submissions'}, status=403)
        if submission.status == 'locked':
            return Response({'error': 'Cannot delete locked submissions'}, status=400)
        title = str(submission)
        sub_id = submission.id
        submission.delete()
        log_audit_action(
            user=request.user, action='grade_delete',
            model_name='GradeSubmission', object_id=sub_id,
            object_repr=title,
            description=f'Deleted grade submission: {title}',
            request=request
        )
        return Response({'message': 'Submission deleted'}, status=200)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can approve'}, status=403)
        submission = self.get_object()
        if submission.status != 'submitted':
            return Response({'error': 'Only submitted grades can be approved'}, status=400)

        submission.status = 'approved'
        submission.approved_at = timezone.now()
        submission.approved_by = request.user
        submission.save(update_fields=['status', 'approved_at', 'approved_by'])

        Grade.objects.filter(
            classroom=submission.classroom,
            subject=submission.subject,
            quarter=submission.grading_period.quarter,
            academic_year=submission.grading_period.academic_year.name,
        ).update(is_locked=True)

        submission.status = 'locked'
        submission.locked_at = timezone.now()
        submission.save(update_fields=['status', 'locked_at'])

        Notification.objects.create(
            recipient=submission.teacher,
            notification_type='grade',
            title='Grades Approved & Locked',
            message=f'Your grades for {submission.classroom.name} - {submission.subject.name} (Q{submission.grading_period.quarter}) have been approved and locked.',
            link='/teacher-grade-dashboard',
        )

        log_audit_action(
            user=request.user, action='grade_approve',
            model_name='GradeSubmission', object_id=submission.id,
            object_repr=str(submission),
            description=f'Approved and locked grades for {submission.classroom.name} - {submission.subject.name}',
            request=request
        )
        return Response(GradeSubmissionSerializer(submission).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can reject'}, status=403)
        submission = self.get_object()
        if submission.status != 'submitted':
            return Response({'error': 'Only submitted grades can be rejected'}, status=400)

        reason = request.data.get('reason', '')
        submission.status = 'draft'
        submission.rejection_reason = reason
        submission.submitted_at = None
        submission.save(update_fields=['status', 'rejection_reason', 'submitted_at'])

        Notification.objects.create(
            recipient=submission.teacher,
            notification_type='grade',
            title='Grade Submission Rejected',
            message=f'Your grades for {submission.classroom.name} - {submission.subject.name} (Q{submission.grading_period.quarter}) were rejected. Reason: {reason}',
            link='/teacher-grade-dashboard',
        )

        log_audit_action(
            user=request.user, action='grade_reject',
            model_name='GradeSubmission', object_id=submission.id,
            object_repr=str(submission),
            description=f'Rejected grades for {submission.classroom.name}: {reason}',
            request=request
        )
        return Response(GradeSubmissionSerializer(submission).data)

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can review'}, status=403)
        submission = self.get_object()
        if submission.status != 'submitted':
            return Response({'error': 'Only submitted grades can be reviewed'}, status=400)

        submission.status = 'reviewed'
        submission.reviewed_at = timezone.now()
        submission.reviewed_by = request.user
        submission.save(update_fields=['status', 'reviewed_at', 'reviewed_by'])
        return Response(GradeSubmissionSerializer(submission).data)

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        submission = self.get_object()
        grading_period = submission.grading_period

        enrolled = StudentClassEnrollment.objects.filter(
            classroom=submission.classroom
        ).select_related('student')

        grades = Grade.objects.filter(
            classroom=submission.classroom,
            subject=submission.subject,
            quarter=grading_period.quarter,
            grade_type='final_grade',
            academic_year=grading_period.academic_year.name,
        ).select_related('student')

        grade_map = {g.student_id: g for g in grades}
        students_with_grades = []
        for e in enrolled:
            g = grade_map.get(e.student.id)
            students_with_grades.append({
                'student_id': e.student.id,
                'student_name': e.student.get_full_name(),
                'has_grade': g is not None and g.raw_score is not None,
                'score': float(g.raw_score) if g and g.raw_score is not None else None,
            })

        scores = [float(g.raw_score) for g in grades if g.raw_score is not None]
        missing = sum(1 for s in students_with_grades if not s['has_grade'])

        data = GradeSubmissionSummarySerializer({
            'quarter': grading_period.quarter,
            'subject_name': submission.subject.name,
            'classroom_name': submission.classroom.name,
            'total_students': enrolled.count(),
            'average_grade': round(sum(scores) / len(scores), 2) if scores else None,
            'missing_grades': missing,
            'highest_grade': max(scores) if scores else None,
            'lowest_grade': min(scores) if scores else None,
            'validation_passed': missing == 0,
        }).data
        data['students'] = students_with_grades
        return Response(data)

    @action(detail=True, methods=['get'])
    def validate(self, request, pk=None):
        submission = self.get_object()
        warnings = submission.validate_grades()
        return Response({
            'warnings': warnings,
            'warning_count': len(warnings),
            'passed': len(warnings) == 0,
        })

    @action(detail=False, methods=['get'])
    def teacher_dashboard(self, request):
        if request.user.role != 'staff':
            return Response({'error': 'This endpoint is for teachers only'}, status=403)

        from ..models import SystemSetting
        sys_ay = SystemSetting.get_settings().academic_year
        ay_filter = {'academic_year__name': sys_ay} if sys_ay else {'academic_year__is_active': True}

        active_period = GradingPeriod.objects.filter(
            **ay_filter,
            status__in=['open', 'closing_soon'],
        ).select_related('academic_year').first()

        # Use the most recent period of any status as a fallback for get_or_create
        any_period = GradingPeriod.objects.filter(
            **ay_filter,
        ).select_related('academic_year').order_by('-quarter').first()

        teacher_classes = ClassroomSubject.objects.filter(
            teacher=request.user
        ).select_related('classroom', 'subject')

        pending = []
        submitted_list = []
        overdue = []
        due_today = []

        period_to_use = active_period or any_period

        for cs in teacher_classes:
            if period_to_use:
                sub, created = GradeSubmission.objects.get_or_create(
                    teacher=request.user,
                    classroom=cs.classroom,
                    subject=cs.subject,
                    grading_period=period_to_use,
                    defaults={'status': 'draft'}
                )
                try:
                    sub.compute_progress()
                except Exception:
                    # compute_progress failed — manually count from Grade table
                    try:
                        from ..models.assignments import Grade as GradeModel
                        enrolled = cs.classroom.enrollments.count()
                        graded = GradeModel.objects.filter(
                            classroom=cs.classroom,
                            subject=cs.subject,
                            grade_type='final_grade',
                            raw_score__isnull=False,
                        ).values('student').distinct().count()
                        sub.total_students = enrolled
                        sub.graded_count = graded
                        sub.missing_count = max(0, enrolled - graded)
                        sub.completion_percentage = round(
                            (graded / enrolled * 100) if enrolled > 0 else 0, 2
                        )
                        sub.save(update_fields=[
                            'total_students', 'graded_count',
                            'missing_count', 'completion_percentage',
                        ])
                    except Exception:
                        pass

                if sub.status in ('draft', 'in_progress'):
                    if active_period and active_period.days_remaining <= 0:
                        overdue.append(sub)
                    elif active_period and active_period.days_remaining == 0:
                        due_today.append(sub)
                    else:
                        pending.append(sub)
                else:
                    submitted_list.append(sub)
            else:
                # No grading period exists at all — show existing GradeSubmission if any
                existing = GradeSubmission.objects.filter(
                    teacher=request.user,
                    classroom=cs.classroom,
                    subject=cs.subject,
                ).select_related('grading_period').order_by('-created_at').first()
                if existing:
                    if existing.status in ('approved', 'locked', 'submitted', 'reviewed'):
                        submitted_list.append(existing)
                    else:
                        pending.append(existing)

        serializer = GradeSubmissionSerializer
        return Response({
            'active_grading_period': GradingPeriodSerializer(active_period).data if active_period else None,
            'submission_deadline': active_period.effective_deadline if active_period else None,
            'days_remaining': active_period.days_remaining if active_period else None,
            'pending_classes': serializer(pending, many=True).data,
            'submitted_classes': serializer(submitted_list, many=True).data,
            'overdue_classes': serializer(overdue, many=True).data,
            'total_pending': len(pending),
            'total_submitted': len(submitted_list),
            'total_overdue': len(overdue),
            'total_due_today': len(due_today),
        })

    @action(detail=False, methods=['get'])
    def admin_monitoring(self, request):
        if request.user.role not in ('admin', 'staff'):
            return Response({'error': 'Only admins can view monitoring'}, status=403)

        from ..models import SystemSetting
        sys_ay = SystemSetting.get_settings().academic_year
        ay_filter = {'academic_year__name': sys_ay} if sys_ay else {'academic_year__is_active': True}

        active_period = GradingPeriod.objects.filter(
            **ay_filter,
            status__in=['open', 'closing_soon', 'closed', 'locked'],
        ).select_related('academic_year').first()

        if not active_period:
            return Response({
                'total_teachers': 0,
                'submitted_teachers': 0,
                'pending_teachers': 0,
                'overdue_teachers': 0,
                'completion_percentage': 0,
                'teacher_details': [],
                'by_department': [],
                'by_grade_level': [],
                'daily_submissions': [],
            })

        all_teachers = User.objects.filter(role='staff', is_active=True)
        teacher_ids = list(all_teachers.values_list('id', flat=True))

        submissions = GradeSubmission.objects.filter(
            grading_period=active_period,
            teacher_id__in=teacher_ids,
        ).values('teacher_id', 'status').annotate(count=Count('id'))

        teacher_stats = {}
        for tid in teacher_ids:
            teacher_stats[tid] = {'submitted': 0, 'pending': 0, 'overdue': 0, 'total': 0}
        for s in submissions:
            tid = s['teacher_id']
            teacher_stats[tid]['total'] += s['count']
            if s['status'] in ('approved', 'locked', 'submitted', 'reviewed'):
                teacher_stats[tid]['submitted'] += s['count']
            elif s['status'] in ('draft', 'in_progress'):
                teacher_stats[tid]['pending'] += s['count']

        submitted_count = sum(1 for tid, stats in teacher_stats.items() if stats['submitted'] > 0)
        pending_count = sum(1 for tid, stats in teacher_stats.items() if stats['pending'] > 0 and stats['submitted'] == 0)
        overdue_count = 0
        if active_period and active_period.days_remaining < 0:
            overdue_count = pending_count

        total_expected = len(teacher_ids) * ClassroomSubject.objects.filter(
            classroom__academic_year=active_period.academic_year
        ).values('classroom_id', 'subject_id').distinct().count()
        total_actual = sum(stats['submitted'] for stats in teacher_stats.values())
        completion = round((total_actual / total_expected * 100) if total_expected > 0 else 0, 2)

        teacher_details = []
        for teacher in all_teachers:
            stats = teacher_stats.get(teacher.id, {'submitted': 0, 'pending': 0, 'overdue': 0, 'total': 0})
            profile = getattr(teacher, 'profile', None)
            dept = None
            if profile and hasattr(profile, 'department'):
                dept = profile.department
            teacher_subs = GradeSubmission.objects.filter(
                teacher=teacher, grading_period=active_period
            ).order_by('-updated_at').first()

            teacher_details.append({
                'id': teacher.id,
                'name': teacher.get_full_name(),
                'department': dept.name if dept else 'Unassigned',
                'total_classes': stats['total'],
                'submitted': stats['submitted'],
                'pending': stats['pending'],
                'overdue': stats['overdue'],
                'completion_percentage': round((stats['submitted'] / stats['total'] * 100) if stats['total'] > 0 else 0, 2),
                'last_submission': teacher_subs.updated_at.isoformat() if teacher_subs else None,
            })

        departments = {}
        for td in teacher_details:
            dept = td['department']
            if dept not in departments:
                departments[dept] = {'submitted': 0, 'pending': 0, 'total': 0}
            departments[dept]['submitted'] += td['submitted']
            departments[dept]['pending'] += td['pending']
            departments[dept]['total'] += td['total_classes']

        by_department = [
            {'name': k, **v, 'completion_percentage': round((v['submitted'] / v['total'] * 100) if v['total'] > 0 else 0, 2)}
            for k, v in departments.items()
        ]

        grade_levels = {}
        for cs in ClassroomSubject.objects.filter(
            classroom__academic_year=active_period.academic_year
        ).select_related('classroom'):
            level = cs.classroom.grade_level or 'Unknown'
            if level not in grade_levels:
                grade_levels[level] = {'submitted': 0, 'pending': 0, 'total': 0}
            grade_levels[level]['total'] += 1

        grade_subs = GradeSubmission.objects.filter(
            grading_period=active_period
        ).values('classroom__grade_level', 'status').annotate(count=Count('id'))
        for gs in grade_subs:
            level = gs['classroom__grade_level'] or 'Unknown'
            if level in grade_levels:
                if gs['status'] in ('approved', 'locked', 'submitted', 'reviewed'):
                    grade_levels[level]['submitted'] += gs['count']
                elif gs['status'] in ('draft', 'in_progress'):
                    grade_levels[level]['pending'] += gs['count']

        by_grade_level = [
            {'name': k, **v, 'completion_percentage': round((v['submitted'] / v['total'] * 100) if v['total'] > 0 else 0, 2)}
            for k, v in grade_levels.items()
        ]

        daily_subs = GradeSubmission.objects.filter(
            grading_period=active_period,
            submitted_at__isnull=False,
        ).values('submitted_at__date').annotate(count=Count('id')).order_by('submitted_at__date')

        daily_submissions = [
            {'date': str(d['submitted_at__date']), 'count': d['count']}
            for d in daily_subs
        ]

        return Response({
            'total_teachers': len(teacher_ids),
            'submitted_teachers': submitted_count,
            'pending_teachers': pending_count,
            'overdue_teachers': overdue_count,
            'completion_percentage': completion,
            'teacher_details': teacher_details,
            'by_department': by_department,
            'by_grade_level': by_grade_level,
            'daily_submissions': daily_submissions,
        })

    @action(detail=False, methods=['post'])
    def bulk_approve(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can bulk approve'}, status=403)
        ids = request.data.get('submission_ids', [])
        if not ids:
            return Response({'error': 'No submission IDs provided'}, status=400)

        approved = 0
        for sid in ids:
            try:
                sub = GradeSubmission.objects.get(id=sid, status='submitted')
                sub.status = 'approved'
                sub.approved_at = timezone.now()
                sub.approved_by = request.user
                sub.save(update_fields=['status', 'approved_at', 'approved_by'])

                Grade.objects.filter(
                    classroom=sub.classroom,
                    subject=sub.subject,
                    quarter=sub.grading_period.quarter,
                    academic_year=sub.grading_period.academic_year.name,
                ).update(is_locked=True)

                sub.status = 'locked'
                sub.locked_at = timezone.now()
                sub.save(update_fields=['status', 'locked_at'])

                Notification.objects.create(
                    recipient=sub.teacher,
                    notification_type='grade',
                    title='Grades Approved & Locked',
                    message=f'Your grades for {sub.classroom.name} - {sub.subject.name} (Q{sub.grading_period.quarter}) have been approved and locked.',
                    link='/teacher-grade-dashboard',
                )
                approved += 1
            except GradeSubmission.DoesNotExist:
                continue

        return Response({'approved': approved})

    @action(detail=False, methods=['get'])
    def export_submissions(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)

        period_id = request.query_params.get('grading_period')
        if not period_id:
            return Response({'error': 'grading_period is required'}, status=400)

        subs = GradeSubmission.objects.filter(
            grading_period_id=period_id
        ).select_related('teacher', 'classroom', 'subject', 'grading_period')

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="grade_submissions_Q{subs.first().grading_period.quarter if subs.exists() else ""}.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'Teacher', 'Classroom', 'Subject', 'Quarter', 'Status',
            'Total Students', 'Graded', 'Missing', 'Completion %',
            'Submitted At', 'Approved At', 'Approved By',
        ])
        for s in subs:
            writer.writerow([
                s.teacher.get_full_name(), s.classroom.name, s.subject.name,
                s.grading_period.quarter, s.get_status_display(),
                s.total_students, s.graded_count, s.missing_count,
                s.completion_percentage,
                s.submitted_at or '', s.approved_at or '',
                s.approved_by.get_full_name() if s.approved_by else '',
            ])
        return response


class GradeReopeningRequestViewSet(viewsets.ModelViewSet):
    serializer_class = GradeReopeningRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return GradeReopeningRequest.objects.select_related(
                'teacher', 'submission', 'submission__classroom',
                'submission__subject', 'submission__grading_period',
                'reviewed_by',
            )
        elif user.role == 'staff':
            return GradeReopeningRequest.objects.filter(
                teacher=user
            ).select_related(
                'teacher', 'submission', 'submission__classroom',
                'submission__subject', 'submission__grading_period',
                'reviewed_by',
            )
        return GradeReopeningRequest.objects.none()

    def perform_create(self, serializer):
        submission = serializer.validated_data.get('submission')
        if submission.status != 'locked':
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Can only request reopening for locked submissions")
        if GradeReopeningRequest.objects.filter(
            submission=submission, status='pending'
        ).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError("A pending reopening request already exists for this submission")
        serializer.save(teacher=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can approve reopening'}, status=403)
        req = self.get_object()
        if req.status != 'pending':
            return Response({'error': 'Only pending requests can be approved'}, status=400)

        req.status = 'approved'
        req.reviewed_by = request.user
        req.reviewed_at = timezone.now()
        req.reviewer_notes = request.data.get('notes', '')
        req.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'reviewer_notes'])

        submission = req.submission
        submission.status = 'in_progress'
        submission.locked_at = None
        submission.save(update_fields=['status', 'locked_at'])

        Grade.objects.filter(
            classroom=submission.classroom,
            subject=submission.subject,
            quarter=submission.grading_period.quarter,
            academic_year=submission.grading_period.academic_year.name,
        ).update(is_locked=False)

        Notification.objects.create(
            recipient=req.teacher,
            notification_type='system',
            title='Grade Reopening Approved',
            message=f'Your request to reopen grades for {submission.classroom.name} - {submission.subject.name} (Q{submission.grading_period.quarter}) has been approved. You can now edit and resubmit.',
            link='/teacher-grade-dashboard',
        )

        log_audit_action(
            user=request.user, action='grade_reopen',
            model_name='GradeReopeningRequest', object_id=req.id,
            object_repr=str(req),
            description=f'Approved reopening for {submission.classroom.name} - {submission.subject.name}',
            request=request
        )
        return Response(GradeReopeningRequestSerializer(req).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can reject reopening'}, status=403)
        req = self.get_object()
        if req.status != 'pending':
            return Response({'error': 'Only pending requests can be rejected'}, status=400)

        req.status = 'rejected'
        req.reviewed_by = request.user
        req.reviewed_at = timezone.now()
        req.reviewer_notes = request.data.get('notes', '')
        req.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'reviewer_notes'])

        Notification.objects.create(
            recipient=req.teacher,
            notification_type='system',
            title='Grade Reopening Rejected',
            message=f'Your request to reopen grades for {req.submission.classroom.name} - {req.submission.subject.name} (Q{req.submission.grading_period.quarter}) has been rejected.',
            link='/teacher-grade-dashboard',
        )

        log_audit_action(
            user=request.user, action='grade_reopen_reject',
            model_name='GradeReopeningRequest', object_id=req.id,
            object_repr=str(req),
            description=f'Rejected reopening for {req.submission.classroom.name}',
            request=request
        )
        return Response(GradeReopeningRequestSerializer(req).data)
