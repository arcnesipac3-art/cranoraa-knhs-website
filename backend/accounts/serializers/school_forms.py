from rest_framework import serializers
from django.db import transaction
from django.db.models import Q

from ..models.school_forms import SchoolForm1, SchoolForm1Student
from ..models.academic import Classroom, StudentClassEnrollment, SystemSetting
from ..models.user import User, Profile
from ._base import full_name


class SchoolForm1StudentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_lrn = serializers.SerializerMethodField()
    sex = serializers.SerializerMethodField()
    birth_date = serializers.SerializerMethodField()
    age = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    mother_tongue = serializers.SerializerMethodField()
    indigenous_people = serializers.SerializerMethodField()
    religion = serializers.SerializerMethodField()
    extension_name = serializers.SerializerMethodField()
    middle_name = serializers.SerializerMethodField()
    mother_name = serializers.SerializerMethodField()
    father_name = serializers.SerializerMethodField()
    contact_number = serializers.SerializerMethodField()
    enrollment_status = serializers.SerializerMethodField()

    class Meta:
        model = SchoolForm1Student
        fields = [
            'id', 'sf1', 'student', 'enrollment', 'remarks', 'order',
            'student_name', 'student_lrn', 'sex', 'birth_date', 'age',
            'address', 'mother_tongue', 'indigenous_people', 'religion',
            'extension_name', 'middle_name', 'mother_name', 'father_name',
            'contact_number', 'enrollment_status',
        ]
        read_only_fields = ['id', 'sf1']

    def _get_profile(self, obj):
        try:
            return obj.student.profile
        except (Profile.DoesNotExist, AttributeError):
            return None

    def get_student_name(self, obj):
        p = self._get_profile(obj)
        if p and p.last_name:
            parts = [p.last_name]
            if p.first_name:
                parts.append(p.first_name)
            if p.middle_name:
                parts.append(p.middle_name[0] + '.')
            if p.extension_name:
                parts.append(p.extension_name)
            return ', '.join(parts[:2]) + (f" {'. '.join(parts[2:])}" if len(parts) > 2 else '')
        return full_name(obj.student)

    def get_student_lrn(self, obj):
        p = self._get_profile(obj)
        return p.lrn if p else ''

    def get_sex(self, obj):
        p = self._get_profile(obj)
        return (p.sex or '').title() if p else ''

    def get_birth_date(self, obj):
        p = self._get_profile(obj)
        if p and p.date_of_birth:
            return p.date_of_birth.strftime('%m/%d/%Y')
        return ''

    def get_age(self, obj):
        p = self._get_profile(obj)
        if p and p.date_of_birth:
            from datetime import date
            today = date.today()
            return today.year - p.date_of_birth.year - (
                (today.month, today.day) < (p.date_of_birth.month, p.date_of_birth.day)
            )
        return ''

    def get_address(self, obj):
        p = self._get_profile(obj)
        return p.address if p else ''

    def get_mother_tongue(self, obj):
        p = self._get_profile(obj)
        return p.mother_tongue if p else ''

    def get_indigenous_people(self, obj):
        p = self._get_profile(obj)
        return p.indigenous_people if p else ''

    def get_religion(self, obj):
        p = self._get_profile(obj)
        return p.religion if p else ''

    def get_extension_name(self, obj):
        p = self._get_profile(obj)
        return p.extension_name if p else ''

    def get_middle_name(self, obj):
        p = self._get_profile(obj)
        return p.middle_name if p else ''

    def get_mother_name(self, obj):
        p = self._get_profile(obj)
        return p.mother_name if p else ''

    def get_father_name(self, obj):
        p = self._get_profile(obj)
        return p.father_name if p else ''

    def get_contact_number(self, obj):
        p = self._get_profile(obj)
        return p.phone_number if p else ''

    def get_enrollment_status(self, obj):
        if obj.enrollment:
            return 'Enrolled'
        return 'Enrolled'


class SchoolForm1ListSerializer(serializers.ModelSerializer):
    adviser_name = serializers.SerializerMethodField()
    generated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SchoolForm1
        fields = [
            'id', 'school_year', 'grade_level', 'section', 'adviser',
            'adviser_name', 'total_male', 'total_female', 'total_learners',
            'status', 'generated_by', 'generated_by_name', 'generated_at',
            'updated_at',
        ]

    def get_adviser_name(self, obj):
        return full_name(obj.adviser) if obj.adviser else ''

    def get_generated_by_name(self, obj):
        return full_name(obj.generated_by) if obj.generated_by else ''


class SchoolForm1DetailSerializer(serializers.ModelSerializer):
    adviser_name = serializers.SerializerMethodField()
    generated_by_name = serializers.SerializerMethodField()
    students = SchoolForm1StudentSerializer(many=True, read_only=True)
    school_name = serializers.SerializerMethodField()
    school_id = serializers.SerializerMethodField()
    region = serializers.SerializerMethodField()
    division = serializers.SerializerMethodField()

    class Meta:
        model = SchoolForm1
        fields = [
            'id', 'school_year', 'grade_level', 'section', 'adviser',
            'adviser_name', 'total_male', 'total_female', 'total_learners',
            'status', 'generated_by', 'generated_by_name', 'generated_at',
            'updated_at', 'students', 'school_name', 'school_id',
            'region', 'division',
        ]

    def get_adviser_name(self, obj):
        return full_name(obj.adviser) if obj.adviser else ''

    def get_generated_by_name(self, obj):
        return full_name(obj.generated_by) if obj.generated_by else ''

    def get_school_name(self, obj):
        return SystemSetting.get_settings().site_name

    def get_school_id(self, obj):
        return getattr(SystemSetting.get_settings(), 'school_id', '')

    def get_region(self, obj):
        return getattr(SystemSetting.get_settings(), 'region', '')

    def get_division(self, obj):
        return getattr(SystemSetting.get_settings(), 'division', '')


class GenerateSF1Serializer(serializers.Serializer):
    academic_year = serializers.CharField(max_length=20)
    grade_level = serializers.CharField(max_length=20)
    section = serializers.CharField(max_length=100)

    def validate(self, data):
        user = self.context['request'].user

        # Check if classroom exists
        classroom = Classroom.objects.filter(
            grade_level=data['grade_level'],
            name__icontains=data['section'],
        ).first()

        if not classroom:
            # Try matching by academic year
            from portal.models import AcademicYear
            ay = AcademicYear.objects.filter(name=data['academic_year']).first()
            if ay:
                classroom = Classroom.objects.filter(
                    grade_level=data['grade_level'],
                    academic_year=ay,
                ).filter(
                    Q(name__icontains=data['section']) |
                    Q(name__iexact=data['section'])
                ).first()

        if not classroom:
            raise serializers.ValidationError(
                'No classroom found for the selected grade level and section.'
            )

        # Check adviser
        if not classroom.teacher:
            raise serializers.ValidationError(
                'No adviser assigned to this section. Please assign an adviser first.'
            )

        # Check enrolled students
        enrolled = StudentClassEnrollment.objects.filter(classroom=classroom)
        if not enrolled.exists():
            raise serializers.ValidationError(
                'No students enrolled in this section. Please enroll students first.'
            )

        # Check duplicate (unless regenerate)
        existing = SchoolForm1.objects.filter(
            school_year=data['academic_year'],
            grade_level=data['grade_level'],
            section=data['section'],
        ).exclude(status='archived').first()

        if existing and not self.context['request'].data.get('regenerate'):
            raise serializers.ValidationError(
                f'SF1 already exists for {data["academic_year"]} - {data["grade_level"]} {data["section"]} '
                f'(ID: {existing.id}). Use regenerate to overwrite.'
            )

        data['classroom'] = classroom
        data['enrolled'] = enrolled
        data['existing'] = existing
        return data

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        classroom = validated_data['classroom']
        enrolled = validated_data['enrolled']
        existing = validated_data.get('existing')

        # Archive existing if regenerating
        if existing:
            existing.status = 'archived'
            existing.save(update_fields=['status'])

        sf1 = SchoolForm1.objects.create(
            school_year=validated_data['academic_year'],
            grade_level=validated_data['grade_level'],
            section=validated_data['section'],
            adviser=classroom.teacher,
            generated_by=user,
        )

        # Bulk create student entries sorted alphabetically
        students_sorted = User.objects.filter(
            enrollments__classroom=classroom,
            role='student',
        ).select_related('profile').order_by('last_name', 'first_name')

        entries = []
        for idx, student in enumerate(students_sorted, 1):
            enrollment = enrolled.filter(student=student).first()
            entries.append(SchoolForm1Student(
                sf1=sf1,
                student=student,
                enrollment=enrollment,
                order=idx,
            ))

        SchoolForm1Student.objects.bulk_create(entries, batch_size=500)

        # Recalculate totals
        sf1.recalculate_totals()

        return sf1
