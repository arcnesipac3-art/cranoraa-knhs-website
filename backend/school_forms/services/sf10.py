"""
SF10 - Permanent Academic Record Service
Generates complete academic history for a student.
"""
from collections import defaultdict, OrderedDict
from django.db.models import Q, Avg, Count

from accounts.models import (
    Grade, StudentClassEnrollment, Classroom, AcademicYear,
    EnrollmentApplication, Transcript, TranscriptLineItem,
)
from accounts.roles import Role


class SF10PermanentRecordService:
    """SF10 - Permanent Academic Record"""

    def __init__(self, student_id):
        self.student_id = student_id

    def _get_student(self):
        from accounts.models import User
        try:
            return User.objects.get(id=self.student_id, role=Role.STUDENT)
        except User.DoesNotExist:
            return None

    def _get_enrollments(self):
        """Get all enrollment history for the student"""
        return StudentClassEnrollment.objects.filter(
            student_id=self.student_id
        ).select_related(
            'classroom',
            'classroom__academic_year',
            'classroom__teacher',
            'classroom__teacher__profile',
        ).prefetch_related(
            'classroom__subjects'
        ).order_by('-enrolled_at')

    def _get_transcript(self):
        """Get official transcript if available"""
        return Transcript.objects.filter(student_id=self.student_id).first()

    def get_student_info(self):
        student = self._get_student()
        if not student:
            return None

        profile = getattr(student, 'profile', None)
        user = student.user if hasattr(student, 'user') else student

        return {
            'student': {
                'id': student.id,
                'first_name': user.first_name or '',
                'middle_name': user.middle_name or '',
                'last_name': user.last_name or '',
                'suffix': user.suffix or '',
                'lrn': profile.lrn if profile else '',
                'birthdate': profile.date_of_birth if profile else None,
                'sex': profile.sex if profile else '',
                'grade_level': profile.grade_level if profile else '',
                'school_name': 'Kiwalan National High School',
                'profile_picture': profile.profile_picture if profile else None,
            }
        }

    def get_enrollment_history(self):
        """Get all enrollment records"""
        enrollments = self._get_enrollments()

        history = []
        for enrollment in enrollments:
            academic_year = enrollment.classroom.academic_year

            history.append({
                'academic_year': str(academic_year) if academic_year else '',
                'grade_level': enrollment.classroom.grade_level,
                'section': enrollment.classroom.name,
                'adviser': enrollment.classroom.teacher,
                'enrollment_status': enrollment.enrollment_status,
                'enrolled_at': enrollment.enrolled_at,
                'gpa': enrollment.gpa,
                'subjects': self._get_subjects_for_enrollment(enrollment),
            })

        return history

    def _get_subjects_for_enrollment(self, enrollment):
        """Get grades for a specific enrollment"""
        grades = Grade.objects.filter(
            student=enrollment.student,
            classroom=enrollment.classroom,
        ).select_related('subject').order_by('subject__name', 'quarter')

        subjects = defaultdict(dict)
        for grade in grades:
            subjects[grade.subject.name if grade.subject else 'Unknown'][f'q{grade.quarter}'] = grade.grade

        result = []
        for subject_name, grade_data in sorted(subjects.items()):
            final_grade = grade_data.get('final', grade_data.get('4'))
            quarters = [grade_data.get(f'q{q}') for q in [1, 2, 3, 4]]
            general_avg = final_grade or round(sum(filter(None, quarters)) / max(1, len([g for g in quarters if g is not None])), 2) if quarters else None

            result.append({
                'subject': subject_name,
                'quarter_grades': quarters,
                'final_grade': final_grade,
                'general_average': general_avg,
                'remarks': 'PASSED' if final_grade and final_grade >= 75 else 'FAILED',
            })

        return result

    def get_promotion_history(self):
        """Track promotion/retention history"""
        enrollments = self._get_enrollments()

        history = []
        for enrollment in enrollments:
            grades = Grade.objects.filter(
                student=enrollment.student,
                classroom=enrollment.classroom,
                grade_type='final_grade',
            )

            if not grades.exists():
                history.append({
                    'academic_year': str(enrollment.classroom.academic_year) if enrollment.classroom.academic_year else '',
                    'grade_level': enrollment.classroom.grade_level,
                    'section': enrollment.classroom.name,
                    'promotion_status': 'No Data',
                })
                continue

            total_avg = grades.aggregate(Avg('grade'))['grade__avg'] or 0
            failed = grades.filter(grade__lt=75).count()

            if total_avg >= 75 and failed == 0:
                status = 'Promoted'
            elif total_avg >= 75 and failed > 0:
                status = 'Conditional'
            else:
                status = 'Retained'

            history.append({
                'academic_year': str(enrollment.classroom.academic_year) if enrollment.classroom.academic_year else '',
                'grade_level': enrollment.classroom.grade_level,
                'section': enrollment.classroom.name,
                'gpa': round(total_avg, 2),
                'promotion_status': status,
            })

        return history

    def get_school_transfers(self):
        """Get school transfer history (if any)"""
        return EnrollmentApplication.objects.filter(
            student_id=self.student_id
        ).exclude(
            enrollment_type='new'
        ).values(
            'academic_year',
            'from_school',
            'enrollment_type',
            'status',
        )

    def get_data(self):
        """Main data retrieval for SF10"""
        student = self._get_student()
        if not student:
            return {'error': 'Student not found'}

        return {
            'student_info': self.get_student_info(),
            'enrollment_history': self.get_enrollment_history(),
            'promotion_history': self.get_promotion_history(),
            'school_transfers': list(self.get_school_transfers()),
            'transcript': self._get_transcript(),
        }

    def validate(self):
        student = self._get_student()
        warnings = []

        if not student:
            warnings.append("Student not found")
            return {'valid': False, 'warnings': warnings}

        enrollments = self._get_enrollments()
        if not enrollments.exists():
            warnings.append("No enrollment records found")

        grades = Grade.objects.filter(student=student)
        missing_grade_subjects = grades.filter(grade__isnull=True).count()
        if missing_grade_subjects:
            warnings.append(f"{missing_grade_subjects} subjects have missing grades")

        return {
            'valid': len(warnings) == 0,
            'warnings': warnings,
            'total_enrollments': enrollments.count(),
            'total_subjects_graded': grades.exclude(grade__isnull=True).count(),
        }

    def get_filters_metadata(self):
        return {
            'student_info': self.get_student_info(),
            'promotion_history': self.get_promotion_history(),
        }


def generate_sf10(student_id):
    service = SF10PermanentRecordService(student_id=student_id)
    return {
        'data': service.get_data(),
        'validation': service.validate(),
        'filters': service.get_filters_metadata(),
    }