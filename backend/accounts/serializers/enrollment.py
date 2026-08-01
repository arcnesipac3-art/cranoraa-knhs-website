from rest_framework import serializers

from ..models import (
    EnrollmentApplication, EnrollmentDocument, EnrollmentStatusHistory,
    EnrollmentWaitlist, EnrollmentChecklist, EnrollmentDocumentVersion,
)
from ._base import full_name


class EnrollmentDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    verification_status_display = serializers.CharField(source='get_verification_status_display', read_only=True)

    class Meta:
        model = EnrollmentDocument
        fields = [
            'id', 'application', 'document_type', 'document_type_display',
            'file_url', 'file_name', 'verification_status', 'verification_status_display',
            'admin_notes', 'uploaded_at', 'updated_at',
        ]
        read_only_fields = ['application', 'uploaded_at', 'updated_at']


class EnrollmentDocumentVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnrollmentDocumentVersion
        fields = ['id', 'document', 'file_url', 'file_name', 'file_hash', 'uploaded_by', 'created_at']
        read_only_fields = ['uploaded_by', 'created_at']


class EnrollmentStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()
    from_status_display = serializers.SerializerMethodField()
    to_status_display = serializers.SerializerMethodField()

    class Meta:
        model = EnrollmentStatusHistory
        fields = [
            'id', 'application', 'from_status', 'from_status_display',
            'to_status', 'to_status_display', 'changed_by', 'changed_by_name',
            'notes', 'created_at',
        ]
        read_only_fields = ['application', 'changed_by', 'created_at']

    def get_changed_by_name(self, obj):
        if not obj.changed_by:
            return None
        return obj.changed_by.get_full_name() or obj.changed_by.username

    def get_from_status_display(self, obj):
        return obj.get_from_status_display() if obj.from_status else None

    def get_to_status_display(self, obj):
        return obj.get_to_status_display()


class EnrollmentChecklistSerializer(serializers.ModelSerializer):
    is_complete = serializers.BooleanField(read_only=True)

    class Meta:
        model = EnrollmentChecklist
        fields = [
            'id', 'application', 'documents_complete', 'lrn_verified',
            'parent_linked', 'classroom_assigned', 'profile_complete',
            'is_complete', 'completed_at', 'completed_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['completed_at', 'completed_by', 'created_at', 'updated_at']


class EnrollmentApplicationSerializer(serializers.ModelSerializer):
    documents = EnrollmentDocumentSerializer(many=True, read_only=True)
    status_history = EnrollmentStatusHistorySerializer(many=True, read_only=True)
    full_name = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    assigned_classroom_name = serializers.CharField(source='assigned_classroom.name', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()
    linked_parent_email = serializers.SerializerMethodField()
    checklist = EnrollmentChecklistSerializer(read_only=True)

    class Meta:
        model = EnrollmentApplication
        fields = [
            'id', 'enrollment_number', 'enrollment_type', 'school_year',
            'first_name', 'last_name', 'middle_name', 'full_name', 'sex', 'date_of_birth', 'age',
            'place_of_birth', 'nationality', 'religion', 'street_address', 'barangay',
            'city_municipality', 'province', 'zip_code',
            'father_name', 'father_occupation', 'father_contact', 'father_email',
            'mother_name', 'mother_occupation', 'mother_contact', 'mother_email',
            'guardian_name', 'guardian_relationship', 'guardian_contact', 'guardian_email',
            'grade_level', 'strand', 'previous_school', 'previous_school_address',
            'lrn', 'lrn_request_reason', 'is_als',
            'birth_certificate', 'report_card', 'form_138', 'certificate_of_completion',
            'good_moral_certificate', 'id_picture', 'last_school_attended_cert',
            'email', 'phone_number', 'emergency_contact_name',
            'emergency_contact_relationship', 'emergency_contact_phone',
            'enrolled_student', 'assigned_classroom', 'assigned_classroom_name',
            'linked_parent', 'linked_parent_email',
            'status', 'remarks', 'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'temp_password_display',
            'submitted_at', 'updated_at', 'documents', 'status_history', 'checklist',
        ]
        read_only_fields = [
            'enrollment_number', 'status', 'submitted_at', 'updated_at',
            'enrolled_student', 'assigned_classroom', 'linked_parent',
            'reviewed_by', 'reviewed_at', 'documents', 'status_history', 'checklist',
        ]

    def validate(self, attrs):
        errors = {}
        date_of_birth = attrs.get('date_of_birth') or (self.instance.date_of_birth if self.instance else None)
        grade_level = attrs.get('grade_level') or (self.instance.grade_level if self.instance else None)
        strand = attrs.get('strand') if 'strand' in attrs else (self.instance.strand if self.instance else None)
        lrn = attrs.get('lrn') if 'lrn' in attrs else (self.instance.lrn if self.instance else None)
        no_lrn = not lrn
        lrn_request_reason = attrs.get('lrn_request_reason') if 'lrn_request_reason' in attrs else (self.instance.lrn_request_reason if self.instance else None)
        email = attrs.get('email') or (self.instance.email if self.instance else None)
        first_name = attrs.get('first_name') or (self.instance.first_name if self.instance else None)
        last_name = attrs.get('last_name') or (self.instance.last_name if self.instance else None)

        if date_of_birth:
            from datetime import date
            today = date.today()
            age = today.year - date_of_birth.year - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))
            if age < 10:
                errors['date_of_birth'] = 'Applicant must be at least 10 years old.'

        if grade_level in ('11', '12') and not strand:
            errors['strand'] = 'SHS applicants (Grades 11-12) must select a strand/track.'

        if lrn and len(lrn) == 12 and lrn.isdigit():
            dup = EnrollmentApplication.objects.filter(
                lrn=lrn, status__in=['pending', 'under_review', 'pending_requirements', 'approved', 'enrolled']
            )
            if self.instance:
                dup = dup.exclude(pk=self.instance.pk)
            if dup.exists():
                errors['lrn'] = 'This LRN is already associated with another application.'

        if email:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            if User.objects.filter(email=email).exclude(role='student').exists():
                errors['email'] = 'This email is already in use by a staff/admin account.'

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def get_full_name(self, obj):
        return obj.full_name

    def get_age(self, obj):
        return obj.age

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username
        return None

    def get_linked_parent_email(self, obj):
        if obj.linked_parent:
            return obj.linked_parent.email
        return None


class EnrollmentWaitlistSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)

    class Meta:
        model = EnrollmentWaitlist
        fields = ['id', 'classroom', 'classroom_name', 'student', 'student_name',
                  'application', 'position', 'status', 'offered_at',
                  'response_deadline', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['position', 'status', 'offered_at']

    def get_student_name(self, obj): return full_name(obj.student)
