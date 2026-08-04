from datetime import date, timedelta
from django.utils import timezone
from django.db.models import Count, Q, Exists, OuterRef
from ..models.compliance import ComplianceType, ComplianceSubmission, ComplianceFile
from ..models.infrastructure import AcademicYear, Semester


def calculate_period_number(compliance_type, target_date=None):
    if target_date is None:
        target_date = date.today()

    if compliance_type.frequency == 'weekly':
        return target_date.isocalendar()[1]
    elif compliance_type.frequency == 'monthly':
        return target_date.month
    elif compliance_type.frequency == 'quarterly':
        month = target_date.month
        if month in (6, 7, 8):
            return 1
        elif month in (9, 10, 11):
            return 2
        else:
            return 3
    elif compliance_type.frequency == 'yearly':
        return 1
    return 1


def get_deadline(compliance_type, period_number, academic_year=None):
    """
    Calculate the deadline date for a given compliance type and period number.
    academic_year is used to determine the correct calendar year.
    """
    # Determine which year to use
    if academic_year and hasattr(academic_year, 'start_date') and academic_year.start_date:
        base_year = academic_year.start_date.year
    else:
        base_year = date.today().year

    if compliance_type.frequency == 'weekly':
        jan4 = date(base_year, 1, 4)
        start_of_week1 = jan4 - timedelta(days=jan4.weekday())
        period_start = start_of_week1 + timedelta(weeks=period_number - 1)
        return period_start + timedelta(days=4)  # Friday
    elif compliance_type.frequency == 'monthly':
        try:
            return date(base_year, period_number, compliance_type.deadline_day or 15)
        except ValueError:
            return date(base_year, period_number, 28)
    elif compliance_type.frequency == 'quarterly':
        quarter_ends = {1: (8, 31), 2: (11, 30), 3: (5, 31)}
        m, d = quarter_ends.get(period_number, (5, 31))
        # If Q3 ends in May, use next year if base_year school year
        return date(base_year, m, d)
    elif compliance_type.frequency == 'yearly':
        if academic_year and hasattr(academic_year, 'end_date') and academic_year.end_date:
            return academic_year.end_date
        return date(base_year, 12, 31)
    return date(base_year, 12, 31)


def get_active_academic_year():
    return AcademicYear.objects.filter(is_active=True).first()


def get_active_semester():
    return Semester.objects.filter(is_active=True).first()


def create_submission_for_teacher(teacher, compliance_type, academic_year=None, semester=None):
    if academic_year is None:
        academic_year = get_active_academic_year()
    if semester is None:
        semester = get_active_semester()

    if not academic_year:
        return None

    period_number = calculate_period_number(compliance_type)

    submission, created = ComplianceSubmission.objects.get_or_create(
        teacher=teacher,
        compliance_type=compliance_type,
        academic_year=academic_year,
        semester=semester,
        period_number=period_number,
        defaults={'status': 'draft'},
    )
    return submission


def ensure_teacher_submissions(teacher, academic_year=None, semester=None):
    if academic_year is None:
        academic_year = get_active_academic_year()
    if semester is None:
        semester = get_active_semester()

    if not academic_year:
        return []

    active_types = ComplianceType.objects.filter(is_active=True)
    submissions = []
    for ct in active_types:
        sub = create_submission_for_teacher(teacher, ct, academic_year, semester)
        if sub:
            submissions.append(sub)
    return submissions


def mark_overdue_submissions():
    """
    Mark draft/submitted compliance as overdue if past deadline.
    Uses the academic year from each submission's record to compute the deadline.
    """
    today = date.today()
    active_types = ComplianceType.objects.filter(is_active=True)
    marked = 0

    for ct in active_types:
        period_num = calculate_period_number(ct)
        # Get all drafts/submitted for this type
        submissions = ComplianceSubmission.objects.filter(
            compliance_type=ct,
            status__in=['draft', 'submitted'],
        ).select_related('academic_year')

        for sub in submissions:
            try:
                deadline = get_deadline(ct, sub.period_number or period_num, sub.academic_year)
            except Exception:
                continue
            if today > deadline:
                sub.status = 'overdue'
                sub.save(update_fields=['status', 'updated_at'])
                marked += 1

    return marked


def get_compliance_stats(academic_year=None, semester=None):
    if academic_year is None:
        academic_year = get_active_academic_year()
    if semester is None:
        semester = get_active_semester()

    if not academic_year:
        return {
            'total_submissions': 0,
            'reviewed_count': 0,
            'pending_count': 0,
            'overdue_count': 0,
            'rejected_count': 0,
            'compliance_rate': 0.0,
            'by_type': [],
            'by_teacher': [],
        }

    base_qs = ComplianceSubmission.objects.filter(
        academic_year=academic_year,
    )
    if semester:
        base_qs = base_qs.filter(semester=semester)

    total = base_qs.count()
    reviewed = base_qs.filter(status='reviewed').count()
    pending = base_qs.filter(status__in=['draft', 'submitted']).count()
    overdue = base_qs.filter(status='overdue').count()
    rejected = base_qs.filter(status='rejected').count()
    rate = (reviewed / total * 100) if total > 0 else 0.0

    by_type = list(
        base_qs.values('compliance_type__name', 'compliance_type__frequency')
        .annotate(
            total=Count('id'),
            reviewed_count=Count('id', filter=Q(status='reviewed')),
            pending_count=Count('id', filter=Q(status__in=['draft', 'submitted'])),
            overdue_count=Count('id', filter=Q(status='overdue')),
            rejected_count=Count('id', filter=Q(status='rejected')),
        )
        .order_by('compliance_type__name')
    )

    by_teacher = list(
        base_qs.values('teacher__id', 'teacher__first_name', 'teacher__last_name', 'teacher__username')
        .annotate(
            total=Count('id'),
            reviewed_count=Count('id', filter=Q(status='reviewed')),
            pending_count=Count('id', filter=Q(status__in=['draft', 'submitted'])),
            overdue_count=Count('id', filter=Q(status='overdue')),
        )
        .order_by('teacher__last_name', 'teacher__first_name')
    )

    for item in by_teacher:
        t_total = item['total']
        t_reviewed = item['reviewed_count']
        item['rate'] = round((t_reviewed / t_total * 100) if t_total > 0 else 0.0, 1)

    return {
        'total_submissions': total,
        'reviewed_count': reviewed,
        'pending_count': pending,
        'overdue_count': overdue,
        'rejected_count': rejected,
        'compliance_rate': round(rate, 1),
        'by_type': by_type,
        'by_teacher': by_teacher,
    }
