from rest_framework import serializers
from ..models import AcademicYear, Classroom, StudentClassEnrollment, Subject, ClassroomSubject, SystemSetting
from ._base import full_name
from .user import SimplifiedStudentSerializer


class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = ['id', 'academic_year', 'academic_level', 'current_quarter',
                  'passing_grade', 'site_name',
                  'school_address', 'school_phone', 'school_email',
                  'maintenance_mode', 'maintenance_message']


class LaxPrimaryKeyField(serializers.PrimaryKeyRelatedField):
    """PK field that treats empty string as None instead of crashing."""

    def to_internal_value(self, data):
        if data == '' or data is None:
            return None
        return super().to_internal_value(data)


class LaxAcademicYearField(serializers.PrimaryKeyRelatedField):
    """Treats empty string as None instead of crashing PostgreSQL."""

    def to_internal_value(self, data):
        if data == '' or data is None:
            return None
        return super().to_internal_value(data)


class ClassroomSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    teacher_profile_picture = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    average_gpa = serializers.SerializerMethodField()
    academic_year_name = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    subject_code = serializers.SerializerMethodField()
    academic_year = LaxAcademicYearField(
        queryset=AcademicYear.objects.all(),
        required=False, allow_null=True,
    )

    class Meta:
        model = Classroom
        fields = ['id', 'name', 'grade_level', 'capacity', 'teacher', 'teacher_name', 'teacher_profile_picture', 'student_count',
                  'average_gpa', 'academic_year', 'academic_year_name', 'subject_name', 'subject_code',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'teacher': {'required': False, 'allow_null': True},
        }

    def get_teacher_name(self, obj): return full_name(obj.teacher) if obj.teacher else 'No Adviser'
    def get_teacher_profile_picture(self, obj):
        if obj.teacher and hasattr(obj.teacher, 'profile') and obj.teacher.profile:
            return obj.teacher.profile.profile_picture
        return None
    def get_student_count(self, obj): return obj.enrollments.count()
    def get_average_gpa(self, obj): return obj.get_average_gpa()
    def get_academic_year_name(self, obj): return obj.academic_year.name if obj.academic_year else None

    def get_subject_name(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role == 'staff':
            assignment = obj.classroom_subjects.filter(teacher=request.user).select_related('subject').first()
            if assignment:
                return assignment.subject.name
        return None

    def get_subject_code(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated and request.user.role == 'staff':
            assignment = obj.classroom_subjects.filter(teacher=request.user).select_related('subject').first()
            if assignment:
                return assignment.subject.code
        return None

    def validate_teacher(self, value):
        # Removed strict validation - teachers can advise multiple classrooms
        # This is common in Filipino high schools where teachers may advise
        # multiple homerooms or sections
        return value


class StudentClassEnrollmentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_email = serializers.CharField(source='student.email', read_only=True)
    student_lrn = serializers.SerializerMethodField()
    student_sex = serializers.CharField(source='student.profile.sex', read_only=True)
    student_profile_picture = serializers.SerializerMethodField()
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    classroom_advisor = serializers.SerializerMethodField()
    general_average = serializers.SerializerMethodField()
    descriptive_equivalent = serializers.SerializerMethodField()

    class Meta:
        model = StudentClassEnrollment
        fields = ['id', 'student', 'student_name', 'student_email', 'student_lrn', 'student_sex', 'student_profile_picture', 'classroom',
                  'classroom_name', 'classroom_advisor', 'q1', 'q2', 'q3', 'q4', 'gpa',
                  'general_average', 'descriptive_equivalent', 'enrolled_at', 'updated_at']
        read_only_fields = ['student', 'classroom', 'classroom_name', 'classroom_advisor',
                            'general_average', 'descriptive_equivalent']

    def get_student_name(self, obj): return full_name(obj.student)
    def get_student_lrn(self, obj):
        profile = getattr(obj.student, 'profile', None)
        return profile.lrn if profile else None
    def get_student_profile_picture(self, obj):
        profile = getattr(obj.student, 'profile', None)
        return profile.profile_picture if profile else None
    def get_classroom_advisor(self, obj): return full_name(obj.classroom.teacher) if obj.classroom.teacher else 'No Advisor'
    def get_general_average(self, obj): return obj.calculate_general_average()
    def get_descriptive_equivalent(self, obj): return obj.get_descriptive_equivalent()

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        request = self.context.get('request')

        if request and request.user.role == 'student' and instance.student != request.user:
            grade_fields = ['q1', 'q2', 'q3', 'q4', 'gpa', 'general_average',
                           'descriptive_equivalent']
            for field in grade_fields:
                if field in representation:
                    representation[field] = None

        return representation


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'description', 'grade_level',
                  'created_at', 'updated_at']


class ClassroomSubjectSerializer(serializers.ModelSerializer):
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    teacher_email = serializers.CharField(source='teacher.email', read_only=True)
    students = serializers.SerializerMethodField()

    class Meta:
        model = ClassroomSubject
        fields = ['id', 'classroom', 'classroom_name', 'subject', 'subject_name',
                  'subject_code', 'teacher', 'teacher_name', 'teacher_email',
                  'ww_weight', 'pt_weight', 'qa_weight', 'assigned_at', 'students']
        read_only_fields = ['assigned_at']

    def get_teacher_name(self, obj): return full_name(obj.teacher)

    def get_students(self, obj):
        enrollments = obj.classroom.enrollments.all().select_related('student')
        students = [e.student for e in enrollments]
        return SimplifiedStudentSerializer(students, many=True).data

    def create(self, validated_data):
        defaults = SystemSetting.get_settings()
        validated_data.setdefault('ww_weight', defaults.default_ww_weight)
        validated_data.setdefault('pt_weight', defaults.default_pt_weight)
        validated_data.setdefault('qa_weight', defaults.default_qa_weight)
        return super().create(validated_data)

    def validate(self, data):
        defaults = SystemSetting.get_settings()
        ww = data.get('ww_weight', self.instance.ww_weight if self.instance else defaults.default_ww_weight)
        pt = data.get('pt_weight', self.instance.pt_weight if self.instance else defaults.default_pt_weight)
        qa = data.get('qa_weight', self.instance.qa_weight if self.instance else defaults.default_qa_weight)
        total = float(ww) + float(pt) + float(qa)
        if abs(total - 100) > 0.01:
            raise serializers.ValidationError(
                f"Weights must sum to 100. Current total: {total}")
        return data
