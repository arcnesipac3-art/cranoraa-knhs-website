from rest_framework import serializers
from django.utils import timezone
from ._base import full_name
from ..models.compliance import (
    ComplianceType, ComplianceSubmission, ComplianceFile, ComplianceComment,
    ComplianceTypeSubjectAssignment
)


class ComplianceTypeSerializer(serializers.ModelSerializer):
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    assigned_subjects = serializers.SerializerMethodField()

    class Meta:
        model = ComplianceType
        fields = [
            'id', 'name', 'slug', 'description', 'frequency', 'frequency_display',
            'deadline_day', 'max_file_size_mb', 'is_active', 'order',
            'assigned_subjects', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_assigned_subjects(self, obj):
        """Return list of subjects assigned to this compliance type."""
        assignments = obj.subject_assignments.select_related('subject').all()
        return [{
            'id': assignment.subject.id,
            'name': assignment.subject.name,
            'code': assignment.subject.code,
            'is_required': assignment.is_required,
        } for assignment in assignments]


class ComplianceFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceFile
        fields = [
            'id', 'file_url', 'original_filename', 'file_size_bytes',
            'content_type', 'uploaded_at',
        ]
        read_only_fields = fields


class ComplianceCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = ComplianceComment
        fields = ['id', 'author', 'author_name', 'content', 'created_at']
        read_only_fields = ['author', 'created_at']

    def get_author_name(self, obj):
        return full_name(obj.author)


class ComplianceSubmissionSerializer(serializers.ModelSerializer):
    files = ComplianceFileSerializer(many=True, read_only=True)
    comments = ComplianceCommentSerializer(many=True, read_only=True)
    teacher_name = serializers.SerializerMethodField()
    compliance_type_name = serializers.CharField(source='compliance_type.name', read_only=True)
    compliance_type_frequency = serializers.CharField(source='compliance_type.frequency', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_editable = serializers.SerializerMethodField()
    file_count = serializers.SerializerMethodField()

    class Meta:
        model = ComplianceSubmission
        fields = [
            'id', 'teacher', 'teacher_name', 'compliance_type', 'compliance_type_name',
            'compliance_type_frequency', 'academic_year', 'semester', 'period_number',
            'status', 'status_display', 'submitted_at', 'reviewed_at', 'reviewed_by',
            'remarks', 'files', 'comments', 'is_editable', 'file_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'teacher', 'status', 'submitted_at', 'reviewed_at', 'reviewed_by',
            'created_at', 'updated_at',
        ]

    def get_teacher_name(self, obj):
        return full_name(obj.teacher)

    def get_is_editable(self, obj):
        return obj.status in ('draft', 'rejected')

    def get_file_count(self, obj):
        return obj.files.count()


class ComplianceSubmissionListSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    compliance_type_name = serializers.CharField(source='compliance_type.name', read_only=True)
    compliance_type_frequency = serializers.CharField(source='compliance_type.frequency', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    file_count = serializers.SerializerMethodField()
    files = ComplianceFileSerializer(many=True, read_only=True)

    class Meta:
        model = ComplianceSubmission
        fields = [
            'id', 'teacher', 'teacher_name', 'compliance_type', 'compliance_type_name',
            'compliance_type_frequency', 'academic_year', 'semester', 'period_number',
            'status', 'status_display', 'submitted_at', 'file_count', 'files',
            'remarks', 'created_at',
        ]

    def get_teacher_name(self, obj):
        return full_name(obj.teacher)

    def get_file_count(self, obj):
        return obj.files.count()


class ComplianceReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[('reviewed', 'Approve'), ('rejected', 'Reject')])
    remarks = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        if data['status'] == 'rejected' and not data.get('remarks'):
            raise serializers.ValidationError({'remarks': 'Remarks are required when rejecting.'})
        return data


class ComplianceBulkReviewSerializer(serializers.Serializer):
    submission_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
    )
    status = serializers.ChoiceField(choices=[('reviewed', 'Approve'), ('rejected', 'Reject')])
    remarks = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        if data['status'] == 'rejected' and not data.get('remarks'):
            raise serializers.ValidationError({'remarks': 'Remarks are required when rejecting.'})
        return data


class ComplianceDashboardSerializer(serializers.Serializer):
    total_submissions = serializers.IntegerField()
    reviewed_count = serializers.IntegerField()
    pending_count = serializers.IntegerField()
    overdue_count = serializers.IntegerField()
    rejected_count = serializers.IntegerField()
    compliance_rate = serializers.FloatField()
    by_type = serializers.ListField(child=serializers.DictField())
    by_teacher = serializers.ListField(child=serializers.DictField())
