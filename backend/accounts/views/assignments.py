from rest_framework import viewsets, parsers, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from ..models import (
    LearningMaterial,
    StudentClassEnrollment,
    Classroom,
    ClassroomSubject,
    Assignment,
    Submission,
    Notification,
    Grade,
    SystemSetting,
)
from ..serializers import (
    LearningMaterialSerializer,
    AssignmentSerializer,
    SubmissionSerializer,
    full_name,
)
from ..utils import log_audit_action
from ..storage import upload_file


class LearningMaterialViewSet(viewsets.ModelViewSet):
    serializer_class = LearningMaterialSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'description']
    
    def get_queryset(self):
        user = self.request.user
        queryset = LearningMaterial.objects.select_related('uploaded_by', 'classroom')
        classroom_id = self.request.query_params.get('classroom')
        material_type = self.request.query_params.get('material_type')
        quarter = self.request.query_params.get('quarter')
        
        # When a specific classroom is requested, allow any authenticated user to see its materials.
        # The classroom list itself is already filtered by enrollment/role.
        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)
        else:
            # RBAC for unfiltered listing (no classroom specified)
            if user.role == 'student':
                from django.db.models import Q
                enrolled_ids = list(StudentClassEnrollment.objects.filter(
                    student=user
                ).values_list('classroom_id', flat=True))
                profile = getattr(user, 'profile', None)
                if profile and hasattr(profile, 'classroom') and profile.classroom:
                    enrolled_ids.append(profile.classroom.id)
                queryset = queryset.filter(Q(classroom_id__in=enrolled_ids) | Q(classroom__isnull=True))
            elif user.role == 'staff':
                from django.db.models import Q
                teacher_ids = list(Classroom.objects.filter(teacher=user).values_list('id', flat=True))
                subject_ids = list(ClassroomSubject.objects.filter(
                    teacher=user
                ).values_list('classroom_id', flat=True))
                all_ids = set(teacher_ids + subject_ids)
                queryset = queryset.filter(Q(classroom_id__in=all_ids) | Q(classroom__isnull=True))
        
        if material_type:
            queryset = queryset.filter(material_type=material_type)
        if quarter:
            queryset = queryset.filter(quarter=quarter)
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        if self.request.user.role not in ['staff', 'admin']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers and admins can upload materials")

        # Upload file to Supabase before saving the record
        file_url = None
        original_filename = ''
        file_size_bytes = None
        uploaded_file = self.request.FILES.get('file')
        if uploaded_file:
            url, err = upload_file(uploaded_file, bucket_key='learning-materials',
                                   folder=f"classroom_{self.request.data.get('classroom', 'general')}")
            if err:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'file': f'Upload failed: {err}'})
            file_url = url
            original_filename = uploaded_file.name
            file_size_bytes = uploaded_file.size

        material = serializer.save(
            uploaded_by=self.request.user,
            file=file_url,
            original_filename=original_filename,
            file_size_bytes=file_size_bytes,
        )

        log_audit_action(
            user=self.request.user,
            action='create',
            model_name='LearningMaterial',
            object_id=material.id,
            object_repr=material.title,
            description=f'Uploaded learning material: {material.title}',
            request=self.request
        )


class AssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = AssignmentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.JSONParser, parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        user = self.request.user
        queryset = Assignment.objects.select_related('classroom', 'subject', 'teacher').annotate(submission_count=Count('submissions'))

        if user.role == 'student':
            enrolled_classrooms = StudentClassEnrollment.objects.filter(student=user).values_list('classroom_id', flat=True)
            queryset = queryset.filter(classroom_id__in=enrolled_classrooms, is_published=True)
            # Filter out future-published assignments
            from django.utils import timezone as tz
            now = tz.now()
            queryset = queryset.filter(Q(publish_at__isnull=True) | Q(publish_at__lte=now))
        elif user.role == 'parent':
            profile = getattr(user, 'profile', None)
            linked_student_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            enrolled_classrooms = StudentClassEnrollment.objects.filter(student_id__in=linked_student_ids).values_list('classroom_id', flat=True)
            queryset = queryset.filter(classroom_id__in=enrolled_classrooms, is_published=True)
            queryset = queryset.filter(Q(publish_at__isnull=True) | Q(publish_at__lte=now))
        elif user.role == 'staff':
            queryset = queryset.filter(Q(teacher=user) | Q(classroom__teacher=user)).distinct()
        # admin sees all

        # Optional filters
        classroom_id = self.request.query_params.get('classroom')
        subject_id = self.request.query_params.get('subject')
        assignment_type = self.request.query_params.get('assignment_type')
        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        if assignment_type:
            queryset = queryset.filter(assignment_type=assignment_type)

        return queryset

    def perform_create(self, serializer):
        if self.request.user.role not in ['admin', 'staff']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers and admins can create assignments")

        file_url = None
        original_filename = ''
        file_size_bytes = None
        uploaded_file = self.request.FILES.get('file')
        if uploaded_file:
            url, err = upload_file(uploaded_file, bucket_key='assignments',
                                   folder=f"teacher_{self.request.user.id}")
            if err:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'file': f'Upload failed: {err}'})
            file_url = url
            original_filename = uploaded_file.name
            file_size_bytes = uploaded_file.size

        assignment = serializer.save(
            teacher=self.request.user,
            file=file_url,
            original_filename=original_filename,
            file_size_bytes=file_size_bytes,
        )

        # Notify students in the classroom about new assignment
        if assignment.is_visible_to_students:
            enrolled_students = StudentClassEnrollment.objects.filter(
                classroom=assignment.classroom
            ).select_related('student')
            teacher_name = full_name(self.request.user)
            for enrollment in enrolled_students:
                Notification.objects.create(
                    recipient=enrollment.student,
                    notification_type='system',
                    title='New Assignment',
                    message=f'{teacher_name} posted "{assignment.title}" for {assignment.subject.name}. Due: {assignment.due_date.strftime("%b %d, %Y %I:%M %p")}.',
                    link='/assignments',
                )

    @action(detail=False, methods=['get'])
    def submission_status(self, request):
        """For teachers: which students have submitted vs not for a given assignment."""
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        assignment_id = request.query_params.get('assignment_id')
        if not assignment_id:
            return Response({'error': 'assignment_id is required'}, status=400)

        try:
            assignment = Assignment.objects.get(id=assignment_id)
        except Assignment.DoesNotExist:
            return Response({'error': 'Assignment not found'}, status=404)

        enrolled = StudentClassEnrollment.objects.filter(
            classroom=assignment.classroom
        ).select_related('student', 'student__profile')

        submissions = Submission.objects.filter(
            assignment=assignment
        ).select_related('student')

        sub_map = {s.student_id: s for s in submissions}

        students = []
        for e in enrolled:
            sub = sub_map.get(e.student.id)
            students.append({
                'student_id': e.student.id,
                'student_name': full_name(e.student),
                'submitted': sub is not None,
                'submitted_at': sub.submitted_at.isoformat() if sub else None,
                'is_late': sub.is_late if sub else False,
                'grade': sub.grade if sub else None,
                'feedback': sub.feedback if sub else None,
            })

        submitted_count = sum(1 for s in students if s['submitted'])
        return Response({
            'assignment': {
                'id': assignment.id,
                'title': assignment.title,
                'points': assignment.points,
                'due_date': assignment.due_date.isoformat(),
            },
            'total_enrolled': len(students),
            'submitted_count': submitted_count,
            'not_submitted_count': len(students) - submitted_count,
            'students': students,
        })

    @action(detail=True, methods=['post'])
    def clone(self, request, pk=None):
        """Clone an assignment as a template or into a different classroom."""
        assignment = self.get_object()
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        target_classroom_id = request.data.get('classroom_id')
        new_title = request.data.get('title', f'{assignment.title} (Copy)')

        clone = Assignment.objects.create(
            title=new_title,
            description=assignment.description,
            classroom_id=target_classroom_id or assignment.classroom_id,
            subject=assignment.subject,
            teacher=request.user,
            assignment_type=assignment.assignment_type,
            points=assignment.points,
            percentage_weight=assignment.percentage_weight,
            due_date=assignment.due_date,
            is_published=False,  # Clone as draft
            allow_late_submissions=assignment.allow_late_submissions,
            max_late_submissions=assignment.max_late_submissions,
            grade_component=assignment.grade_component,
        )

        serializer = self.get_serializer(clone)
        return Response(serializer.data, status=201)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Assignment and submission analytics"""
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        classroom_id = request.query_params.get('classroom')
        queryset = Assignment.objects.select_related('classroom', 'subject').all()
        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)

        total_assignments = queryset.count()
        total_submissions = Submission.objects.filter(assignment__in=queryset).count()
        late_submissions = Submission.objects.filter(assignment__in=queryset, is_late=True).count()

        # Batch-fetch enrollment counts to avoid N+1
        assignment_classroom_ids = list(queryset.values_list('classroom_id', flat=True).distinct())
        enrollment_counts = dict(
            StudentClassEnrollment.objects.filter(classroom_id__in=assignment_classroom_ids)
            .values('classroom_id')
            .annotate(cnt=Count('id'))
            .values_list('classroom_id', 'cnt')
        )
        submission_counts = dict(
            Submission.objects.filter(assignment__in=queryset)
            .values('assignment_id')
            .annotate(cnt=Count('id'))
            .values_list('assignment_id', 'cnt')
        )

        assignment_rates = []
        for assignment in queryset:
            enrolled_count = enrollment_counts.get(assignment.classroom_id, 0)
            sub_count = submission_counts.get(assignment.id, 0)
            rate = round(sub_count / enrolled_count * 100, 1) if enrolled_count > 0 else 0
            assignment_rates.append({
                'id': assignment.id,
                'title': assignment.title,
                'type': assignment.assignment_type,
                'rate': rate,
                'submissions': sub_count,
                'total_possible': enrolled_count
            })

        return Response({
            'total_assignments': total_assignments,
            'total_submissions': total_submissions,
            'late_submissions': late_submissions,
            'assignment_rates': assignment_rates
        })

class SubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = SubmissionSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]

    def get_queryset(self):
        user = self.request.user
        queryset = Submission.objects.select_related('assignment', 'student', 'graded_by')

        if user.role == 'student':
            return queryset.filter(student=user)
        elif user.role == 'parent':
            profile = getattr(user, 'profile', None)
            linked_student_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            return queryset.filter(student_id__in=linked_student_ids)
        elif user.role == 'staff':
            return queryset.filter(assignment__teacher=user)

        return queryset

    def perform_create(self, serializer):
        if self.request.user.role != 'student':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only students can submit assignments")

        assignment = serializer.validated_data.get('assignment')

        # Check late submission policy
        if not assignment.allow_late_submissions and timezone.now() > assignment.due_date:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'error': 'Late submissions are not allowed for this assignment.'})

        if assignment.max_late_submissions > 0:
            late_count = Submission.objects.filter(
                assignment=assignment, student=self.request.user, is_late=True
            ).count()
            if late_count >= assignment.max_late_submissions:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'error': f'Maximum late submissions ({assignment.max_late_submissions}) reached.'})

        uploaded_file = self.request.FILES.get('file')
        if not uploaded_file:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'file': 'A file is required for submission.'})

        url, err = upload_file(uploaded_file, bucket_key='submissions',
                               folder=f"student_{self.request.user.id}")
        if err:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'file': f'Upload failed: {err}'})

        submission = serializer.save(
            student=self.request.user,
            file=url,
            original_filename=uploaded_file.name,
            file_size_bytes=uploaded_file.size,
        )

        # Notify teacher of new submission
        teacher = assignment.teacher
        student_name = full_name(self.request.user)
        Notification.objects.create(
            recipient=teacher,
            notification_type='system',
            title='New Submission',
            message=f'{student_name} submitted "{assignment.title}" for {assignment.subject.name}.',
            link='/assignments',
        )

    @action(detail=True, methods=['post'])
    def grade_submission(self, request, pk=None):
        """Grade a submission and optionally propagate to the Grade model."""
        submission = self.get_object()
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        grade_value = request.data.get('grade')
        feedback = request.data.get('feedback', '')

        if grade_value is None:
            return Response({'error': 'grade is required'}, status=400)

        try:
            grade_value = int(grade_value)
        except (TypeError, ValueError):
            return Response({'error': 'grade must be an integer'}, status=400)

        assignment = submission.assignment
        if grade_value < 0 or grade_value > assignment.points:
            return Response({'error': f'grade must be between 0 and {assignment.points}'}, status=400)

        submission.grade = grade_value
        submission.feedback = feedback
        submission.graded_at = timezone.now()
        submission.graded_by = request.user
        submission.save()

        # Auto-propagate to Grade model if assignment is linked to a grade component
        propagate = request.data.get('propagate_to_grade', True)
        grade_record = None
        if propagate and assignment.grade_component:
            # Calculate percentage score
            percentage = round((grade_value / assignment.points) * 100, 2) if assignment.points > 0 else 0

            # Use the current term from system settings
            settings = SystemSetting.get_settings()
            quarter = int(settings.current_term)
            academic_year = settings.academic_year

            grade_record, _ = Grade.objects.update_or_create(
                student=submission.student,
                subject=assignment.subject,
                grade_type=assignment.grade_component,
                quarter=quarter,
                academic_year=academic_year,
                defaults={
                    'raw_score': percentage,
                    'total_score': 100,
                    'teacher': request.user,
                    'classroom': assignment.classroom,
                }
            )

        # Notify student
        student = submission.student
        teacher_name = full_name(request.user)
        Notification.objects.create(
            recipient=student,
            notification_type='grade',
            title='Submission Graded',
            message=f'{teacher_name} graded your submission for "{assignment.title}": {grade_value}/{assignment.points}.',
            link='/assignments',
        )

        return Response({
            'id': submission.id,
            'grade': submission.grade,
            'feedback': submission.feedback,
            'graded_at': submission.graded_at.isoformat(),
            'grade_record_id': grade_record.id if grade_record else None,
        })
