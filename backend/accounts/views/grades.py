import csv
import io
import logging
import re
import datetime

from django.conf import settings
from django.db import transaction
from django.db.models import Q, Avg, Count, Max, Min, Case, When, IntegerField
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from ..models import (
    User, Profile, Classroom, StudentClassEnrollment,
    Subject, ClassroomSubject, ScratchCard, Notification,
    Grade, GradeReport,
)
from ..serializers import (
    GradeSerializer, GradeReportSerializer, full_name,
)
from ..permissions import IsAdminOrStaff
from ..throttles import CheckResultRateThrottle
from ..utils import log_audit_action

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def grade_distribution_stats(request):
    """
    Detailed statistics for grade distribution across the school.
    Supports filtering by academic_year, grade_level, and subject.
    """
    academic_year = request.query_params.get('academic_year', '2025-2026')
    grade_level = request.query_params.get('grade_level', 'all')
    subject_id = request.query_params.get('subject_id', 'all')
    quarter = request.query_params.get('quarter', 'all')
    timeframe = request.query_params.get('timeframe', 'all')
    mode = request.query_params.get('mode', 'student')

    # 1. Base filtering
    base_grades = Grade.objects.filter(
        grade_type='final_grade',
        raw_score__isnull=False
    ).filter(
        Q(academic_year=academic_year) |
        Q(classroom__academic_year__name=academic_year)
    )

    # Filter by Timeframe (submission date)
    if timeframe == 'today':
        base_grades = base_grades.filter(submitted_at__date=timezone.now().date())
    elif timeframe == 'weekly':
        week_ago = timezone.now().date() - datetime.timedelta(days=7)
        base_grades = base_grades.filter(submitted_at__date__gte=week_ago)

    # Filter by Quarter if specified
    if quarter != 'all':
        base_grades = base_grades.filter(quarter=quarter)

    # Filter by Grade Level if specified
    if grade_level != 'all':
        level_classrooms = Classroom.objects.filter(name__icontains=grade_level)
        base_grades = base_grades.filter(classroom__in=level_classrooms)

    # Filter by Subject if specified
    if subject_id != 'all':
        base_grades = base_grades.filter(subject_id=subject_id)

    if not base_grades.exists():
        subjects_in_year = Subject.objects.filter(
            classroom_subjects__classroom__academic_year__name=academic_year
        ).distinct().values('id', 'name', 'code')

        return Response({
            'total_students': 0,
            'overall_average': 0,
            'category_counts': [],
            'by_level': [],
            'by_group': [],
            'mode': mode,
            'meta': {
                'subjects': list(subjects_in_year) if subjects_in_year.exists() else list(Subject.objects.values('id', 'name', 'code')[:20]),
                'grade_levels': ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"]
            }
        })

    # 2. Summary Stats
    student_averages = base_grades.values('student').annotate(avg=Avg('raw_score'))
    total_students = student_averages.count()
    total_entries = base_grades.count()
    overall_avg = base_grades.aggregate(avg=Avg('raw_score'))['avg']

    categories = {
        'Outstanding (90-100)': 0,
        'Very Satisfactory (85-89)': 0,
        'Satisfactory (80-84)': 0,
        'Fairly Satisfactory (75-79)': 0,
        'Did Not Meet Expectations (<75)': 0,
    }

    if mode == 'student':
        for sa in student_averages:
            score = sa['avg']
            if score is None:
                continue
            if score >= 90:
                categories['Outstanding (90-100)'] += 1
            elif score >= 85:
                categories['Very Satisfactory (85-89)'] += 1
            elif score >= 80:
                categories['Satisfactory (80-84)'] += 1
            elif score >= 75:
                categories['Fairly Satisfactory (75-79)'] += 1
            else:
                categories['Did Not Meet Expectations (<75)'] += 1
    else:
        agg = base_grades.aggregate(
            outstanding=Count(Case(When(raw_score__gte=90, then=1), output_field=IntegerField())),
            very_sat=Count(Case(When(raw_score__gte=85, raw_score__lt=90, then=1), output_field=IntegerField())),
            sat=Count(Case(When(raw_score__gte=80, raw_score__lt=85, then=1), output_field=IntegerField())),
            fairly_sat=Count(Case(When(raw_score__gte=75, raw_score__lt=80, then=1), output_field=IntegerField())),
            dnm=Count(Case(When(raw_score__lt=75, then=1), output_field=IntegerField())),
        )
        categories['Outstanding (90-100)'] = agg['outstanding']
        categories['Very Satisfactory (85-89)'] = agg['very_sat']
        categories['Satisfactory (80-84)'] = agg['sat']
        categories['Fairly Satisfactory (75-79)'] = agg['fairly_sat']
        categories['Did Not Meet Expectations (<75)'] = agg['dnm']

    category_counts = [{'name': k, 'value': v} for k, v in categories.items()]

    # 3. Dynamic Comparison Chart (By Level or By Classroom)
    by_level = []
    if grade_level == 'all':
        level_classrooms = Classroom.objects.filter(
            name__regex=r'Grade [7-12]'
        ).values('id', 'name')
        level_classroom_map = {}
        for lc in level_classrooms:
            match = re.search(r'Grade (\d+)', lc['name'])
            if match:
                level_num = int(match.group(1))
                level_classroom_map.setdefault(level_num, []).append(lc['id'])

        level_ids = [ids for ids in level_classroom_map.values()]
        flat_ids = [cid for sublist in level_ids for cid in sublist]
        level_grades_agg = base_grades.filter(classroom_id__in=flat_ids).values(
            'classroom_id'
        ).annotate(avg=Avg('raw_score'), count=Count('id'))

        grade_lookup = {r['classroom_id']: r for r in level_grades_agg}

        for level_num in range(7, 13):
            cids = level_classroom_map.get(level_num, [])
            if not cids:
                continue
            avgs = [grade_lookup[cid]['avg'] for cid in cids if cid in grade_lookup and grade_lookup[cid]['avg'] is not None]
            counts = [grade_lookup[cid]['count'] for cid in cids if cid in grade_lookup]
            if avgs:
                by_level.append({
                    'label': f"Grade {level_num}",
                    'average': round(float(sum(avgs) / len(avgs)), 2),
                    'count': sum(counts),
                })
    else:
        level_classrooms = Classroom.objects.filter(name__icontains=grade_level)
        level_class_ids = list(level_classrooms.values_list('id', flat=True))
        classroom_grades_agg = base_grades.filter(classroom_id__in=level_class_ids).values(
            'classroom_id', 'classroom__name'
        ).annotate(avg=Avg('raw_score'), count=Count('id'))
        grade_lookup = {r['classroom_id']: r for r in classroom_grades_agg}
        for c in level_classrooms:
            r = grade_lookup.get(c.id)
            if r:
                by_level.append({
                    'label': r['classroom__name'],
                    'average': round(float(r['avg']), 2) if r['avg'] else 0,
                    'count': r['count']
                })

    # 4. Top Performing Group (By Subject or By Classroom for a Subject)
    by_group = []
    if subject_id == 'all':
        subject_stats = base_grades.values('subject__name', 'subject__code').annotate(
            avg=Avg('raw_score'),
            count=Count('id')
        ).order_by('-avg')[:10]

        for s in subject_stats:
            by_group.append({
                'name': s['subject__name'],
                'code': s['subject__code'],
                'average': round(float(s['avg']), 2) if s['avg'] else 0,
                'count': s['count']
            })
    else:
        classroom_stats = base_grades.values('classroom__name').annotate(
            avg=Avg('raw_score'),
            count=Count('id')
        ).order_by('-avg')[:10]

        for cs in classroom_stats:
            by_group.append({
                'name': cs['classroom__name'],
                'code': cs['classroom__name'],
                'average': round(float(cs['avg']), 2) if cs['avg'] else 0,
                'count': cs['count']
            })

    return Response({
        'academic_year': academic_year,
        'grade_level': grade_level,
        'subject_id': subject_id,
        'total_students': total_students,
        'total_entries': base_grades.count(),
        'overall_average': round(float(overall_avg), 2) if overall_avg else 0,
        'category_counts': [{'name': k, 'value': v} for k, v in categories.items()],
        'by_level': by_level,
        'by_group': by_group,
        'meta': {
            'subjects': list(Subject.objects.values('id', 'name', 'code', 'grade_level').order_by('grade_level', 'name')),
            'grade_levels': ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"]
        }
    })


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([CheckResultRateThrottle])
def check_result(request):
    registration_number = request.data.get('registration_number', '').strip()
    scratch_card = request.data.get('scratch_card', '').strip()

    if not registration_number or not scratch_card:
        return Response({'error': 'Registration number and scratch card are required'}, status=400)

    if len(registration_number) > 30 or len(scratch_card) > 30:
        return Response({'error': 'Invalid input'}, status=400)

    if not registration_number.replace('-', '').isalnum() or not scratch_card.replace('-', '').isalnum():
        return Response({'error': 'Invalid input format'}, status=400)

    try:
        profile = Profile.objects.get(registration_number=registration_number)
        student = profile.user

        if student.role != 'student':
            return Response({'error': 'Invalid registration number'}, status=400)

        card = ScratchCard.objects.filter(serial_number=scratch_card, student=student, is_used=False).first()

        if not card:
            return Response({'error': 'Invalid or used scratch card'}, status=400)

        card.is_used = True
        card.used_at = timezone.now()
        card.save()

        enrollments = StudentClassEnrollment.objects.filter(student=student).select_related('classroom')
        grades_data = []
        for enrollment in enrollments:
            grades_data.append({
                'classroom': enrollment.classroom.name,
                'q1': enrollment.q1,
                'q2': enrollment.q2,
                'q3': enrollment.q3,
                'q4': enrollment.q4,
                'general_average': enrollment.calculate_general_average(),
                'descriptive_equivalent': enrollment.get_descriptive_equivalent(),
            })

        return Response({
            'student': {
                'name': student.get_full_name() or student.username,
                'registration_number': registration_number,
            },
            'grades': grades_data,
        })

    except Profile.DoesNotExist:
        return Response({'error': 'Invalid registration number'}, status=400)
    except Exception as e:
        logger.error(f"check_result error: {str(e)}", exc_info=True)
        return Response({'error': 'An error occurred processing your request.'}, status=500)


class GradeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Grade model with role-based access control
    - Admin: Full access to all grades
    - Teacher: Can input/edit grades for their assigned classes
    - Student: Can only view their own grades
    """
    serializer_class = GradeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['student__username', 'student__email', 'subject__name', 'subject__code']
    ordering_fields = ['quarter', 'subject__name', 'submitted_at', 'updated_at']
    ordering = ['-quarter', 'subject__name']

    def get_queryset(self):
        user = self.request.user
        queryset = Grade.objects.select_related('student', 'student__profile', 'subject', 'classroom', 'teacher')

        if user.role == 'admin':
            pass  # admin gets all, still apply query param filters below
        elif user.role == 'staff':
            assigned_classrooms = ClassroomSubject.objects.filter(teacher=user).values_list('classroom_id', flat=True)
            queryset = queryset.filter(Q(classroom__teacher=user) | Q(classroom_id__in=assigned_classrooms) | Q(teacher=user)).distinct()
        elif user.role == 'student':
            queryset = queryset.filter(student=user)
        elif user.role == 'parent':
            profile = getattr(user, 'profile', None)
            linked_student_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            queryset = queryset.filter(student_id__in=linked_student_ids)
        else:
            return queryset.none()

        # Apply query param filters
        params = self.request.query_params
        classroom_id = params.get('classroom')
        subject_id = params.get('subject')
        grade_type = params.get('grade_type')
        quarter = params.get('quarter')
        academic_year = params.get('academic_year')
        student_id = params.get('student')

        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        if grade_type:
            queryset = queryset.filter(grade_type=grade_type)
        if quarter:
            queryset = queryset.filter(quarter=quarter)
        if academic_year:
            queryset = queryset.filter(academic_year=academic_year)
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        return queryset

    def create(self, request, *args, **kwargs):
        """Custom create to handle upsert (update if exists, otherwise create)"""
        student_id = request.data.get('student')
        subject_id = request.data.get('subject')
        grade_type = request.data.get('grade_type')
        quarter = request.data.get('quarter')
        academic_year = request.data.get('academic_year')
        component = request.data.get('component', '')

        if all([student_id, subject_id, grade_type, quarter, academic_year]):
            try:
                grade = Grade.objects.get(
                    student_id=student_id,
                    subject_id=subject_id,
                    component=component or '',
                    grade_type=grade_type,
                    quarter=quarter,
                    academic_year=academic_year
                )

                if self.request.user.role != 'admin' and grade.teacher != self.request.user:
                    assigned = ClassroomSubject.objects.filter(
                        classroom=grade.classroom,
                        subject=grade.subject,
                        teacher=self.request.user
                    ).exists()
                    if not assigned:
                        return Response({'error': 'You do not have permission to update this grade.'}, status=status.HTTP_403_FORBIDDEN)

                if grade.is_locked and self.request.user.role != 'admin':
                    return Response({'error': 'This grade is locked and cannot be edited'}, status=status.HTTP_403_FORBIDDEN)

                serializer = self.get_serializer(grade, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()

                try:
                    log_audit_action(
                        user=self.request.user,
                        action='grade_update',
                        model_name='Grade',
                        object_id=grade.id,
                        object_repr=str(grade),
                        description=f'Updated grade for {grade.student.username} via upsert',
                        request=self.request
                    )
                except Exception as audit_err:
                    logger.warning(f"Audit logging failed (create/upsert): {str(audit_err)}")
                return Response(serializer.data)
            except Grade.DoesNotExist:
                pass

        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Custom update with permission checks"""
        try:
            partial = kwargs.pop('partial', False)
            instance = self.get_object()

            # Admin and staff have full update access
            if request.user.role in ['admin', 'staff']:
                # Staff can update even locked grades
                serializer = self.get_serializer(instance, data=request.data, partial=partial)
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)

                try:
                    log_audit_action(
                        user=request.user,
                        action='grade_update',
                        model_name='Grade',
                        object_id=instance.id,
                        object_repr=str(instance),
                        description=f'Updated grade for {instance.student.username}',
                        request=request
                    )
                except Exception as audit_error:
                    logger.warning(f"Audit logging failed: {str(audit_error)}")
                
                return Response(serializer.data)

            # For non-admin/staff, check if they're the teacher
            if instance.teacher == request.user:
                # Check if grade is locked
                if hasattr(instance, 'is_locked') and instance.is_locked:
                    return Response(
                        {'error': 'This grade is locked and cannot be edited'},
                        status=status.HTTP_403_FORBIDDEN
                    )

                serializer = self.get_serializer(instance, data=request.data, partial=partial)
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)

                try:
                    log_audit_action(
                        user=request.user,
                        action='grade_update',
                        model_name='Grade',
                        object_id=instance.id,
                        object_repr=str(instance),
                        description=f'Updated grade for {instance.student.username}',
                        request=request
                    )
                except Exception as audit_error:
                    logger.warning(f"Audit logging failed: {str(audit_error)}")
                
                return Response(serializer.data)

            # No permission
            return Response(
                {'error': 'You do not have permission to update this grade.'},
                status=status.HTTP_403_FORBIDDEN
            )

        except Exception as e:
            logger.error(f"Grade update error: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to update grade: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        """Custom destroy with permission checks - simplified for staff access"""
        try:
            instance = self.get_object()

            # Admin and staff have full delete access
            if request.user.role in ['admin', 'staff']:
                try:
                    log_audit_action(
                        user=request.user,
                        action='grade_delete',
                        model_name='Grade',
                        object_id=instance.id,
                        object_repr=str(instance),
                        description=f'Deleted grade for {instance.student.username}',
                        request=request
                    )
                except Exception as audit_error:
                    # Log audit error but don't fail the operation
                    logger.warning(f"Audit logging failed: {str(audit_error)}")
                
                # Direct delete without perform_destroy
                instance.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            # For non-admin/staff, check if they're the teacher
            if instance.teacher == request.user:
                # Check if grade is locked
                if hasattr(instance, 'is_locked') and instance.is_locked:
                    return Response(
                        {'error': 'This grade is locked and cannot be deleted'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                try:
                    log_audit_action(
                        user=request.user,
                        action='grade_delete',
                        model_name='Grade',
                        object_id=instance.id,
                        object_repr=str(instance),
                        description=f'Deleted grade for {instance.student.username}',
                        request=request
                    )
                except Exception as audit_error:
                    logger.warning(f"Audit logging failed: {str(audit_error)}")
                
                instance.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)

            # No permission
            return Response(
                {'error': 'You do not have permission to delete this grade.'},
                status=status.HTTP_403_FORBIDDEN
            )

        except Exception as e:
            logger.error(f"Grade delete error: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to delete grade: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def batch_save(self, request):
        """Bulk save grades for an entire classroom. Accepts {classroom_id, subject_id, quarter, academic_year, grades: [{student_id, raw_score, total_score?}]}."""
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        classroom_id = request.data.get('classroom_id')
        subject_id = request.data.get('subject_id')
        quarter = request.data.get('quarter')
        academic_year = request.data.get('academic_year')
        grades_data = request.data.get('grades', [])

        if not all([classroom_id, subject_id, quarter, academic_year]):
            return Response({'error': 'classroom_id, subject_id, quarter, and academic_year are required'}, status=400)
        if not grades_data:
            return Response({'error': 'grades array is required'}, status=400)

        try:
            classroom = Classroom.objects.get(id=classroom_id)
            subject = Subject.objects.get(id=subject_id)
        except (Classroom.DoesNotExist, Subject.DoesNotExist):
            return Response({'error': 'Invalid classroom or subject'}, status=404)

        created_count = 0
        updated_count = 0
        errors = []

        with transaction.atomic():
            for item in grades_data:
                student_id = item.get('student_id')
                raw_score = item.get('raw_score')
                total_score = item.get('total_score', 100)

                if not student_id:
                    errors.append(f'Missing student_id in item: {item}')
                    continue

                if raw_score is not None:
                    try:
                        raw_score = float(raw_score)
                    except (TypeError, ValueError):
                        errors.append(f'Invalid raw_score for student {student_id}')
                        continue

                try:
                    grade = Grade.objects.get(
                        student_id=student_id,
                        subject=subject,
                        grade_type='written_work',
                        quarter=quarter,
                        academic_year=academic_year,
                    )
                    if grade.is_locked and request.user.role != 'admin':
                        errors.append(f'Grade for student {student_id} is locked')
                        continue
                    grade.raw_score = raw_score
                    grade.total_score = total_score
                    grade.classroom = classroom
                    grade.teacher = request.user
                    grade.save()
                    updated_count += 1
                except Grade.DoesNotExist:
                    Grade.objects.create(
                        student_id=student_id,
                        subject=subject,
                        classroom=classroom,
                        teacher=request.user,
                        grade_type='written_work',
                        quarter=quarter,
                        academic_year=academic_year,
                        raw_score=raw_score,
                        total_score=total_score,
                    )
                    created_count += 1

        return Response({
            'created': created_count,
            'updated': updated_count,
            'errors': errors,
        })

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Advanced grade analytics and monitoring"""
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        classroom_id = request.query_params.get('classroom')
        subject_id = request.query_params.get('subject')
        quarter = request.query_params.get('quarter')

        queryset = Grade.objects.filter(grade_type='final_grade', raw_score__isnull=False)
        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        if quarter:
            queryset = queryset.filter(quarter=quarter)

        subject_stats = queryset.values('subject__name', 'subject__code').annotate(
            avg_grade=Avg('raw_score'),
            count=Count('id'),
            highest=Max('raw_score'),
            lowest=Min('raw_score')
        ).order_by('-avg_grade')

        distribution = {
            'outstanding': queryset.filter(raw_score__gte=90).count(),
            'very_satisfactory': queryset.filter(raw_score__gte=85, raw_score__lt=90).count(),
            'satisfactory': queryset.filter(raw_score__gte=80, raw_score__lt=85).count(),
            'fairly_satisfactory': queryset.filter(raw_score__gte=75, raw_score__lt=80).count(),
            'failed': queryset.filter(raw_score__lt=75).count(),
        }

        missing_grades = []
        if classroom_id and quarter:
            enrolled_students = StudentClassEnrollment.objects.filter(
                classroom_id=classroom_id
            ).select_related('student')
            classroom_subjects = ClassroomSubject.objects.filter(
                classroom_id=classroom_id
            ).select_related('subject')
            existing_grades = set(
                Grade.objects.filter(
                    classroom_id=classroom_id, quarter=quarter
                ).values_list('student_id', 'subject_id')
            )
            for enrollment in enrolled_students:
                for cs in classroom_subjects:
                    if (enrollment.student_id, cs.subject_id) not in existing_grades:
                        missing_grades.append({
                            'student_name': f"{enrollment.student.first_name} {enrollment.student.last_name}",
                            'subject_name': cs.subject.name,
                            'student_id': enrollment.student.id
                        })

        return Response({
            'subject_stats': subject_stats,
            'distribution': distribution,
            'missing_grades': missing_grades[:50],
            'total_graded': queryset.count()
        })

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'student':
            raise serializers.ValidationError("Students cannot create grades")

        serializer.save(teacher=user)
        grade = serializer.instance

        try:
            log_audit_action(
                user=user,
                action='grade_create',
                model_name='Grade',
                object_id=grade.id,
                object_repr=str(grade),
                description=f'Created grade for {grade.student.username} in {grade.subject.code}',
                request=self.request
            )
        except Exception as audit_err:
            logger.warning(f"Audit logging failed (perform_create): {str(audit_err)}")

        if grade.grade_type == 'final_grade' and grade.raw_score is not None:
            teacher_name = user.get_full_name() or user.username
            try:
                Notification.objects.create(
                    recipient=grade.student,
                    notification_type='grade',
                    title='Grade Posted',
                    message=f'{teacher_name} posted your {grade.subject.name} grade for Q{grade.quarter}: {grade.raw_score}.',
                    link='/grades',
                )
            except Exception as notif_err:
                logger.warning(f"Notification failed (perform_create): {str(notif_err)}")

    def perform_update(self, serializer):
        user = self.request.user
        grade = self.get_object()

        if grade.is_locked and user.role not in ['admin', 'staff']:
            if len(serializer.validated_data) == 1 and 'is_locked' in serializer.validated_data:
                pass
            else:
                raise serializers.ValidationError("This grade is locked and cannot be edited")

        serializer.save()
        grade.refresh_from_db()

        try:
            log_audit_action(
                user=user,
                action='grade_update',
                model_name='Grade',
                object_id=grade.id,
                object_repr=str(grade),
                description=f'Updated grade for {grade.student.username} in {grade.subject.code}',
                request=self.request
            )
        except Exception as audit_err:
            logger.warning(f"Audit logging failed (perform_update): {str(audit_err)}")

        if grade.grade_type == 'final_grade' and grade.raw_score is not None:
            teacher_name = user.get_full_name() or user.username
            try:
                Notification.objects.create(
                    recipient=grade.student,
                    notification_type='grade',
                    title='Grade Updated',
                    message=f'{teacher_name} updated your {grade.subject.name} grade for Q{grade.quarter}: {grade.raw_score}.',
                    link='/grades',
                )
            except Exception as notif_err:
                logger.warning(f"Notification failed (perform_update): {str(notif_err)}")

    def perform_destroy(self, instance):
        user = self.request.user
        try:
            log_audit_action(
                user=user,
                action='grade_delete',
                model_name='Grade',
                object_id=instance.id,
                object_repr=str(instance),
                description=f'Deleted grade for {instance.student.username} in {instance.subject.code}',
                request=self.request
            )
        except Exception as audit_err:
            logger.warning(f"Audit logging failed (perform_destroy): {str(audit_err)}")

        instance.delete()

    @action(detail=False, methods=['get'])
    def my_grades(self, request):
        """Get current user's grades (for students)"""
        if request.user.role != 'student':
            return Response({'error': 'This endpoint is for students only'}, status=status.HTTP_403_FORBIDDEN)

        grades = self.get_queryset()
        serializer = self.get_serializer(grades, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_classroom(self, request):
        """Get grades by classroom (for teachers)"""
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        classroom_id = request.query_params.get('classroom_id')
        quarter = request.query_params.get('quarter')

        if not classroom_id:
            return Response({'error': 'classroom_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        queryset = self.get_queryset().filter(classroom_id=classroom_id)
        if quarter:
            queryset = queryset.filter(quarter=quarter)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def calculate_final(self, request):
        """Calculate final grade for a student in a subject.
        For composite subjects (MAPEH): averages the component final grades.
        For normal subjects: weighted WW/PT/QA calculation.
        """
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        student_id = request.data.get('student_id')
        subject_id = request.data.get('subject_id')
        quarter = request.data.get('quarter')

        if not all([student_id, subject_id, quarter]):
            return Response({'error': 'student_id, subject_id, and quarter are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            subject = Subject.objects.get(id=subject_id)
        except Subject.DoesNotExist:
            return Response({'error': 'Subject not found'}, status=status.HTTP_404_NOT_FOUND)

        # Composite subject (MAPEH): average the component final grades
        if subject.has_components:
            component_finals = Grade.objects.filter(
                student_id=student_id,
                subject__grade_level=subject.grade_level,
                subject__component__in=['music_arts', 'pe_health'],
                quarter=quarter,
                grade_type='final_grade',
            ).exclude(component='').exclude(raw_score__isnull=True)

            if not component_finals.exists():
                return Response({'error': 'No component final grades found. Enter final grades for Music & Arts and PE & Health first.'}, status=status.HTTP_404_NOT_FOUND)

            scores = [float(g.raw_score) for g in component_finals]
            final_score = round(sum(scores) / len(scores), 2)

            # Determine classroom from component grades
            classroom = component_finals.first().classroom

            final_grade, created = Grade.objects.update_or_create(
                student_id=student_id,
                subject_id=subject_id,
                component='',
                quarter=quarter,
                grade_type='final_grade',
                defaults={
                    'raw_score': final_score,
                    'total_score': 100,
                    'teacher': request.user,
                    'classroom': classroom,
                }
            )

            serializer = self.get_serializer(final_grade)
            return Response(serializer.data)

        # Normal subject: weighted WW/PT/QA calculation
        component_grades = Grade.objects.filter(
            student_id=student_id,
            subject_id=subject_id,
            component='',
            quarter=quarter,
            grade_type__in=['written_work', 'performance_task', 'quarterly_assessment']
        )

        if not component_grades.exists():
            return Response({'error': 'No component grades found'}, status=status.HTTP_404_NOT_FOUND)

        classroom_id = component_grades.first().classroom_id
        try:
            cs = ClassroomSubject.objects.get(classroom_id=classroom_id, subject_id=subject_id)
            ww_w = float(cs.ww_weight) / 100
            pt_w = float(cs.pt_weight) / 100
            qa_w = float(cs.qa_weight) / 100
        except ClassroomSubject.DoesNotExist:
            ww_w, pt_w, qa_w = 0.30, 0.50, 0.20

        total_score = 0
        total_weight = 0

        for grade in component_grades:
            if grade.raw_score is not None:
                if grade.grade_type == 'written_work':
                    total_score += float(grade.raw_score) * ww_w
                    total_weight += ww_w
                elif grade.grade_type == 'performance_task':
                    total_score += float(grade.raw_score) * pt_w
                    total_weight += pt_w
                elif grade.grade_type == 'quarterly_assessment':
                    total_score += float(grade.raw_score) * qa_w
                    total_weight += qa_w

        if total_weight > 0:
            final_score = round(total_score / total_weight, 2)

            final_grade, created = Grade.objects.update_or_create(
                student_id=student_id,
                subject_id=subject_id,
                component='',
                quarter=quarter,
                grade_type='final_grade',
                defaults={
                    'raw_score': final_score,
                    'total_score': 100,
                    'teacher': request.user,
                    'classroom': component_grades.first().classroom
                }
            )

            serializer = self.get_serializer(final_grade)
            return Response(serializer.data)

        return Response({'error': 'Could not calculate final grade'}, status=status.HTTP_400_BAD_REQUEST)


class GradeReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for GradeReport model with role-based access control
    - Admin: Full access to all reports
    - Teacher: Can view reports for their classes
    - Student: Can only view their own reports
    """
    serializer_class = GradeReportSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['student__username', 'student__email', 'classroom__name']
    ordering_fields = ['quarter', 'school_year', 'generated_at']
    ordering = ['-school_year', '-quarter']

    def get_queryset(self):
        user = self.request.user
        queryset = GradeReport.objects.select_related('student', 'classroom', 'generated_by', 'approved_by')

        if user.role == 'admin':
            return queryset
        elif user.role == 'staff':
            assigned_classrooms = ClassroomSubject.objects.filter(teacher=user).values_list('classroom_id', flat=True)
            return queryset.filter(Q(classroom__teacher=user) | Q(classroom_id__in=assigned_classrooms)).distinct()
        elif user.role == 'student':
            return queryset.filter(student=user)
        elif user.role == 'parent':
            profile = getattr(user, 'profile', None)
            child_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            return queryset.filter(student_id__in=child_ids)
        return queryset.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ['admin', 'staff']:
            raise serializers.ValidationError("Only admins and teachers can create reports")

        report = serializer.save(generated_by=user)
        report.calculate_averages()

        try:
            log_audit_action(
                user=user,
                action='grade_report_create',
                model_name='GradeReport',
                object_id=report.id,
                object_repr=str(report),
                description=f'Created grade report for {report.student.username} - Q{report.quarter}',
                request=self.request
            )
        except Exception as audit_err:
            logger.warning(f"Audit logging failed (grade_report_create): {str(audit_err)}")

    @action(detail=False, methods=['post'])
    def generate_for_classroom(self, request):
        """Generate grade reports for all students in a classroom + compute ranks"""
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        classroom_id = request.data.get('classroom_id')
        quarter = request.data.get('quarter')
        school_year = request.data.get('school_year', '2025-2026')

        if not all([classroom_id, quarter]):
            return Response({'error': 'classroom_id and quarter are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            classroom = Classroom.objects.get(id=classroom_id)
        except Classroom.DoesNotExist:
            return Response({'error': 'Classroom not found'}, status=status.HTTP_404_NOT_FOUND)

        enrollments = StudentClassEnrollment.objects.filter(classroom=classroom).select_related('student')

        reports_created = []
        reports_updated = []
        for enrollment in enrollments:
            report, created = GradeReport.objects.get_or_create(
                student=enrollment.student,
                classroom=classroom,
                quarter=quarter,
                school_year=school_year,
                defaults={'generated_by': request.user}
            )
            report.calculate_averages()
            if created:
                reports_created.append(report.id)
            else:
                reports_updated.append(report.id)

        all_reports = GradeReport.objects.filter(
            classroom=classroom, quarter=quarter, school_year=school_year,
            general_average__isnull=False
        ).order_by('-general_average')
        reports_to_update = []
        rank = 1
        for r in all_reports:
            r.class_rank = rank
            reports_to_update.append(r)
            rank += 1
        if reports_to_update:
            GradeReport.objects.bulk_update(reports_to_update, ['class_rank'])

        return Response({
            'message': f'Generated {len(reports_created)} new reports, updated {len(reports_updated)} existing reports, ranks computed',
            'report_ids': reports_created + reports_updated
        })

    @action(detail=False, methods=['post'])
    def notify_missing_grades(self, request):
        """Notify teachers about missing final grades for a classroom/quarter"""
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        classroom_id = request.data.get('classroom_id')
        quarter = request.data.get('quarter')
        academic_year = request.data.get('academic_year', '2025-2026')

        if not all([classroom_id, quarter]):
            return Response({'error': 'classroom_id and quarter are required'}, status=400)

        enrolled = StudentClassEnrollment.objects.filter(classroom_id=classroom_id).select_related('student')
        classroom_subjects = ClassroomSubject.objects.filter(classroom_id=classroom_id).select_related('subject', 'teacher')

        existing_grades = set(
            Grade.objects.filter(
                classroom_id=classroom_id,
                quarter=quarter,
                grade_type='final_grade',
                academic_year=academic_year,
            ).values_list('student_id', 'subject_id')
        )

        missing = []
        for enrollment in enrolled:
            for cs in classroom_subjects:
                if (enrollment.student_id, cs.subject_id) not in existing_grades:
                    missing.append({
                        'student': full_name(enrollment.student),
                        'subject': cs.subject.name,
                        'teacher_id': cs.teacher_id,
                        'teacher_name': full_name(cs.teacher),
                    })
                    Notification.objects.create(
                        recipient=cs.teacher,
                        notification_type='grade',
                        title='Missing Grade',
                        message=f'Missing final grade for {full_name(enrollment.student)} in {cs.subject.name} (Q{quarter})',
                        link='/grades',
                    )

        return Response({'missing_count': len(missing), 'missing': missing[:50]})

    @action(detail=True, methods=['post'])
    def submit_for_review(self, request, pk=None):
        """Teacher submits a report for admin approval"""
        report = self.get_object()
        if report.status != 'draft':
            return Response({'error': 'Only draft reports can be submitted'}, status=400)
        report.status = 'submitted'
        report.save(update_fields=['status'])
        return Response(GradeReportSerializer(report).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Admin approves a submitted report"""
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can approve'}, status=403)
        report = self.get_object()
        if report.status != 'submitted':
            return Response({'error': 'Only submitted reports can be approved'}, status=400)
        report.status = 'approved'
        report.approved_by = request.user
        report.approved_at = timezone.now()
        report.is_final = True
        report.save(update_fields=['status', 'approved_by', 'approved_at', 'is_final'])

        Notification.objects.create(
            recipient=report.student,
            notification_type='grade',
            title='Report Card Available',
            message=f'Your Q{report.quarter} grade report has been approved. General Average: {report.general_average}',
            link='/grades',
        )
        return Response(GradeReportSerializer(report).data)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export grade reports as CSV for a classroom"""
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)
        classroom_id = request.query_params.get('classroom_id')
        quarter = request.query_params.get('quarter')
        school_year = request.query_params.get('school_year')
        if not all([classroom_id, quarter]):
            return Response({'error': 'classroom_id and quarter are required'}, status=400)
        qs = self.get_queryset().filter(classroom_id=classroom_id, quarter=quarter)
        if school_year:
            qs = qs.filter(school_year=school_year)
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="grade_reports_Q{quarter}.csv"'
        writer = csv.writer(response)
        writer.writerow(['Student', 'Classroom', 'Quarter', 'School Year', 'General Average',
                         'GPA', 'Class Rank', 'Total Subjects', 'Passed', 'Failed', 'Status'])
        for r in qs.select_related('student', 'classroom'):
            writer.writerow([
                r.student.username, r.classroom.name, r.quarter, r.school_year,
                r.general_average or '', r.gpa or '', r.class_rank or '',
                r.total_subjects, r.passed_subjects, r.failed_subjects, r.status,
            ])
        return response

    @action(detail=False, methods=['post'])
    def import_csv(self, request):
        """Import grade reports from CSV. Accepts file upload with columns: student_username, classroom_name, quarter, school_year, general_average"""
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can import'}, status=403)
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file uploaded'}, status=400)
        try:
            decoded = file.read().decode('utf-8')
            reader = csv.DictReader(io.StringIO(decoded))
        except Exception:
            return Response({'error': 'Invalid CSV file'}, status=400)
        created, updated, errors = 0, 0, []
        for i, row in enumerate(reader, start=2):
            try:
                student = User.objects.get(username=row['student_username'])
                classroom = Classroom.objects.get(name=row['classroom_name'])
                quarter = int(row['quarter'])
                school_year = row['school_year']
                general_average = float(row['general_average']) if row.get('general_average') else None
                report, is_created = GradeReport.objects.update_or_create(
                    student=student, classroom=classroom, quarter=quarter, school_year=school_year,
                    defaults={
                        'general_average': general_average,
                        'generated_by': request.user,
                        'status': 'draft',
                    }
                )
                report.calculate_averages()
                if is_created:
                    created += 1
                else:
                    updated += 1
            except Exception as e:
                errors.append(f'Row {i}: {str(e)}')
        return Response({'created': created, 'updated': updated, 'errors': errors})

    @action(detail=False, methods=['get'])
    def my_reports(self, request):
        """Get current user's grade reports (for students)"""
        if request.user.role != 'student':
            return Response({'error': 'This endpoint is for students only'}, status=status.HTTP_403_FORBIDDEN)

        reports = self.get_queryset()
        serializer = self.get_serializer(reports, many=True)
        return Response(serializer.data)
