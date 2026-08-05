from rest_framework import serializers

from ..models import Grade, GradeReport
from ._base import full_name


class GradeSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_email = serializers.CharField(source='student.email', read_only=True)
    student_sex = serializers.SerializerMethodField()
    student_lrn = serializers.SerializerMethodField()
    student_profile_picture = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    grade_type_display = serializers.CharField(source='get_grade_type_display', read_only=True)
    quarter_display = serializers.CharField(source='get_quarter_display', read_only=True)
    component_display = serializers.CharField(source='get_component_display', read_only=True)
    percentage = serializers.SerializerMethodField()
    has_components = serializers.SerializerMethodField()

    class Meta:
        model = Grade
        fields = [
            'id', 'student', 'student_name', 'student_email', 'student_sex', 'student_lrn', 'student_profile_picture', 'subject',
            'subject_name', 'subject_code', 'classroom', 'classroom_name',
            'teacher', 'teacher_name', 'grade_type', 'grade_type_display',
            'component', 'component_display', 'has_components',
            'quarter', 'quarter_display', 'academic_year', 'raw_score', 'total_score',
            'final_grade', 'remarks', 'computed_remarks',
            'percentage', 'submitted_at', 'updated_at', 'is_locked'
        ]
        read_only_fields = ['computed_remarks', 'teacher']

    def get_student_name(self, obj): return full_name(obj.student)
    def get_teacher_name(self, obj): return full_name(obj.teacher)
    def get_percentage(self, obj): return obj.get_percentage()
    def get_student_sex(self, obj):
        profile = getattr(obj.student, 'profile', None)
        return getattr(profile, 'sex', None) if profile else None
    def get_student_lrn(self, obj):
        profile = getattr(obj.student, 'profile', None)
        return getattr(profile, 'registration_number', None) if profile else None
    def get_has_components(self, obj):
        return hasattr(obj.subject, 'has_components') and obj.subject.has_components
    def get_student_profile_picture(self, obj):
        profile = getattr(obj.student, 'profile', None)
        return getattr(profile, 'profile_picture', None) if profile else None


class GradeReportSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_email = serializers.CharField(source='student.email', read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    quarter_display = serializers.CharField(source='get_quarter_display', read_only=True)
    generated_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GradeReport
        fields = [
            'id', 'student', 'student_name', 'student_email', 'classroom',
            'classroom_name', 'quarter', 'quarter_display', 'school_year',
            'general_average', 'total_subjects', 'passed_subjects',
            'failed_subjects', 'overall_remarks', 'class_rank', 'gpa',
            'status', 'approved_by', 'approved_by_name', 'approved_at',
            'generated_at', 'generated_by', 'generated_by_name', 'is_final'
        ]
        read_only_fields = ['general_average', 'total_subjects',
                            'passed_subjects', 'failed_subjects', 'class_rank', 'gpa']

    def get_student_name(self, obj): return full_name(obj.student)
    def get_generated_by_name(self, obj):
        return full_name(obj.generated_by) if obj.generated_by else ''
    def get_approved_by_name(self, obj):
        return full_name(obj.approved_by) if obj.approved_by else ''
