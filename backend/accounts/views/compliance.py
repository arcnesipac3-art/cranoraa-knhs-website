from rest_framework import viewsets, status, parsers, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from django.contrib.auth import get_user_model

from ..models.compliance import (
    ComplianceType, ComplianceSubmission, ComplianceFile, ComplianceComment,
    ComplianceTypeSubjectAssignment, ComplianceAuditLog,
)
from ..serializers.compliance import (
    ComplianceTypeSerializer,
    ComplianceSubmissionSerializer,
    ComplianceSubmissionListSerializer,
    ComplianceFileSerializer,
    ComplianceCommentSerializer,
    ComplianceReviewSerializer,
    ComplianceBulkReviewSerializer,
)
from ..permissions import IsAdmin, IsStaff, IsAdminOrStaff
from ..storage import upload_file, StorageValidationError
from ..services.compliance import (
    calculate_period_number,
    create_submission_for_teacher,
    ensure_teacher_submissions,
    mark_overdue_submissions,
    get_compliance_stats,
    get_active_academic_year,
    get_active_semester,
)

import logging

logger = logging.getLogger(__name__)

User = get_user_model()


# ── Audit helper ──────────────────────────────────────────────────────────────
def _log_action(submission, user, action, details=None):
    """Create a ComplianceAuditLog entry. Silently ignores errors."""
    try:
        from ..models.compliance import ComplianceAuditLog
        ComplianceAuditLog.objects.create(
            submission=submission,
            user=user,
            action=action,
            details=details or {},
        )
    except Exception as exc:
        logger.warning(f"[compliance audit] failed to log action={action}: {exc}")


class ComplianceTypeViewSet(viewsets.ModelViewSet):
    serializer_class = ComplianceTypeSerializer
    permission_classes = [IsAuthenticated]
    queryset = ComplianceType.objects.all()

    def get_queryset(self):
        qs = ComplianceType.objects.all()
        if self.request.user.role != 'admin':
            qs = qs.filter(is_active=True)
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        instance = serializer.save()
        
        # Handle subject assignments
        assigned_subjects = self.request.data.get('assigned_subjects', [])
        if assigned_subjects:
            for subject_id in assigned_subjects:
                ComplianceTypeSubjectAssignment.objects.create(
                    compliance_type=instance,
                    subject_id=subject_id,
                )

    @transaction.atomic
    def perform_update(self, serializer):
        instance = serializer.save()
        
        # Only update subject assignments if explicitly provided in the request
        if 'assigned_subjects' in self.request.data:
            assigned_subjects = self.request.data.get('assigned_subjects', [])
            
            # Clear existing assignments
            ComplianceTypeSubjectAssignment.objects.filter(
                compliance_type=instance
            ).delete()
            
            # Create new assignments
            for subject_id in assigned_subjects:
                ComplianceTypeSubjectAssignment.objects.create(
                    compliance_type=instance,
                    subject_id=subject_id,
                )

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])

    @action(detail=True, methods=['delete'], url_path='hard-delete')
    def hard_delete(self, request, pk=None):
        if request.user.role != 'admin':
            return Response(
                {'error': 'Only admins can delete compliance types.'},
                status=status.HTTP_403_FORBIDDEN
            )
        instance = self.get_object()
        submission_count = instance.submissions.count()
        if submission_count > 0:
            return Response(
                {'error': f'Cannot delete — this type has {submission_count} submission(s) linked to it. Deactivate it instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.delete()
        return Response({'message': 'Compliance type permanently deleted.'}, status=status.HTTP_204_NO_CONTENT)


class ComplianceSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = ComplianceSubmissionSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        user = self.request.user
        qs = ComplianceSubmission.objects.select_related(
            'teacher', 'compliance_type', 'academic_year', 'semester', 'reviewed_by',
            'classroom_subject__subject', 'classroom_subject__classroom'
        ).prefetch_related('files', 'comments')

        if user.role == 'admin':
            teacher_id = self.request.query_params.get('teacher_id')
            compliance_type_id = self.request.query_params.get('compliance_type_id')
            status_filter = self.request.query_params.get('status')
            academic_year_id = self.request.query_params.get('academic_year_id')
            semester_id = self.request.query_params.get('semester_id')
            period_number = self.request.query_params.get('period_number')
            subject_id = self.request.query_params.get('subject_id')
            classroom_id = self.request.query_params.get('classroom_id')

            if teacher_id:
                qs = qs.filter(teacher_id=teacher_id)
            if compliance_type_id:
                qs = qs.filter(compliance_type_id=compliance_type_id)
            if status_filter:
                qs = qs.filter(status=status_filter)
            if academic_year_id:
                qs = qs.filter(academic_year_id=academic_year_id)
            if semester_id:
                qs = qs.filter(semester_id=semester_id)
            if period_number:
                qs = qs.filter(period_number=period_number)
            if subject_id:
                qs = qs.filter(classroom_subject__subject_id=subject_id)
            if classroom_id:
                qs = qs.filter(classroom_subject__classroom_id=classroom_id)
        else:
            qs = qs.filter(teacher=user)

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ComplianceSubmissionListSerializer
        return ComplianceSubmissionSerializer

    def perform_create(self, serializer):
        # Validate classroom_subject is provided for new submissions
        classroom_subject_id = self.request.data.get('classroom_subject')
        if not classroom_subject_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'classroom_subject': 'classroom_subject is required for new submissions. Please select a subject/classroom assignment.'
            })
        
        submission = serializer.save(teacher=self.request.user)

        files = self.request.FILES.getlist('files')
        for f in files:
            url, err = upload_file(
                f,
                bucket_key='compliance-documents',
                folder=f"compliance/{submission.id}"
            )
            if url:
                ComplianceFile.objects.create(
                    submission=submission,
                    file_url=url,
                    original_filename=f.name,
                    file_size_bytes=f.size,
                    content_type=getattr(f, 'content_type', '') or '',
                )
            else:
                logger.warning(f"File upload failed: {err}")

        # Audit log
        _log_action(submission, self.request.user, 'create')

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        submission = self.get_object()

        if submission.teacher != request.user:
            return Response(
                {'error': 'You can only submit your own compliance.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if submission.status not in ('draft', 'rejected'):
            return Response(
                {'error': f'Cannot submit a {submission.status} submission.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        submission.status = 'submitted'
        submission.submitted_at = timezone.now()
        submission.save(update_fields=['status', 'submitted_at', 'updated_at'])

        _log_action(submission, request.user, 'submit')

        from ..models import Notification
        admins = User.objects.filter(role='admin', is_active=True)
        teacher_name = submission.teacher.get_full_name() or submission.teacher.username
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                sender=request.user,
                notification_type='system',
                title='New Compliance Submission',
                message=f'{teacher_name} submitted {submission.compliance_type.name} for Period {submission.period_number}',
                link='/compliance?tab=submissions',
            )

        return Response({'status': 'submitted', 'message': 'Submission sent for review.'})

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        if request.user.role != 'admin':
            return Response(
                {'error': 'Only admins can review submissions.'},
                status=status.HTTP_403_FORBIDDEN
            )

        submission = self.get_object()
        serializer = ComplianceReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        remarks = serializer.validated_data.get('remarks', '')

        submission.status = new_status
        submission.reviewed_at = timezone.now()
        submission.reviewed_by = request.user
        submission.remarks = remarks
        submission.save(update_fields=['status', 'reviewed_at', 'reviewed_by', 'remarks', 'updated_at'])

        action_name = 'approve' if new_status == 'reviewed' else 'reject'
        _log_action(submission, request.user, action_name, {'remarks': remarks})

        from ..models import Notification
        teacher_name = submission.teacher.get_full_name() or submission.teacher.username
        status_word = 'approved' if new_status == 'reviewed' else 'rejected'
        Notification.objects.create(
            recipient=submission.teacher,
            sender=request.user,
            notification_type='system',
            title=f'Compliance {status_word.title()}',
            message=f'Your {submission.compliance_type.name} (Period {submission.period_number}) was {status_word}.{f" Remarks: {remarks}" if remarks else ""}',
            link='/my-compliance',
        )

        return Response({'status': new_status, 'message': f'Submission {status_word}.'})

    @action(detail=False, methods=['post'])
    def bulk_review(self, request):
        if request.user.role != 'admin':
            return Response(
                {'error': 'Only admins can perform bulk review.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ComplianceBulkReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        submission_ids = serializer.validated_data['submission_ids']
        new_status = serializer.validated_data['status']
        remarks = serializer.validated_data.get('remarks', '')

        submissions = ComplianceSubmission.objects.filter(
            id__in=submission_ids,
            status__in=['submitted', 'overdue'],
        )

        reviewed_count = 0
        for sub in submissions:
            sub.status = new_status
            sub.reviewed_at = timezone.now()
            sub.reviewed_by = request.user
            sub.remarks = remarks
            sub.save(update_fields=['status', 'reviewed_at', 'reviewed_by', 'remarks', 'updated_at'])
            reviewed_count += 1

            action_name = 'approve' if new_status == 'reviewed' else 'reject'
            _log_action(sub, request.user, action_name, {'remarks': remarks, 'bulk': True})

            from ..models import Notification
            status_word = 'approved' if new_status == 'reviewed' else 'rejected'
            Notification.objects.create(
                recipient=sub.teacher,
                sender=request.user,
                notification_type='system',
                title=f'Compliance {status_word.title()}',
                message=f'Your {sub.compliance_type.name} (Period {sub.period_number}) was {status_word}.{f" Remarks: {remarks}" if remarks else ""}',
                link='/my-compliance',
            )

        return Response({
            'status': new_status,
            'reviewed_count': reviewed_count,
            'message': f'{reviewed_count} submissions {new_status}.',
        })

    @action(detail=True, methods=['get', 'post'])
    def comments(self, request, pk=None):
        submission = self.get_object()

        if request.user.role != 'admin' and submission.teacher != request.user:
            return Response(
                {'error': 'You do not have access to this submission.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if request.method == 'GET':
            comments = submission.comments.select_related('author').all()
            serializer = ComplianceCommentSerializer(comments, many=True)
            return Response(serializer.data)

        serializer = ComplianceCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(author=request.user, submission=submission)

        from ..models import Notification
        if request.user.role == 'admin' and submission.teacher != request.user:
            teacher_name = submission.teacher.get_full_name() or submission.teacher.username
            Notification.objects.create(
                recipient=submission.teacher,
                sender=request.user,
                notification_type='system',
                title='New Comment on Compliance',
                message=f'Admin commented on your {submission.compliance_type.name} submission.',
                link='/my-compliance',
            )
        elif submission.teacher == request.user:
            admins = User.objects.filter(role='admin', is_active=True)
            teacher_name = request.user.get_full_name() or request.user.username
            for admin in admins:
                Notification.objects.create(
                    recipient=admin,
                    sender=request.user,
                    notification_type='system',
                    title='New Comment on Compliance',
                    message=f'{teacher_name} commented on their {submission.compliance_type.name} submission.',
                    link='/compliance?tab=submissions',
                )

        return Response(ComplianceCommentSerializer(comment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='files/(?P<file_id>[0-9]+)')
    def remove_file(self, request, pk=None, file_id=None):
        submission = self.get_object()

        if submission.teacher != request.user:
            return Response(
                {'error': 'You can only modify your own files.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if submission.status not in ('draft', 'rejected'):
            return Response(
                {'error': 'Cannot modify files on a submitted compliance.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            file_obj = ComplianceFile.objects.get(id=file_id, submission=submission)
            file_obj.delete()
            return Response({'message': 'File removed.'})
        except ComplianceFile.DoesNotExist:
            return Response(
                {'error': 'File not found.'},
                status=status.HTTP_404_NOT_FOUND
            )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def compliance_dashboard(request):
    if request.user.role != 'admin':
        return Response(
            {'error': 'Only admins can access the dashboard.'},
            status=status.HTTP_403_FORBIDDEN
        )

    academic_year_id = request.query_params.get('academic_year_id')
    semester_id      = request.query_params.get('semester_id')
    subject_id       = request.query_params.get('subject_id')

    from ..models.infrastructure import AcademicYear, Semester

    academic_year = None
    semester      = None

    if academic_year_id:
        try:
            academic_year = AcademicYear.objects.get(id=academic_year_id)
        except AcademicYear.DoesNotExist:
            pass
    if not academic_year:
        academic_year = get_active_academic_year()

    if semester_id:
        try:
            semester = Semester.objects.get(id=semester_id)
        except Semester.DoesNotExist:
            pass
    if not semester:
        semester = get_active_semester()

    stats = get_compliance_stats(
        academic_year=academic_year,
        semester=semester,
        subject_id=int(subject_id) if subject_id else None,
    )
    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_compliance_status(request):
    """
    Returns teacher's compliance status grouped by classroom subject assignment.
    Each assignment (subject + classroom) lists applicable compliance types
    and existing submissions for the current period.
    """
    user = request.user
    academic_year = get_active_academic_year()
    semester = get_active_semester()

    if not academic_year:
        return Response({
            'academic_year': None,
            'semester': None,
            'assignments': [],
            'summary': {'total': 0, 'submitted': 0, 'pending': 0, 'overdue': 0},
        })

    # Get teacher's classroom subject assignments
    # NOTE: classroom.academic_year is nullable — filter by teacher only
    from ..models.academic import ClassroomSubject
    assignments = ClassroomSubject.objects.filter(
        teacher=user,
        teacher__is_active=True,
    ).select_related('subject', 'classroom').order_by(
        'classroom__name', 'subject__name'
    )

    # Get all active compliance types with their subject assignments
    all_types = ComplianceType.objects.filter(is_active=True).prefetch_related(
        'subject_assignments__subject'
    )

    # Get all teacher's submissions for this academic year
    submissions_qs = ComplianceSubmission.objects.filter(
        teacher=user,
        academic_year=academic_year,
    ).select_related(
        'compliance_type', 'classroom_subject__subject', 'classroom_subject__classroom'
    ).prefetch_related('files')

    if semester:
        submissions_qs = submissions_qs.filter(semester=semester)

    # Build a lookup: (compliance_type_id, classroom_subject_id) -> submission
    submissions_map = {}
    for sub in submissions_qs:
        key = (sub.compliance_type_id, sub.classroom_subject_id)
        # Keep the most recent per key
        if key not in submissions_map or sub.created_at > submissions_map[key].created_at:
            submissions_map[key] = sub

    def get_applicable_types(subject):
        """Return compliance types that apply to a subject (global + subject-specific)."""
        applicable = []
        for ctype in all_types:
            subject_assignments = list(ctype.subject_assignments.all())
            # No subject restrictions → applies to all
            if not subject_assignments:
                applicable.append(ctype)
            # Has restrictions → check if this subject is included
            elif any(sa.subject_id == subject.id for sa in subject_assignments):
                applicable.append(ctype)
        return applicable

    def format_submission(sub):
        if not sub:
            return None
        return {
            'id': sub.id,
            'status': sub.status,
            'period_number': sub.period_number,
            'submitted_at': sub.submitted_at.isoformat() if sub.submitted_at else None,
            'reviewed_at': sub.reviewed_at.isoformat() if sub.reviewed_at else None,
            'remarks': sub.remarks,
            'file_count': sub.files.count(),
            'files': [
                {
                    'id': f.id,
                    'file_url': f.file_url,
                    'original_filename': f.original_filename,
                    'file_size_bytes': f.file_size_bytes,
                    'uploaded_at': f.uploaded_at.isoformat(),
                }
                for f in sub.files.all()
            ],
        }

    # Build grouped response
    assignment_data = []
    total_expected = 0
    total_submitted = 0
    total_pending = 0
    total_overdue = 0

    for assignment in assignments:
        applicable_types = get_applicable_types(assignment.subject)
        if not applicable_types:
            continue

        types_with_status = []
        for ctype in applicable_types:
            period_num = calculate_period_number(ctype, academic_year=academic_year)
            sub = submissions_map.get((ctype.id, assignment.id))

            # Also check for the current period specifically
            if not sub:
                sub = next(
                    (v for (ct_id, cs_id), v in submissions_map.items()
                     if ct_id == ctype.id and cs_id == assignment.id
                     and v.period_number == period_num),
                    None
                )

            total_expected += 1
            if sub and sub.status in ('submitted', 'reviewed'):
                total_submitted += 1
            elif sub and sub.status == 'overdue':
                total_overdue += 1
            else:
                total_pending += 1

            # Collect all submissions history for this type+assignment
            history = [
                format_submission(v)
                for (ct_id, cs_id), v in submissions_map.items()
                if ct_id == ctype.id and cs_id == assignment.id
            ]
            history.sort(key=lambda x: x['id'] if x else 0, reverse=True)

            types_with_status.append({
                'id': ctype.id,
                'name': ctype.name,
                'slug': ctype.slug,
                'description': ctype.description,
                'frequency': ctype.frequency,
                'deadline_day': ctype.deadline_day,
                'max_file_size_mb': ctype.max_file_size_mb,
                'current_period': period_num,
                'latest_submission': format_submission(sub),
                'submissions': history,
                'can_submit': not sub or sub.status in ('reviewed', 'rejected'),
            })

        assignment_data.append({
            'id': assignment.id,
            'subject_id': assignment.subject.id,
            'subject_name': assignment.subject.name,
            'subject_code': assignment.subject.code,
            'classroom_id': assignment.classroom.id,
            'classroom_name': assignment.classroom.name,
            'compliance_types': types_with_status,
            'compliant_count': sum(
                1 for t in types_with_status
                if t['latest_submission'] and t['latest_submission']['status'] in ('submitted', 'reviewed')
            ),
            'total_count': len(types_with_status),
        })

    return Response({
        'academic_year': {
            'id': academic_year.id,
            'name': academic_year.name,
        },
        'semester': {
            'id': semester.id,
            'name': semester.name,
            'semester_type': semester.semester_type,
        } if semester else None,
        'assignments': assignment_data,
        'summary': {
            'total': total_expected,
            'submitted': total_submitted,
            'pending': total_pending,
            'overdue': total_overdue,
            'rate': round(total_submitted / total_expected * 100, 1) if total_expected > 0 else 0,
        },
    })


@api_view(['POST'])
@permission_classes([IsAdmin])
def check_overdue_submissions(request):
    marked = mark_overdue_submissions()
    return Response({
        'marked_overdue': marked,
        'message': f'{marked} submissions marked as overdue.',
    })


def log_compliance_action(submission, user, action, details=None):
    """Create an audit log entry for a compliance action."""
    try:
        ComplianceAuditLog.objects.create(
            submission=submission,
            user=user,
            action=action,
            details=details or {},
        )
    except Exception as e:
        logger.warning(f"Failed to create compliance audit log: {e}")


@api_view(['POST'])
@permission_classes([IsAdmin])
def bulk_assign_classroom_subject(request):
    """
    Bulk-assign classroom_subject to legacy submissions that have none.
    Useful for migrating old submissions to the new subject-linked structure.
    """
    submission_ids       = request.data.get('submission_ids', [])
    classroom_subject_id = request.data.get('classroom_subject_id')

    if not classroom_subject_id:
        return Response({'error': 'classroom_subject_id is required'}, status=400)

    if not submission_ids:
        return Response({'error': 'submission_ids must be a non-empty list'}, status=400)

    updated = ComplianceSubmission.objects.filter(
        id__in=submission_ids,
    ).update(classroom_subject_id=classroom_subject_id)

    # Audit log each reassignment
    for sub in ComplianceSubmission.objects.filter(id__in=submission_ids):
        log_compliance_action(sub, request.user, 'bulk_assign', {
            'classroom_subject_id': classroom_subject_id,
        })

    return Response({
        'updated': updated,
        'message': f'{updated} submission(s) assigned to classroom subject {classroom_subject_id}.',
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def legacy_submissions(request):
    """
    Return submissions with no classroom_subject assigned.
    These are old/legacy records that need manual assignment.
    """
    qs = ComplianceSubmission.objects.filter(
        classroom_subject__isnull=True,
    ).select_related(
        'teacher', 'compliance_type', 'academic_year',
    ).order_by('-created_at')

    data = [{
        'id':                   sub.id,
        'teacher':              sub.teacher_id,
        'teacher_name':         sub.teacher.get_full_name() or sub.teacher.username,
        'compliance_type':      sub.compliance_type_id,
        'compliance_type_name': sub.compliance_type.name,
        'period_number':        sub.period_number,
        'status':               sub.status,
        'academic_year':        sub.academic_year_id,
        'created_at':           sub.created_at.isoformat(),
    } for sub in qs]

    return Response({'count': len(data), 'results': data})


@api_view(['GET'])
@permission_classes([IsAdmin])
def compliance_audit_trail(request):
    """Return audit log entries for a specific submission."""
    submission_id = request.query_params.get('submission_id')
    if not submission_id:
        return Response({'error': 'submission_id is required'}, status=400)

    logs = ComplianceAuditLog.objects.filter(
        submission_id=submission_id,
    ).select_related('user').order_by('-created_at')

    data = [{
        'id':          log.id,
        'action':      log.action,
        'action_display': log.get_action_display(),
        'user_id':     log.user_id,
        'user_name':   log.user.get_full_name() or log.user.username if log.user else 'system',
        'details':     log.details,
        'created_at':  log.created_at.isoformat(),
    } for log in logs]

    return Response({'results': data})


@api_view(['POST'])
@permission_classes([IsAdmin])
def trigger_compliance_reminders(request):
    """
    Admin endpoint to manually trigger compliance reminders.
    Same logic as the management command but runs synchronously.
    """
    from datetime import date, timedelta
    from ..models.academic import ClassroomSubject
    from ..models.compliance import ComplianceTypeSubjectAssignment
    from ..models import Notification

    dry_run = request.data.get('dry_run', False)
    today = date.today()

    academic_year = get_active_academic_year()
    if not academic_year:
        return Response({'error': 'No active academic year'}, status=400)

    semester = get_active_semester()
    all_types = list(ComplianceType.objects.filter(is_active=True))

    assignments_map = {}
    for sa in ComplianceTypeSubjectAssignment.objects.all():
        assignments_map.setdefault(sa.compliance_type_id, []).append(sa.subject_id)

    teachers = User.objects.filter(role='staff', is_active=True)
    total_reminders = 0
    total_overdue = 0

    for teacher in teachers:
        cs_assignments = ClassroomSubject.objects.filter(
            teacher=teacher,
            teacher__is_active=True,
        ).select_related('subject', 'classroom')

        if not cs_assignments.exists():
            continue

        overdue_items = []
        reminder_items = []

        for cs in cs_assignments:
            subject_ids_for_type = {}
            for ctype_id, sids in assignments_map.items():
                subject_ids_for_type[ctype_id] = sids

            for ctype in all_types:
                type_subject_ids = assignments_map.get(ctype.id, [])
                if type_subject_ids and cs.subject_id not in type_subject_ids:
                    continue

                period_num = calculate_period_number(ctype, academic_year=academic_year)
                qs = ComplianceSubmission.objects.filter(
                    teacher=teacher, compliance_type=ctype,
                    classroom_subject=cs, period_number=period_num,
                    academic_year=academic_year,
                )
                if semester:
                    qs = qs.filter(semester=semester)
                submission = qs.first()

                if submission and submission.status in ('submitted', 'reviewed'):
                    continue

                try:
                    deadline = get_deadline(ctype, period_num, academic_year)
                except Exception:
                    continue

                days_until = (deadline - today).days
                item = {'ctype': ctype, 'cs': cs, 'deadline': deadline, 'days_until': days_until}

                if days_until < 0:
                    overdue_items.append(item)
                elif days_until <= 2:
                    reminder_items.append(item)

        if not dry_run:
            if overdue_items:
                items_str = ', '.join(
                    f"{i['ctype'].name} ({i['cs'].subject.name})" for i in overdue_items[:3]
                )
                Notification.objects.create(
                    recipient=teacher,
                    notification_type='system',
                    title='Compliance Overdue',
                    message=f"You have {len(overdue_items)} overdue compliance(s): {items_str}. Submit immediately.",
                    link='/my-compliance',
                )
                total_overdue += 1

            if reminder_items:
                items_str = ', '.join(
                    f"{i['ctype'].name} ({i['cs'].subject.name}) in {i['days_until']}d"
                    for i in reminder_items[:3]
                )
                Notification.objects.create(
                    recipient=teacher,
                    notification_type='system',
                    title='Compliance Reminder',
                    message=f"You have {len(reminder_items)} compliance(s) due soon: {items_str}.",
                    link='/my-compliance',
                )
                total_reminders += 1

    return Response({
        'dry_run': dry_run,
        'total_reminders_sent': total_reminders,
        'total_overdue_alerts': total_overdue,
        'message': f'{"[DRY RUN] " if dry_run else ""}Sent {total_reminders} reminders and {total_overdue} overdue alerts.',
    })


@api_view(['POST'])
@permission_classes([IsAdmin])
def sync_teacher_submissions(request):
    teacher_id = request.data.get('teacher_id')
    if teacher_id:
        try:
            teacher = User.objects.get(id=teacher_id, role='staff')
            submissions = ensure_teacher_submissions(teacher)
            return Response({
                'synced': len(submissions),
                'message': f'{len(submissions)} submissions synced for {teacher.username}.',
            })
        except User.DoesNotExist:
            return Response({'error': 'Teacher not found.'}, status=404)
    else:
        teachers = User.objects.filter(role='staff', is_active=True)
        total = 0
        for teacher in teachers:
            subs = ensure_teacher_submissions(teacher)
            total += len(subs)
        return Response({
            'synced': total,
            'message': f'{total} submissions synced for all teachers.',
        })
