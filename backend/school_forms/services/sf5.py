"""
SF5 - Report on Promotion and Learning Progress Service
Computes promotion status from grades and attendance.
"""
from collections import defaultdict
from django.db.models import Avg, Count, Q

from accounts.models import Grade, StudentClassEnrollment, Classroom, AcademicYear, Profile


class SF5PromotionService:
    """SF5 - Promotion and Learning Progress Report"""

    def __init__(self, academic_year=None, grade_level=None, section=None, adviser=None):
        self.academic_year_id = academic_year
        self.grade_level = grade_level
        self.section = section
        self.adviser = adviser

    def _get_enrollments(self):
        qs = StudentClassEnrollment.objects.select_related(
            'student', 'student__user', 'student__profile',
            'classroom', 'classroom__academic_year', 'classroom__teacher',
        ).prefetch_related(
            'student__grade_set__subject',
        ).order_by('student__last_name', 'student__first_name')

        if self.academic_year_id:
            qs = qs.filter(classroom__academic_year_id=self.academic_year_id)
        else:
            qs = qs.filter(classroom__academic_year__is_active=True)

        if self.grade_level:
            qs = qs.filter(classroom__grade_level=self.grade_level)
        if self.section:
            qs = qs.filter(classroom__name=self.section)
        if self.adviser:
            qs = qs.filter(classroom__teacher_id=self.adviser)

        return qs

    def compute_gpa(self, grade_score):
        """Convert numeric grade to GPA (DepEd scale)"""
        if grade_score >= 90:
            return 1.00
        elif grade_score >= 85:
            return 1.25
        elif grade_score >= 80:
            return 1.50
        elif grade_score >= 75:
            return 1.75
        elif grade_score >= 70:
            return 2.00
        elif grade_score >= 65:
            return 2.25
        elif grade_score >= 60:
            return 2.50
        elif grade_score >= 55:
            return 2.75
        elif grade_score >= 50:
            return 3.00
        elif grade_score >= 40:
            return 4.00
        else:
            return 5.00

    def compute_remarks(self, general_average):
        """Determine passing/failing based on DepEd standard (75 passing)"""
        return 'PASSED' if general_average >= 75 else 'FAILED'

    def compute_promotion_status(self, student_enrollments):
        """Determine promotion: Promoted, Retained, Conditional"""
        if not student_enrollments:
            return {'status': 'Unknown', 'reason': 'No records'}

        total_avg = 0
        total_subjects = 0
        failed_subjects = 0

        for enrollment in student_enrollments:
            grades = Grade.objects.filter(
                student=enrollment.student,
                classroom=enrollment.classroom,
                quarter='4',
            )

            if not grades.exists():
                continue

            avg = grades.aggregate(Avg('grade'))['grade__avg'] or 0
            total_avg += avg
            total_subjects += 1

            if avg < 75:
                failed_subjects += 1

        if total_subjects == 0:
            return {'status': 'No Data', 'reason': 'No grades recorded'}

        general_average = total_avg / total_subjects
        remarks = self.compute_remarks(general_average)

        if general_average >= 75 and failed_subjects == 0:
            return {'status': 'Promoted', 'general_average': round(general_average, 2), 'remarks': remarks}
        elif general_average >= 75 and failed_subjects > 0:
            return {'status': 'Conditional', 'general_average': round(general_average, 2), 'remarks': remarks, 'failed_count': failed_subjects}
        else:
            return {'status': 'Retained', 'general_average': round(general_average, 2), 'remarks': remarks}

    def get_class_summary(self, enrollments=None):
        """Class-wide promotion summary"""
        if enrollments is None:
            enrollments = self._get_enrollments()

        promoted = 0
        retained = 0
        conditional = 0
        no_data = 0
        total_avg = 0

        for enrollment in enrollments:
            grades = Grade.objects.filter(
                student=enrollment.student,
                classroom=enrollment.classroom,
            ).aggregate(Avg('grade'))['grade__avg']

            if grades is None:
                no_data += 1
                continue

            total_avg += grades
            result = self.compute_promotion_status([enrollment])

            if result['status'] == 'Promoted':
                promoted += 1
            elif result['status'] == 'Retained':
                retained += 1
            elif result['status'] == 'Conditional':
                conditional += 1

        total = promoted + retained + conditional + no_data
        return {
            'total_students': total,
            'promoted': promoted,
            'retained': retained,
            'conditional': conditional,
            'no_data': no_data,
            'class_average': round(total_avg / max(1, total), 2),
            'promotion_rate': round(promoted / max(1, total) * 100, 2),
        }

    def get_data(self):
        """Main data retrieval"""
        enrollments = self._get_enrollments()

        # Group by student
        student_enrollments_map = defaultdict(list)
        for enrollment in enrollments.select_related('student__profile', 'student__user'):
            student_enrollments_map[enrollment.student.id].append(enrollment)

        results = []
        for student_id, student_enrollments in student_enrollments_map.items():
            enrollment = student_enrollments[0]
            student = enrollment.student
            profile = getattr(student, 'profile', None)

            student_name = f"{student.last_name}, {student.first_name}"
            if profile and profile.middle_name:
                student_name += f" {profile.middle_name[0]}."

            lrn = profile.lrn if profile else ''
            sex = profile.sex if profile else ''
            birthdate = profile.date_of_birth if profile else None
            age = None
            if birthdate:
                today = __import__('datetime').date.today()
                age = today.year - birthdate.year - (
                    (today.month, today.day) < (birthdate.month, birthdate.day)
                )

            promotion = self.compute_promotion_status(student_enrollments)

            # Get per-subject grades
            subject_grades = []
            for sub_enrollment in student_enrollments:
                grades = Grade.objects.filter(
                    student=student,
                    classroom=sub_enrollment.classroom,
                ).select_related('subject')

                for grade in grades:
                    subject_grades.append({
                        'subject': grade.subject.name if grade.subject else '',
                        'subject_code': grade.subject.code if grade.subject else '',
                        'quarter': grade.quarter,
                        'grade': grade.grade,
                    })

            results.append({
                'student': {
                    'id': student.id,
                    'name': student_name,
                    'lrn': lrn,
                    'sex': sex,
                    'birthdate': birthdate,
                    'age': age,
                },
                'classroom': {
                    'name': enrollment.classroom.name,
                    'grade_level': enrollment.classroom.grade_level,
                },
                'promotion_status': promotion,
                'subject_grades': subject_grades,
            })

        return {
            'students': results,
            'class_summary': self.get_class_summary(enrollments),
        }

    def validate(self):
        enrollments = self._get_enrollments()
        warnings = []

        missing_grades = enrollments.filter(
            student__grade__isnull=True
        ).distinct().count()
        if missing_grades:
            warnings.append(f"{missing_grades} students have no grades recorded")

        missing_profiles = enrollments.filter(student__profile__isnull=True).count()
        if missing_profiles:
            warnings.append(f"{missing_profiles} students missing profiles")

        return {
            'valid': len(warnings) == 0,
            'warnings': warnings,
            'total_students': enrollments.count(),
        }

    def get_filters_metadata(self):
        return {
            'academic_years': list(AcademicYear.objects.filter(is_active=True).values('id', 'name')),
            'grade_levels': list(Classroom.objects.values_list('grade_level', flat=True).distinct().order_by('grade_level')),
            'sections': list(Classroom.objects.values_list('name', flat=True).distinct().order_by('name')),
            'advisers': list(__import__('accounts.models', fromlist=['User']).User.objects.filter(role='staff', classroom__isnull=False).distinct().values('id', 'first_name', 'last_name')),
        }


def generate_sf5(academic_year=None, grade_level=None, section=None, adviser=None):
    service = SF5PromotionService(
        academic_year=academic_year,
        grade_level=grade_level,
        section=section,
        adviser=adviser,
    )
    return {
        'data': service.get_data(),
        'validation': service.validate(),
        'filters': service.get_filters_metadata(),
    }