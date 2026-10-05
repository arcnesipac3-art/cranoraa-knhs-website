"""User management views: UserViewSet, admin create, profile views."""
from rest_framework import viewsets, status, filters, parsers
from rest_framework.decorators import api_view, permission_classes, action, parser_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.utils import timezone
from django.db.models import Q
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.utils.dateparse import parse_date
import logging
import re
import csv
import io
import datetime
from django.db import transaction

from ..serializers import UserSerializer
from ..models import User, Profile, Classroom, StudentClassEnrollment, EnrollmentApplication
from ..models import AcademicYear as AccountsAcademicYear
from ..permissions import IsAdmin, IsAdminOrStaff
from ..throttles import CsvImportRateThrottle
from ..utils import log_audit_action, generate_temp_password
from ..pagination import UserPagination
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
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    # Directory search covers the identifiers people actually look students up
    # by: name, username/LRN, email, employee id and the registration number.
    search_fields = ['username', 'email', 'first_name', 'last_name', 'profile__employee_id',
                     'profile__lrn', 'profile__registration_number']
    pagination_class = UserPagination
    # Allow-list: only directory-relevant columns are sortable.
    ordering_fields = ['username', 'first_name', 'last_name', 'profile__grade_level',
                       'profile__enrollment_status', 'profile__sex', 'account_status',
                       'staff_title', 'email', 'date_joined']

    def get_queryset(self):
        try:
            user = self.request.user
            role = self.request.query_params.get('role')
            queryset = User.objects.all().select_related('profile').prefetch_related('departments').order_by('-date_joined')

            is_user_admin = (
                user.role == 'admin'
                or getattr(user, 'is_admin', False)
                or getattr(user, 'is_superuser', False)
            )

            if not is_user_admin:
                User.objects.filter(role='admin', is_admin=False).exclude(id=user.id).update(role='staff')

            if role in ['student', 'staff']:
                queryset = queryset.filter(is_approved=True)

            # `include_inactive=1` relaxes the is_active gate so the People
            # directories can still show (and un-suspend) suspended or
            # disabled accounts. Admin-only: staff/student/parent callers — and
            # the faculty and parent pickers that share these params — keep the
            # old, active-only behaviour.
            include_inactive = (
                is_user_admin
                and str(self.request.query_params.get('include_inactive', '')).lower()
                in ('1', 'true', 'yes')
            )

            if role == 'admin':
                queryset = queryset.filter(role='admin', is_active=True)
            elif role == 'staff':
                scope = Q(role='staff') | Q(role='admin')
                if not include_inactive:
                    scope &= Q(is_active=True)
                queryset = queryset.filter(scope)
            elif role == 'parent':
                scope = Q(role='parent')
                if not include_inactive:
                    scope &= Q(is_active=True)
                queryset = queryset.filter(scope)
            # For students/parents viewing teachers (directory), return all active staff
            elif role is None and user.role in ['student', 'parent']:
                queryset = queryset.filter(
                    Q(role='staff', is_active=True) |
                    Q(role='admin', is_active=True)
                )
            elif is_user_admin:
                # `?role=student` must actually mean students. The admin path
                # used to return every approved user, so each caller had to
                # re-filter role client-side.
                if role:
                    queryset = queryset.filter(role=role)
            elif user.role == 'student':
                queryset = queryset.filter(id=user.id)
            elif user.role == 'parent':
                profile = getattr(user, 'profile', None)
                if profile:
                    try:
                        linked_student_ids = profile.linked_students.values_list('id', flat=True)
                        queryset = queryset.filter(Q(id__in=linked_student_ids) | Q(id=user.id))
                    except Exception:
                        queryset = queryset.filter(id=user.id)
                else:
                    queryset = queryset.filter(id=user.id)
            elif user.role == 'staff':
                if user.staff_title in ('registrar', 'guidance_counselor'):
                    # Registrar / guidance manage the whole student directory.
                    # The department module gate (VIEWSET_MODULES 'people')
                    # still applies on top, and teachers keep advisory scoping.
                    if role == 'student':
                        queryset = queryset.filter(role='student')
                    else:
                        queryset = (queryset.filter(role='student') | queryset.filter(id=user.id)).distinct()
                else:
                    advisory_students = queryset.filter(enrollments__classroom__teacher=user)

                    if role == 'student':
                        queryset = advisory_students.distinct()
                    else:
                        queryset = (advisory_students | queryset.filter(id=user.id)).distinct()
            elif role:
                queryset = queryset.filter(role=role)

            return self._apply_directory_filters(queryset)
        except DRFValidationError:
            # Bad query parameters must answer 400, not degrade into an
            # accidental "only me" queryset.
            raise
        except Exception as e:
            logger.error(f"UserViewSet queryset error: {str(e)}")
            return User.objects.filter(id=self.request.user.id) if self.request.user.is_authenticated else User.objects.none()

    def _apply_directory_filters(self, queryset):
        """Optional student-directory filters (all additive, applied last).

        Runs after the role/scope branches so every caller is filtered the same
        way *within their own scope*. Only filters backed by real model fields
        are supported: grade, section (classroom), student status, sex, account
        status, academic year, adviser and account-created date range.
        """
        params = self.request.query_params
        role = params.get('role')
        used_enrollment_join = False

        grade = params.get('grade')
        if grade:
            # profile.grade_level is the cached copy; the enrollment join also
            # matches students whose profile row was never backfilled. Values
            # are stored both as bare digits ("12") and with the word
            # ("Grade 12") depending on the flow that wrote them, so a digit
            # filter matches both spellings.
            grade_variants = [grade]
            if str(grade).isdigit():
                grade_variants.append(f'Grade {grade}')
            grade_q = Q()
            for variant in grade_variants:
                grade_q |= Q(profile__grade_level=variant)
                grade_q |= Q(enrollments__classroom__grade_level=variant)
            queryset = queryset.filter(grade_q)
            used_enrollment_join = True

        section = params.get('section')
        if section and section.isdigit():
            queryset = queryset.filter(enrollments__classroom_id=section)
            used_enrollment_join = True

        student_status = params.get('status')
        if student_status:
            queryset = queryset.filter(profile__enrollment_status=student_status)

        sex = params.get('sex')
        if sex:
            queryset = queryset.filter(profile__sex__iexact=sex)

        account_status = params.get('account_status')
        if account_status:
            queryset = queryset.filter(account_status=account_status)

        academic_year = params.get('academic_year')
        if academic_year and academic_year.isdigit():
            # Students sectioned in the viewed year, plus students with no
            # section anywhere yet (pending intake) so they stay actionable.
            # Students known only from other years stay out of the view.
            queryset = queryset.filter(
                Q(enrollments__classroom__academic_year_id=academic_year) |
                Q(enrollments__isnull=True)
            )
            used_enrollment_join = True

        adviser = params.get('adviser')
        if adviser and adviser.isdigit():
            queryset = queryset.filter(enrollments__classroom__teacher_id=adviser)
            used_enrollment_join = True

        date_from = params.get('date_from')
        if date_from:
            if parse_date(date_from) is None:
                raise DRFValidationError({'date_from': 'Use format YYYY-MM-DD.'})
            queryset = queryset.filter(date_joined__date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            if parse_date(date_to) is None:
                raise DRFValidationError({'date_to': 'Use format YYYY-MM-DD.'})
            queryset = queryset.filter(date_joined__date__lte=date_to)

        if used_enrollment_join:
            queryset = queryset.distinct()

        # Staff-specific filters (only meaningful when the view is scoped to staff)
        if role in ('staff', 'admin'):
            department = params.get('department')
            if department and department.isdigit():
                queryset = queryset.filter(departments__id=department).distinct()

            staff_title = params.get('staff_title')
            if staff_title:
                queryset = queryset.filter(staff_title=staff_title)

            additional_role = params.get('additional_role')
            if additional_role:
                queryset = queryset.filter(additional_roles__icontains=additional_role)

        # Parent-specific filters
        if role == 'parent':
            has_children = params.get('has_children')
            if has_children == 'true':
                queryset = queryset.filter(profile__linked_students__isnull=False).distinct()
            elif has_children == 'false':
                queryset = queryset.filter(profile__linked_students__isnull=True)

        return queryset

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

        reason = (request.data.get('reason') or '').strip()

        is_active = new_status not in ['suspended', 'inactive']
        queryset.update(account_status=new_status, is_active=is_active)

        try:
            reason_note = f' — {reason}' if reason else ''
            log_audit_action(
                user=request.user,
                action='update',
                model_name='User',
                object_id=None,
                object_repr=f'Bulk status update to {new_status}',
                description=f'{request.user.role.capitalize()} changed status to {new_status} for {count} users{reason_note}',
                request=request
            )
        except Exception:
            pass

        return Response({'status': f'Updated {count} users to {new_status}', 'reason': reason})

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

        reason = (request.data.get('reason') or '').strip()

        user.account_status = status_val
        if status_val in ['suspended', 'inactive']:
            user.is_active = False
        else:
            user.is_active = True
        user.save()

        try:
            reason_note = f' — {reason}' if reason else ''
            log_audit_action(
                user=request.user,
                action='update',
                model_name='User',
                object_id=user.id,
                object_repr=str(user),
                description=f'{request.user.role.capitalize()} updated account status to {status_val} for {user.username}{reason_note}',
                request=request
            )
        except Exception as audit_exc:
            logger.warning(f"Audit log failed for update_status: {audit_exc}")

        return Response({
            'status': f'User account status updated to {status_val}',
            'account_status': user.account_status,
            'is_active': user.is_active,
            'reason': reason
        })

    @action(detail=True, methods=['post'], url_path='update-enrollment-status')
    def update_enrollment_status(self, request, pk=None):
        """Change a student's record status (Profile.enrollment_status).

        Kept separate from `update_status`, which changes the *account* status
        — the two are different facts about a person (§12: student status vs
        account status). A reason is required, matching the existing withdraw/
        remove flows, and it lands in the audit entry.
        """
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=403)

        student = self.get_object()
        if student.role != 'student':
            return Response({'error': 'Only students have a student status'}, status=400)

        if request.user.role == 'staff' and getattr(request.user, 'staff_title', None) not in (
            'registrar', 'guidance_counselor'
        ):
            is_advisory_student = StudentClassEnrollment.objects.filter(
                student=student,
                classroom__teacher=request.user
            ).exists()
            if not is_advisory_student:
                return Response(
                    {'error': 'You can only change status for students in your advisory classroom.'},
                    status=403
                )

        new_status = request.data.get('status')
        valid_statuses = [choice[0] for choice in Profile.ENROLLMENT_STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': 'Invalid status', 'choices': valid_statuses}, status=400)

        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'error': 'A reason is required to change a student status'}, status=400)

        profile, _ = Profile.objects.get_or_create(user=student)
        old_status = profile.enrollment_status
        profile.enrollment_status = new_status
        profile.enrollment_status_reason = reason
        profile.save(update_fields=['enrollment_status', 'enrollment_status_reason'])

        try:
            log_audit_action(
                user=request.user,
                action='update',
                model_name='Profile',
                object_id=profile.id,
                object_repr=str(student.username),
                description=(f'{request.user.role.capitalize()} changed student status for '
                             f'{student.username}: {old_status} -> {new_status} ({reason})'),
                request=request
            )
        except Exception as audit_exc:
            logger.warning(f"Audit log failed for update_enrollment_status: {audit_exc}")

        return Response({
            'enrollment_status': profile.enrollment_status,
            'enrollment_status_reason': profile.enrollment_status_reason,
            'previous_status': old_status,
        })

    def _year_start(self, request):
        """Start date of the requested academic year (viewed → active → calendar).

        Shared by the student/staff/parent stats endpoints so "new this year"
        means the same thing in every directory.
        """
        resolved_year = None
        ay_param = request.query_params.get('academic_year')
        if ay_param and str(ay_param).isdigit():
            try:
                from portal.models import AcademicYear as PortalAcademicYear
                resolved_year = PortalAcademicYear.objects.filter(pk=int(ay_param)).first()
            except Exception:
                resolved_year = None
            if resolved_year is None:
                resolved_year = AccountsAcademicYear.objects.filter(pk=int(ay_param)).first()
        if resolved_year is None:
            try:
                from portal.models import AcademicYear as PortalAcademicYear
                resolved_year = PortalAcademicYear.objects.filter(is_active=True, is_archived=False).first()
            except Exception:
                resolved_year = None
        if resolved_year is not None and getattr(resolved_year, 'start_date', None):
            return resolved_year.start_date
        today = timezone.localdate()
        return today.replace(month=1, day=1)

    @action(detail=False, methods=['get'])
    def student_stats(self, request):
        """Directory summary counts over the caller's own scope.

        Always filtered to role=student and approved accounts so the numbers
        match what the directory list itself shows. Pass `academic_year` to
        scope the view (and the pending / new-this-year counts) to a school
        year; without it, every student in scope counts.
        """
        qs = self.get_queryset().filter(role='student', is_approved=True)
        total = qs.count()

        # Pending = current students with no section assigned anywhere yet
        # (retired statuses are excluded so graduates don't look "pending").
        pending = qs.filter(enrollments__isnull=True).exclude(
            profile__enrollment_status__in=['inactive', 'withdrawn', 'transferred', 'dropped', 'graduated']
        ).count()

        # Active = live status AND actually placed in a section. Students with
        # a live status but no section are counted as pending above, so the
        # three buckets are disjoint: active + pending + inactive == total.
        active = qs.filter(
            profile__enrollment_status__in=['active', 'enrolled']
        ).exclude(enrollments__isnull=True).count()

        # Everyone else (inactive / transferred / graduated / dropped /
        # unknown status) counts as not active.
        inactive = total - active - pending

        # "New this year" uses the viewed academic year's start date; fall back
        # to the active school year, then to the calendar year.
        year_start = self._year_start(request)

        new_this_year = qs.filter(date_joined__gte=year_start).count()

        return Response({
            'total': total,
            'active': active,
            'inactive': inactive,
            'pending': pending,
            'new_this_year': new_this_year,
        })

    @action(detail=False, methods=['get'])
    def staff_stats(self, request):
        """Directory summary counts for staff within the caller's scope.

        Defaults to the same `role=staff&include_inactive=1` scope the Staff
        directory list uses, so every card matches what the table shows.
        Callers that omit those params get the equivalent staff-only scope.
        """
        qs = self.get_queryset()
        if request.query_params.get('role') != 'staff':
            qs = qs.filter(is_approved=True).filter(
                Q(role='staff', is_active=True) | Q(role='admin', is_active=True)
            )
        total = qs.count()
        active = qs.filter(account_status='active').count()
        suspended = qs.filter(account_status='suspended').count()
        inactive = qs.filter(account_status='inactive').count()
        pending = qs.filter(account_status='pending_reset').count()

        # By staff title
        title_counts = {}
        for key, label in User.STAFF_TITLE_CHOICES:
            title_counts[key] = qs.filter(staff_title=key).count()

        # "New this year" — same academic year logic as students
        year_start = self._year_start(request)

        new_this_year = qs.filter(date_joined__gte=year_start).count()

        return Response({
            'total': total,
            'active': active,
            'suspended': suspended,
            'inactive': inactive,
            'pending_reset': pending,
            'new_this_year': new_this_year,
            'by_title': title_counts,
        })

    @action(detail=False, methods=['get'])
    def parent_stats(self, request):
        """Directory summary counts for parents within the caller's scope.

        Mirrors the `role=parent` list scope so the cards always agree with
        the table.
        """
        qs = self.get_queryset()
        if request.query_params.get('role') != 'parent':
            qs = qs.filter(role='parent')
            include_inactive = (
                request.user.role == 'admin'
                and str(request.query_params.get('include_inactive', '')).lower()
                in ('1', 'true', 'yes')
            )
            if not include_inactive:
                qs = qs.filter(is_active=True)
        total = qs.count()

        active = qs.filter(account_status='active').count()
        suspended = qs.filter(account_status='suspended').count()
        inactive = qs.filter(account_status='inactive').count()
        pending = qs.filter(account_status='pending_reset').count()

        # Parents with linked children
        with_children = qs.filter(profile__linked_students__isnull=False).distinct().count()

        # "New this year" — same academic year logic
        year_start = self._year_start(request)

        new_this_year = qs.filter(date_joined__gte=year_start).count()

        return Response({
            'total': total,
            'active': active,
            'suspended': suspended,
            'inactive': inactive,
            'pending_reset': pending,
            'with_children': with_children,
            'new_this_year': new_this_year,
        })

    @action(detail=False, methods=['post'], url_path='bulk-update-enrollment-status')
    def bulk_update_enrollment_status(self, request):
        """Change the student status of many students at once (with a reason)."""
        if request.user.role != 'admin' and getattr(request.user, 'staff_title', None) != 'registrar':
            return Response({'error': 'Unauthorized'}, status=403)

        user_ids = request.data.get('user_ids', [])
        if not user_ids:
            return Response({'error': 'No students selected'}, status=400)

        new_status = request.data.get('status')
        valid_statuses = [choice[0] for choice in Profile.ENROLLMENT_STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({'error': 'Invalid status', 'choices': valid_statuses}, status=400)

        reason = (request.data.get('reason') or '').strip()
        if not reason:
            return Response({'error': 'A reason is required to change student statuses'}, status=400)

        students = User.objects.filter(id__in=user_ids, role='student')
        count = students.count()
        if count == 0:
            return Response({'error': 'No students found matching the selection'}, status=400)

        with transaction.atomic():
            # Create missing profile rows first so every selected student
            # actually receives the new status.
            for student in students.filter(profile__isnull=True):
                Profile.objects.create(user=student)
            Profile.objects.filter(user__in=students).update(
                enrollment_status=new_status,
                enrollment_status_reason=reason
            )

        try:
            usernames = list(students.values_list('username', flat=True))
            log_audit_action(
                user=request.user,
                action='update',
                model_name='Profile',
                object_id=None,
                object_repr=f'Bulk student status -> {new_status}',
                description=(f'{request.user.role.capitalize()} changed student status to '
                             f'{new_status} for {count} students ({", ".join(usernames[:10])}'
                             f'{"…" if count > 10 else ""}) — {reason}'),
                request=request
            )
        except Exception as audit_exc:
            logger.warning(f"Audit log failed for bulk status change: {audit_exc}")

        return Response({'updated_count': count, 'status': new_status, 'reason': reason})

    @action(detail=False, methods=['post'], url_path='bulk-assign-section')
    def bulk_assign_section(self, request):
        """Assign many students to one classroom/section in a single action.

        Reuses the same capacity and grade checks as the single assign_section
        action; grade mismatches are reported per student instead of failing
        the whole batch, but insufficient seats reject the batch up front so a
        partial over-fill can never happen.
        """
        if request.user.role != 'admin' and getattr(request.user, 'staff_title', None) != 'registrar':
            return Response({'error': 'Unauthorized'}, status=403)

        user_ids = request.data.get('user_ids', [])
        if not user_ids:
            return Response({'error': 'No students selected'}, status=400)

        classroom_id = request.data.get('classroom_id')
        if not classroom_id:
            return Response({'error': 'classroom_id is required'}, status=400)

        try:
            classroom = Classroom.objects.get(id=classroom_id)
        except Classroom.DoesNotExist:
            return Response({'error': 'Classroom not found'}, status=404)

        students = list(
            User.objects.filter(id__in=user_ids, role='student').select_related('profile')
        )
        if not students:
            return Response({'error': 'No students found matching the selection'}, status=400)

        grade_mismatch = []
        to_assign = []
        already = []
        for student in students:
            student_grade = student.profile.grade_level if hasattr(student, 'profile') else None
            if student_grade and _grade_key(classroom.grade_level) != _grade_key(student_grade):
                grade_mismatch.append(student)
                continue
            if StudentClassEnrollment.objects.filter(student=student, classroom=classroom).exists():
                already.append(student)
                continue
            to_assign.append(student)

        if to_assign:
            current_count = StudentClassEnrollment.objects.filter(classroom=classroom).count()
            capacity = classroom.capacity or 40
            free = capacity - current_count
            if len(to_assign) > free:
                return Response({
                    'error': f'{classroom.name} does not have enough seats '
                             f'({free} free of {capacity}, {len(to_assign)} students need one)'
                }, status=400)

        assigned = []
        with transaction.atomic():
            for student in to_assign:
                enrollment = StudentClassEnrollment.objects.create(
                    student=student,
                    classroom=classroom,
                    enrolled_at=timezone.now()
                )
                if hasattr(student, 'profile'):
                    student.profile.grade_level = str(classroom.grade_level)
                    student.profile.save(update_fields=['grade_level'])
                assigned.append(student)

        try:
            log_audit_action(
                user=request.user,
                action='update',
                model_name='StudentClassEnrollment',
                object_id=None,
                object_repr=f'Bulk assign {len(assigned)} students -> {classroom.name}',
                description=(
                    f'{request.user.role.capitalize()} bulk assigned {len(assigned)} students '
                    f'to {classroom.name}'
                    + (f' ({len(already)} already enrolled)' if already else '')
                    + (f' ({len(grade_mismatch)} skipped: grade mismatch)' if grade_mismatch else '')
                ),
                request=request
            )
        except Exception as audit_exc:
            logger.warning(f"Audit log failed for bulk_assign_section: {audit_exc}")

        return Response({
            'classroom': {
                'id': classroom.id,
                'name': classroom.name,
                'grade_level': classroom.grade_level,
            },
            'assigned_count': len(assigned),
            'assigned': [{'id': s.id, 'username': s.username} for s in assigned],
            'already_enrolled': [{'id': s.id, 'username': s.username} for s in already],
            'skipped': [
                {
                    'id': s.id,
                    'username': s.username,
                    'error': (f'Grade level mismatch: classroom is Grade {classroom.grade_level}, '
                              f'student is Grade {s.profile.grade_level if hasattr(s, "profile") and s.profile.grade_level else "Unassigned"}'),
                }
                for s in grade_mismatch
            ],
        })

    @action(detail=True, methods=['post'], url_path='update-roles')
    def update_roles(self, request, pk=None):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can change roles'}, status=403)

        user = self.get_object()
        if user.role != 'staff' and not (user.is_admin and user.staff_title):
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
        is_user_admin = (
            user_role == 'admin'
            or getattr(request.user, 'is_admin', False)
            or getattr(request.user, 'is_superuser', False)
        )
        if not is_user_admin and user_role != 'staff':
            return Response({'error': 'Unauthorized'}, status=403)

        user = self.get_object()

        if not is_user_admin and user_role == 'staff':
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
            # Advisory teachers import for their own classroom; the registrar
            # imports school-wide (mirrors directory read scope).
            is_registrar = getattr(request.user, 'staff_title', None) == 'registrar'
            if not is_registrar:
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

        # One validation pass feeds both modes: a dry run (preview) and a real
        # import can never disagree about which rows are importable, so invalid
        # records are never silently created.
        dry_run = str(request.data.get('dry_run', '')).lower() in ('1', 'true', 'yes')

        created_count = 0
        created_users = []
        errors = []       # flat strings (legacy shape, consumed by current UI)
        row_errors = []   # [{'row': n, 'message': ...}] for the import wizard
        row_warnings = [] # [{'row': n, 'message': ...}] — importable but flagged
        plan = []

        def fail(row_no, message):
            errors.append(f'Row {row_no}: {message}')
            row_errors.append({'row': row_no, 'message': message})

        def warn(row_no, message):
            row_warnings.append({'row': row_no, 'message': message})

        rows = list(reader)

        email_values = [(r.get('Email') or r.get('email') or '').strip() for r in rows]
        email_values = [e for e in email_values if e]
        existing_emails = set(
            User.objects.filter(email__in=email_values).values_list('email', flat=True)
        ) if email_values else set()

        id_values = [str(r.get('Student ID') or r.get('username') or '').strip() for r in rows]
        id_values = [v for v in id_values if v]
        existing_usernames = set(
            User.objects.filter(username__in=id_values).values_list('username', flat=True)
        ) if id_values else set()

        seen_ids = {}

        for idx, row in enumerate(rows, start=1):
            try:
                student_id = row.get('Student ID') or row.get('username')
                if not student_id:
                    fail(idx, 'Missing Student ID for a row')
                    continue
                student_id = str(student_id).strip()

                if len(student_id) != 12 or not student_id.isdigit():
                    fail(idx, f'Invalid LRN {student_id}: Must be exactly 12 digits')
                    continue

                if student_id in seen_ids:
                    fail(idx, f'Duplicate LRN {student_id} in this file '
                              f'(first seen in row {seen_ids[student_id]})')
                    continue
                seen_ids[student_id] = idx

                email = row.get('Email') or row.get('email')
                email = email.strip() if email else None
                if not email:
                    email = None
                if email and email in existing_emails:
                    fail(idx, f'Email {email} already exists')
                    continue

                first_name = (row.get('First Name') or '').strip()
                last_name = (row.get('Last Name') or '').strip()
                if not first_name and not last_name:
                    fail(idx, 'First Name or Last Name is required')
                    continue

                grade_level = (row.get('Grade Level') or '').strip()
                if advisory_classroom and not grade_level:
                    grade_level = advisory_classroom.grade_level or ''
                if not grade_level:
                    warn(idx, 'Missing grade level')

                sex = row.get('Sex') or row.get('sex') or ''
                if sex:
                    sex = sex.lower().strip()
                    if sex not in ['male', 'female']:
                        warn(idx, f'Unrecognized sex "{sex}" — left blank')
                        sex = None
                else:
                    sex = None

                if student_id in existing_usernames:
                    fail(idx, f'Student ID {student_id} already exists')
                    continue

                plan.append({
                    'row': idx,
                    'student_id': student_id,
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'grade_level': grade_level,
                    'sex': sex,
                })
            except Exception as e:
                fail(idx, f'Error importing {row.get("Student ID")}: {str(e)}')

        if dry_run:
            # Preview only: nothing is written and no audit entry is made.
            return Response({
                'status': 'success',
                'dry_run': True,
                'created_count': 0,
                'created_users': [],
                'valid_count': len(plan),
                'errors': errors,
                'row_errors': row_errors,
                'row_warnings': row_warnings,
                'preview': [
                    {
                        'row': p['row'],
                        'student_id': p['student_id'],
                        'first_name': p['first_name'],
                        'last_name': p['last_name'],
                        'name': f"{p['first_name']} {p['last_name']}".strip(),
                        'email': p['email'],
                        'grade_level': p['grade_level'],
                        'sex': p['sex'],
                        'has_warnings': any(w['row'] == p['row'] for w in row_warnings),
                    }
                    for p in plan
                ],
            })

        for entry in plan:
            try:
                student_id = entry['student_id']
                temp_password = generate_temp_password()

                with transaction.atomic():
                    user = User(
                        username=student_id,
                        email=entry['email'],
                        first_name=entry['first_name'],
                        last_name=entry['last_name'],
                        role='student',
                        is_approved=True,
                        is_verified=True if entry['email'] else False,
                        must_change_password=True,
                        account_status='active'
                    )
                    user.set_password(temp_password)
                    user.save()

                    Profile.objects.update_or_create(
                        user=user,
                        defaults={
                            'lrn': student_id,
                            'grade_level': entry['grade_level'],
                            'sex': entry['sex']
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
                    'name': f"{entry['first_name']} {entry['last_name']}".strip()
                })
            except Exception as e:
                fail(entry['row'], f"Error importing {entry['student_id']}: {str(e)}")

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
            'dry_run': False,
            'created_count': created_count,
            'created_users': created_users,
            'valid_count': len(plan),
            'errors': errors,
            'row_errors': row_errors,
            'row_warnings': row_warnings
        })

    @action(detail=False, methods=['post'], throttle_classes=[CsvImportRateThrottle])
    def import_teachers_csv(self, request):
        """Import staff accounts (teachers, admin, etc.) from CSV.

        Supports `dry_run` for preview: validates all rows, returns row-indexed
        errors/warnings and a preview of valid rows. Writes nothing in dry run.
        """
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

        dry_run = str(request.data.get('dry_run', '')).lower() in ('1', 'true', 'yes')

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
        row_errors = []
        row_warnings = []
        plan = []

        def fail(row_no, message):
            errors.append(f'Row {row_no}: {message}')
            row_errors.append({'row': row_no, 'message': message})

        def warn(row_no, message):
            row_warnings.append({'row': row_no, 'message': message})

        rows = list(reader)

        email_values = [(r.get('Email') or r.get('email') or '').strip() for r in rows]
        email_values = [e for e in email_values if e]
        existing_emails = set(
            User.objects.filter(email__in=email_values).values_list('email', flat=True)
        ) if email_values else set()
        seen_emails = {}

        for idx, row in enumerate(rows, start=1):
            try:
                email = row.get('Email') or row.get('email')
                if not email:
                    fail(idx, 'Missing Email for a row')
                    continue
                email = email.strip()
                if email in existing_emails:
                    fail(idx, f'Email {email} already exists')
                    continue
                if email in seen_emails:
                    fail(idx, f'Duplicate Email {email} in this file '
                              f'(first seen in row {seen_emails[email]})')
                    continue
                seen_emails[email] = idx

                title = (row.get('Title') or '').strip()
                first_name = (row.get('First Name') or '').strip()
                last_name = (row.get('Last Name') or '').strip()
                if not first_name and not last_name:
                    fail(idx, 'First Name or Last Name is required')
                    continue

                sex = row.get('Sex') or row.get('sex') or ''
                if sex:
                    sex = sex.lower().strip()
                    if sex not in ['male', 'female']:
                        warn(idx, f'Unrecognized sex "{sex}" — left blank')
                        sex = None
                else:
                    sex = None

                staff_title = (row.get('Staff Title') or 'teacher').strip().lower()
                valid_titles = [t[0] for t in User.STAFF_TITLE_CHOICES]
                if staff_title not in valid_titles:
                    warn(idx, f'Unrecognized staff title "{staff_title}" — defaulting to teacher')
                    staff_title = 'teacher'

                plan.append({
                    'row': idx,
                    'email': email,
                    'title': title,
                    'first_name': first_name,
                    'last_name': last_name,
                    'sex': sex,
                    'staff_title': staff_title,
                })
            except Exception as e:
                fail(idx, f'Error preparing row: {str(e)}')

        if dry_run:
            # Preview only: nothing is written and no audit entry is made.
            return Response({
                'status': 'success',
                'dry_run': True,
                'created_count': 0,
                'created_users': [],
                'valid_count': len(plan),
                'errors': errors,
                'row_errors': row_errors,
                'row_warnings': row_warnings,
                'preview': [
                    {
                        'row': p['row'],
                        'email': p['email'],
                        'name': f"{p['title']} {p['first_name']} {p['last_name']}".strip(),
                        'staff_title': p['staff_title'],
                        'has_warnings': any(w['row'] == p['row'] for w in row_warnings),
                    }
                    for p in plan
                ],
            })

        for entry in plan:
            try:
                temp_password = generate_temp_password()

                with transaction.atomic():
                    user = User(
                        username=entry['email'],
                        email=entry['email'],
                        first_name=entry['first_name'],
                        last_name=entry['last_name'],
                        role='staff',
                        staff_title=entry['staff_title'],
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
                            'title': entry['title'],
                            'sex': entry['sex']
                        }
                    )

                created_count += 1
                created_users.append({
                    'username': entry['email'],
                    'password': temp_password,
                    'name': f"{entry['title']} {entry['first_name']} {entry['last_name']}".strip()
                })
            except Exception as e:
                fail(entry['row'], f"Error importing {entry['email']}: {str(e)}")

        try:
            log_audit_action(
                user=request.user,
                action='create',
                model_name='User',
                object_id=None,
                object_repr=f'CSV import {created_count} staff',
                description=f'{request.user.role.capitalize()} imported {created_count} staff via CSV with {len(errors)} errors',
                request=request
            )
        except Exception as audit_exc:
            logger.warning(f"Audit log failed for staff CSV import: {audit_exc}")

        return Response({
            'status': 'success',
            'dry_run': False,
            'created_count': created_count,
            'created_users': created_users,
            'valid_count': len(plan),
            'errors': errors,
            'row_errors': row_errors,
            'row_warnings': row_warnings
        })

    @action(detail=False, methods=['post'], throttle_classes=[CsvImportRateThrottle])
    def import_parents_csv(self, request):
        """Import parent accounts from CSV.

        Supports `dry_run` for preview: validates all rows, returns row-indexed
        errors/warnings and a preview of valid rows. Writes nothing in dry run.
        """
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

        dry_run = str(request.data.get('dry_run', '')).lower() in ('1', 'true', 'yes')

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
        row_errors = []
        row_warnings = []
        plan = []

        def fail(row_no, message):
            errors.append(f'Row {row_no}: {message}')
            row_errors.append({'row': row_no, 'message': message})

        def warn(row_no, message):
            row_warnings.append({'row': row_no, 'message': message})

        rows = list(reader)

        email_values = [(r.get('Email') or r.get('email') or '').strip() for r in rows]
        email_values = [e for e in email_values if e]
        existing_emails = set(
            User.objects.filter(email__in=email_values).values_list('email', flat=True)
        ) if email_values else set()
        seen_emails = {}

        for idx, row in enumerate(rows, start=1):
            try:
                email = row.get('Email') or row.get('email')
                if not email:
                    fail(idx, 'Missing Email for a row')
                    continue
                email = email.strip()
                if email in existing_emails:
                    fail(idx, f'Email {email} already exists')
                    continue
                if email in seen_emails:
                    fail(idx, f'Duplicate Email {email} in this file '
                              f'(first seen in row {seen_emails[email]})')
                    continue
                seen_emails[email] = idx

                first_name = (row.get('First Name') or '').strip()
                last_name = (row.get('Last Name') or '').strip()
                if not first_name and not last_name:
                    fail(idx, 'First Name or Last Name is required')
                    continue

                password = row.get('Password') or None

                plan.append({
                    'row': idx,
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'password': password,
                })
            except Exception as e:
                fail(idx, f'Error preparing row: {str(e)}')

        if dry_run:
            return Response({
                'status': 'success',
                'dry_run': True,
                'created_count': 0,
                'created_users': [],
                'valid_count': len(plan),
                'errors': errors,
                'row_errors': row_errors,
                'row_warnings': row_warnings,
                'preview': [
                    {
                        'row': p['row'],
                        'email': p['email'],
                        'name': f"{p['first_name']} {p['last_name']}".strip(),
                        'has_warnings': False,
                    }
                    for p in plan
                ],
            })

        for entry in plan:
            try:
                temp_password = entry['password'] or generate_temp_password()

                with transaction.atomic():
                    user = User(
                        username=entry['email'],
                        email=entry['email'],
                        first_name=entry['first_name'],
                        last_name=entry['last_name'],
                        role='parent',
                        is_approved=True,
                        is_verified=False,
                        must_change_password=True,
                        account_status='active'
                    )
                    user.set_password(temp_password)
                    user.save()

                created_count += 1
                created_users.append({
                    'username': entry['email'],
                    'password': temp_password,
                    'name': f"{entry['first_name']} {entry['last_name']}".strip()
                })
            except Exception as e:
                fail(entry['row'], f"Error importing {entry['email']}: {str(e)}")

        try:
            log_audit_action(
                user=request.user,
                action='create',
                model_name='User',
                object_id=None,
                object_repr=f'CSV import {created_count} parents',
                description=f'{request.user.role.capitalize()} imported {created_count} parents via CSV with {len(errors)} errors',
                request=request
            )
        except Exception as audit_exc:
            logger.warning(f"Audit log failed for parent CSV import: {audit_exc}")

        return Response({
            'status': 'success',
            'dry_run': False,
            'created_count': created_count,
            'created_users': created_users,
            'valid_count': len(plan),
            'errors': errors,
            'row_errors': row_errors,
            'row_warnings': row_warnings
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
        if not request.user.is_authenticated or not (
            request.user.role == 'admin'
            or getattr(request.user, 'is_admin', False)
            or getattr(request.user, 'is_superuser', False)
        ):
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
        if not request.user.is_authenticated or not (
            request.user.role == 'admin'
            or getattr(request.user, 'is_admin', False)
            or getattr(request.user, 'is_superuser', False)
        ):
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
    def toggle_admin(self, request, pk=None):
        """Toggle admin privileges on a user. Admin-only."""
        if not request.user.is_authenticated or not (
            request.user.role == 'admin'
            or getattr(request.user, 'is_admin', False)
            or getattr(request.user, 'is_superuser', False)
        ):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        user = self.get_object()

        user.is_admin = not user.is_admin
        update_fields = ['is_admin']

        if not user.is_admin and user.role == 'admin':
            user.role = 'staff'
            update_fields.append('role')

        user.save(update_fields=update_fields)

        status_str = 'granted admin privileges' if user.is_admin else 'revoked admin privileges'
        try:
            log_audit_action(
                user=request.user,
                action='update',
                model_name='User',
                object_id=user.id,
                object_repr=str(user),
                description=f'Admin {status_str} for user: {user.email}',
                request=request
            )
        except Exception as audit_exc:
            logger.warning(f"Audit log failed for toggle_admin: {audit_exc}")

        return Response({
            'status': f'User {status_str} successfully',
            'is_admin': user.is_admin,
            'role': user.role,
        })

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if not request.user.is_authenticated or not (
            request.user.role == 'admin'
            or getattr(request.user, 'is_admin', False)
            or getattr(request.user, 'is_superuser', False)
        ):
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
            return Response({'error': 'Unable to approve account. The account may have been modified.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if not request.user.is_authenticated or not (
            request.user.role == 'admin'
            or getattr(request.user, 'is_admin', False)
            or getattr(request.user, 'is_superuser', False)
        ):
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
            return Response({'error': 'Unable to reject account. The account may have been modified.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
            return Response({'error': 'Failed to update profile. Please verify all fields and try again.'}, status=500)