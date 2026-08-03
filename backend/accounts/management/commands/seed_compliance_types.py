from django.core.management.base import BaseCommand
from accounts.models.compliance import ComplianceType


COMPLIANCE_TYPES = [
    {
        'name': 'Lesson Plan',
        'slug': 'lesson-plan',
        'description': 'Weekly lesson plan (DLP/DLL)',
        'frequency': 'weekly',
        'deadline_day': 5,
        'order': 1,
    },
    {
        'name': 'SF2 (Attendance Report)',
        'slug': 'sf2-attendance',
        'description': 'Monthly attendance summary report',
        'frequency': 'monthly',
        'deadline_day': 15,
        'order': 2,
    },
    {
        'name': 'Action Plan',
        'slug': 'action-plan',
        'description': 'Quarterly action plan for the term',
        'frequency': 'quarterly',
        'deadline_day': 1,
        'order': 3,
    },
    {
        'name': 'Class Record',
        'slug': 'class-record',
        'description': 'Quarterly class record submission',
        'frequency': 'quarterly',
        'deadline_day': 30,
        'order': 4,
    },
    {
        'name': 'MPS (Mean Points Score)',
        'slug': 'mps',
        'description': 'Quarterly MPS computation',
        'frequency': 'quarterly',
        'deadline_day': 30,
        'order': 5,
    },
    {
        'name': 'PL (Exam Results)',
        'slug': 'pl-exam-results',
        'description': 'Quarterly exam results (Post-test)',
        'frequency': 'quarterly',
        'deadline_day': 30,
        'order': 6,
    },
    {
        'name': 'Grading Sheet',
        'slug': 'grading-sheet',
        'description': 'Quarterly grading sheet',
        'frequency': 'quarterly',
        'deadline_day': 30,
        'order': 7,
    },
    {
        'name': 'OCMASS',
        'slug': 'ocmass',
        'description': 'Organizational Compliance Monitoring and Assessment',
        'frequency': 'yearly',
        'deadline_day': 30,
        'order': 8,
    },
]


class Command(BaseCommand):
    help = 'Seed default compliance types'

    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for data in COMPLIANCE_TYPES:
            obj, created = ComplianceType.objects.update_or_create(
                slug=data['slug'],
                defaults=data,
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'Created: {obj.name}'))
            else:
                updated_count += 1
                self.stdout.write(self.style.WARNING(f'Updated: {obj.name}'))

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Created: {created_count}, Updated: {updated_count}'
        ))
