from rest_framework import serializers
from .models import Announcement, SchoolClass, Department, AcademicYear as PortalAcademicYear, DatabaseBackup
from accounts.models import AuditLog, AcademicYear, Semester
from accounts.serializers import UserSerializer, full_name


class AnnouncementSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    
    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content', 'created_at', 'updated_at', 'is_active', 'author']
        read_only_fields = ['created_at', 'updated_at']


class SchoolClassSerializer(serializers.ModelSerializer):
    adviser = UserSerializer(read_only=True)
    student_count = serializers.ReadOnlyField()
    
    class Meta:
        model = SchoolClass
        fields = ['id', 'name', 'grade_level', 'section', 'adviser', 'capacity', 'student_count', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class DepartmentSerializer(serializers.ModelSerializer):
    head = UserSerializer(read_only=True)
    
    class Meta:
        model = Department
        fields = ['id', 'name', 'code', 'head', 'description', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ['id', 'name', 'start_date', 'end_date', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class SemesterSerializer(serializers.ModelSerializer):
    academic_year_name = serializers.ReadOnlyField(source='academic_year.name')
    
    class Meta:
        model = Semester
        fields = ['id', 'academic_year', 'academic_year_name', 'name', 'semester_type', 'start_date', 'end_date', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'user_name', 'user_email', 'action', 'action_type', 'model_name', 'object_id', 'object_repr', 'description', 'ip_address', 'user_agent', 'timestamp']
        read_only_fields = ['timestamp']

    def get_user_name(self, obj):
        return full_name(obj.user) if obj.user else 'System'


class DatabaseBackupSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    
    class Meta:
        model = DatabaseBackup
        fields = ['id', 'filename', 'size', 'created_at', 'created_by']
        read_only_fields = ['created_at']
