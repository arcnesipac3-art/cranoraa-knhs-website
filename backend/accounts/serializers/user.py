from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth import get_user_model
from django.utils import timezone

from ..models import Profile, StudentClassEnrollment, Classroom, Department
from ..roles import Role
from ._base import full_name

User = get_user_model()

# Sentinel so we can tell "field absent" from "field present with value None".
_UNSET = object()


def _is_admin_user(user):
    """True when the user holds admin privileges (mirrors accounts.permissions.IsAdmin)."""
    return bool(
        user
        and user.is_authenticated
        and (
            getattr(user, 'role', None) == Role.ADMIN
            or getattr(user, 'is_admin', False)
            or getattr(user, 'is_superuser', False)
        )
    )


class ProfileSerializer(serializers.ModelSerializer):
    classroom_name = serializers.SerializerMethodField()
    is_muted = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ['id', 'title', 'grade_level', 'classroom_name', 'employee_id', 'phone_number', 'address',
                  'date_of_birth', 'registration_number', 'lrn', 'sex', 'state',
                  'nationality', 'middle_name', 'father_name', 'mother_name', 'contact_information',
                  'linked_students', 'profile_picture', 'mute_until', 'is_muted', 'is_suspended',
                  'enrollment_status', 'enrollment_status_reason']
        # Directory display only: LRN comes from creation/import flows, and the
        # student status only changes through update_enrollment_status, which
        # requires a reason and writes the audit entry.
        read_only_fields = ['lrn', 'enrollment_status', 'enrollment_status_reason']

    def get_is_muted(self, obj):
        return obj.mute_until is not None and obj.mute_until > timezone.now()

    def get_classroom_name(self, obj):
        try:
            enrollment = StudentClassEnrollment.objects.filter(student=obj.user).select_related('classroom').first()
            if enrollment and enrollment.classroom:
                return enrollment.classroom.name
        except Exception:
            pass
        return None


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(required=False)
    full_name = serializers.SerializerMethodField()
    is_online = serializers.BooleanField(read_only=True)
    is_adviser = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    # Canonical multi-department membership (M2M). `department` / `department_name`
    # stay for legacy readers; the server keeps them mirroring the first entry.
    departments = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(), many=True, required=False
    )
    department_names = serializers.SerializerMethodField()
    # The portal modules this account may actually open — the frontend's copy
    # of the backend's decision in accounts.access, so the sidebar and route
    # guard mirror what the API enforces instead of re-deriving it. Read-only:
    # departments can only ever narrow this list, never widen it.
    effective_modules = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'full_name',
                  'role', 'staff_title', 'additional_roles', 'is_verified', 'is_approved', 'is_online', 'profile',
                  'must_change_password', 'account_status', 'is_active', 'date_joined',
                  'department', 'department_name',
                  'departments', 'department_names', 'effective_modules',
                  'is_adviser', 'is_admin']
        # is_active / date_joined are surfaced for the student directory but
        # stay immutable here: account state only changes through the dedicated
        # toggle/status actions (which audit), and date_joined is a record of
        # when the account was created.
        read_only_fields = ['is_active', 'date_joined']

    def get_full_name(self, obj):
        return full_name(obj)

    def get_is_adviser(self, obj):
        if obj.role == 'staff' and obj.staff_title == 'advisory':
            return Classroom.objects.filter(teacher=obj).exists()
        if obj.role == 'staff' and obj.staff_title == 'teacher':
            return Classroom.objects.filter(teacher=obj).exists()
        return False

    def get_department_name(self, obj):
        # Legacy single-value mirror, kept in sync with `departments`.
        return obj.department.name if obj.department else None

    def get_department_names(self, obj):
        names = list(obj.departments.order_by('name').values_list('name', flat=True))
        if names:
            return names
        # Legacy rows written before the M2M backfill ran.
        return [obj.department.name] if obj.department else []

    def get_effective_modules(self, obj):
        # Same function the API gate uses, so the client cannot be shown a
        # module the server would reject (or hide one it would allow).
        from ..access import effective_module_keys
        return sorted(effective_module_keys(obj))

    def validate_department(self, value):
        """Guard department assignment.

        Rules (department membership grants no permissions — it is purely an
        organisational field):
          1. Only an authorized admin may change a user's department.
          2. Students and parents are never assigned to a department.
          3. Archived departments cannot receive new members.
          4. Changing department must never alter `role` / `is_admin`.
        """
        request = self.context.get('request')
        instance = self.instance

        current_id = instance.department_id if instance else None
        new_id = value.id if value is not None else None

        # No actual change → nothing to guard.
        if current_id == new_id:
            return value

        # 1. Read is open (IsAdminOrStaff) but writes require admin.
        if request is None or not _is_admin_user(request.user):
            raise PermissionDenied(
                'Only administrators can change a department assignment.'
            )

        if value is not None:
            # 2. Students and parents are never assigned to a department.
            target_role = instance.role if instance else None
            if target_role in (Role.STUDENT, Role.PARENT):
                raise serializers.ValidationError(
                    'Students and parents cannot be assigned to a department.'
                )

            # 3. No new members for an archived department.
            if not value.is_active:
                raise serializers.ValidationError(
                    f'Department "{value.name}" is archived and cannot receive members.'
                )

        return value

    def validate_departments(self, value):
        """Guard multi-department assignment (the canonical `departments` field).

        Same four rules as the legacy `department` field:
          1. Only an authorized admin may change membership.
          2. Students and parents are never assigned to a department.
          3. Archived departments cannot receive new members.
          4. Membership never alters `role` / `is_admin`.
        """
        request = self.context.get('request')
        instance = self.instance

        if instance is not None:
            current_ids = set(instance.departments.values_list('id', flat=True))
            # Rows written before the M2M backfill may only have the legacy FK.
            if not current_ids and instance.department_id:
                current_ids = {instance.department_id}
        else:
            current_ids = set()

        new_ids = {dept.id for dept in value}
        if current_ids == new_ids:
            return value

        # 1. Read is open (IsAdminOrStaff) but writes require admin.
        if request is None or not _is_admin_user(request.user):
            raise PermissionDenied(
                'Only administrators can change a department assignment.'
            )

        # 2. Students and parents are never assigned to a department.
        target_role = instance.role if instance else None
        if target_role in (Role.STUDENT, Role.PARENT):
            raise serializers.ValidationError(
                'Students and parents cannot be assigned to a department.'
            )

        # 3. No NEW members for archived departments. A department the user is
        #    already in may stay in the payload: keeping a historical membership
        #    is not a new assignment, and rejecting it would make the record
        #    un-editable (or silently drop it) the moment anyone changed an
        #    unrelated membership alongside it.
        for dept in value:
            if not dept.is_active and dept.id not in current_ids:
                raise serializers.ValidationError(
                    f'Department "{dept.name}" is archived and cannot receive members.'
                )

        return value

    def validate(self, attrs):
        """Department changes are organizational only — never touch role."""
        request = self.context.get('request')
        instance = self.instance

        # Which membership field(s) does this payload actually change?
        changed = False

        if 'departments' in attrs:
            new_ids = {dept.id for dept in attrs['departments']}
            if instance is not None:
                old_ids = set(instance.departments.values_list('id', flat=True))
                if not old_ids and instance.department_id:
                    old_ids = {instance.department_id}
            else:
                old_ids = set()
            changed = new_ids != old_ids

        if not changed and 'department' in attrs:
            legacy = attrs['department']
            new_id = legacy.id if legacy is not None else None
            old_id = instance.department_id if instance is not None else None
            changed = new_id != old_id

        if changed:
            if instance is not None:
                if 'role' in attrs and attrs['role'] != instance.role:
                    raise serializers.ValidationError(
                        {'role': 'Role cannot be changed as part of a department update.'}
                    )
                if 'is_admin' in attrs and attrs['is_admin'] != instance.is_admin:
                    raise serializers.ValidationError(
                        {'is_admin': 'Admin status cannot be changed as part of a '
                                     'department update.'}
                    )
            if not _is_admin_user(getattr(request, 'user', None)):
                raise PermissionDenied(
                    'Only administrators can change a department assignment.'
                )

            # Students and parents are never assigned to a department. This also
            # closes the create path, where `instance` is still None.
            target_role = attrs.get('role') or (instance.role if instance else None)
            if target_role in (Role.STUDENT, Role.PARENT):
                non_empty = False
                if 'departments' in attrs:
                    non_empty = len(attrs['departments']) > 0
                elif 'department' in attrs:
                    non_empty = attrs['department'] is not None
                if non_empty:
                    raise serializers.ValidationError(
                        'Students and parents cannot be assigned to a department.'
                    )

        return attrs

    def create(self, validated_data):
        legacy = validated_data.get('department', None)
        instance = super().create(validated_data)

        # Keep the M2M and the legacy FK mirror consistent on the create path.
        if instance.departments.exists():
            if instance.sync_legacy_department():
                instance.save(update_fields=['department'])
        elif legacy is not None:
            instance.departments.set([legacy])
        return instance

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)

        # Membership is many-to-many + a single mirror column, so it cannot go
        # through plain `setattr`.
        departments = validated_data.pop('departments', _UNSET)
        legacy = validated_data.pop('department', _UNSET)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if departments is not _UNSET:
            # Canonical write: replace the set, then refresh the mirror.
            instance.set_departments(departments)
        elif legacy is not _UNSET:
            # Legacy write keeps its old "assignment moves you" meaning: it
            # replaces membership rather than adding to it.
            instance.set_departments([legacy] if legacy is not None else [])

        if profile_data:
            profile, created = Profile.objects.get_or_create(user=instance)
            linked_students = profile_data.pop('linked_students', None)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
            if linked_students is not None:
                profile.linked_students.set(linked_students)

        return instance


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class SimplifiedStudentSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    student_sex = serializers.CharField(source='profile.sex', read_only=True)
    grade_level = serializers.CharField(source='profile.grade_level', read_only=True)
    registration_number = serializers.CharField(source='profile.registration_number', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'full_name', 'email', 'role',
                  'student_sex', 'grade_level', 'registration_number']

    def get_full_name(self, obj):
        return full_name(obj)
