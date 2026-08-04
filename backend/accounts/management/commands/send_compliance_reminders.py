"""
Management command: send_compliance_reminders

Checks all active teachers' compliance per classroom assignment and sends:
  - Upcoming reminder  (due in 1-2 days, not yet submitted)
  - Due-today reminder (due today, not yet submitted)
  - Overdue alert      (past deadline, still missing)

Run daily via cron (weekdays, 7 AM):
    0 7 * * 1-5 cd /path/to/backend && python manage.py send_compliance_reminders

Usage:
    python manage.py send_compliance_reminders           # full run
    python manage.py send_compliance_reminders --dry-run # preview only
    python manage.py send_compliance_reminders --teacher-id 42
"""

from datetime import date
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from accounts.models.academic import ClassroomSubject
from accounts.models.compliance import (
    ComplianceType, ComplianceSubmission, ComplianceTypeSubjectAssignment
)
from accounts.models.notifications import Notification
from accounts.services.compliance import (
    calculate_period_number, get_deadline,
    get_active_academic_year, get_active_semester,
)

User = get_user_model()


def _applicable_types(subject_id, all_types, assignments_map):
    """Return compliance types that apply to a given subject."""
    result = []
    for ctype in all_types:
        subject_ids = assignments_map.get(ctype.id, [])
        if not subject_ids or subject_id in subject_ids:
            result.append(ctype)
    return result


def _already_notified_today(teacher_id, keyword):
    """Prevent duplicate notifications on the same calendar day."""
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    return Notification.objects.filter(
        recipient_id=teacher_id,
        notification_type='system',
        title__icontains=keyword,
        created_at__gte=today_start,
    ).exists()


class Command(BaseCommand):
    help = 'Send compliance deadline reminders and overdue alerts to teachers'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true',
                            help='Preview without sending notifications')
        parser.add_argument('--teacher-id', type=int,
                            help='Run for a specific teacher only')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        specific_id = options.get('teacher_id')
        today = date.today()

        if today.weekday() in (5, 6):
            self.stdout.write(self.style.WARNING('Weekend — skipping.'))
            return

        academic_year = get_active_academic_year()
        if not academic_year:
            self.stdout.write(self.style.ERROR('No active academic year. Exiting.'))
            return

        semester = get_active_semester()
        all_types = list(ComplianceType.objects.filter(is_active=True))
        if not all_types:
            self.stdout.write(self.style.WARNING('No active compliance types. Exiting.'))
            return

        # Build { compliance_type_id: [subject_id, ...] }
        assignments_map = {}
        for sa in ComplianceTypeSubjectAssignment.objects.all():
            assignments_map.setdefault(sa.compliance_type_id, []).append(sa.subject_id)

        teachers_qs = User.objects.filter(role='staff', is_active=True)
        if specific_id:
            teachers_qs = teachers_qs.filter(id=specific_id)

        sent_reminders = 0
        sent_overdue = 0
        teachers_notified = 0

        for teacher in teachers_qs:
            cs_list = ClassroomSubject.objects.filter(
                teacher=teacher,
                teacher__is_active=True,
            ).select_related('subject', 'classroom')

            if not cs_list.exists():
                continue

            overdue_items, today_items, soon_items = [], [], []

            for cs in cs_list:
                for ctype in _applicable_types(cs.subject_id, all_types, assignments_map):
                    period_num = calculate_period_number(ctype)

                    sub_qs = ComplianceSubmission.objects.filter(
                        teacher=teacher, compliance_type=ctype,
                        classroom_subject=cs, period_number=period_num,
                        academic_year=academic_year,
                    )
                    if semester:
                        sub_qs = sub_qs.filter(semester=semester)
                    sub = sub_qs.first()

                    # Already properly submitted
                    if sub and sub.status in ('submitted', 'reviewed'):
                        continue

                    try:
                        deadline = get_deadline(ctype, period_num, academic_year)
                    except Exception:
                        continue

                    days = (deadline - today).days
                    item = {'ctype': ctype, 'cs': cs, 'deadline': deadline, 'days': days}
                    if days < 0:
                        overdue_items.append(item)
                    elif days == 0:
                        today_items.append(item)
                    elif days <= 2:
                        soon_items.append(item)

            # ── Overdue ────────────────────────────────────────────────────────
            if overdue_items and not _already_notified_today(teacher.id, 'Overdue'):
                if len(overdue_items) == 1:
                    i = overdue_items[0]
                    msg = (f"{i['ctype'].name} for {i['cs'].subject.name} "
                           f"({i['cs'].classroom.name}) is {abs(i['days'])} day(s) overdue.")
                else:
                    parts = ', '.join(
                        f"{i['ctype'].name} – {i['cs'].subject.name}"
                        for i in overdue_items[:3]
                    )
                    extra = f' and {len(overdue_items)-3} more' if len(overdue_items) > 3 else ''
                    msg = f"{len(overdue_items)} compliance(s) overdue: {parts}{extra}."

                self.stdout.write(self.style.ERROR(f'  [OVERDUE] {teacher.username}: {msg}'))
                if not dry_run:
                    Notification.objects.create(
                        recipient=teacher, notification_type='system',
                        title='Compliance Overdue',
                        message=msg + ' Please submit immediately.',
                        link='/my-compliance',
                    )
                sent_overdue += 1

            # ── Due today ─────────────────────────────────────────────────────
            if today_items and not _already_notified_today(teacher.id, 'Due Today'):
                if len(today_items) == 1:
                    i = today_items[0]
                    msg = (f"{i['ctype'].name} for {i['cs'].subject.name} "
                           f"({i['cs'].classroom.name}) is due TODAY.")
                else:
                    parts = ', '.join(
                        f"{i['ctype'].name} – {i['cs'].subject.name}"
                        for i in today_items[:3]
                    )
                    msg = f"{len(today_items)} compliance(s) due today: {parts}."

                self.stdout.write(self.style.WARNING(f'  [TODAY]   {teacher.username}: {msg}'))
                if not dry_run:
                    Notification.objects.create(
                        recipient=teacher, notification_type='system',
                        title='Compliance Due Today',
                        message=msg + ' Please submit now.',
                        link='/my-compliance',
                    )
                sent_reminders += 1

            # ── Upcoming (1-2 days) ────────────────────────────────────────────
            if soon_items and not _already_notified_today(teacher.id, 'Reminder'):
                if len(soon_items) == 1:
                    i = soon_items[0]
                    msg = (f"{i['ctype'].name} for {i['cs'].subject.name} "
                           f"({i['cs'].classroom.name}) is due in {i['days']} day(s) "
                           f"({i['deadline'].strftime('%b %d')}).")
                else:
                    parts = ', '.join(
                        f"{i['ctype'].name} – {i['cs'].subject.name} (in {i['days']}d)"
                        for i in soon_items[:3]
                    )
                    extra = f' and {len(soon_items)-3} more' if len(soon_items) > 3 else ''
                    msg = f"{len(soon_items)} compliance(s) due soon: {parts}{extra}."

                self.stdout.write(self.style.SUCCESS(f'  [REMIND]  {teacher.username}: {msg}'))
                if not dry_run:
                    Notification.objects.create(
                        recipient=teacher, notification_type='system',
                        title='Compliance Reminder',
                        message=msg,
                        link='/my-compliance',
                    )
                sent_reminders += 1

            if overdue_items or today_items or soon_items:
                teachers_notified += 1

        prefix = '[DRY RUN] ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(
            f'\n{prefix}Done! Teachers notified: {teachers_notified} | '
            f'Reminders: {sent_reminders} | Overdue alerts: {sent_overdue}'
        ))
