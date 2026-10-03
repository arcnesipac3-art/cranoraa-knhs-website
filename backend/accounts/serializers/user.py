from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth import get_user_model
from django.utils import timezone

from ..models import Profile, StudentClassEnrollment, Classroom
from ..roles import Role
from ._base import full_name

User = get_user_model()


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
                  'date_of_birth', 'registration_number', 'sex', 'state',
                  'nationality', 'middle_name', 'father_name', 'mother_name', 'contact_information',
                  'linked_students', 'profile_picture', 'mute_until', 'is_muted', 'is_suspended']

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

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'full_name',
                  'role', 'staff_title', 'additional_roles', 'is_verified', 'is_approved', 'is_online', 'profile',
                  'must_change_password', 'account_status', 'department', 'department_name',
                  'is_adviser', 'is_admin']

    def get_full_name(self, obj):
        return full_name(obj)

    def get_is_adviser(self, obj):
        if obj.role == 'staff' and obj.staff_title == 'advisory':
            return Classroom.objects.filter(teacher=obj).exists()
        if obj.role == 'staff' and obj.staff_title == 'teacher':
            return Classroom.objects.filter(teacher=obj).exists()
        return False

    def get_department_name(self, obj):
        return obj.department.name if obj.department else None

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

    def validate(self, attrs):
        """Department changes are organizational only — never touch role."""
        request = self.context.get('request')
        instance = self.instance

        if instance is not None and 'department' in attrs:
            new_dept = attrs['department']
            new_id = new_dept.id if new_dept is not None else None
            # Only guard when the assignment actually changes.
            if new_id != instance.department_id:
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

        return attrs

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

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
