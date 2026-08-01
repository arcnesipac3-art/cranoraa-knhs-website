from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from ..models import Profile, StudentClassEnrollment, Classroom
from ._base import full_name

User = get_user_model()


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

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'first_name', 'last_name', 'full_name',
                  'role', 'staff_title', 'additional_roles', 'is_verified', 'is_approved', 'is_online', 'profile',
                  'must_change_password', 'account_status',
                  'is_adviser']

    def get_full_name(self, obj):
        return full_name(obj)

    def get_is_adviser(self, obj):
        if obj.role == 'staff' and obj.staff_title == 'advisory':
            return Classroom.objects.filter(teacher=obj).exists()
        if obj.role == 'staff' and obj.staff_title == 'teacher':
            return Classroom.objects.filter(teacher=obj).exists()
        return False

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
