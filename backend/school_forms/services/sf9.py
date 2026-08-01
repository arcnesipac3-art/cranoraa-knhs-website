"""
SF9 - Learner Progress Report Card Service
Generates official report cards with grades, attendance, core values.
"""
from collections import defaultdict
from django.db.models import Avg, Count

from accounts.models import (
    Grade, StudentClassEnrollment, Classroom, AcademicYear,
    Attendance, Profile, CoreValuesGrade,
)


class SF9ReportCardService:
    """SF9 - Learner Progress Report Card"""

    def __init__(self, student_id, academic_year=None):
        self.student_id = student_id
        self.academic_year_id = academic_year

        self._enrollment = None
        self._student = None
        self._profile = None

    def _get_enrollment(self):
        if self._enrollment is not None:
            return self._enrollment

        qs = StudentClassEnrollment.objects.select_related(
            'student', 'student__user', 'student__profile',
            'classroom', 'classroom__academic_year',
            'classroom__teacher', 'classroom__teacher__profile',
        ).prefetch_related(
            'student__grade_set__subject',
            'student__attendance_set__schedule__subject',
        )

        if self.academic_year_id:
            qs = qs.filter(classroom__academic_year_id=self.academic_year_id)
        else:
            qs = qs.filter(classroom__academic_year__is_active=True)

        self._enrollment = qs.filter(student_id=self.student_id).first()
        return self._enrollment

    def _get_student(self):
        if self._student is None:
            enrollment = self._get_enrollment()
            if enrollment:
                self._student = enrollment.student
        return self._student

    def _get_profile(self):
        if self._profile is None:
            student = self._get_student()
            if student:
                self._profile = getattr(student, 'profile', None)
        return self._profile

    def get_student_info(self):
        """Get student information block for SF9"""
        student = self._get_student()
        profile = self._get_profile()
        enrollment = self._get_enrollment()

        if not student:
            return None

        user = student.user if hasattr(student, 'user') else None

        return {
            'student': {
                'id': student.id,
                'first_name': user.first_name if user else '',
                'middle_name': user.middle_name if user else '',
                'last_name': user.last_name if user else '',
                'suffix': user.suffix if user else '',
                'lrn': profile.lrn if profile else '',
                'birthdate': profile.date_of_birth if profile else None,
                'sex': profile.sex if profile else '',
                'age': None,
                'grade_level': enrollment.classroom.grade_level if enrollment else '',
                'section': enrollment.classroom.name if enrollment else '',
                'adviser': None,
                'enrollment_status': enrollment.enrollment_status if enrollment else '',
            }
        }

    def get_quarter_grades(self):
        """Get grades organized by quarter"""
        enrollment = self._get_enrollment()
        if not enrollment:
            return {}

        student = enrollment.student
        classroom = enrollment.classroom

        grades = Grade.objects.filter(
            student=student,
            classroom=classroom,
        ).select_related('subject').order_by('subject__name', 'quarter')

        quarters = defaultdict(list)
        for grade in grades:
            quarters[grade.quarter].append({
                'subject': grade.subject.name if grade.subject else '',
                'subject_code': grade.subject.code if grade.subject else '',
                'component_type': grade.grade_type,
                'grade': grade.grade,
                'raw_score': grade.raw_score,
                'total_score': grade.total_score,
            })

        return dict(quarters)

    def get_final_grades(self):
        """Get final grades per subject"""
        enrollment = self._get_enrollment()
        if not enrollment:
            return []

        student = enrollment.student
        classroom = enrollment.classroom

        grades = Grade.objects.filter(
            student=student,
            classroom=classroom,
            grade_type='final_grade',
        ).select_related('subject')

        final_grades = []
        for grade in grades:
            final_grades.append({
                'subject': grade.subject.name if grade.subject else '',
                'subject_code': grade.subject.code if grade.subject else '',
                'final_grade': grade.grade,
                'remarks': 'PASSED' if grade.grade and grade.grade >= 75 else 'FAILED',
            })

        return final_grades

    def get_general_average(self):
        """Compute general average"""
        final_grades = self.get_final_grades()
        if not final_grades:
            return None

        total = sum(g['final_grade'] for g in final_grades if g['final_grade'] is not None)
        return round(total / len(final_grades), 2)

    def get_attendance_summary(self):
        """Get attendance summary for the school year"""
        enrollment = self._get_enrollment()
        if not enrollment:
            return {}

        student = enrollment.student
        classroom = enrollment.classroom

        attendance_qs = Attendance.objects.filter(
            student=student,
            classroom=classroom,
        )

        total_days = attendance_qs.count()
        present = attendance_qs.filter(status='present').count()
        absent = attendance_qs.filter(status='absent').count()
        late = attendance_qs.filter(status='late').count()
        excused = attendance_qs.filter(status='excused').count()

        return {
            'total_days': total_days,
            'present': present,
            'absent': absent,
            'late': late,
            'excused': excused,
            'attendance_rate': round(present / max(1, total_days) * 100, 2) if total_days > 0 else 0,
        }

    def get_core_values(self):
        """Get core values grades"""
        enrollment = self._get_enrollment()
        if not enrollment:
            return {}

        student = enrollment.student

        cv_grades = CoreValuesGrade.objects.filter(
            student=student,
            classroom=classroom if hasattr(self, 'classroom') else None,
        ).first()

        if cv_grades is None:
            return {}

        return {
            'maka_diyos': getattr(cv_grades, 'maka_diyos', ''),
            'maka_tao': getattr(cv_grades, 'maka_tao', ''),
            'maka_bayan': getattr(cv_grades, 'maka_bayan', ''),
            'maka_kalikasan': getattr(cv_grades, 'maka_kalikasan', ''),
        }

    def get_remarks(self):
        """Get adviser remarks"""
        enrollment = self._get_enrollment()
        if not enrollment or not enrollment.classroom.teacher:
            return {
                'adviser_name': '',
                'adviser_remarks': '',
            }

        teacher = enrollment.classroom.teacher
        adviser_name = f"{teacher.first_name} {teacher.last_name}".strip()

        return {
            'adviser_name': adviser_name,
            'adviser_remarks': '',  # To be filled by adviser
            'principal_name': '',  # To be filled by principal
            'school_name': 'Kiwalan National High School',
        }

    def get_data(self):
        """Main data retrieval for SF9"""
        enrollment = self._get_enrollment()
        if not enrollment:
            return {'error': 'Enrollment not found'}

        return {
            'student_info': self.get_student_info(),
            'quarter_grades': self.get_quarter_grades(),
            'final_grades': self.get_final_grades(),
            'general_average': self.get_general_average(),
            'attendance_summary': self.get_attendance_summary(),
            'core_values': self.get_core_values(),
            'remarks': self.get_remarks(),
            'academic_year': str(enrollment.classroom.academic_year) if enrollment.classroom.academic_year else '',
        }

    def validate(self):
        enrollment = self._get_enrollment()
        warnings = []

        if not enrollment:
            warnings.append("No enrollment record found")
            return {'valid': False, 'warnings': warnings}

        student = enrollment.student
        profile = self._get_profile()

        if not profile:
            warnings.append("Student profile is incomplete")

        grades = Grade.objects.filter(student=student, classroom=enrollment.classroom)
        missing_subjects = grades.filter(grade__isnull=True).count()
        if missing_subjects:
            warnings.append(f"{missing_subjects} subjects have missing grades")

        attendance_total = Attendance.objects.filter(
            student=student, classroom=enrollment.classroom
        ).count()
        if attendance_total == 0:
            warnings.append("No attendance records found")

        return {
            'valid': len(warnings) == 0,
            'warnings': warnings,
        }


def generate_sf9(student_id, academic_year=None):
    service = SF9ReportCardService(student_id=student_id, academic_year=academic_year)
    return {
        'data': service.get_data(),
        'validation': service.validate(),
    }