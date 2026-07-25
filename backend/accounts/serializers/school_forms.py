import calendar
from datetime import date, datetime

from rest_framework import serializers
from django.db import transaction
from django.db.models import Q, Count, Sum
from django.utils import timezone

from ..models.school_forms import (
    SchoolForm1, SchoolForm1Student,
    SchoolForm5, SchoolForm5Student,
    SchoolForm9, SchoolForm9Subject,
    SchoolForm10, SchoolForm10Record, SchoolForm10Subject,
)
from ..models.academic import Classroom, StudentClassEnrollment, SystemSetting, Subject
from ..models.user import User, Profile
from ._base import full_name


def _get_profile(student):
    try:
        return student.profile
    except (Profile.DoesNotExist, AttributeError):
        return None


def _student_sex(student):
    p = _get_profile(student)
    return (p.sex or '').title() if p else ''


def _determine_promotion(general_average, failed_subjects, passing_grade=75):
    if general_average is None:
        return 'retained'
    if float(general_average) >= passing_grade and failed_subjects == 0:
        return 'promoted'
    if float(general_average) >= passing_grade and failed_subjects > 0:
        return 'conditional'
    return 'retained'


def _compute_remarks(general_average, passing_grade=75):
    if general_average is None:
        return 'No Grade'
    avg = float(general_average)
    if avg >= 90:
        return 'With Honors'
    if avg >= passing_grade:
        return 'Promoted'
    return 'Did Not Meet Expectations'


# ─── SF2: Attendance Data Serializer ─────────────────────────────────────────
class SF2StudentRowSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    lrn = serializers.CharField()
    sex = serializers.CharField()
    daily = serializers.DictField(help_text="{'1': 'P', '2': 'A', ...}")
    days_present = serializers.IntegerField()
    days_absent = serializers.IntegerField()
    days_late = serializers.IntegerField()
    attendance_pct = serializers.FloatField()


class SF2MonthDataSerializer(serializers.Serializer):
    month = serializers.IntegerField()
    year = serializers.IntegerField()
    month_name = serializers.CharField()
    total_school_days = serializers.IntegerField()
    students = SF2StudentRowSerializer(many=True)
    total_present = serializers.IntegerField()
    total_absent = serializers.IntegerField()
    total_late = serializers.IntegerField()


class SF2OverviewSerializer(serializers.Serializer):
    school_name = serializers.CharField()
    school_id = serializers.CharField()
    region = serializers.CharField()
    division = serializers.CharField()
    school_year = serializers.CharField()
    grade_level = serializers.CharField()
    section = serializers.CharField()
    adviser_name = serializers.CharField()
    total_learners = serializers.IntegerField()
    overall_attendance_pct = serializers.FloatField()
    months = SF2MonthDataSerializer(many=True)


# ─── SF5: Promotion Report Serializers ───────────────────────────────────────
class SchoolForm5StudentSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_lrn = serializers.SerializerMethodField()
    sex = serializers.SerializerMethodField()
    promotion_display = serializers.SerializerMethodField()

    class Meta:
        model = SchoolForm5Student
        fields = [
            'id', 'sf5', 'student', 'enrollment', 'general_average',
            'total_subjects', 'passed_subjects', 'failed_subjects',
            'promotion_status', 'promotion_display', 'remarks', 'awards', 'order',
            'student_name', 'student_lrn', 'sex',
        ]
        read_only_fields = ['id', 'sf5']

    def get_student_name(self, obj):
        return full_name(obj.student)

    def get_student_lrn(self, obj):
        p = _get_profile(obj.student)
        return p.lrn if p else ''

    def get_sex(self, obj):
        return _student_sex(obj.student)

    def get_promotion_display(self, obj):
        return obj.get_promotion_status_display()


class SchoolForm5ListSerializer(serializers.ModelSerializer):
    adviser_name = serializers.SerializerMethodField()
    generated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SchoolForm5
        fields = [
            'id', 'school_year', 'grade_level', 'section', 'adviser',
            'adviser_name', 'total_promoted', 'total_retained', 'total_conditional',
            'total_male', 'total_female', 'total_learners',
            'status', 'generated_by', 'generated_by_name', 'generated_at',
        ]

    def get_adviser_name(self, obj):
        return full_name(obj.adviser) if obj.adviser else ''

    def get_generated_by_name(self, obj):
        return full_name(obj.generated_by) if obj.generated_by else ''


class SchoolForm5DetailSerializer(serializers.ModelSerializer):
    adviser_name = serializers.SerializerMethodField()
    generated_by_name = serializers.SerializerMethodField()
    students = SchoolForm5StudentSerializer(many=True, read_only=True)
    school_name = serializers.SerializerMethodField()
    school_id = serializers.SerializerMethodField()

    class Meta:
        model = SchoolForm5
        fields = [
            'id', 'school_year', 'grade_level', 'section', 'adviser',
            'adviser_name', 'total_promoted', 'total_retained', 'total_conditional',
            'total_male', 'total_female', 'total_learners',
            'status', 'generated_by', 'generated_by_name', 'generated_at',
            'updated_at', 'students', 'school_name', 'school_id',
        ]

    def get_adviser_name(self, obj):
        return full_name(obj.adviser) if obj.adviser else ''

    def get_generated_by_name(self, obj):
        return full_name(obj.generated_by) if obj.generated_by else ''

    def get_school_name(self, obj):
        return SystemSetting.get_settings().site_name

    def get_school_id(self, obj):
        return getattr(SystemSetting.get_settings(), 'school_id', '')


class GenerateSF5Serializer(serializers.Serializer):
    academic_year = serializers.CharField(max_length=20)
    grade_level = serializers.CharField(max_length=20)
    section = serializers.CharField(max_length=100)

    def validate(self, data):
        classroom = self._find_classroom(data)
        if not classroom:
            raise serializers.ValidationError('No classroom found for the selected grade level and section.')
        if not classroom.teacher:
            raise serializers.ValidationError('No adviser assigned to this section.')
        enrolled = StudentClassEnrollment.objects.filter(classroom=classroom)
        if not enrolled.exists():
            raise serializers.ValidationError('No students enrolled in this section.')

        passing = float(SystemSetting.get_settings().passing_grade)
        students_with_grades = 0
        for enroll in enrolled.select_related('student'):
            grades = enroll.student.subject_grades.filter(
                classroom=classroom,
                grade_type='final_grade',
                academic_year=data['academic_year'],
                raw_score__isnull=False,
            )
            if grades.exists():
                students_with_grades += 1

        if students_with_grades == 0:
            raise serializers.ValidationError('No final grades found. Enter grades before generating SF5.')

        existing = SchoolForm5.objects.filter(
            school_year=data['academic_year'],
            grade_level=data['grade_level'],
            section=data['section'],
        ).exclude(status='archived').first()

        if existing and not self.context['request'].data.get('regenerate'):
            raise serializers.ValidationError(
                f'SF5 already exists (ID: {existing.id}). Use regenerate to overwrite.'
            )

        data['classroom'] = classroom
        data['enrolled'] = enrolled
        data['existing'] = existing
        data['passing_grade'] = passing
        return data

    def _find_classroom(self, data):
        classroom = Classroom.objects.filter(
            grade_level=data['grade_level'],
            name__icontains=data['section'],
        ).first()
        if not classroom:
            try:
                from portal.models import AcademicYear
                ay = AcademicYear.objects.filter(name=data['academic_year']).first()
                if ay:
                    classroom = Classroom.objects.filter(
                        grade_level=data['grade_level'], academic_year=ay,
                    ).filter(Q(name__icontains=data['section']) | Q(name__iexact=data['section'])).first()
            except Exception:
                pass
        return classroom

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        classroom = validated_data['classroom']
        enrolled = validated_data['enrolled']
        existing = validated_data.get('existing')
        passing = validated_data['passing_grade']

        if existing:
            existing.status = 'archived'
            existing.save(update_fields=['status'])

        sf5 = SchoolForm5.objects.create(
            school_year=validated_data['academic_year'],
            grade_level=validated_data['grade_level'],
            section=validated_data['section'],
            adviser=classroom.teacher,
            generated_by=user,
        )

        students_sorted = User.objects.filter(
            enrollments__classroom=classroom, role='student',
        ).select_related('profile').order_by('last_name', 'first_name')

        entries = []
        total_promoted = total_retained = total_conditional = 0
        total_male = total_female = 0

        for idx, student in enumerate(students_sorted, 1):
            enrollment = enrolled.filter(student=student).first()
            grades = student.subject_grades.filter(
                classroom=classroom,
                grade_type='final_grade',
                academic_year=validated_data['academic_year'],
                raw_score__isnull=False,
            )

            scores = [float(g.raw_score) for g in grades]
            avg = round(sum(scores) / len(scores), 2) if scores else None
            passed = sum(1 for s in scores if s >= passing)
            failed = len(scores) - passed
            promotion = _determine_promotion(avg, failed, passing)

            sex = _student_sex(student)
            if sex == 'Male':
                total_male += 1
            elif sex == 'Female':
                total_female += 1

            if promotion == 'promoted':
                total_promoted += 1
            elif promotion == 'conditional':
                total_conditional += 1
            else:
                total_retained += 1

            entries.append(SchoolForm5Student(
                sf5=sf5, student=student, enrollment=enrollment,
                general_average=avg, total_subjects=len(scores),
                passed_subjects=passed, failed_subjects=failed,
                promotion_status=promotion, order=idx,
            ))

        SchoolForm5Student.objects.bulk_create(entries, batch_size=500)

        sf5.total_promoted = total_promoted
        sf5.total_retained = total_retained
        sf5.total_conditional = total_conditional
        sf5.total_male = total_male
        sf5.total_female = total_female
        sf5.total_learners = total_male + total_female
        sf5.save(update_fields=[
            'total_promoted', 'total_retained', 'total_conditional',
            'total_male', 'total_female', 'total_learners',
        ])

        return sf5


# ─── SF9: Report Card Serializers ────────────────────────────────────────────
class SchoolForm9SubjectSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)

    class Meta:
        model = SchoolForm9Subject
        fields = ['id', 'sf9', 'subject', 'subject_name', 'subject_code',
                  'q1', 'q2', 'q3', 'q4', 'final_rating', 'remarks']
        read_only_fields = ['id', 'sf9']


class SchoolForm9ListSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    adviser_name = serializers.SerializerMethodField()

    class Meta:
        model = SchoolForm9
        fields = [
            'id', 'school_year', 'grade_level', 'section', 'student',
            'student_name', 'adviser', 'adviser_name', 'general_average',
            'promotion_status', 'status', 'generated_at',
        ]

    def get_student_name(self, obj):
        return full_name(obj.student)

    def get_adviser_name(self, obj):
        return full_name(obj.adviser) if obj.adviser else ''


class SchoolForm9DetailSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_lrn = serializers.SerializerMethodField()
    student_sex = serializers.SerializerMethodField()
    adviser_name = serializers.SerializerMethodField()
    subjects = SchoolForm9SubjectSerializer(many=True, read_only=True)
    school_name = serializers.SerializerMethodField()
    school_id = serializers.SerializerMethodField()

    class Meta:
        model = SchoolForm9
        fields = [
            'id', 'school_year', 'grade_level', 'section', 'student',
            'student_name', 'student_lrn', 'student_sex',
            'adviser', 'adviser_name', 'general_average',
            'total_subjects', 'passed_subjects', 'failed_subjects',
            'promotion_status', 'days_present', 'days_absent', 'days_tardy',
            'adviser_remarks', 'principal_remarks', 'status',
            'generated_at', 'subjects', 'school_name', 'school_id',
        ]

    def get_student_name(self, obj):
        return full_name(obj.student)

    def get_student_lrn(self, obj):
        p = _get_profile(obj.student)
        return p.lrn if p else ''

    def get_student_sex(self, obj):
        return _student_sex(obj.student)

    def get_adviser_name(self, obj):
        return full_name(obj.adviser) if obj.adviser else ''

    def get_school_name(self, obj):
        return SystemSetting.get_settings().site_name

    def get_school_id(self, obj):
        return getattr(SystemSetting.get_settings(), 'school_id', '')


class GenerateSF9Serializer(serializers.Serializer):
    academic_year = serializers.CharField(max_length=20)
    grade_level = serializers.CharField(max_length=20)
    section = serializers.CharField(max_length=100)

    def validate(self, data):
        classroom = self._find_classroom(data)
        if not classroom:
            raise serializers.ValidationError('No classroom found.')
        if not classroom.teacher:
            raise serializers.ValidationError('No adviser assigned.')
        enrolled = StudentClassEnrollment.objects.filter(classroom=classroom)
        if not enrolled.exists():
            raise serializers.ValidationError('No students enrolled.')

        passing = float(SystemSetting.get_settings().passing_grade)
        data['classroom'] = classroom
        data['enrolled'] = enrolled
        data['passing_grade'] = passing
        return data

    def _find_classroom(self, data):
        classroom = Classroom.objects.filter(
            grade_level=data['grade_level'], name__icontains=data['section'],
        ).first()
        if not classroom:
            try:
                from portal.models import AcademicYear
                ay = AcademicYear.objects.filter(name=data['academic_year']).first()
                if ay:
                    classroom = Classroom.objects.filter(
                        grade_level=data['grade_level'], academic_year=ay,
                    ).filter(Q(name__icontains=data['section']) | Q(name__iexact=data['section'])).first()
            except Exception:
                pass
        return classroom

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        classroom = validated_data['classroom']
        enrolled = validated_data['enrolled']
        passing = validated_data['passing_grade']

        students_sorted = User.objects.filter(
            enrollments__classroom=classroom, role='student',
        ).select_related('profile').order_by('last_name', 'first_name')

        created_records = []
        for student in students_sorted:
            enrollment = enrolled.filter(student=student).first()

            existing = SchoolForm9.objects.filter(
                school_year=validated_data['academic_year'],
                grade_level=validated_data['grade_level'],
                section=validated_data['section'],
                student=student,
            ).first()
            if existing:
                existing.delete()

            subjects = Subject.objects.filter(classroomsubject__classroom=classroom)

            subject_grades = []
            scores = []
            for subj in subjects:
                grade = student.subject_grades.filter(
                    subject=subj, classroom=classroom,
                    grade_type='final_grade',
                    academic_year=validated_data['academic_year'],
                ).first()

                q1 = q2 = q3 = q4 = final = None
                if grade:
                    final = grade.raw_score
                    if final is not None:
                        scores.append(float(final))

                    for q in range(1, 5):
                        q_grade = student.subject_grades.filter(
                            subject=subj, classroom=classroom,
                            quarter=q,
                            academic_year=validated_data['academic_year'],
                        ).first()
                        if q_grade and q_grade.raw_score is not None:
                            setattr(subject_grades_obj := type('obj', (), {'q': None})(), 'q', q_grade.raw_score)

                remarks = ''
                if final is not None:
                    if float(final) >= 90:
                        remarks = 'Outstanding'
                    elif float(final) >= 85:
                        remarks = 'Very Satisfactory'
                    elif float(final) >= 80:
                        remarks = 'Satisfactory'
                    elif float(final) >= passing:
                        remarks = 'Fairly Satisfactory'
                    else:
                        remarks = 'Did Not Meet Expectations'

                subject_grades.append(SchoolForm9Subject(
                    subject=subj, q1=q1, q2=q2, q3=q3, q4=q4,
                    final_rating=final, remarks=remarks,
                ))

            avg = round(sum(scores) / len(scores), 2) if scores else None
            passed = sum(1 for s in scores if s >= passing)
            failed = len(scores) - passed
            promotion = _determine_promotion(avg, failed, passing)

            att_qs = student.attendances.filter(classroom=classroom)
            present_count = att_qs.filter(status__in=['present', 'late']).count()
            absent_count = att_qs.filter(status='absent').count()
            late_count = att_qs.filter(status='late').count()

            sf9 = SchoolForm9.objects.create(
                school_year=validated_data['academic_year'],
                grade_level=validated_data['grade_level'],
                section=validated_data['section'],
                student=student, adviser=classroom.teacher,
                general_average=avg, total_subjects=len(scores),
                passed_subjects=passed, failed_subjects=failed,
                promotion_status=promotion,
                days_present=present_count, days_absent=absent_count,
                days_tardy=late_count, generated_by=user,
            )

            for sg in subject_grades:
                sg.sf9 = sf9
            SchoolForm9Subject.objects.bulk_create(subject_grades, batch_size=100)
            created_records.append(sf9)

        return created_records


# ─── SF10: Permanent Academic Record Serializers ─────────────────────────────
class SchoolForm10SubjectSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = SchoolForm10Subject
        fields = ['id', 'record', 'subject', 'subject_name',
                  'q1', 'q2', 'q3', 'q4', 'final_rating', 'remarks']
        read_only_fields = ['id', 'record']


class SchoolForm10RecordSerializer(serializers.ModelSerializer):
    subjects = SchoolForm10SubjectSerializer(many=True, read_only=True)

    class Meta:
        model = SchoolForm10Record
        fields = [
            'id', 'sf10', 'school_year', 'grade_level', 'section',
            'school_name', 'general_average', 'promotion_status',
            'total_subjects', 'passed_subjects', 'failed_subjects',
            'remarks', 'awards', 'date_of_transfer', 'receiving_school',
            'order', 'subjects',
        ]
        read_only_fields = ['id', 'sf10']


class SchoolForm10ListSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = SchoolForm10
        fields = [
            'id', 'student', 'student_name', 'school_year_from', 'school_year_to',
            'status', 'generated_at',
        ]

    def get_student_name(self, obj):
        return full_name(obj.student)


class SchoolForm10DetailSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_lrn = serializers.SerializerMethodField()
    student_sex = serializers.SerializerMethodField()
    student_birth_date = serializers.SerializerMethodField()
    academic_records = SchoolForm10RecordSerializer(many=True, read_only=True)
    school_name = serializers.SerializerMethodField()
    school_id = serializers.SerializerMethodField()

    class Meta:
        model = SchoolForm10
        fields = [
            'id', 'student', 'student_name', 'student_lrn', 'student_sex',
            'student_birth_date', 'school_year_from', 'school_year_to',
            'status', 'generated_at', 'academic_records',
            'school_name', 'school_id',
        ]

    def get_student_name(self, obj):
        return full_name(obj.student)

    def get_student_lrn(self, obj):
        p = _get_profile(obj.student)
        return p.lrn if p else ''

    def get_student_sex(self, obj):
        return _student_sex(obj.student)

    def get_student_birth_date(self, obj):
        p = _get_profile(obj.student)
        if p and p.date_of_birth:
            return p.date_of_birth.strftime('%m/%d/%Y')
        return ''

    def get_school_name(self, obj):
        return SystemSetting.get_settings().site_name

    def get_school_id(self, obj):
        return getattr(SystemSetting.get_settings(), 'school_id', '')


class GenerateSF10Serializer(serializers.Serializer):
    student_id = serializers.IntegerField()

    def validate_student_id(self, value):
        try:
            student = User.objects.get(id=value, role='student')
        except User.DoesNotExist:
            raise serializers.ValidationError('Student not found.')
        return value

    def validate(self, data):
        student = User.objects.get(id=data['student_id'])
        existing = SchoolForm10.objects.filter(student=student).first()
        if existing and not self.context['request'].data.get('regenerate'):
            raise serializers.ValidationError(
                f'SF10 already exists for {full_name(student)} (ID: {existing.id}). Use regenerate to overwrite.'
            )
        data['student'] = student
        data['existing'] = existing
        return data

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        student = validated_data['student']
        existing = validated_data.get('existing')

        if existing:
            existing.status = 'archived'
            existing.save(update_fields=['status'])

        enrollments = StudentClassEnrollment.objects.filter(
            student=student,
        ).select_related('classroom', 'classroom__academic_year').order_by('classroom__academic_year__name')

        years = []
        for idx, enroll in enumerate(enrollments, 1):
            classroom = enroll.classroom
            ay_name = classroom.academic_year.name if classroom.academic_year else ''

            grades = student.subject_grades.filter(
                classroom=classroom, grade_type='final_grade',
                raw_score__isnull=False,
            )

            scores = [float(g.raw_score) for g in grades]
            avg = round(sum(scores) / len(scores), 2) if scores else None
            passing = float(SystemSetting.get_settings().passing_grade)
            passed = sum(1 for s in scores if s >= passing)
            failed = len(scores) - passed
            promotion = _determine_promotion(avg, failed, passing)

            subjects = Subject.objects.filter(classroomsubject__classroom=classroom)
            subject_data = []
            for subj in subjects:
                grade = student.subject_grades.filter(
                    subject=subj, classroom=classroom,
                    grade_type='final_grade', academic_year=ay_name,
                ).first()
                final = grade.raw_score if grade else None
                remarks = ''
                if final is not None:
                    if float(final) >= 90:
                        remarks = 'Outstanding'
                    elif float(final) >= 80:
                        remarks = 'Satisfactory'
                    elif float(final) >= passing:
                        remarks = 'Fairly Satisfactory'
                    else:
                        remarks = 'Did Not Meet Expectations'
                subject_data.append(SchoolForm10Subject(
                    subject=subj, final_rating=final, remarks=remarks,
                ))

            years.append({
                'school_year': ay_name,
                'grade_level': classroom.grade_level or '',
                'section': classroom.name,
                'school_name': SystemSetting.get_settings().site_name,
                'general_average': avg,
                'promotion_status': promotion,
                'total_subjects': len(scores),
                'passed_subjects': passed,
                'failed_subjects': failed,
                'subjects': subject_data,
                'order': idx,
            })

        sf10 = SchoolForm10.objects.create(
            student=student,
            school_year_from=years[0]['school_year'] if years else '',
            school_year_to=years[-1]['school_year'] if years else '',
            generated_by=user,
        )

        for year_data in years:
            subjects = year_data.pop('subjects')
            record = SchoolForm10Record.objects.create(sf10=sf10, **year_data)
            for subj in subjects:
                subj.record = record
            SchoolForm10Subject.objects.bulk_create(subjects, batch_size=100)

        return sf10


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
