"""User management views: UserViewSet, admin create, profile views."""
from rest_framework import viewsets, status, filters, parsers
from rest_framework.decorators import api_view, permission_classes, action, parser_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.utils import timezone
from django.db.models import Q
import logging
import re
import csv
import io
import datetime
from django.db import transaction

from ..serializers import UserSerializer
from ..models import User, Profile, Classroom, StudentClassEnrollment, EnrollmentApplication
from ..permissions import IsAdmin, IsAdminOrStaff
from ..throttles import CsvImportRateThrottle
from ..utils import log_audit_action, generate_temp_password
from .enrollment import _grade_key

logger = logging.getLogger(__name__)


@api_view(['GET'])
def user_profile(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdmin])
@throttle_classes([CsvImportRateThrottle])
def admin_create_user_view(request):
    username = request.data.get('username')
    email = request.data.get('email')

    if email is not None:
        email = email.strip()
        if email == "":
            email = None

    password = request.data.get('password')
    role = request.data.get('role', 'student')
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    profile_data = request.data.get('profile', {})

    advisory_classroom = None
    if request.user.role == 'staff':
        if role != 'student':
            return Response({'error': 'Teachers can only create student accounts.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            advisory_classroom = Classroom.objects.get(teacher=request.user)
        except Classroom.DoesNotExist:
            return Response({'error': 'You must be assigned as an advisory teacher to create students.'}, status=status.HTTP_403_FORBIDDEN)

    if not username:
        return Response({'error': 'Username/Student ID is required'}, status=status.HTTP_400_BAD_REQUEST)

    if role == 'student' and (len(str(username)) != 12 or not str(username).isdigit()):
        return Response({'error': 'Student LRN must be exactly 12 digits'}, status=status.HTTP_400_BAD_REQUEST)

    if not password:
        password = generate_temp_password()

    if User.objects.filter(username=username).exists():
        return Response({'error': 'User with this ID/Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

    if email and User.objects.filter(email=email).exists():
        return Response({'error': 'User with this email already exists'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            user = User(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
            )
            user.set_password(password)
            user.role = role
            user.staff_title = request.data.get('staff_title') if role == 'staff' else None
            user.is_verified = True if email else False
            user.is_approved = True
            user.must_change_password = True
            user.account_status = 'active'
            user.save()

            profile, created = Profile.objects.get_or_create(user=user)

            profile.lrn = profile_data.get('lrn', username if role == 'student' else None)
            profile.title = profile_data.get('title')
            profile.sex = profile_data.get('sex')

            assigned_grade = profile_data.get('grade_level')
            if not assigned_grade and advisory_classroom:
                assigned_grade = advisory_classroom.grade_level

            profile.grade_level = assigned_grade
            profile.employee_id = profile_data.get('employee_id')
            profile.phone_number = profile_data.get('phone_number')
            profile.address = profile_data.get('address')

            if profile_data.get('date_of_birth'):
                from datetime import datetime
                try:
                    profile.date_of_birth = datetime.strptime(profile_data.get('date_of_birth'), '%Y-%m-%d').date()
                except ValueError:
                    pass

            profile.save()

            if role == 'student':
                try:
                    EnrollmentApplication.objects.filter(
                        lrn=username,
                        status__in=['pending', 'under_review', 'approved']
                    ).update(
                        enrolled_student=user,
                        status='enrolled',
                        temp_password_display=password
                    )
                except Exception as e:
                    logger.error(f"Failed to link manual user creation to enrollment app: {e}")

            if advisory_classroom:
                StudentClassEnrollment.objects.get_or_create(
                    student=user,
                    classroom=advisory_classroom
                )

            log_audit_action(
                user=request.user,
                action='create',
                model_name='User',
                object_id=user.id,
                object_repr=str(user),
                description=f'{request.user.role.capitalize()} created {role} account: {username}',
                request=request
            )

        return Response({
            'message': f'Account for {username} created successfully!',
            'username': username,
            'temporary_password': password,
            'role': role
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        logger.error(f"User creation error: {str(e)}", exc_info=True)
        return Response({'error': 'Failed to create user account. Please check the provided data.'}, status=status.HTTP_400_BAD_REQUEST)


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
                from django.db.models import Q as DQ
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
            is_advisory_student = StudentClassEnrollment.objects.filter(
                student=instance,
                classroom__teacher=user
            ).exists()
            if not is_advisory_student:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only delete students from your advisory classroom.")

        # Capture repr before deletion so the audit log survives even after the row is gone
        user_id = instance.id
        user_repr = str(instance)
        username = instance.username

        instance.delete()

        # Audit log is best-effort — a logging failure must never surface as a 500
        try:
            log_audit_action(
                user=user,
                action='delete',
                model_name='User',
                object_id=user_id,
                object_repr=user_repr,
                description=f'{user.role.capitalize()} deleted user account: {username}',
                request=self.request
            )
        except Exception as audit_exc:
            logger.warning(f"Audit log failed after deleting user {user_id}: {audit_exc}")

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

        # Capture details before deletion
        usernames = list(queryset.values_list("username", flat=True))

        queryset.delete()

        # Best-effort audit log
        try:
            log_audit_action(
                user=self.request.user,
                action='delete',
                model_name='User',
                object_id=None,
                object_repr=f'Bulk delete {count} users',
                description=f'{self.request.user.role.capitalize()} performed bulk delete on {count} user accounts: {usernames}',
                request=self.request
            )
        except Exception as audit_exc:
            logger.warning(f"Audit log failed after bulk delete of {count} users: {audit_exc}")

        return Response({'status': f'Successfully deleted {count} users'})

    @action(detail=False, methods=['post'], url_path='bulk-update-status')
    def bulk_update_status(self, request):
        """Update account_status for multiple users at once."""
        if request.user.role not in ['admin']:
            return Response({'error': 'Unauthorized'}, status=403)

        user_ids = request.data.get('user_ids', [])
        new_status = request.data.get('status')

        if not user_ids:
            return Response({'error': 'No users selected'}, status=400)
        if new_status not in [s[0] for s in User.STATUS_CHOICES]:
            return Response({'error': 'Invalid status'}, status=400)

        queryset = User.objects.filter(id__in=user_ids)
        count = queryset.count()

        is_active = new_status not in ['suspended', 'inactive']
        queryset.update(account_status=new_status, is_active=is_active)

        try:
            log_audit_action(
                user=request.user,
                action='update',
                model_name='User',
                object_id=None,
                object_repr=f'Bulk status update to {new_status}',
                description=f'{request.user.role.capitalize()} changed status to {new_status} for {count} users',
                request=request
            )
        except Exception:
            pass

        return Response({'status': f'Updated {count} users to {new_status}'})

    @action(detail=True, methods=['post'])
    def assign_section(self, request, pk=None):
        """Assign a student to a classroom/section."""
        user = request.user
        if user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        student = self.get_object()

        # Only students can be assigned to sections
        if student.role != 'student':
            return Response({'error': 'Only students can be assigned to sections'}, status=400)

        classroom_id = request.data.get('classroom_id')
        if not classroom_id:
            return Response({'error': 'classroom_id is required'}, status=400)

        try:
            classroom = Classroom.objects.get(id=classroom_id)
        except Classroom.DoesNotExist:
            return Response({'error': 'Classroom not found'}, status=404)

        # Check capacity
        current_count = StudentClassEnrollment.objects.filter(classroom=classroom).count()
        capacity = classroom.capacity or 40
        if current_count >= capacity:
            return Response({'error': f'{classroom.name} is at full capacity ({current_count}/{capacity})'}, status=400)

        # Check grade level match
        student_grade = student.profile.grade_level if hasattr(student, 'profile') else None
        if student_grade and _grade_key(classroom.grade_level) != _grade_key(student_grade):
            return Response({
                'error': f'Grade level mismatch: classroom is Grade {classroom.grade_level}, student is Grade {student_grade}'
            }, status=400)

        # Create or update enrollment
        enrollment, created = StudentClassEnrollment.objects.get_or_create(
            student=student,
            classroom=classroom,
            defaults={'enrolled_at': timezone.now()}
        )

        # Update student profile with grade level
        profile, _ = Profile.objects.get_or_create(user=student)
        profile.grade_level = str(classroom.grade_level)
        profile.save(update_fields=['grade_level'])

        try:
            log_audit_action(
                user=request.user,
                action='update',
                model_name='StudentClassEnrollment',
                object_id=enrollment.id,
                object_repr=f'{student.username} -> {classroom.name}',
                description=f'{user.role.capitalize()} assigned {student.username} to {classroom.name}',
                request=request
            )
        except Exception as audit_exc:
            logger.warning(f"Audit log failed for assign_section: {audit_exc}")

        return Response({
            'status': f'Student assigned to {classroom.name}',
            'classroom': {
                'id': classroom.id,
                'name': classroom.name,
                'grade_level': classroom.grade_level
            },
            'enrollment_created': created
        })

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        user_role = request.user.role
        if user_role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        user = self.get_object()

        if user_role == 'staff':
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

        try:
            log_audit_action(
                user=request.user,
                action='update',
                model_name='User',
                object_id=user.id,
                object_repr=str(user),
                description=f'{request.user.role.capitalize()} updated account status to {status_val} for {user.username}',
                request=request
            )
        except Exception as audit_exc:
            logger.warning(f"Audit log failed for update_status: {audit_exc}")

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
            log_audit_action(
                user=request.user,
                action='password_reset',
                model_name='User',
                object_id=user.id,
                object_repr=str(user),
                description=f'{request.user.role.capitalize()} reset password for {user.username}',
                request=request
            )
        except Exception as audit_exc:
            logger.warning(f"Audit log failed for password reset: {audit_exc}")

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

        try:
            log_audit_action(
                user=request.user,
                action='create',
                model_name='User',
                object_id=None,
                object_repr=f'CSV import {created_count} students',
                description=f'{request.user.role.capitalize()} imported {created_count} students via CSV with {len(errors)} errors',
                request=request
            )
        except Exception as audit_exc:
            logger.warning(f"Audit log failed for CSV import: {audit_exc}")

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

        try:
            log_audit_action(
                user=request.user,
                action='create',
                model_name='User',
                object_id=None,
                object_repr=f'CSV import {created_count} teachers',
                description=f'Admin imported {created_count} teachers via CSV with {len(errors)} errors',
                request=request
            )
        except Exception as audit_exc:
            logger.warning(f"Audit log failed for teacher CSV import: {audit_exc}")

        return Response({
            'status': 'success',
            'created_count': created_count,
            'created_users': created_users,
            'errors': errors
        })

    @action(detail=True, methods=['post'])
    def mute(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized'}, status=403)

        user = self.get_object()
        hours = int(request.data.get('hours', 24))

        profile, created = Profile.objects.get_or_create(user=user)
        profile.mute_until = timezone.now() + datetime.timedelta(hours=hours)
        profile.save()

        try:
            log_audit_action(
                user=request.user,
                action='update',
                model_name='User',
                object_id=user.id,
                object_repr=str(user),
                description=f'Admin muted {user.username} for {hours} hours',
                request=request
            )
        except Exception as audit_exc:
            logger.warning(f"Audit log failed for mute action: {audit_exc}")

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
        try:
            log_audit_action(
                user=request.user,
                action='update',
                model_name='User',
                object_id=user.id,
                object_repr=str(user),
                description=f'Admin {status_str} user account: {user.email}',
                request=request
            )
        except Exception as audit_exc:
            logger.warning(f"Audit log failed for suspend action: {audit_exc}")

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

    @action(detail=True, methods=['get'], url_path='activity')
    def user_activity(self, request, pk=None):
        """Return recent audit log entries for a specific user."""
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        target_user = self.get_object()
        limit = int(request.query_params.get('limit', 20))

        from ..models.infrastructure import AuditLog
        logs = AuditLog.objects.filter(user=target_user).order_by('-timestamp')[:limit]

        data = []
        for log in logs:
            data.append({
                'id': log.id,
                'action': log.action,
                'action_type': log.action_type,
                'model_name': log.model_name,
                'object_id': log.object_id,
                'object_repr': log.object_repr,
                'description': log.description,
                'timestamp': log.timestamp.isoformat(),
            })

        return Response(data)

    @action(detail=True, methods=['get'], url_path='profile-completeness')
    def profile_completeness(self, request, pk=None):
        """Return profile completeness score and missing fields for a user."""
        target_user = self.get_object()
        profile, _ = Profile.objects.get_or_create(user=target_user)

        if target_user.role == 'student':
            fields = {
                'first_name': bool(target_user.first_name),
                'last_name': bool(target_user.last_name),
                'email': bool(target_user.email),
                'sex': bool(profile.sex),
                'date_of_birth': bool(profile.date_of_birth),
                'phone_number': bool(profile.phone_number),
                'address': bool(profile.address),
                'nationality': bool(profile.nationality),
                'registration_number': bool(profile.registration_number),
                'profile_picture': bool(profile.profile_picture),
            }
        elif target_user.role == 'staff':
            fields = {
                'first_name': bool(target_user.first_name),
                'last_name': bool(target_user.last_name),
                'email': bool(target_user.email),
                'sex': bool(profile.sex),
                'phone_number': bool(profile.phone_number),
                'address': bool(profile.address),
                'date_of_birth': bool(profile.date_of_birth),
                'employee_id': bool(profile.employee_id),
                'profile_picture': bool(profile.profile_picture),
            }
        else:
            fields = {
                'first_name': bool(target_user.first_name),
                'last_name': bool(target_user.last_name),
                'email': bool(target_user.email),
                'phone_number': bool(profile.phone_number),
                'address': bool(profile.address),
            }

        filled = sum(1 for v in fields.values() if v)
        total = len(fields)
        percentage = round((filled / total) * 100) if total > 0 else 0
        missing = [k for k, v in fields.items() if not v]

        return Response({
            'percentage': percentage,
            'filled': filled,
            'total': total,
            'missing': missing,
            'fields': fields,
        })

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


@api_view(['GET', 'PUT', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser])
def student_profile(request):
    target_user = request.user
    student_id = request.query_params.get('student_id')

    if student_id:
        if request.user.role not in ['staff', 'admin']:
            return Response({'error': 'Unauthorized'}, status=403)
        try:
            target_user = User.objects.get(id=student_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

    profile, _ = Profile.objects.get_or_create(user=target_user)

    if request.method == 'POST':
        if 'profile_picture' in request.FILES:
            from ..storage import upload_file
            pic_file = request.FILES['profile_picture']
            try:
                url, error = upload_file(pic_file, bucket_key='profile-pictures',
                                         folder=f"user_{target_user.id}")
                if url:
                    profile.profile_picture = url
                    profile.save()
                    return Response({'message': 'Profile picture updated successfully', 'profile_picture': url})
                else:
                    return Response({'error': error or 'Failed to upload picture to storage.'}, status=500)
            except Exception as e:
                logger.error(f"Error in student_profile POST: {str(e)}", exc_info=True)
                return Response({'error': 'Failed to upload profile picture.'}, status=500)
        return Response({'error': 'No file provided'}, status=400)

    if request.method == 'GET':
        grade_level = profile.grade_level
        if not grade_level:
            enrollment = StudentClassEnrollment.objects.filter(student=target_user).select_related('classroom').first()
            if enrollment:
                import re
                match = re.search(r'Grade\s+\d+', enrollment.classroom.name, re.IGNORECASE)
                if match:
                    grade_level = match.group(0)

        profile_data = {
            'id': target_user.id,
            'username': target_user.username,
            'email': target_user.email,
            'first_name': target_user.first_name,
            'last_name': target_user.last_name,
            'role': target_user.role,
            'must_change_password': target_user.must_change_password,
            'profile': {
                'title': profile.title,
                'sex': profile.sex,
                'state': profile.state,
                'nationality': profile.nationality,
                'middle_name': profile.middle_name,
                'extension_name': profile.extension_name,
                'father_name': profile.father_name,
                'mother_name': profile.mother_name,
                'date_of_birth': profile.date_of_birth,
                'contact_information': profile.contact_information,
                'phone_number': profile.phone_number,
                'address': profile.address,
                'grade_level': grade_level,
                'registration_number': profile.registration_number,
                'lrn': profile.lrn,
                'profile_picture': profile.profile_picture,
                'enrollment_status': profile.enrollment_status,
                'mute_until': profile.mute_until,
                'is_muted': profile.mute_until is not None and profile.mute_until > timezone.now(),
                'is_suspended': profile.is_suspended or target_user.account_status == 'suspended',
                'mother_tongue': profile.mother_tongue,
                'indigenous_people': profile.indigenous_people,
                'religion': profile.religion,
                'emergency_contact_name': profile.emergency_contact_name,
                'emergency_contact_phone': profile.emergency_contact_phone,
                'emergency_contact_relationship': profile.emergency_contact_relationship,
                'medical_alerts': profile.medical_alerts,
            }
        }
        return Response(profile_data)

    elif request.method == 'PUT':
        if target_user != request.user:
            return Response({'error': 'Unauthorized'}, status=403)

        try:
            if 'email' in request.data:
                email_val = request.data.get('email')
                new_email = email_val.strip() if email_val and isinstance(email_val, str) else None

                if new_email:
                    if User.objects.filter(email=new_email).exclude(id=target_user.id).exists():
                        return Response({'error': 'Email already in use'}, status=400)
                    target_user.email = new_email
                else:
                    target_user.email = None

            if 'first_name' in request.data:
                target_user.first_name = request.data['first_name']
            if 'last_name' in request.data:
                target_user.last_name = request.data['last_name']
            target_user.save()

            profile_fields = [
                'title', 'sex', 'state', 'nationality', 'middle_name',
                'father_name', 'mother_name', 'phone_number', 'address',
                'contact_information', 'grade_level'
            ]

            for field in profile_fields:
                if field in request.data:
                    val = request.data[field]
                    if not val or (isinstance(val, str) and not val.strip()):
                        val = None
                    setattr(profile, field, val)

            if 'registration_number' in request.data:
                val = request.data['registration_number']
                if not val or (isinstance(val, str) and not val.strip()):
                    val = None
                if val != profile.registration_number:
                    if val and Profile.objects.filter(registration_number=val).exclude(pk=profile.pk).exists():
                        return Response({'error': 'This LRN is already assigned to another student.'}, status=400)
                    profile.registration_number = val
                    profile.lrn = val

            if 'date_of_birth' in request.data:
                dob_val = request.data['date_of_birth']
                if dob_val:
                    from datetime import datetime
                    try:
                        if isinstance(dob_val, str):
                            profile.date_of_birth = datetime.strptime(dob_val, '%Y-%m-%d').date()
                    except (ValueError, TypeError):
                        pass
                else:
                    profile.date_of_birth = None

            profile.save()

            try:
                log_audit_action(
                    user=request.user,
                    action='update',
                    model_name='Profile',
                    object_id=profile.id,
                    object_repr=str(target_user),
                    description=f'User {target_user.username} updated their profile',
                    request=request
                )
            except Exception as audit_exc:
                logger.warning(f"Audit log failed for profile update: {audit_exc}")

            return Response({'message': 'Profile updated successfully'})

        except Exception as e:
            import traceback
            logger.error(f"Error updating profile for user {target_user.username}: {str(e)}\n{traceback.format_exc()}")
            return Response({'error': 'Failed to update profile. Please check your input.'}, status=500)