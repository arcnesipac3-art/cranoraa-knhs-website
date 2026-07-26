from rest_framework import serializers

from ..models import (
    Transcript, TranscriptLineItem, TransferCertificate,
    CharacterCertificate, AchievementRecord, RecordRequest,
    StudentPromotionRecord,
)
from ._base import full_name


class TranscriptLineItemSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)

    class Meta:
        model = TranscriptLineItem
        fields = ['id', 'subject', 'subject_name', 'subject_code', 'q1', 'q2', 'q3', 'q4', 'final_average', 'remarks']


class TranscriptSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_email = serializers.CharField(source='student.email', read_only=True)
    generated_by_name = serializers.SerializerMethodField()
    items = TranscriptLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = Transcript
        fields = ['id', 'student', 'student_name', 'student_email', 'school_year',
                  'general_average', 'total_subjects', 'passed_subjects', 'failed_subjects',
                  'status', 'remarks', 'generated_by', 'generated_by_name', 'pdf_url',
                  'items', 'generated_at', 'updated_at']
        read_only_fields = ['general_average', 'total_subjects', 'passed_subjects', 'failed_subjects', 'pdf_url']

    def get_student_name(self, obj):
        return full_name(obj.student)

    def get_generated_by_name(self, obj):
        return full_name(obj.generated_by) if obj.generated_by else ''


class TransferCertificateSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    issued_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = TransferCertificate
        fields = ['id', 'student', 'student_name', 'reference_number',
                  'school_year_from', 'school_year_to', 'destination_school',
                  'last_grade_completed', 'last_school_attended', 'general_average',
                  'date_of_birth', 'place_of_birth', 'nationality',
                  'status', 'status_display', 'reason', 'remarks',
                  'issued_by', 'issued_by_name', 'issued_at', 'pdf_url',
                  'requested_at', 'updated_at']
        read_only_fields = ['reference_number', 'pdf_url', 'issued_at']

    def get_student_name(self, obj):
        return full_name(obj.student)

    def get_issued_by_name(self, obj):
        return full_name(obj.issued_by) if obj.issued_by else ''


class CharacterCertificateSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    issued_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = CharacterCertificate
        fields = ['id', 'student', 'student_name', 'reference_number',
                  'purpose', 'school_year', 'status', 'status_display',
                  'character_rating', 'remarks',
                  'issued_by', 'issued_by_name', 'issued_at', 'pdf_url',
                  'requested_at', 'updated_at']
        read_only_fields = ['reference_number', 'pdf_url', 'issued_at']

    def get_student_name(self, obj):
        return full_name(obj.student)

    def get_issued_by_name(self, obj):
        return full_name(obj.issued_by) if obj.issued_by else ''


class AchievementRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    verified_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AchievementRecord
        fields = ['id', 'student', 'student_name', 'title', 'description', 'category',
                  'date_achieved', 'awarded_by', 'school_year', 'grade_level',
                  'evidence_url', 'is_verified', 'verified_by', 'verified_by_name',
                  'created_at', 'updated_at']
        read_only_fields = ['is_verified', 'verified_by']

    def get_student_name(self, obj):
        return full_name(obj.student)

    def get_verified_by_name(self, obj):
        return full_name(obj.verified_by) if obj.verified_by else ''


class RecordRequestSerializer(serializers.ModelSerializer):
    requestor_name = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    handled_by_name = serializers.SerializerMethodField()
    record_type_display = serializers.CharField(source='get_record_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = RecordRequest
        fields = ['id', 'requestor', 'requestor_name', 'record_type', 'record_type_display',
                  'student', 'student_name', 'purpose', 'status', 'status_display',
                  'notes', 'admin_notes', 'handled_by', 'handled_by_name', 'copies',
                  'reference_record_id', 'created_at', 'updated_at']
        read_only_fields = ['requestor', 'reference_record_id']

    def get_requestor_name(self, obj):
        return full_name(obj.requestor)

    def get_student_name(self, obj):
        return full_name(obj.student) if obj.student else None

    def get_handled_by_name(self, obj):
        return full_name(obj.handled_by) if obj.handled_by else None


class StudentPromotionRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    from_classroom_name = serializers.CharField(source='from_classroom.name', read_only=True)
    to_classroom_name = serializers.CharField(source='to_classroom.name', read_only=True, default=None)
    decision_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = StudentPromotionRecord
        fields = ['id', 'student', 'student_name', 'from_classroom', 'from_classroom_name',
                  'to_classroom', 'to_classroom_name', 'from_school_year', 'to_school_year',
                  'status', 'status_display', 'general_average', 'decision_by', 'decision_by_name',
                  'decided_at', 'remarks', 'is_final', 'created_at', 'updated_at']
        read_only_fields = ['decided_at', 'is_final']

    def get_student_name(self, obj):
        return full_name(obj.student) if obj.student else None

    def get_decision_by_name(self, obj):
        return full_name(obj.decision_by) if obj.decision_by else None
