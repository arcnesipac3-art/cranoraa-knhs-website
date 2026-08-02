from rest_framework import viewsets, status, filters, parsers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
import datetime
from django.db.models import Q, Count, F
from ..serializers import (
    UserSerializer, ClassroomSerializer, StudentClassEnrollmentSerializer,
    AnnouncementSerializer, AnnouncementCommentSerializer, AttendanceSerializer,
    LearningMaterialSerializer, SubjectSerializer, ClassroomSubjectSerializer,
    ScratchCardSerializer, FeeSerializer, EnrollmentWaitlistSerializer,
    AbsenceExcuseSerializer, full_name,
)
from ..models import (
    User, Profile, Classroom, StudentClassEnrollment, Announcement, AnnouncementAttachment,
    AnnouncementComment, Attendance, LearningMaterial, Subject, ClassroomSubject, ScratchCard,
    Fee, Notification, EnrollmentApplication, SystemSetting, Schedule, FCMToken,
    AbsenceExcuse, EnrollmentWaitlist, EnrollmentStatusHistory,
)
from ..permissions import IsAdmin
from ..throttles import CsvImportRateThrottle
from ..utils import log_audit_action, generate_temp_password
import logging
import secrets
from django.conf import settings
from django.db import transaction

logger = logging.getLogger(__name__)


class ClassroomViewSet(viewsets.ModelViewSet):
    serializer_class = ClassroomSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    def get_queryset(self):
        try:
            from django.db.models import Q
            user = self.request.user
            academic_year = self.request.query_params.get('academic_year')

            qs = Classroom.objects.select_related('teacher', 'academic_year').prefetch_related('enrollments', 'classroom_subjects__subject')

            if academic_year:
                from ..models import AcademicYear
                # Resolve the academic year by name or ID
                ay = None
                try:
                    ay = AcademicYear.objects.get(name=academic_year)
                except AcademicYear.DoesNotExist:
                    try:
                        ay = AcademicYear.objects.get(pk=int(academic_year))
                    except (AcademicYear.DoesNotExist, ValueError, TypeError):
                        pass
                if ay:
                    # Auto-assign orphan classrooms to this academic year
                    Classroom.objects.filter(academic_year__isnull=True).update(academic_year=ay)
                    qs = qs.filter(academic_year=ay)
                else:
                    qs = qs.filter(Q(academic_year__name=academic_year) | Q(academic_year__isnull=True))

            if user.role == 'admin':
                return qs
            if user.role == 'staff':
                assigned_classrooms = ClassroomSubject.objects.filter(teacher=user).values_list('classroom_id', flat=True)
                return qs.filter(Q(teacher=user) | Q(id__in=assigned_classrooms)).distinct()

            if user.role == 'student':
                enrolled_classrooms = StudentClassEnrollment.objects.filter(student=user).values_list('classroom_id', flat=True)
                return Classroom.objects.filter(id__in=enrolled_classrooms)

            return Classroom.objects.none()
        except Exception as e:
            logger.error(f"Classroom queryset error: {str(e)}", exc_info=True)
            return Classroom.objects.none()

    def perform_create(self, serializer):
        if 'teacher' not in serializer.validated_data and self.request.user.role == 'staff':
            classroom = serializer.save(teacher=self.request.user)
        else:
            classroom = serializer.save()

        if classroom.teacher:
            self._ensure_advisory_role(classroom.teacher)

        log_audit_action(
            user=self.request.user,
            action='create',
            model_name='Classroom',
            object_id=classroom.id,
            object_repr=str(classroom),
            description=f'Created classroom: {classroom.name}',
            request=self.request
        )

    def perform_update(self, serializer):
        old_teacher = serializer.instance.teacher
        classroom = serializer.save()
        new_teacher = classroom.teacher

        if old_teacher != new_teacher:
            if new_teacher:
                self._ensure_advisory_role(new_teacher)
            if old_teacher:
                self._maybe_remove_advisory_role(old_teacher)

        log_audit_action(
            user=self.request.user,
            action='update',
            model_name='Classroom',
            object_id=classroom.id,
            object_repr=str(classroom),
            description=f'Updated classroom: {classroom.name}',
            request=self.request
        )

    def perform_destroy(self, instance):
        teacher = instance.teacher
        log_audit_action(
            user=self.request.user,
            action='delete',
            model_name='Classroom',
            object_id=instance.id,
            object_repr=str(instance),
            description=f'Deleted classroom: {instance.name}',
            request=self.request
        )
        instance.delete()
        if teacher:
            self._maybe_remove_advisory_role(teacher)

    @staticmethod
    def _ensure_advisory_role(user):
        if user.role != 'staff':
            return
        titles = set()
        if user.staff_title:
            titles.add(user.staff_title)
        if user.additional_roles:
            titles.update(r.strip() for r in user.additional_roles.split(',') if r.strip())
        if 'advisory' not in titles:
            extra = [r.strip() for r in (user.additional_roles or '').split(',') if r.strip()]
            extra.append('advisory')
            user.additional_roles = ','.join(extra)
            user.save(update_fields=['additional_roles'])

    @staticmethod
    def _maybe_remove_advisory_role(user):
        if user.role != 'staff':
            return
        still_advising = Classroom.objects.filter(teacher=user).exists()
        if still_advising:
            return
        if user.additional_roles:
            extra = [r.strip() for r in user.additional_roles.split(',') if r.strip() and r.strip() != 'advisory']
            user.additional_roles = ','.join(extra)
            user.save(update_fields=['additional_roles'])
        if user.staff_title == 'advisory':
            user.staff_title = 'teacher'
            user.save(update_fields=['staff_title'])

    @action(detail=True, methods=['get', 'post'])
    def students(self, request, pk=None):
        classroom = self.get_object()

        if request.method == 'GET':
            enrollments = classroom.enrollments.select_related('student', 'student__profile').all()
            search = request.query_params.get('search', '')
            if search:
                enrollments = enrollments.filter(student__username__icontains=search)
            serializer = StudentClassEnrollmentSerializer(enrollments, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            student_id = request.data.get('student_id')
            if not student_id:
                return Response(
                    {'error': 'student_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                student = User.objects.get(id=student_id, role='student')
                enrollment, created = StudentClassEnrollment.objects.get_or_create(
                    student=student,
                    classroom=classroom
                )
                if created:
                    serializer = StudentClassEnrollmentSerializer(enrollment)
                    return Response(serializer.data, status=status.HTTP_201_CREATED)
                else:
                    return Response(
                        {'error': 'Student already enrolled in this class'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except User.DoesNotExist:
                return Response(
                    {'error': 'Student not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Bulk create multiple classrooms at once.
        Expects array of classroom data: [{ name, teacher, grade_level, academic_year }, ...]
        """
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=403)

        classrooms_data = request.data.get('classrooms', [])
        if not classrooms_data or not isinstance(classrooms_data, list):
            return Response(
                {'error': 'Expected "classrooms" array in request body'},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_classrooms = []
        errors = []

        with transaction.atomic():
            for idx, cls_data in enumerate(classrooms_data):
                try:
                    serializer = self.get_serializer(data=cls_data)
                    serializer.is_valid(raise_exception=True)
                    classroom = serializer.save()
                    
                    if classroom.teacher:
                        self._ensure_advisory_role(classroom.teacher)
                    
                    created_classrooms.append(serializer.data)
                    log_audit_action(
                        user=request.user,
                        action='create',
                        model_name='Classroom',
                        object_id=classroom.id,
                        object_repr=str(classroom),
                        description=f'Bulk created classroom: {classroom.name}',
                        request=request
                    )
                except Exception as e:
                    errors.append({'index': idx, 'data': cls_data, 'error': str(e)})

        return Response({
            'created': len(created_classrooms),
            'classrooms': created_classrooms,
            'errors': errors
        }, status=status.HTTP_201_CREATED if created_classrooms else status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def rollover_year(self, request):
        """
        Copy classrooms from one academic year to another.
        Useful for setting up new school year with same classroom structure.
        """
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=403)

        source_year_id = request.data.get('source_year_id')
        target_year_id = request.data.get('target_year_id')
        copy_teachers = request.data.get('copy_teachers', True)
        copy_subjects = request.data.get('copy_subjects', False)

        if not source_year_id or not target_year_id:
            return Response(
                {'error': 'source_year_id and target_year_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from ..models import AcademicYear
            source_year = AcademicYear.objects.get(id=source_year_id)
            target_year = AcademicYear.objects.get(id=target_year_id)
        except AcademicYear.DoesNotExist:
            return Response({'error': 'Invalid academic year'}, status=404)

        source_classrooms = Classroom.objects.filter(academic_year=source_year).prefetch_related('classroom_subjects')
        created_count = 0
        created_classrooms = []

        with transaction.atomic():
            for old_cls in source_classrooms:
                # Check if classroom already exists in target year
                if Classroom.objects.filter(
                    name=old_cls.name,
                    grade_level=old_cls.grade_level,
                    academic_year=target_year
                ).exists():
                    continue

                new_cls = Classroom.objects.create(
                    name=old_cls.name,
                    grade_level=old_cls.grade_level,
                    capacity=old_cls.capacity,
                    teacher=old_cls.teacher if copy_teachers else None,
                    academic_year=target_year
                )
                
                if new_cls.teacher:
                    self._ensure_advisory_role(new_cls.teacher)

                # Copy subject assignments if requested
                if copy_subjects:
                    for old_assignment in old_cls.classroom_subjects.all():
                        ClassroomSubject.objects.create(
                            classroom=new_cls,
                            subject=old_assignment.subject,
                            teacher=old_assignment.teacher,
                            ww_weight=old_assignment.ww_weight,
                            pt_weight=old_assignment.pt_weight,
                            qa_weight=old_assignment.qa_weight
                        )

                created_count += 1
                created_classrooms.append({
                    'id': new_cls.id,
                    'name': new_cls.name,
                    'grade_level': new_cls.grade_level
                })

                log_audit_action(
                    user=request.user,
                    action='create',
                    model_name='Classroom',
                    object_id=new_cls.id,
                    object_repr=str(new_cls),
                    description=f'Rolled over classroom from {source_year.name} to {target_year.name}',
                    request=request
                )

        return Response({
            'status': 'success',
            'created': created_count,
            'source_year': source_year.name,
            'target_year': target_year.name,
            'classrooms': created_classrooms
        })

    @action(detail=True, methods=['post'])
    def bulk_enroll(self, request, pk=None):
        """
        Enroll multiple students into a classroom at once.
        Expects: { student_ids: [1, 2, 3, ...] }
        """
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        classroom = self.get_object()
        student_ids = request.data.get('student_ids', [])

        if not student_ids or not isinstance(student_ids, list):
            return Response(
                {'error': 'Expected "student_ids" array'},
                status=status.HTTP_400_BAD_REQUEST
            )

        enrolled_count = 0
        already_enrolled = []
        not_found = []
        capacity_exceeded = []

        with transaction.atomic():
            current_count = classroom.enrollments.count()
            for student_id in student_ids:
                if current_count + enrolled_count >= classroom.capacity:
                    capacity_exceeded.append(student_id)
                    continue
                try:
                    student = User.objects.get(id=student_id, role='student')
                    _, created = StudentClassEnrollment.objects.get_or_create(
                        student=student,
                        classroom=classroom
                    )
                    if created:
                        enrolled_count += 1
                    else:
                        already_enrolled.append(student_id)
                except User.DoesNotExist:
                    not_found.append(student_id)

        log_audit_action(
            user=request.user,
            action='create',
            model_name='StudentClassEnrollment',
            object_id=classroom.id,
            object_repr=f'Bulk enrollment to {classroom.name}',
            description=f'Bulk enrolled {enrolled_count} students to {classroom.name}',
            request=request
        )

        return Response({
            'status': 'success',
            'enrolled': enrolled_count,
            'already_enrolled': already_enrolled,
            'not_found': not_found,
            'capacity_exceeded': capacity_exceeded,
        })


class StudentClassEnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentClassEnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = StudentClassEnrollment.objects.select_related(
            'student', 'student__profile', 'classroom', 'classroom__teacher'
        )
        classroom_id = self.request.query_params.get('classroom')

        if user.role == 'student':
            if classroom_id:
                is_enrolled = StudentClassEnrollment.objects.filter(student=user, classroom_id=classroom_id).exists()
                if is_enrolled:
                    queryset = queryset.filter(classroom_id=classroom_id)
                else:
                    queryset = queryset.filter(student=user)
            else:
                queryset = queryset.filter(student=user)
        elif user.role == 'staff':
            from django.db.models import Q
            assigned_classrooms = ClassroomSubject.objects.filter(teacher=user).values_list('classroom_id', flat=True)
            queryset = queryset.filter(Q(classroom__teacher=user) | Q(classroom_id__in=assigned_classrooms))

        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)

        return queryset

    def perform_create(self, serializer):
        student_id = self.request.data.get('student')
        classroom_id = self.request.data.get('classroom')

        if not student_id or not classroom_id:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'error': 'student and classroom are required'})

        try:
            student = User.objects.get(pk=student_id, role='student')
            classroom = Classroom.objects.get(pk=classroom_id)
        except (User.DoesNotExist, Classroom.DoesNotExist):
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'error': 'Student or classroom not found'})

        if StudentClassEnrollment.objects.filter(student=student, classroom=classroom).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'error': 'Student is already enrolled in this classroom'})

        enrollment = serializer.save(student=student, classroom=classroom)

        log_audit_action(
            user=self.request.user,
            action='create',
            model_name='StudentClassEnrollment',
            object_id=enrollment.id,
            object_repr=str(enrollment),
            description=f'Enrolled {student.username} in {classroom.name}',
            request=self.request
        )

    def perform_update(self, serializer):
        if self.request.user.role not in ['staff', 'admin']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers and admins can update grades")
        enrollment = serializer.save()

        log_audit_action(
            user=self.request.user,
            action='update',
            model_name='StudentClassEnrollment',
            object_id=enrollment.id,
            object_repr=str(enrollment),
            description=f'Updated grades for {enrollment.student.username} in {enrollment.classroom.name}',
            request=self.request
            )

        if enrollment.student:
            if any([enrollment.q1, enrollment.q2, enrollment.q3, enrollment.q4]):
                try:
                    from ..services.notification_service import notify
                    notify(enrollment.student, 'grade', 'Grades Updated',
                        f'Your grades for {enrollment.classroom.name} have been updated.',
                        '/result-checker')
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"Notification error: {e}")

    @action(detail=False, methods=['post'], url_path='assign-classroom')
    def assign_classroom(self, request):
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)
        student_id = request.data.get('student')
        classroom_id = request.data.get('classroom')
        if not student_id or not classroom_id:
            return Response({'error': 'student and classroom are required'}, status=400)
        try:
            student = User.objects.get(pk=student_id, role='student')
            classroom = Classroom.objects.get(pk=classroom_id)
        except (User.DoesNotExist, Classroom.DoesNotExist):
            return Response({'error': 'Student or classroom not found'}, status=404)
        existing = StudentClassEnrollment.objects.filter(
            student=student,
            classroom__academic_year=classroom.academic_year,
        ).first()
        if existing:
            if existing.classroom_id == classroom.id:
                return Response({'status': 'Already assigned to this section'})
            old_name = existing.classroom.name
            existing.classroom = classroom
            existing.save()
            msg = f'Moved from {old_name} to {classroom.name}'
        else:
            StudentClassEnrollment.objects.create(student=student, classroom=classroom)
            msg = f'Assigned to {classroom.name}'
        return Response({'status': msg})

    @action(detail=True, methods=['post'])
    def withdraw_student(self, request, pk=None):
        enrollment = self.get_object()
        reason = request.data.get('reason', request.data.get('remarks', '')).strip()
        reason_type = request.data.get('reason_type', 'other')
        if not reason:
            return Response({'error': 'A reason is required to withdraw a student'}, status=400)

        student = enrollment.student
        classroom_name = enrollment.classroom.name if enrollment.classroom else 'unknown'
        enrollment.delete()

        from ..models import Profile, EnrollmentApplication
        profile, _ = Profile.objects.get_or_create(user=student)
        profile.enrollment_status = reason_type
        profile.enrollment_status_reason = reason
        profile.save(update_fields=['enrollment_status', 'enrollment_status_reason'])

        app = EnrollmentApplication.objects.filter(enrolled_student=student).order_by('-submitted_at').first()
        if app:
            from_status = app.status
            app.status = 'rejected'
            app.remarks = f'Withdrawn: {reason}'
            app.reviewed_by = request.user
            app.reviewed_at = timezone.now()
            app.save()
            EnrollmentStatusHistory.objects.create(
                application=app, from_status=from_status, to_status='rejected',
                changed_by=request.user, notes=f'Withdrawn ({reason_type}): {reason}',
            )

        try:
            log_audit_action(
                user=request.user, action='withdraw',
                model_name='StudentClassEnrollment', object_id=enrollment.id,
                object_repr=classroom_name,
                description=f'Withdrew {student.username} from {classroom_name} — {reason_type}: {reason}',
                request=request,
            )
        except Exception as e:
            logger.error(f"Audit log failed on withdraw_student: {e}")

        return Response({'status': 'Student withdrawn', 'reason_type': reason_type})


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name', 'profile__employee_id']

    def get_queryset(self):
        try:
            user = self.request.user
            role = self.request.query_params.get('role')
            queryset = User.objects.all().select_related('profile').order_by('-date_joined')

            if role in ['student', 'staff']:
                queryset = queryset.filter(is_approved=True)

            if role == 'admin':
                return queryset.filter(role='admin', is_active=True)

            if role == 'staff':
                return queryset.filter(role='staff', is_active=True)

            if role == 'parent':
                return queryset.filter(role='parent', is_active=True)

            if user.role == 'student':
                return queryset.filter(id=user.id)

            if user.role == 'parent':
                profile = getattr(user, 'profile', None)
                if profile:
                    try:
                        linked_student_ids = profile.linked_students.values_list('id', flat=True)
                        return queryset.filter(Q(id__in=linked_student_ids) | Q(id=user.id))
                    except Exception:
                        pass
                return queryset.filter(id=user.id)

            if user.role == 'staff':
                from django.db.models import Q
                advisory_students = queryset.filter(enrollments__classroom__teacher=user)

                if role == 'student':
                    return advisory_students.distinct()

                return (advisory_students | queryset.filter(id=user.id)).distinct()

            if role:
                queryset = queryset.filter(role=role)
            return queryset
        except Exception as e:
            logger.error(f"UserViewSet queryset error: {str(e)}")
            return User.objects.filter(id=self.request.user.id) if self.request.user.is_authenticated else User.objects.none()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == 'staff':
            from ..models import StudentClassEnrollment
            is_advisory_student = StudentClassEnrollment.objects.filter(
                student=instance,
                classroom__teacher=user
            ).exists()
            if not is_advisory_student:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only delete students from your advisory classroom.")

        log_audit_action(
            user=self.request.user,
            action='delete',
            model_name='User',
            object_id=instance.id,
            object_repr=str(instance),
            description=f'{self.request.user.role.capitalize()} deleted user account: {instance.username}',
            request=self.request
        )
        instance.delete()

    @action(detail=False, methods=['get'])
    def pending(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)

        queryset = User.objects.filter(is_approved=False).select_related('profile').order_by('-date_joined')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)

        import csv
        from django.http import HttpResponse

        role = request.query_params.get('role')
        queryset = self.get_queryset()

        if role:
            queryset = queryset.filter(role=role)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="users_{role or "all"}_{timezone.now().strftime("%Y%m%d")}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Email', 'Username', 'First Name', 'Last Name', 'Role', 'Is Verified', 'Is Approved', 'LRN', 'Grade Level', 'Employee ID'])

        for user in queryset:
            profile = getattr(user, 'profile', None)
            writer.writerow([
                user.email,
                user.username,
                user.first_name,
                user.last_name,
                user.role,
                user.is_verified,
                user.is_approved,
                profile.lrn if profile else '',
                profile.grade_level if profile else '',
                profile.employee_id if profile else '',
            ])

        return response

    @action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
    def bulk_delete(self, request):
        user_ids = request.data.get('user_ids', [])
        if not user_ids:
            return Response({'error': 'No users selected'}, status=400)

        queryset = self.get_queryset().filter(id__in=user_ids)
        count = queryset.count()

        if count == 0:
            return Response({'error': 'No valid users found to delete'}, status=404)

        log_audit_action(
            user=self.request.user,
            action='delete',
            model_name='User',
            object_id=None,
            object_repr=f'Bulk delete {count} users',
            description=f'{self.request.user.role.capitalize()} performed bulk delete on {count} user accounts: {list(queryset.values_list("username", flat=True))}',
            request=self.request
        )

        queryset.delete()
        return Response({'status': f'Successfully deleted {count} users'})

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        user_role = request.user.role
        if user_role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        user = self.get_object()

        if user_role == 'staff':
            from ..models import StudentClassEnrollment
            is_advisory_student = StudentClassEnrollment.objects.filter(
                student=user,
                classroom__teacher=request.user
            ).exists()
            if not is_advisory_student:
                return Response({'error': 'You can only update status for students in your advisory classroom.'}, status=403)

        status_val = request.data.get('status')
        if status_val not in [s[0] for s in User.STATUS_CHOICES]:
            return Response({'error': 'Invalid status'}, status=400)

        user.account_status = status_val
        if status_val in ['suspended', 'inactive']:
            user.is_active = False
        else:
            user.is_active = True
        user.save()

        return Response({'status': f'User account status updated to {status_val}', 'account_status': user.account_status, 'is_active': user.is_active})

    @action(detail=True, methods=['post'], url_path='update-roles')
    def update_roles(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can change roles'}, status=403)

        user = self.get_object()
        if user.role != 'staff':
            return Response({'error': 'Can only set roles on staff accounts'}, status=400)

        staff_title = request.data.get('staff_title')
        additional_roles = request.data.get('additional_roles', '')

        valid_titles = [t[0] for t in User.STAFF_TITLE_CHOICES]
        if staff_title and staff_title not in valid_titles:
            return Response({'error': f'Invalid staff_title. Valid: {valid_titles}'}, status=400)

        if staff_title:
            user.staff_title = staff_title

        if isinstance(additional_roles, list):
            additional_roles = [r for r in additional_roles if r != staff_title and r in valid_titles]
            user.additional_roles = ','.join(additional_roles)
        elif isinstance(additional_roles, str):
            user.additional_roles = additional_roles

        user.save(update_fields=['staff_title', 'additional_roles'])

        return Response({
            'staff_title': user.staff_title,
            'additional_roles': user.additional_roles,
        })

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user_role = request.user.role
        if user_role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        user = self.get_object()

        if user_role == 'staff':
            from ..models import StudentClassEnrollment
            is_advisory_student = StudentClassEnrollment.objects.filter(
                student=user,
                classroom__teacher=request.user
            ).exists()
            if not is_advisory_student:
                return Response({'error': 'You can only reset passwords for students in your advisory classroom.'}, status=403)

        new_password = request.data.get('password')

        if not new_password:
            new_password = generate_temp_password()

        user.set_password(new_password)
        user.must_change_password = True
        user.save()

        try:
            EnrollmentApplication.objects.filter(
                enrolled_student=user,
                status='enrolled'
            ).update(temp_password_display=new_password)
        except Exception as e:
            logger.error(f"Failed to update temp_password_display on enrollment app: {e}")

        return Response({
            'message': 'Password reset successfully',
            'temporary_password': new_password
        })

    @action(detail=False, methods=['post'], parser_classes=[parsers.MultiPartParser], throttle_classes=[CsvImportRateThrottle])
    def import_csv(self, request):
        user_role = request.user.role
        if user_role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        advisory_classroom = None
        if user_role == 'staff':
            try:
                advisory_classroom = Classroom.objects.get(teacher=request.user)
            except Classroom.DoesNotExist:
                return Response({'error': 'You must be an advisory teacher to import students.'}, status=403)

        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)

        max_file_size = 5 * 1024 * 1024
        if file.size > max_file_size:
            return Response({'error': 'File too large. Maximum size is 5MB.'}, status=400)

        if not file.name.endswith('.csv'):
            return Response({'error': 'Invalid file type. Only CSV files are allowed.'}, status=400)

        import csv
        import io

        try:
            decoded_file = file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
        except Exception as e:
            logger.error(f"CSV parse error: {str(e)}")
            return Response({'error': 'Failed to parse CSV file. Ensure it is UTF-8 encoded with the correct columns.'}, status=400)

        created_count = 0
        created_users = []
        errors = []

        for row in reader:
            try:
                student_id = row.get('Student ID') or row.get('username')
                if not student_id:
                    errors.append("Missing Student ID for a row")
                    continue

                if len(str(student_id)) != 12 or not str(student_id).isdigit():
                    errors.append(f"Invalid LRN {student_id}: Must be exactly 12 digits")
                    continue

                email = row.get('Email') or row.get('email')
                if email:
                    email = email.strip()
                if not email:
                    email = None

                if email and User.objects.filter(email=email).exists():
                    errors.append(f"Email {email} already exists")
                    continue

                first_name = row.get('First Name') or ''
                last_name = row.get('Last Name') or ''
                grade_level = row.get('Grade Level') or ''

                if advisory_classroom and not grade_level:
                    grade_level = advisory_classroom.grade_level or ''

                sex = row.get('Sex') or row.get('sex') or ''

                if sex:
                    sex = sex.lower().strip()
                    if sex not in ['male', 'female']:
                        sex = None
                else:
                    sex = None

                if User.objects.filter(username=student_id).exists():
                    errors.append(f"Student ID {student_id} already exists")
                    continue

                temp_password = generate_temp_password()

                with transaction.atomic():
                    user = User(
                        username=student_id,
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        role='student',
                        is_approved=True,
                        is_verified=True if email else False,
                        must_change_password=True,
                        account_status='active'
                    )
                    user.set_password(temp_password)
                    user.save()

                    from ..models import Profile
                    Profile.objects.update_or_create(
                        user=user,
                        defaults={
                            'lrn': student_id,
                            'grade_level': grade_level,
                            'sex': sex
                        }
                    )

                    try:
                        EnrollmentApplication.objects.filter(
                            lrn=student_id,
                            status__in=['pending', 'under_review', 'approved']
                        ).update(
                            enrolled_student=user,
                            status='enrolled',
                            temp_password_display=temp_password
                        )
                    except Exception as e:
                        logger.error(f"Failed to link imported user to enrollment app: {e}")

                    if advisory_classroom:
                        from ..models import StudentClassEnrollment
                        StudentClassEnrollment.objects.get_or_create(
                            student=user,
                            classroom=advisory_classroom
                        )

                created_count += 1
                created_users.append({
                    'username': student_id,
                    'password': temp_password,
                    'name': f"{first_name} {last_name}".strip()
                })
            except Exception as e:
                errors.append(f"Error importing {row.get('Student ID')}: {str(e)}")

        return Response({
            'status': 'success',
            'created_count': created_count,
            'created_users': created_users,
            'errors': errors
        })

    @action(detail=False, methods=['post'], throttle_classes=[CsvImportRateThrottle])
    def import_teachers_csv(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)

        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)

        max_file_size = 5 * 1024 * 1024
        if file.size > max_file_size:
            return Response({'error': 'File too large. Maximum size is 5MB.'}, status=400)

        if not file.name.endswith('.csv'):
            return Response({'error': 'Invalid file type. Only CSV files are allowed.'}, status=400)

        import csv
        import io

        try:
            decoded_file = file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
        except Exception as e:
            logger.error(f"CSV parse error: {str(e)}")
            return Response({'error': 'Failed to parse CSV file. Ensure it is UTF-8 encoded with the correct columns.'}, status=400)

        created_count = 0
        created_users = []
        errors = []

        for row in reader:
            try:
                email = row.get('Email') or row.get('email')
                if not email:
                    errors.append("Missing Email for a row")
                    continue

                email = email.strip()
                if User.objects.filter(username=email).exists() or User.objects.filter(email=email).exists():
                    errors.append(f"Email {email} already exists")
                    continue

                title = row.get('Title') or ''
                first_name = row.get('First Name') or ''
                last_name = row.get('Last Name') or ''
                sex = row.get('Sex') or row.get('sex') or ''

                if sex:
                    sex = sex.lower().strip()
                    if sex not in ['male', 'female']:
                        sex = None
                else:
                    sex = None

                temp_password = generate_temp_password()

                with transaction.atomic():
                    user = User(
                        username=email,
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        role='staff',
                        staff_title='teacher',
                        is_approved=True,
                        is_verified=False,
                        must_change_password=True,
                        account_status='active'
                    )
                    user.set_password(temp_password)
                    user.save()

                    from ..models import Profile
                    Profile.objects.update_or_create(
                        user=user,
                        defaults={
                            'title': title,
                            'sex': sex
                        }
                    )

                created_count += 1
                created_users.append({
                    'username': email,
                    'password': temp_password,
                    'name': f"{title} {first_name} {last_name}".strip()
                })
            except Exception as e:
                errors.append(f"Error importing {row.get('Email')}: {str(e)}")

        return Response({
            'status': 'success',
            'created_count': created_count,
            'created_users': created_users,
            'errors': errors
        })

    @action(detail=False, methods=['get'])
    def pending(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        users = User.objects.filter(is_approved=False, is_verified=True).order_by('date_joined')
        serializer = self.get_serializer(users, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mute(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)

        user = self.get_object()
        hours = int(request.data.get('hours', 24))

        profile, created = Profile.objects.get_or_create(user=user)
        profile.mute_until = timezone.now() + datetime.timedelta(hours=hours)
        profile.save()

        return Response({'status': f'User muted for {hours} hours'})

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)

        user = self.get_object()
        profile, created = Profile.objects.get_or_create(user=user)
        profile.is_suspended = not profile.is_suspended
        profile.save()

        user.account_status = 'suspended' if profile.is_suspended else 'active'
        user.is_active = not profile.is_suspended
        user.save()

        status_str = 'suspended' if profile.is_suspended else 'unsuspended'
        return Response({'status': f'User {status_str} successfully'})

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)

        user = self.get_object()
        user.is_active = not user.is_active
        user.save()

        status_str = 'activated' if user.is_active else 'deactivated'
        log_audit_action(
            user=request.user,
            action='update',
            model_name='User',
            object_id=user.id,
            object_repr=str(user),
            description=f'Admin {status_str} user account: {user.email}',
            request=request
        )

        return Response({'status': f'User {status_str} successfully', 'is_active': user.is_active})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if not request.user.is_authenticated or request.user.role != 'admin':
            return Response({'error': 'Unauthorized. Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(pk=pk)

            if user.is_approved:
                return Response({'message': f'{user.email} is already approved.'})

            user.is_approved = True
            user.save()

            try:
                log_audit_action(
                    user=request.user,
                    action='approve',
                    model_name='User',
                    object_id=user.id,
                    object_repr=str(user),
                    description=f'Admin approved account for {user.email}',
                    request=request,
                )
            except Exception as audit_err:
                logger.error(f"Failed to log audit action for approval: {audit_err}")

            return Response({'message': f'Account for {user.email} has been approved successfully.'})

        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in approve action: {str(e)}")
            return Response({'error': 'Failed to approve account.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if not request.user.is_authenticated or request.user.role != 'admin':
            return Response({'error': 'Unauthorized. Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(pk=pk)
            email = user.email
            reason = request.data.get('reason', 'Your account registration has been rejected by the administrator.')

            try:
                log_audit_action(
                    user=request.user,
                    action='reject',
                    model_name='User',
                    object_id=user.id,
                    object_repr=str(user),
                    description=f'Admin rejected account for {email}. Reason: {reason}',
                    request=request,
                )
            except Exception as audit_err:
                logger.error(f"Failed to log audit action for rejection: {audit_err}")

            user.delete()
            return Response({'message': f'Account for {email} has been rejected and removed.'})

        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in reject action: {str(e)}")
            return Response({'error': 'Failed to reject account.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q', '')

        if request.user.role == 'admin':
            users = User.objects.all().select_related('profile')
        else:
            users = User.objects.filter(role__in=['staff', 'student']).select_related('profile')

        if query:
            users = users.filter(
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(email__icontains=query) |
                Q(username__icontains=query)
            )

        users = users.exclude(id=request.user.id)[:50]

        return Response(UserSerializer(users, many=True).data)


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

        if user.role == 'student':
            queryset = queryset.filter(status='live')
            queryset = queryset.filter(
                Q(target_audience__in=['all', 'students']) |
                Q(target_classrooms__enrollments__student=user)
            ).distinct()
            queryset = queryset.exclude(event_date__lt=timezone.now())

        elif user.role == 'parent':
            profile = getattr(user, 'profile', None)
            linked_student_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            queryset = queryset.filter(status='live')
            queryset = queryset.filter(
                Q(target_audience__in=['all', 'parents']) |
                Q(target_classrooms__enrollments__student_id__in=linked_student_ids)
            ).distinct()
            queryset = queryset.exclude(event_date__lt=timezone.now())

        elif user.role == 'staff':
            queryset = queryset.filter(
                Q(status='live', target_audience__in=['all', 'teachers']) |
                Q(author=user)
            ).distinct()
            queryset = queryset.exclude(event_date__lt=timezone.now())

        elif user.role == 'admin':
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
        try:
            announcement = serializer.save(author=self.request.user)
            logger.info(f"Announcement created: {announcement.title}")

            files = self.request.FILES.getlist('attachments')
            logger.info(f"Found {len(files)} attachment(s)")
            from ..storage import upload_file, StorageValidationError
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

            log_audit_action(
                user=self.request.user,
                action='create',
                model_name='Announcement',
                object_id=announcement.id,
                object_repr=announcement.title,
                description=f'Created announcement: {announcement.title}',
                request=self.request
            )

            from django.contrib.auth import get_user_model
            User = get_user_model()

            target_users = User.objects.filter(is_active=True, is_verified=True)

            if announcement.target_audience != 'all':
                target_users = target_users.filter(role=announcement.target_audience.rstrip('s'))

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
                for notif in notifications_to_create:
                    notif.save()
        except Exception as e:
            logger.error(f"Error in perform_create: {str(e)}")
            raise

    @action(detail=False, methods=['post', 'delete'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response({"error": "No IDs provided"}, status=400)

        queryset = Announcement.objects.filter(id__in=ids)
        if request.user.role != 'admin':
            queryset = queryset.filter(author=request.user)

        count = queryset.count()
        queryset.delete()

        log_audit_action(
            user=request.user,
            action='delete',
            model_name='Announcement',
            object_id=None,
            object_repr=f"Bulk delete {count} announcements",
            description=f'Deleted {count} announcements with IDs: {ids}',
            request=request
        )

        return Response({"message": f"Successfully deleted {count} announcements"}, status=200)

    @action(detail=False, methods=['post'])
    def delete_all(self, request):
        if request.user.role != 'admin':
            return Response({"error": "Unauthorized"}, status=403)

        queryset = Announcement.objects.all()
        count = queryset.count()
        queryset.delete()

        log_audit_action(
            user=request.user,
            action='delete',
            model_name='Announcement',
            object_id=None,
            object_repr="Delete all announcements",
            description=f'Deleted all {count} announcements from the system',
            request=request
        )

        return Response({"message": f"Successfully deleted all {count} announcements"}, status=200)

    def perform_update(self, serializer):
        announcement = serializer.save()
        files = self.request.FILES.getlist('attachments')
        from ..storage import upload_file
        for f in files:
            url, err = upload_file(f, bucket_key='announcements', folder='attachments')
            if url:
                from ..models import AnnouncementAttachment
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

        from django.contrib.auth import get_user_model
        User = get_user_model()

        users = User.objects.all()

        if announcement.target_audience == 'admins':
            users = users.filter(role='admin')
        elif announcement.target_audience == 'students':
            users = users.filter(role='student')
        elif announcement.target_audience == 'teachers':
            users = users.filter(role='staff')

        for user in users:
            if user != self.request.user:
                Notification.objects.create(
                    recipient=user,
                    notification_type='announcement',
                    title=f'New Announcement: {announcement.title}',
                    message=announcement.content[:200] + '...' if len(announcement.content) > 200 else announcement.content,
                    link='/announcements'
                )

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        announcement = self.get_object()
        announcement.read_by.add(request.user)
        return Response({'status': 'marked as read'})

    def perform_destroy(self, instance):
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
        announcement = self.get_object()
        announcement.is_pinned = not announcement.is_pinned
        announcement.save()
        return Response({'is_pinned': announcement.is_pinned})

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        announcement = self.get_object()
        announcement.status = 'live'
        announcement.save()
        return Response({'status': 'published'})

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        announcement = self.get_object()
        announcement.status = 'expired'
        announcement.save()
        Notification.objects.filter(
            notification_type='announcement',
            link='/announcements',
            title__icontains=announcement.title[:30]
        ).delete()
        return Response({'status': 'archived'})

    @action(detail=True, methods=['post'], url_path='delete-attachment')
    def delete_attachment(self, request, pk=None):
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
        announcement = self.get_object()
        try:
            comment = announcement.comments.get(id=comment_id)
        except AnnouncementComment.DoesNotExist:
            return Response({'error': 'Comment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role != 'admin' and comment.author_id != request.user.id:
            return Response({'error': 'Not allowed to delete this comment.'}, status=status.HTTP_403_FORBIDDEN)

        comment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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

        from django.db.models import Count, Case, When, IntegerField
        from django.utils import timezone
        import datetime

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

        import datetime
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

                if status_val not in ['present', 'absent', 'late', 'excused']:
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

        return Response({
            'created': created_count,
            'updated': updated_count,
            'errors': errors,
        })

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
        return Response(AbsenceExcuseSerializer(excuse).data)


class EnrollmentWaitlistViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentWaitlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'staff']:
            return EnrollmentWaitlist.objects.select_related('student', 'classroom', 'application')
        return EnrollmentWaitlist.objects.select_related('student', 'classroom', 'application').filter(student=user)

    def perform_create(self, serializer):
        if self.request.user.role not in ['admin', 'staff']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins can manage waitlist")
        classroom = serializer.validated_data['classroom']
        last_pos = EnrollmentWaitlist.objects.filter(classroom=classroom, status='waiting').order_by('-position').first()
        position = (last_pos.position + 1) if last_pos else 1
        serializer.save(position=position)

    @action(detail=True, methods=['post'], url_path='process')
    def process(self, request, pk=None):
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)
        entry = self.get_object()
        action_val = request.data.get('action')
        if action_val == 'offer':
            entry.status = 'offered'
            entry.offered_at = timezone.now()
            entry.response_deadline = timezone.now() + timezone.timedelta(days=3)
            entry.save()
        elif action_val == 'accept':
            entry.status = 'accepted'
            entry.save()
        elif action_val == 'decline':
            entry.status = 'declined'
            entry.save()
            EnrollmentWaitlist.objects.filter(
                classroom=entry.classroom, position__gt=entry.position, status='waiting'
            ).update(position=F('position') - 1)
        else:
            return Response({'error': 'action must be offer, accept, or decline'}, status=400)
        return Response(EnrollmentWaitlistSerializer(entry).data)


class LearningMaterialViewSet(viewsets.ModelViewSet):
    serializer_class = LearningMaterialSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'description']

    def get_queryset(self):
        user = self.request.user
        from django.db.models import Q
        queryset = LearningMaterial.objects.select_related('uploaded_by', 'classroom')
        classroom_id = self.request.query_params.get('classroom')
        material_type = self.request.query_params.get('material_type')
        quarter = self.request.query_params.get('quarter')

        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)
        else:
            if user.role == 'student':
                enrolled_ids = list(StudentClassEnrollment.objects.filter(
                    student=user
                ).values_list('classroom_id', flat=True))
                profile = getattr(user, 'profile', None)
                if profile and hasattr(profile, 'classroom') and profile.classroom:
                    enrolled_ids.append(profile.classroom.id)
                queryset = queryset.filter(Q(classroom_id__in=enrolled_ids) | Q(classroom__isnull=True))
            elif user.role == 'staff':
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

        file_url = None
        original_filename = ''
        file_size_bytes = None
        uploaded_file = self.request.FILES.get('file')
        if uploaded_file:
            from ..storage import upload_file
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


class SubjectViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'code']

    def get_queryset(self):
        queryset = Subject.objects.all()
        grade_level = self.request.query_params.get('grade_level')
        if grade_level:
            queryset = queryset.filter(grade_level=grade_level)
        return queryset


class ClassroomSubjectViewSet(viewsets.ModelViewSet):
    serializer_class = ClassroomSubjectSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['classroom__name', 'subject__name', 'subject__code', 'teacher__username']
    ordering_fields = ['classroom__name', 'subject__name', 'assigned_at']
    ordering = ['classroom__name', 'subject__name']

    def get_queryset(self):
        user = self.request.user
        queryset = ClassroomSubject.objects.select_related('classroom', 'subject', 'teacher')

        if user.role == 'staff':
            classroom_ids = set()
            classroom_ids.update(Classroom.objects.filter(teacher=user).values_list('id', flat=True))
            classroom_ids.update(ClassroomSubject.objects.filter(teacher=user).values_list('classroom_id', flat=True))
            queryset = queryset.filter(classroom_id__in=classroom_ids)
        elif user.role == 'student':
            enrolled_classrooms = StudentClassEnrollment.objects.filter(student=user).values_list('classroom_id', flat=True)
            queryset = queryset.filter(classroom_id__in=enrolled_classrooms)

        classroom_id = self.request.query_params.get('classroom')
        subject_id = self.request.query_params.get('subject')
        teacher_id = self.request.query_params.get('teacher')
        # Bulk fetch by academic year — avoids N+1 on academic setup page
        academic_year_id = self.request.query_params.get('academic_year_id')

        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
        if academic_year_id:
            queryset = queryset.filter(classroom__academic_year_id=academic_year_id)

        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        if user.role not in ['admin', 'staff']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins and teachers can assign subjects to classrooms")

        classroom = serializer.validated_data.get('classroom')
        subject = serializer.validated_data.get('subject')
        teacher = serializer.validated_data.get('teacher')

        # Use update_or_create so re-assigning the same subject to a section just updates the teacher
        from ..models import ClassroomSubject
        instance, created = ClassroomSubject.objects.update_or_create(
            classroom=classroom,
            subject=subject,
            defaults={'teacher': teacher},
        )
        action = 'create' if created else 'update'
        log_audit_action(user, action, 'ClassroomSubject',
                         object_id=instance.id,
                         object_repr=str(instance),
                         description=f"{'Assigned' if created else 'Updated'} {instance.subject.code} in {instance.classroom.name}",
                         request=self.request)
        return instance

    def perform_update(self, serializer):
        user = self.request.user
        if user.role not in ['admin', 'staff']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins and teachers can update subject assignments")
        if user.role == 'staff' and serializer.instance.teacher != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only edit assignments for subjects assigned to you")
        instance = serializer.save()
        log_audit_action(user, 'update', 'ClassroomSubject',
                         object_id=instance.id,
                         object_repr=str(instance),
                         description=f"Updated weights for {instance.subject.code} in {instance.classroom.name}",
                         request=self.request)

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role not in ['admin', 'staff']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins and teachers can remove subject assignments")
        if user.role == 'staff' and instance.teacher != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only remove assignments for subjects assigned to you")
        log_audit_action(user, 'delete', 'ClassroomSubject',
                         object_id=instance.id,
                         object_repr=str(instance),
                         description=f"Removed {instance.subject.code} from {instance.classroom.name}",
                         request=self.request)
        instance.delete()

    @action(detail=False, methods=['get'])
    def by_classroom(self, request):
        classroom_id = request.query_params.get('classroom_id')
        if not classroom_id:
            return Response({'error': 'classroom_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)

        queryset = ClassroomSubject.objects.select_related(
            'classroom', 'subject', 'teacher'
        ).filter(classroom_id=classroom_id)

        user = request.user
        # Only filter by teacher for pure staff role, not admin users
        # Admin users should see all subjects even if they also have staff role
        if user.role == 'staff' and not (hasattr(user, 'is_superuser') and user.is_superuser):
            queryset = queryset.filter(teacher=user)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_teacher(self, request):
        user = request.user
        teacher_id = request.query_params.get('teacher_id')

        if user.role == 'staff':
            teacher_id = user.id

        if not teacher_id:
            return Response({'error': 'teacher_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)

        queryset = self.get_queryset().filter(teacher_id=teacher_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ScratchCardViewSet(viewsets.ModelViewSet):
    serializer_class = ScratchCardSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['serial_number', 'student__username']

    def get_queryset(self):
        queryset = ScratchCard.objects.all()
        student_id = self.request.query_params.get('student')
        is_used = self.request.query_params.get('is_used')

        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if is_used:
            queryset = queryset.filter(is_used=is_used == 'true')
        return queryset


class FeeViewSet(viewsets.ModelViewSet):
    serializer_class = FeeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['student__username']

    def get_queryset(self):
        user = self.request.user
        queryset = Fee.objects.select_related('student')
        student_id = self.request.query_params.get('student')
        status = self.request.query_params.get('status')
        fee_type = self.request.query_params.get('fee_type')

        if user.role == 'student':
            queryset = queryset.filter(student=user)
        elif user.role == 'parent':
            profile = getattr(user, 'profile', None)
            linked_student_ids = profile.linked_students.values_list('id', flat=True) if profile else []
            queryset = queryset.filter(student_id__in=linked_student_ids)
        elif user.role == 'staff':
            teacher_classrooms = Classroom.objects.filter(teacher=user)
            student_classroom_ids = StudentClassEnrollment.objects.filter(
                classroom__in=teacher_classrooms
            ).values_list('student_id', flat=True).distinct()
            queryset = queryset.filter(student_id__in=student_classroom_ids)

        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if status:
            queryset = queryset.filter(status=status)
        if fee_type:
            queryset = queryset.filter(fee_type=fee_type)
        return queryset

    def perform_create(self, serializer):
        fee = serializer.save()
        try:
            log_audit_action(
                user=self.request.user,
                action='create',
                model_name='Fee',
                object_id=fee.id,
                object_repr=str(fee),
                description=f'Created {fee.get_fee_type_display()} fee of {fee.amount} for {fee.student.username}',
                request=self.request
            )
        except Exception as audit_err:
            logger.warning(f"Audit log failed on fee create: {audit_err}")

    def perform_update(self, serializer):
        fee = serializer.save()
        try:
            log_audit_action(
                user=self.request.user,
                action='update',
                model_name='Fee',
                object_id=fee.id,
                object_repr=str(fee),
                description=f'Updated fee for {fee.student.username}: {fee.get_fee_type_display()} ({fee.status}, {fee.amount_paid}/{fee.amount})',
                request=self.request
            )
        except Exception as audit_err:
            logger.warning(f"Audit log failed on fee update: {audit_err}")

    def perform_destroy(self, instance):
        fee_repr = str(instance)
        student_username = instance.student.username if instance.student else 'unknown'
        fee_type = instance.get_fee_type_display()
        fee_id = instance.id
        instance.delete()
        try:
            log_audit_action(
                user=self.request.user,
                action='delete',
                model_name='Fee',
                object_id=fee_id,
                object_repr=fee_repr,
                description=f'Deleted {fee_type} fee for {student_username}',
                request=self.request
            )
        except Exception as audit_err:
            logger.warning(f"Audit log failed on fee delete: {audit_err}")
