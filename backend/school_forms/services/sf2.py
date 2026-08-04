from datetime import date, timedelta, datetime
from calendar import monthrange
from django.db.models import Q, Count, Case, When, IntegerField, F
from django.db.models.functions import TruncMonth

from accounts.models import (
    User, Profile, Classroom, StudentClassEnrollment,
    Attendance, AcademicYear, Schedule, TimeSlot, Subject
)
from accounts.models.attendance import AbsenceExcuse


class SF2DailyAttendanceReportService:
    """SF2 - Daily Attendance Report Service"""

    def __init__(self, academic_year=None, grade_level=None, section=None, adviser=None,
                 start_date=None, end_date=None, report_type='daily'):
        self.academic_year_id = academic_year
        self.grade_level = grade_level
        self.section = section
        self.adviser = adviser
        self.start_date = start_date
        self.end_date = end_date
        self.report_type = report_type  # daily, monthly, quarterly

        self._queryset = None

    def get_queryset(self):
        if self._queryset is not None:
            return self._queryset

        qs = StudentClassEnrollment.objects.select_related(
            'student', 'student__profile', 'classroom',
            'classroom__teacher', 'classroom__teacher__profile',
            'classroom__academic_year'
        )

        if self.academic_year_id:
            qs = qs.filter(classroom__academic_year_id=self.academic_year_id)
        elif AcademicYear.objects.filter(is_active=True).exists():
            qs = qs.filter(classroom__academic_year__is_active=True)

        if self.grade_level:
            qs = qs.filter(classroom__grade_level=self.grade_level)
        if self.section:
            qs = qs.filter(classroom__name=self.section)
        if self.adviser:
            qs = qs.filter(classroom__teacher_id=self.adviser)

        self._queryset = qs
        return qs

    def get_date_range(self):
        """Determine date range for report"""
        if self.start_date and self.end_date:
            # Parse string dates to date objects
            try:
                start = datetime.strptime(str(self.start_date), '%Y-%m-%d').date()
                end = datetime.strptime(str(self.end_date), '%Y-%m-%d').date()
                return start, end
            except (ValueError, TypeError):
                pass

        # Default to current academic year
        ay = AcademicYear.objects.filter(is_active=True).first()
        if ay:
            return ay.start_date, ay.end_date

        # Fallback to current month
        today = date.today()
        start = date(today.year, today.month, 1)
        end = date(today.year, today.month, monthrange(today.year, today.month)[1])
        return start, end

    def get_attendance_data(self):
        """Get attendance records for enrolled students in date range"""
        enrollments = self.get_queryset()
        student_ids = list(enrollments.values_list('student_id', flat=True))

        if not student_ids:
            return []

        start_date, end_date = self.get_date_range()

        attendance_qs = Attendance.objects.filter(
            student_id__in=student_ids,
            date__range=[start_date, end_date]
        ).select_related('schedule', 'schedule__subject', 'schedule__time_slot')

        if self.report_type == 'monthly':
            attendance_qs = attendance_qs.annotate(month=TruncMonth('date'))
        elif self.report_type == 'quarterly':
            # Approximate quarters
            pass

        return list(attendance_qs)

    def build_student_matrix(self):
        """Build student x date matrix with attendance status"""
        enrollments = self.get_queryset()
        attendance_records = self.get_attendance_data()
        start_date, end_date = self.get_date_range()

        # Create date list
        dates = []
        current = start_date
        while current <= end_date:
            dates.append(current)
            current += timedelta(days=1)

        # Build lookup: (student_id, date) -> attendance
        attendance_lookup = {}
        for att in attendance_records:
            key = (att.student_id, att.date)
            attendance_lookup[key] = att

        # Build student data
        students = []
        for enrollment in enrollments:
            student = enrollment.student
            profile = getattr(student, 'profile', None)

            student_name = ''
            if student.first_name or student.last_name:
                student_name = f"{student.last_name}, {student.first_name}"
                if student.middle_name:
                    student_name += f" {student.middle_name[0]}."

            lrn = profile.lrn if profile else ''

            # Build daily attendance
            daily_attendance = []
            for d in dates:
                att = attendance_lookup.get((student.id, d))
                if att:
                    daily_attendance.append({
                        'date': d,
                        'status': att.status,
                        'subject': att.schedule.subject.name if att.schedule and att.schedule.subject else None,
                        'time_slot': att.schedule.time_slot.label if att.schedule and att.schedule.time_slot else None,
                    })
                else:
                    # No record = not yet recorded
                    daily_attendance.append({
                        'date': d,
                        'status': None,
                        'subject': None,
                        'time_slot': None,
                    })

            students.append({
                'id': student.id,
                'lrn': lrn,
                'name': student_name,
                'grade_level': enrollment.classroom.grade_level,
                'section': enrollment.classroom.name,
                'daily_attendance': daily_attendance,
            })

        return {
            'dates': dates,
            'start_date': start_date,
            'end_date': end_date,
            'students': students,
            'report_type': self.report_type,
        }

    def get_summary_stats(self):
        """Compute attendance summary"""
        enrollments = self.get_queryset()
        attendance_records = self.get_attendance_data()
        start_date, end_date = self.get_date_range()

        total_students = enrollments.count()
        total_days = (end_date - start_date).days + 1

        # Count by status
        status_counts = Attendance.objects.filter(
            student_id__in=enrollments.values_list('student_id', flat=True),
            date__range=[start_date, end_date]
        ).values('status').annotate(count=Count('id'))

        stats = {item['status']: item['count'] for item in status_counts}
        present = stats.get('present', 0)
        absent = stats.get('absent', 0)
        late = stats.get('late', 0)
        excused = stats.get('excused', 0)

        # Per student summary
        student_summaries = []
        for enrollment in enrollments:
            student_atts = [a for a in attendance_records if a.student_id == enrollment.student_id]
            s_present = sum(1 for a in student_atts if a.status == 'present')
            s_absent = sum(1 for a in student_atts if a.status == 'absent')
            s_late = sum(1 for a in student_atts if a.status == 'late')
            s_excused = sum(1 for a in student_atts if a.status == 'excused')

            student_summaries.append({
                'student_id': enrollment.student_id,
                'name': f"{enrollment.student.last_name}, {enrollment.student.first_name}",
                'present': s_present,
                'absent': s_absent,
                'late': s_late,
                'excused': s_excused,
                'total_recorded': len(student_atts),
            })

        return {
            'total_students': total_students,
            'total_days': total_days,
            'total_possible': total_students * total_days,
            'present': present,
            'absent': absent,
            'late': late,
            'excused': excused,
            'attendance_rate': round(present / max(1, present + absent + late + excused) * 100, 2),
            'student_summaries': student_summaries,
        }

    def get_data(self):
        """Main entry point"""
        matrix = self.build_student_matrix()
        summary = self.get_summary_stats()
        return {
            'matrix': matrix,
            'summary': summary,
        }

    def validate(self):
        errors = []
        warnings = []

        enrollments = self.get_queryset()
        if not enrollments.exists():
            warnings.append("No students found for the selected filters")

        start_date, end_date = self.get_date_range()
        if not AcademicYear.objects.filter(is_active=True).exists():
            warnings.append("No active academic year found")

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'total_students': enrollments.count(),
            'date_range': f"{start_date} to {end_date}",
        }

    def get_filters_metadata(self):
        return {
            'academic_years': list(AcademicYear.objects.filter(is_active=True).values('id', 'name')),
            'grade_levels': list(Classroom.objects.values_list('grade_level', flat=True).distinct().order_by('grade_level')),
            'sections': list(Classroom.objects.values_list('name', flat=True).distinct().order_by('name')),
            'advisers': list(User.objects.filter(role='staff', teaching_classroom__isnull=False).distinct().values('id', 'first_name', 'last_name')),
        }


def generate_sf2(academic_year=None, grade_level=None, section=None, adviser=None,
                 start_date=None, end_date=None, report_type='daily'):
    service = SF2DailyAttendanceReportService(
        academic_year=academic_year,
        grade_level=grade_level,
        section=section,
        adviser=adviser,
        start_date=start_date,
        end_date=end_date,
        report_type=report_type,
    )
    return {
        'data': service.get_data(),
        'validation': service.validate(),
        'filters': service.get_filters_metadata(),
    }