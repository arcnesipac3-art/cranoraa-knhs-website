from rest_framework import viewsets, status, parsers, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from django.utils import timezone
from django.contrib.auth import get_user_model

from ..models.compliance import ComplianceType, ComplianceSubmission, ComplianceFile, ComplianceComment
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


class ComplianceTypeViewSet(viewsets.ModelViewSet):
    serializer_class = ComplianceTypeSerializer
    permission_classes = [IsAuthenticated]
    queryset = ComplianceType.objects.all()

    def get_queryset(self):
        qs = ComplianceType.objects.all()
        if self.request.user.role != 'admin':
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class ComplianceSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = ComplianceSubmissionSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        user = self.request.user
        qs = ComplianceSubmission.objects.select_related(
            'teacher', 'compliance_type', 'academic_year', 'semester', 'reviewed_by'
        ).prefetch_related('files', 'comments')

        if user.role == 'admin':
            teacher_id = self.request.query_params.get('teacher_id')
            compliance_type_id = self.request.query_params.get('compliance_type_id')
            status_filter = self.request.query_params.get('status')
            academic_year_id = self.request.query_params.get('academic_year_id')
            semester_id = self.request.query_params.get('semester_id')
            period_number = self.request.query_params.get('period_number')

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
        else:
            qs = qs.filter(teacher=user)

        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return ComplianceSubmissionListSerializer
        return ComplianceSubmissionSerializer

    def perform_create(self, serializer):
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
    semester_id = request.query_params.get('semester_id')

    from ..models.infrastructure import AcademicYear, Semester

    academic_year = None
    semester = None

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

    stats = get_compliance_stats(academic_year=academic_year, semester=semester)
    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_compliance_status(request):
    user = request.user
    academic_year = get_active_academic_year()
    semester = get_active_semester()

    if not academic_year:
        return Response({
            'academic_year': None,
            'semester': None,
            'types': [],
            'submissions': [],
        })

    submissions = ComplianceSubmission.objects.filter(
        teacher=user,
        academic_year=academic_year,
    ).select_related('compliance_type').prefetch_related('files')

    if semester:
        submissions = submissions.filter(semester=semester)

    types = ComplianceType.objects.filter(is_active=True)
    types_data = ComplianceTypeSerializer(types, many=True).data
    submissions_data = ComplianceSubmissionSerializer(submissions, many=True).data

    return Response({
        'academic_year': {
            'id': academic_year.id,
            'name': academic_year.name,
        } if academic_year else None,
        'semester': {
            'id': semester.id,
            'name': semester.name,
            'semester_type': semester.semester_type,
        } if semester else None,
        'types': types_data,
        'submissions': submissions_data,
    })


@api_view(['POST'])
@permission_classes([IsAdmin])
def check_overdue_submissions(request):
    marked = mark_overdue_submissions()
    return Response({
        'marked_overdue': marked,
        'message': f'{marked} submissions marked as overdue.',
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
