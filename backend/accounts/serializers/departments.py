from rest_framework import serializers

from ..models import Department, StaffPerformance
from ..modules import (
    MODULE_KEYS,
    effective_module_keys,
    normalize_module_keys,
    ordered,
)
from ..roles import Role
from ._base import full_name


def _is_admin_user(user):
    """True when the user holds admin privileges (any of the existing routes)."""
    return bool(
        user
        and (
            getattr(user, 'role', None) == Role.ADMIN
            or getattr(user, 'is_admin', False)
            or getattr(user, 'is_superuser', False)
        )
    )


def normalize_code(value):
    """Uppercase a department code and collapse all internal whitespace.

    Matches the existing UI, which uppercases the code as it is typed.
    """
    if value is None:
        return value
    return ''.join(str(value).split()).upper()


class DepartmentMemberSerializer(serializers.Serializer):
    """Lightweight user representation for department member lists."""
    id = serializers.IntegerField()
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    full_name = serializers.SerializerMethodField()
    role = serializers.CharField()
    staff_title = serializers.CharField()
    account_status = serializers.CharField()
    profile_picture = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return full_name(obj)

    def get_profile_picture(self, obj):
        profile = getattr(obj, 'profile', None)
        return getattr(profile, 'profile_picture', None) if profile else None


class DepartmentSerializer(serializers.ModelSerializer):
    head_name = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    members = serializers.SerializerMethodField()
    module_count = serializers.SerializerMethodField()
    # Read returns the *effective* grant (null -> every module); write validates
    # the keys against the registry so a typo can never be persisted.
    modules = serializers.ListField(
        child=serializers.CharField(),
        source='module_keys',
        required=False,
        allow_null=True,
    )

    # Declared explicitly (without max_length) so normalization runs *before*
    # the length check in validate_* — otherwise raw input is checked first.
    name = serializers.CharField(required=True, allow_blank=False)
    code = serializers.CharField(required=True, allow_blank=False)

    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'description', 'head', 'head_name',
                  'member_count', 'members', 'modules', 'module_count',
                  'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at']

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError("Department name is required.")
        max_len = Department._meta.get_field('name').max_length
        if len(value) > max_len:
            raise serializers.ValidationError(
                "Department name must be %d characters or fewer." % max_len
            )
        qs = Department.objects.filter(name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A department with this name already exists.")
        return value

    def validate_code(self, value):
        value = normalize_code(value)
        if not value:
            raise serializers.ValidationError("Department code is required.")
        max_len = Department._meta.get_field('code').max_length
        if len(value) > max_len:
            raise serializers.ValidationError(
                "Department code must be %d characters or fewer." % max_len
            )
        qs = Department.objects.filter(code__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A department with this code already exists.")
        return value

    def validate_modules(self, value):
        """Validate portal-module access against the code-side registry.

        ``None`` means "not yet configured" and grants every module; ``[]``
        means the department is explicitly granted nothing.
        """
        if value is None:
            return None
        try:
            return normalize_module_keys(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))

    def validate_head(self, value):
        """Head must be an active, eligible admin/staff account."""
        if value is None:
            return value

        if not value.is_active:
            raise serializers.ValidationError(
                "Department head must be an active account."
            )

        account_status = getattr(value, 'account_status', 'active')
        if account_status in ('inactive', 'suspended'):
            raise serializers.ValidationError(
                "Department head must have an active account status."
            )

        eligible = (
            value.role in (Role.ADMIN, Role.STAFF)
            or getattr(value, 'is_admin', False)
            or getattr(value, 'is_superuser', False)
        )
        if not eligible:
            raise serializers.ValidationError(
                "Department head must be an admin or staff account."
            )

        return value

    def validate(self, attrs):
        """Prevent head assignment on an archived department."""
        if 'is_active' in attrs:
            will_be_active = attrs['is_active']
        elif self.instance is not None:
            will_be_active = self.instance.is_active
        else:
            will_be_active = True

        if 'head' in attrs:
            new_head = attrs['head']
            current_head_id = self.instance.head_id if self.instance else None
            new_head_id = new_head.pk if new_head is not None else None
            assigning_head = new_head_id is not None and new_head_id != current_head_id
            if assigning_head and not will_be_active:
                raise serializers.ValidationError(
                    {'head': 'Cannot assign a head to an archived department. '
                             'Activate the department first.'}
                )

        return attrs

    def get_head_name(self, obj):
        return full_name(obj.head) if obj.head else None

    def get_member_count(self, obj):
        # Use prefetched queryset if available, else query
        if hasattr(obj, '_prefetched_objects_cache') and 'members' in obj._prefetched_objects_cache:
            return len(obj._prefetched_objects_cache['members'])
        return obj.members.count()

    def get_module_count(self, obj):
        keys = effective_module_keys(obj)
        return len(MODULE_KEYS) if keys is None else len(keys)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Always hand the client a concrete list: an unconfigured department
        # grants everything, and the UI should simply show that as all-checked.
        raw = data.get('modules')
        data['modules'] = list(MODULE_KEYS) if raw is None else ordered(raw)
        return data

    def get_members(self, obj):
        # Only include members on detail (retrieve) actions, not list
        request = self.context.get('request')
        if request and request.method == 'GET' and 'pk' in request.parser_context.get('kwargs', {}):
            members = obj.members.select_related('profile').filter(is_active=True)
            return DepartmentMemberSerializer(members, many=True).data
        return []


class StaffPerformanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    evaluated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffPerformance
        fields = ['id', 'staff', 'staff_name', 'academic_year',
                  'evaluated_by', 'evaluated_by_name',
                  'teaching_quality', 'student_engagement', 'classroom_management',
                  'lesson_planning', 'professional_development',
                  'average_student_grade', 'attendance_rate', 'students_passed_pct',
                  'comments', 'overall_rating', 'created_at', 'updated_at']
        read_only_fields = ['overall_rating']

    def get_staff_name(self, obj): return full_name(obj.staff)
    def get_evaluated_by_name(self, obj): return full_name(obj.evaluated_by) if obj.evaluated_by else ''
