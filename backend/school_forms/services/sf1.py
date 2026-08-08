"""
SF1 - School Register Service
Generates class register using enrolled students.
Data source: StudentClassEnrollment + Profile + User + Classroom + EnrollmentApplication
"""
import logging
from collections import defaultdict
from datetime import date
from django.db.models import Prefetch, Count
from accounts.models import (
    StudentClassEnrollment,
    Classroom,
    AcademicYear,
    User,
    Profile,
    EnrollmentApplication,
    SystemSetting,
)

logger = logging.getLogger(__name__)


_UNSET = object()


class SF1SchoolRegisterService:
    """Service for generating SF1 - School Register"""

    def __init__(self, academic_year=None, grade_level=None, section=None, adviser=None, student_id=None):
        self.academic_year = academic_year
        self.grade_level = grade_level
        self.section = section
        self.adviser = adviser
        self.student_id = student_id
        self._resolved_academic_year = _UNSET

    def _resolve_academic_year(self):
        """Resolve the academic year to use, with fallback to active year."""
        if self._resolved_academic_year is not _UNSET:
            return self._resolved_academic_year

        ay_id = self.academic_year
        if ay_id:
            try:
                self._resolved_academic_year = AcademicYear.objects.get(pk=ay_id)
            except (AcademicYear.DoesNotExist, ValueError, TypeError):
                self._resolved_academic_year = AcademicYear.objects.filter(is_active=True).first()
        else:
            self._resolved_academic_year = AcademicYear.objects.filter(is_active=True).first()

        return self._resolved_academic_year

    def _ensure_classrooms_linked(self):
        """Auto-assign academic year to classrooms that have NULL academic_year."""
        try:
            ay = self._resolve_academic_year()
            if not ay:
                return
            updated = Classroom.objects.filter(
                academic_year__isnull=True
            ).update(academic_year=ay)
            if updated:
                logger.info("SF1: Linked %d orphaned classrooms to academic year %s", updated, ay)
        except Exception as e:
            logger.warning("SF1: Failed to link classrooms: %s", e)

    def get_queryset(self):
        """Get filtered enrollments with related data, with fallback strategies."""
        self._ensure_classrooms_linked()

        ay = self._resolve_academic_year()

        qs = StudentClassEnrollment.objects.select_related(
            'student',
            'classroom',
            'classroom__academic_year',
            'classroom__teacher',
        )

        # Strategy 1: Filter by explicit academic year
        if ay:
            qs_filtered = qs.filter(classroom__academic_year=ay)
        else:
            qs_filtered = qs

        if self.grade_level:
            qs_filtered = qs_filtered.filter(classroom__grade_level=self.grade_level)
        if self.section:
            qs_filtered = qs_filtered.filter(classroom__name__icontains=self.section)
        if self.adviser:
            qs_filtered = qs_filtered.filter(classroom__teacher=self.adviser)
        if self.student_id:
            qs_filtered = qs_filtered.filter(student_id=self.student_id)

        if qs_filtered.exists():
            return qs_filtered.order_by('classroom__grade_level', 'classroom__name', 'student__last_name', 'student__first_name')

        # Strategy 2: Try without academic year filter (classrooms may have different years)
        qsFallback = StudentClassEnrollment.objects.select_related(
            'student', 'classroom', 'classroom__academic_year', 'classroom__teacher',
        )
        if self.grade_level:
            qsFallback = qsFallback.filter(classroom__grade_level=self.grade_level)
        if self.section:
            qsFallback = qsFallback.filter(classroom__name__icontains=self.section)
        if self.adviser:
            qsFallback = qsFallback.filter(classroom__teacher=self.adviser)
        if self.student_id:
            qsFallback = qsFallback.filter(student_id=self.student_id)

        if qsFallback.exists():
            logger.info("SF1: Falling back to enrollments without academic_year filter")
            return qsFallback.order_by('classroom__grade_level', 'classroom__name', 'student__last_name', 'student__first_name')

        # Strategy 3: Return all enrollments (last resort)
        qsAll = StudentClassEnrollment.objects.select_related(
            'student', 'classroom', 'classroom__academic_year', 'classroom__teacher',
        )
        if self.student_id:
            qsAll = qsAll.filter(student_id=self.student_id)

        return qsAll.order_by('classroom__grade_level', 'classroom__name', 'student__last_name', 'student__first_name')

    def _compute_age(self, birthdate):
        if not birthdate:
            return None
        today = date.today()
        return today.year - birthdate.year - (
            (today.month, today.day) < (birthdate.month, birthdate.day)
        )

    def _get_student_data(self, student, enrollment):
        """Extract all SF1 fields for a student from Profile + EnrollmentApplication"""
        profile = getattr(student, 'profile', None)

        lrn = ''
        sex = ''
        birthdate = None
        age = None
        mother_tongue = ''
        indigenous_people = ''
        religion = ''
        extension_name = ''
        middle_name = ''
        address_full = ''
        house_number = ''
        street = ''
        barangay = ''
        city_municipality = ''
        province = ''
        father_name = ''
        mother_name = ''
        guardian_name = ''
        guardian_relationship = ''
        contact_number = ''
        learning_modality = 'Face to Face'

        if profile:
            lrn = profile.lrn or ''
            sex = (profile.sex or '').title()
            birthdate = profile.date_of_birth
            age = self._compute_age(birthdate)
            mother_tongue = profile.mother_tongue or ''
            indigenous_people = profile.indigenous_people or ''
            religion = profile.religion or ''
            extension_name = profile.extension_name or ''
            middle_name = profile.middle_name or ''
            father_name = profile.father_name or ''
            mother_name = profile.mother_name or ''
            contact_number = profile.phone_number or ''
            address_full = profile.address or ''

        # Try to get additional data from EnrollmentApplication
        app = None
        try:
            app = EnrollmentApplication.objects.filter(
                enrolled_student=student, status='enrolled'
            ).first()
        except Exception:
            pass

        if app:
            if not father_name:
                father_name = app.father_name or ''
            if not mother_name:
                mother_name = app.mother_name or ''
            if not middle_name:
                middle_name = app.middle_name or ''
            if not sex:
                sex = (app.sex or '').title()
            if not birthdate:
                birthdate = app.date_of_birth
                age = self._compute_age(birthdate)
            if not lrn:
                lrn = app.lrn or ''
            if not religion:
                religion = app.religion or ''
            if not contact_number:
                contact_number = app.phone_number or ''

            house_number = app.street_address or ''
            barangay = app.barangay or ''
            city_municipality = app.city_municipality or ''
            province = app.province or ''

            if not address_full:
                parts = [p for p in [house_number, street, barangay, city_municipality, province] if p]
                address_full = ', '.join(parts)

            guardian_name = app.guardian_name or ''
            guardian_relationship = app.guardian_relationship or ''
            if not guardian_name:
                guardian_name = father_name or mother_name or ''
            if not guardian_relationship:
                guardian_relationship = 'Parent'

        # Build student name in LAST NAME, FIRST NAME M.I. format
        last_name = student.last_name or ''
        first_name = student.first_name or ''
        ext = f" {extension_name}" if extension_name else ''
        mi = f" {middle_name[0]}." if middle_name else ''
        student_name = f"{last_name}{ext}, {first_name} {mi}".strip()

        # Determine remarks from enrollment type and status
        remarks = ''
        if app:
            enrollment_type = app.enrollment_type or ''
            if enrollment_type == 'transferee':
                remarks = 'TrnI'
            elif enrollment_type == 'returning':
                remarks = 'BA'
            elif enrollment_type == 'new':
                # Check if late enrollment
                if app.submitted_at:
                    remarks = ''

        # Check profile enrollment status for transfer/withdrawal
        if profile:
            p_status = profile.enrollment_status or ''
            if p_status == 'transferred':
                remarks = 'TrnO'
            elif p_status == 'withdrawn':
                remarks = 'WO'

        return {
            'lrn': lrn,
            'last_name': last_name,
            'first_name': first_name,
            'middle_name': middle_name,
            'extension_name': extension_name,
            'name': student_name,
            'sex': sex,
            'birthdate': birthdate.isoformat() if birthdate else None,
            'age': age,
            'mother_tongue': mother_tongue,
            'indigenous_people': indigenous_people,
            'religion': religion,
            'house_number': house_number,
            'street': street,
            'barangay': barangay,
            'city_municipality': city_municipality,
            'province': province,
            'address': address_full,
            'father_name': father_name,
            'mother_name': mother_name,
            'guardian_name': guardian_name,
            'guardian_relationship': guardian_relationship,
            'contact_number': contact_number,
            'learning_modality': learning_modality,
            'remarks': remarks,
            'enrollment_status': 'enrolled',
        }

    def get_data(self):
        """Get structured data for SF1 with male/female separation"""
        enrollments = self.get_queryset()
        settings = SystemSetting.get_settings()

        school_info = {
            'school_name': settings.site_name or '',
            'school_id': getattr(settings, 'school_id', '') or '',
            'region': getattr(settings, 'region', '') or '',
            'division': getattr(settings, 'division', '') or '',
            'school_address': settings.school_address or '',
        }

        # Get school head (admin or principal)
        school_head = User.objects.filter(role='admin').first()
        if not school_head:
            school_head = User.objects.filter(staff_title='principal').first()
        school_head_name = ''
        if school_head:
            school_head_name = f"{school_head.first_name} {school_head.last_name}".strip()

        by_classroom = defaultdict(list)
        for enrollment in enrollments:
            by_classroom[enrollment.classroom].append(enrollment)

        result = []
        for classroom, enrollments_list in by_classroom.items():
            adviser = classroom.teacher
            adviser_name = ''
            if adviser:
                adviser_name = f"{adviser.first_name} {adviser.last_name}".strip()

            male_students = []
            female_students = []
            for idx, enrollment in enumerate(enrollments_list, 1):
                student = enrollment.student
                student_data = self._get_student_data(student, enrollment)
                student_data['no'] = idx

                if student_data['sex'] == 'Male':
                    male_students.append(student_data)
                else:
                    female_students.append(student_data)

            # Renumber after separation
            for i, s in enumerate(male_students, 1):
                s['no'] = i
            for i, s in enumerate(female_students, 1):
                s['no'] = i

            total_male = len(male_students)
            total_female = len(female_students)
            total_combined = total_male + total_female

            # Count remarks
            remarks_counts = {
                'transfer_in': sum(1 for s in male_students + female_students if s['remarks'] == 'TrnI'),
                'transfer_out': sum(1 for s in male_students + female_students if s['remarks'] == 'TrnO'),
                'cct': 0,
                'balik_aral': sum(1 for s in male_students + female_students if s['remarks'] == 'BA'),
                'sned': 0,
                'late_enrollment': 0,
            }

            result.append({
                'classroom': {
                    'id': classroom.id,
                    'grade_level': classroom.grade_level or '',
                    'section': classroom.name,
                    'adviser': adviser_name,
                    'academic_year': str(classroom.academic_year) if classroom.academic_year else '',
                },
                'male_students': male_students,
                'female_students': female_students,
                'total_male': total_male,
                'total_female': total_female,
                'total_combined': total_combined,
                'remarks_counts': remarks_counts,
            })

        return {
            'school_info': school_info,
            'school_head_name': school_head_name,
            'generated_date': date.today().strftime('%B %d, %Y'),
            'classrooms': result,
        }

    def validate(self):
        """Validate data before generation with detailed per-student warnings"""
        errors = []
        warnings = []
        student_warnings = []

        enrollments = self.get_queryset()

        if not enrollments.exists():
            errors.append('No enrolled students found for the selected filters.')
            return {
                'valid': False,
                'errors': errors,
                'warnings': warnings,
                'student_warnings': student_warnings,
                'total_students': 0,
                'total_male': 0,
                'total_female': 0,
            }

        total_male = 0
        total_female = 0

        for enrollment in enrollments.select_related('student', 'student__profile'):
            student = enrollment.student
            profile = getattr(student, 'profile', None)
            stu_warns = []
            student_name = f"{student.last_name}, {student.first_name}"

            if profile:
                sex = (profile.sex or '').title()
                if sex == 'Male':
                    total_male += 1
                else:
                    total_female += 1

                if not profile.lrn:
                    stu_warns.append('Missing LRN')
                if not profile.date_of_birth:
                    stu_warns.append('Missing Birth Date')
                if not profile.sex:
                    stu_warns.append('Missing Sex')
                if not profile.address:
                    stu_warns.append('Missing Address')
            else:
                total_female += 1
                stu_warns.append('Missing Profile')
                warnings.append(f'{student_name}: No profile record')

            # Check enrollment application data
            app = EnrollmentApplication.objects.filter(
                enrolled_student=student, status='enrolled'
            ).first()
            if app:
                if not app.father_name and not app.mother_name:
                    stu_warns.append('Missing Parent Names')
                if not app.guardian_name and not app.father_name and not app.mother_name:
                    stu_warns.append('Missing Guardian Info')
                if not app.barangay:
                    stu_warns.append('Missing Barangay')
            else:
                stu_warns.append('No linked enrollment application')

            if stu_warns:
                student_warnings.append({
                    'student': student_name,
                    'lrn': profile.lrn if profile else '',
                    'warnings': stu_warns,
                })

        # Check for missing advisers
        missing_adviser = enrollments.filter(classroom__teacher__isnull=True).count()
        if missing_adviser:
            warnings.append(f'{missing_adviser} sections without assigned adviser')

        # Check for duplicate LRNs
        duplicate_lrns = Profile.objects.filter(
            user__studentclassenrollment__in=enrollments
        ).exclude(lrn='').values('lrn').annotate(count=Count('id')).filter(count__gt=1)
        if duplicate_lrns.exists():
            dupes = list(duplicate_lrns.values_list('lrn', flat=True))
            errors.append(f'Duplicate LRNs found: {dupes}')

        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'student_warnings': student_warnings[:50],
            'total_students': enrollments.count(),
            'total_male': total_male,
            'total_female': total_female,
        }

    def get_filters_metadata(self):
        """Get available filter options, scoped to the resolved academic year."""
        ay = self._resolve_academic_year()
        classroom_qs = Classroom.objects.all()
        if ay:
            classroom_qs = classroom_qs.filter(academic_year=ay)

        return {
            'academic_years': list(AcademicYear.objects.all().values('id', 'name')),
            'grade_levels': list(classroom_qs.values_list('grade_level', flat=True).distinct().order_by('grade_level')),
            'sections': list(classroom_qs.values_list('name', flat=True).distinct().order_by('name')),
            'advisers': list(User.objects.filter(role='staff').distinct().values('id', 'first_name', 'last_name')),
        }


def generate_sf1(academic_year=None, grade_level=None, section=None, adviser=None, student_id=None):
    service = SF1SchoolRegisterService(
        academic_year=academic_year,
        grade_level=grade_level,
        section=section,
        adviser=adviser,
        student_id=student_id,
    )
    empty_result = {
        'data': {
            'school_info': {},
            'school_head_name': '',
            'generated_date': date.today().strftime('%B %d, %Y'),
            'classrooms': [],
        },
        'validation': {
            'valid': False,
            'errors': ['An error occurred while generating SF1.'],
            'warnings': [],
            'student_warnings': [],
            'total_students': 0,
            'total_male': 0,
            'total_female': 0,
        },
        'filters': {},
    }
    try:
        data = service.get_data()
    except Exception as e:
        logger.exception("SF1 get_data error: %s", e)
        data = empty_result['data']
    try:
        validation = service.validate() if data.get('classrooms') else empty_result['validation']
    except Exception as e:
        logger.exception("SF1 validate error: %s", e)
        validation = empty_result['validation']
    try:
        filters = service.get_filters_metadata()
    except Exception as e:
        logger.exception("SF1 filters error: %s", e)
        filters = empty_result['filters']
    return {
        'data': data,
        'validation': validation,
        'filters': filters,
    }
