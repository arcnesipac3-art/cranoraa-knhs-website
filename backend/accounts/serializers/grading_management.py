from rest_framework import serializers

from ..models import GradingPeriod, GradeSubmission, GradeReopeningRequest
from ._base import full_name


class GradingPeriodSerializer(serializers.ModelSerializer):
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    quarter_display = serializers.CharField(source='get_quarter_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_remaining = serializers.IntegerField(read_only=True)
    effective_deadline = serializers.DateField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GradingPeriod
        fields = [
            'id', 'academic_year', 'academic_year_name', 'quarter', 'quarter_display',
            'start_date', 'submission_deadline', 'grace_period_days',
            'status', 'status_display', 'is_manually_opened', 'is_manually_closed',
            'lock_after_approval', 'description',
            'days_remaining', 'effective_deadline', 'is_active',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['status', 'created_by']

    def get_created_by_name(self, obj):
        return full_name(obj.created_by) if obj.created_by else ''


class GradeSubmissionSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    grading_period_quarter = serializers.IntegerField(source='grading_period.quarter', read_only=True)
    grading_period_status = serializers.CharField(source='grading_period.status', read_only=True)
    grading_period_deadline = serializers.DateField(source='grading_period.effective_deadline', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GradeSubmission
        fields = [
            'id', 'teacher', 'teacher_name', 'classroom', 'classroom_name',
            'subject', 'subject_name', 'subject_code',
            'grading_period', 'grading_period_quarter', 'grading_period_status',
            'grading_period_deadline',
            'status', 'status_display',
            'total_students', 'graded_count', 'missing_count', 'completion_percentage',
            'submitted_at', 'reviewed_at', 'approved_at', 'locked_at',
            'reviewed_by', 'reviewed_by_name', 'approved_by', 'approved_by_name',
            'notes', 'rejection_reason',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'teacher', 'total_students', 'graded_count', 'missing_count',
            'completion_percentage', 'submitted_at', 'reviewed_at', 'approved_at',
            'locked_at', 'reviewed_by', 'approved_by',
        ]

    def get_teacher_name(self, obj):
        return full_name(obj.teacher)
    def get_reviewed_by_name(self, obj):
        return full_name(obj.reviewed_by) if obj.reviewed_by else ''
    def get_approved_by_name(self, obj):
        return full_name(obj.approved_by) if obj.approved_by else ''


class GradeSubmissionSummarySerializer(serializers.Serializer):
    quarter = serializers.IntegerField()
    subject_name = serializers.CharField()
    classroom_name = serializers.CharField()
    total_students = serializers.IntegerField()
    average_grade = serializers.FloatField(allow_null=True)
    missing_grades = serializers.IntegerField()
    highest_grade = serializers.FloatField(allow_null=True)
    lowest_grade = serializers.FloatField(allow_null=True)
    validation_passed = serializers.BooleanField()


class GradeReopeningRequestSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    submission_detail = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GradeReopeningRequest
        fields = [
            'id', 'teacher', 'teacher_name', 'submission', 'submission_detail',
            'reason', 'status', 'status_display',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'reviewer_notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['teacher', 'status', 'reviewed_by', 'reviewed_at']

    def get_teacher_name(self, obj):
        return full_name(obj.teacher)
    def get_reviewed_by_name(self, obj):
        return full_name(obj.reviewed_by) if obj.reviewed_by else ''
    def get_submission_detail(self, obj):
        s = obj.submission
        return {
            'id': s.id,
            'classroom_name': s.classroom.name,
            'subject_name': s.subject.name,
            'quarter': s.grading_period.quarter,
            'status': s.status,
        }


class AdminMonitoringSerializer(serializers.Serializer):
    total_teachers = serializers.IntegerField()
    submitted_teachers = serializers.IntegerField()
    pending_teachers = serializers.IntegerField()
    overdue_teachers = serializers.IntegerField()
    completion_percentage = serializers.FloatField()


class TeacherDashboardSerializer(serializers.Serializer):
    active_grading_period = GradingPeriodSerializer(allow_null=True)
    submission_deadline = serializers.DateField(allow_null=True)
    days_remaining = serializers.IntegerField(allow_null=True)
    pending_classes = GradeSubmissionSerializer(many=True)
    submitted_classes = GradeSubmissionSerializer(many=True)
    overdue_classes = GradeSubmissionSerializer(many=True)
    total_pending = serializers.IntegerField()
    total_submitted = serializers.IntegerField()
    total_overdue = serializers.IntegerField()
    total_due_today = serializers.IntegerField()
