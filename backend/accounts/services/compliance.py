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


def get_compliance_stats(academic_year=None, semester=None, subject_id=None):
    from ..models.academic import ClassroomSubject
    from ..models.compliance import ComplianceTypeSubjectAssignment

    if academic_year is None:
        academic_year = get_active_academic_year()
    if semester is None:
        semester = get_active_semester()

    empty = {
        'total_submissions': 0,
        'reviewed_count': 0,
        'pending_count': 0,
        'overdue_count': 0,
        'rejected_count': 0,
        'compliance_rate': 0.0,
        'by_type': [],
        'by_teacher': [],
        'by_subject': [],
        'missing_submissions': [],
    }
    if not academic_year:
        return empty

    base_qs = ComplianceSubmission.objects.filter(academic_year=academic_year)
    if semester:
        base_qs = base_qs.filter(semester=semester)
    if subject_id:
        base_qs = base_qs.filter(classroom_subject__subject_id=subject_id)

    total    = base_qs.count()
    reviewed = base_qs.filter(status='reviewed').count()
    pending  = base_qs.filter(status__in=['draft', 'submitted']).count()
    overdue  = base_qs.filter(status='overdue').count()
    rejected = base_qs.filter(status='rejected').count()
    rate     = (reviewed / total * 100) if total > 0 else 0.0

    # ── By type ───────────────────────────────────────────────────────────────
    by_type = list(
        base_qs
        .values('compliance_type__name', 'compliance_type__frequency')
        .annotate(
            total=Count('id'),
            reviewed_count=Count('id', filter=Q(status='reviewed')),
            pending_count=Count('id', filter=Q(status__in=['draft', 'submitted'])),
            overdue_count=Count('id', filter=Q(status='overdue')),
            rejected_count=Count('id', filter=Q(status='rejected')),
        )
        .order_by('compliance_type__name')
    )

    # ── By teacher ────────────────────────────────────────────────────────────
    by_teacher = list(
        base_qs
        .values('teacher__id', 'teacher__first_name', 'teacher__last_name', 'teacher__username')
        .annotate(
            total=Count('id'),
            reviewed_count=Count('id', filter=Q(status='reviewed')),
            pending_count=Count('id', filter=Q(status__in=['draft', 'submitted'])),
            overdue_count=Count('id', filter=Q(status='overdue')),
        )
        .order_by('teacher__last_name', 'teacher__first_name')
    )
    for item in by_teacher:
        t = item['total']
        item['rate'] = round((item['reviewed_count'] / t * 100) if t > 0 else 0.0, 1)
        item['teacher_name'] = (
            f"{item['teacher__first_name']} {item['teacher__last_name']}".strip()
            or item['teacher__username']
        )

    # ── By subject ────────────────────────────────────────────────────────────
    by_subject_qs = (
        base_qs
        .exclude(classroom_subject__isnull=True)
        .values(
            'classroom_subject__subject__id',
            'classroom_subject__subject__name',
            'classroom_subject__subject__code',
        )
        .annotate(
            total=Count('id'),
            reviewed_count=Count('id', filter=Q(status='reviewed')),
            pending_count=Count('id', filter=Q(status__in=['draft', 'submitted'])),
            overdue_count=Count('id', filter=Q(status='overdue')),
        )
        .order_by('classroom_subject__subject__name')
    )
    by_subject = []
    for item in by_subject_qs:
        t = item['total']
        by_subject.append({
            'subject_id':   item['classroom_subject__subject__id'],
            'subject_name': item['classroom_subject__subject__name'],
            'subject_code': item['classroom_subject__subject__code'],
            'total':          t,
            'reviewed_count': item['reviewed_count'],
            'pending_count':  item['pending_count'],
            'overdue_count':  item['overdue_count'],
            'rate': round((item['reviewed_count'] / t * 100) if t > 0 else 0.0, 1),
        })

    # ── Missing submissions ───────────────────────────────────────────────────
    # Walk every active teacher × classroom_subject × compliance_type for the
    # current period and surface those with no accepted submission.
    # NOTE: We do NOT filter by classroom__academic_year here because that field
    # is nullable and most classrooms may not have it set. Instead we consider
    # all active ClassroomSubject records (teacher assigned to a subject/classroom)
    # and check submissions against the active academic_year.
    all_types = list(ComplianceType.objects.filter(is_active=True))
    assignments_map = {}   # { compliance_type_id: [subject_id, ...] }
    for sa in ComplianceTypeSubjectAssignment.objects.all():
        assignments_map.setdefault(sa.compliance_type_id, []).append(sa.subject_id)

    cs_qs = ClassroomSubject.objects.filter(
        teacher__isnull=False,
        teacher__is_active=True,
    ).select_related('subject', 'classroom', 'teacher')
    if subject_id:
        cs_qs = cs_qs.filter(subject_id=subject_id)

    today = date.today()
    missing = []
    for cs in cs_qs:
        if not cs.teacher_id:
            continue
        for ctype in all_types:
            sids = assignments_map.get(ctype.id, [])
            if sids and cs.subject_id not in sids:
                continue

            period_num = calculate_period_number(ctype)
            sub_qs = ComplianceSubmission.objects.filter(
                teacher_id=cs.teacher_id,
                compliance_type=ctype,
                classroom_subject=cs,
                period_number=period_num,
                academic_year=academic_year,
            )
            if semester:
                sub_qs = sub_qs.filter(semester=semester)
            sub = sub_qs.first()

            if sub and sub.status in ('submitted', 'reviewed'):
                continue

            try:
                deadline = get_deadline(ctype, period_num, academic_year)
            except Exception:
                deadline = None

            days_overdue = (today - deadline).days if deadline and today > deadline else 0
            missing.append({
                'teacher_id':   cs.teacher_id,
                'teacher_name': (
                    cs.teacher.get_full_name().strip() or cs.teacher.username
                    if cs.teacher else 'Unknown'
                ),
                'subject_name':   cs.subject.name,
                'subject_code':   cs.subject.code,
                'classroom_name': cs.classroom.name,
                'compliance_type': ctype.name,
                'current_status': sub.status if sub else 'not_started',
                'deadline':       deadline.isoformat() if deadline else None,
                'days_overdue':   days_overdue,
            })

    # Sort: most overdue first
    missing.sort(key=lambda x: x['days_overdue'], reverse=True)

    return {
        'total_submissions':  total,
        'reviewed_count':     reviewed,
        'pending_count':      pending,
        'overdue_count':      overdue,
        'rejected_count':     rejected,
        'compliance_rate':    round(rate, 1),
        'by_type':            by_type,
        'by_teacher':         by_teacher,
        'by_subject':         by_subject,
        'missing_submissions': missing[:50],  # cap at 50 rows
    }
