"""
Management command: seed_jhs_subjects
--------------------------------------
Creates all official DepEd Junior High School subjects (Grade 7–10)
based on the SF10-JHS (School Form 10) structure used at
Kiwalan National High School.

Subject list is drawn directly from the SF10-JHS form:
  - Filipino
  - English
  - Mathematics
  - Science
  - Araling Panlipunan (AP)
  - Edukasyon sa Pagpapakatao (EsP)
  - Technology and Livelihood Education (TLE)
  - Music (under MAPEH)
  - Arts (under MAPEH)
  - Physical Education (under MAPEH)
  - Health (under MAPEH)
  - Homeroom Guidance

Usage:
    python manage.py seed_jhs_subjects
    python manage.py seed_jhs_subjects --skip-existing   (default — skips dupes)
    python manage.py seed_jhs_subjects --overwrite       (updates existing records)
    python manage.py seed_jhs_subjects --dry-run         (preview only, no DB writes)
"""

from django.core.management.base import BaseCommand
from accounts.models import Subject


# ---------------------------------------------------------------------------
# Subject definitions per grade level
# Each entry: (code, name, description)
# Codes follow the pattern: <SUBJECT_ABBREV><GRADE_NUMBER>
# ---------------------------------------------------------------------------

_BASE_SUBJECTS = [
    # (code_suffix, name, description, component)
    ('FIL',  'Filipino',
     'Paglinang ng kasanayan sa komunikasyon sa wikang Filipino.', 'core'),
    ('ENG',  'English',
     'Development of communicative competence in the English language.', 'core'),
    ('MATH', 'Mathematics',
     'Number sense, measurement, geometry, patterns, algebra, and statistics.', 'core'),
    ('SCI',  'Science',
     'Scientific inquiry, life science, physical science, and earth science.', 'core'),
    ('AP',   'Araling Panlipunan',
     'Philippine and world history, geography, economics, and social studies.', 'core'),
    ('ESP',  'Edukasyon sa Pagpapakatao',
     'Character education grounded in Filipino values and ethics.', 'core'),
    ('TLE',  'Technology and Livelihood Education',
     'Practical technology, home economics, and livelihood skills.', 'core'),
    ('MUS',  'Music',
     'Musical literacy, appreciation, and performance. (MAPEH component)', 'mapeh'),
    ('ARTS', 'Arts',
     'Visual arts, appreciation, and creative expression. (MAPEH component)', 'mapeh'),
    ('PE',   'Physical Education',
     'Physical fitness, sports, and healthy lifestyle. (MAPEH component)', 'mapeh'),
    ('HLT',  'Health',
     'Personal health, community health, and health literacy. (MAPEH component)', 'mapeh'),
    ('HG',   'Homeroom Guidance',
     'Guidance and counseling integrated through homeroom sessions.', 'guidance'),
]

GRADES = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10']


def _build_subjects():
    """Return a list of dicts ready to pass to Subject.objects.get_or_create."""
    subjects = []
    for grade in GRADES:
        grade_num = grade.split()[-1]  # '7', '8', '9', '10'
        for suffix, name, description, component in _BASE_SUBJECTS:
            code = f'{suffix}{grade_num}'
            subjects.append({
                'code':        code,
                'name':        name,
                'grade_level': grade,
                'description': description,
                'component':   component,
            })
    return subjects


class Command(BaseCommand):
    help = 'Seed official DepEd JHS subjects (Grade 7–10) based on the SF10-JHS form.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--overwrite',
            action='store_true',
            default=False,
            help='Update name/description for existing subjects instead of skipping.',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=False,
            help='Preview what would be created/updated without writing to the DB.',
        )

    def handle(self, *args, **options):
        overwrite = options['overwrite']
        dry_run   = options['dry_run']

        subjects   = _build_subjects()
        created    = 0
        updated    = 0
        skipped    = 0

        self.stdout.write(self.style.MIGRATE_HEADING(
            f'\nSeeding {len(subjects)} JHS subjects across Grades 7–10…'
            + (' [DRY RUN]' if dry_run else '')
        ))

        for s in subjects:
            try:
                existing = Subject.objects.filter(code=s['code']).first()

                if existing:
                    if overwrite:
                        if not dry_run:
                            existing.name        = s['name']
                            existing.grade_level = s['grade_level']
                            existing.description = s['description']
                            existing.component   = s['component']
                            existing.save()
                        self.stdout.write(
                            f"  {'[DRY] ' if dry_run else ''}UPDATED  {s['code']:<8} {s['grade_level']} — {s['name']}"
                        )
                        updated += 1
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f"  SKIPPED  {s['code']:<8} {s['grade_level']} — already exists"
                            )
                        )
                        skipped += 1
                else:
                    if not dry_run:
                        Subject.objects.create(**s)
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  {'[DRY] ' if dry_run else ''}CREATED  {s['code']:<8} {s['grade_level']} — {s['name']}"
                        )
                    )
                    created += 1

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"  ERROR    {s['code']:<8} — {e}")
                )

        # ── Summary ─────────────────────────────────────────────────────────
        self.stdout.write('')
        self.stdout.write(self.style.MIGRATE_HEADING('── Summary ──────────────────────────────'))
        self.stdout.write(self.style.SUCCESS(f'  Created : {created}'))
        if updated:
            self.stdout.write(f'  Updated : {updated}')
        if skipped:
            self.stdout.write(self.style.WARNING(f'  Skipped : {skipped}'))
        self.stdout.write(self.style.MIGRATE_HEADING('─────────────────────────────────────────'))

        if dry_run:
            self.stdout.write(self.style.WARNING('\n[DRY RUN] No changes were written to the database.\n'))
        else:
            total = created + updated
            self.stdout.write(self.style.SUCCESS(
                f'\n✓ Done — {total} subject(s) affected across {len(GRADES)} grade levels.\n'
            ))
