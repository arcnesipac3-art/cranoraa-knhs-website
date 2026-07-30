"""
SF1 - School Register Service
Generates class register using enrolled students.
Data source: StudentClassEnrollment + Profile + User + Classroom
"""
from collections import defaultdict
from django.db.models import Prefetch
from accounts.models import (
    StudentClassEnrollment,
    Classroom,
    AcademicYear,
    Semester,
    User,
    Profile,
)


class SF1SchoolRegisterService:
    """Service for generating SF1 - School Register"""

    def __init__(self, academic_year=None, grade_level=None, section=None, adviser=None, student_id=None):
        self.academic_year = academic_year
        self.grade_level = grade_level
        self.section = section
        self.adviser = adviser
        self.student_id = student_id

    def get_queryset(self):
        """Get filtered enrollments with related data"""
        qs = StudentClassEnrollment.objects.select_related(
            'student',
            'student__user',
            'student__profile',
            'classroom',
            'classroom__academic_year',
            'classroom__teacher',
            'classroom__teacher__profile',
        ).prefetch_related(
            'student__user__additional_roles'
        )

        if self.academic_year:
            qs = qs.filter(classroom__academic_year=self.academic_year)

        if self.grade_level:
            qs = qs.filter(classroom__grade_level=self.grade_level)

        if self.section:
            qs = qs.filter(classroom__name=self.section)

        if self.adviser:
            qs = qs.filter(classroom__teacher=self.adviser)

        if self.student_id:
            qs = qs.filter(student_id=self.student_id)

        # Only active enrollments
        qs = qs.filter(enrollment_status='enrolled')

        return qs.order_by('classroom__grade_level', 'classroom__name', 'student__last_name', 'student__first_name')

    def get_data(self):
        """Get structured data for SF1"""
        enrollments = self.get_queryset()

        # Group by classroom
        by_classroom = defaultdict(list)
        for enrollment in enrollments:
            by_classroom[enrollment.classroom].append(enrollment)

        result = []
        for classroom, enrollments_list in by_classroom.items():
            adviser = classroom.teacher
            adviser_name = ''
            if adviser:
                adviser_name = f"{adviser.first_name} {adviser.last_name}".strip()

            students_data = []
            for idx, enrollment in enumerate(enrollments_list, 1):
                student = enrollment.student
                profile = getattr(student, 'profile', None)
                user = getattr(student, 'user', None)

                if not profile:
                    lrn = profile.lrn
                    sex = profile.sex
                    birthdate = profile.date_of_birth
                    age = None
                    if birthdate:
                        from datetime import date
                        today = date.today()
                        age = today.year - birthdate.year - (
                            (today.month, today.day) < (birthdate.month, birthdate.day)
                        )
                else:
                    lrn = ''
                    sex = ''
                    birthdate = None
                    age = None

                student_name = ''
                if user:
                    student_name = f"{user.last_name}, {user.first_name}"
                    if user.middle_name:
                        student_name += f" {user.middle_name[0]}."

                enrollment_status = enrollment.enrollment_status or 'enrolled'

                students_data.append({
                    'no': idx,
                    'lrn': lrn,
                    'name': student_name,
                    'sex': sex,
                    'birthdate': birthdate,
                    'age': age,
                    'grade_level': classroom.grade_level,
                    'section': classroom.name,
                    'adviser': adviser_name,
                    'enrollment_status': enrollment_status,
                })

            result.append({
                'classroom': {
                    'id': classroom.id,
                    'grade_level': classroom.grade_level,
                    'section': classroom.name,
                    'adviser': adviser_name,
                    'academic_year': str(classroom.academic_year) if classroom.academic_year else '',
                },
                'students': students_data,
            })

        return result

    def validate(self):
        """Validate data before generation"""
        errors = []
        warnings = []

        enrollments = self.get_queryset()

        # Check for missing LRNs
        missing_lrn = enrollments.filter(student__profile__lrn='').count()
        if missing_lrn:
            warnings.append(f"{missing_lrn} students missing LRN")

        # Check for missing profiles
        missing_profile = enrollments.filter(student__profile__isnull=True).count()
        if missing_profile:
            warnings.append(f"{missing_profile} students missing profile")

        # Check for missing advisers
        missing_adviser = enrollments.filter(classroom__teacher__isnull=True).count()
        if missing_adviser:
            warnings.append(f"{missing_adviser} students in sections without adviser")

        # Check for duplicate LRNs
        from django.db.models import Count
        duplicate_lrns = Profile.objects.filter(
            user__studentclassenrollment__in=enrollments
        ).values('lrn').annotate(count=Count('id')).filter(count__gt=1)
        if duplicate_lrns.exists():
            errors.append(f"Duplicate LRNs found: {list(duplicate_lrns.values_list('lrn', flat=True))}")

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'total_students': enrollments.count(),
            'total_sections': enrollments.values('classroom').distinct().count(),
        }

    def get_filters_metadata(self):
        """Get available filter options"""
        return {
            'academic_years': list(AcademicYear.objects.filter(is_active=True).values('id', 'name')),
            'grade_levels': list(Classroom.objects.values_list('grade_level', flat=True).distinct().order_by('grade_level')),
            'sections': list(Classroom.objects.values_list('name', flat=True).distinct().order_by('name')),
            'advisers': list(User.objects.filter(role='staff', classroom__isnull=False).distinct().values('id', 'first_name', 'last_name')),
        }


# Convenience function
def generate_sf1(academic_year=None, grade_level=None, section=None, adviser=None, student_id=None):
    service = SF1SchoolRegisterService(
        academic_year=academic_year,
        grade_level=grade_level,
        section=section,
        adviser=adviser,
        student_id=student_id,
    )
    return {
        'data': service.get_data(),
        'validation': service.validate(),
        'filters': service.get_filters_metadata(),
    }