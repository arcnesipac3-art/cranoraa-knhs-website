"""
Management command to sync system groups with the academic structure.

Usage:
    python manage.py sync_system_groups
    python manage.py sync_system_groups --classroom <id>
    python manage.py sync_system_groups --department <id>
    python manage.py sync_system_groups --faculty-only
"""
import logging

from django.core.management.base import BaseCommand

from accounts.system_groups import (
    sync_all_system_groups,
    sync_classroom_group,
    sync_department_group,
    sync_faculty_group,
    remove_classroom_group,
    remove_department_group,
)
from accounts.models import Classroom, Department

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sync system groups with the academic structure'

    def add_arguments(self, parser):
        parser.add_argument(
            '--classroom', type=int, help='Sync a specific classroom by ID'
        )
        parser.add_argument(
            '--department', type=int, help='Sync a specific department by ID'
        )
        parser.add_argument(
            '--faculty-only', action='store_true', help='Only sync the faculty group'
        )
        parser.add_argument(
            '--remove-classroom', type=int, help='Remove a classroom group by ID'
        )
        parser.add_argument(
            '--remove-department', type=int, help='Remove a department group by ID'
        )

    def handle(self, *args, **options):
        if options['remove_classroom']:
            try:
                classroom = Classroom.objects.get(id=options['remove_classroom'])
                remove_classroom_group(classroom)
                self.stdout.write(self.style.SUCCESS(f'Removed classroom group: {classroom.name}'))
            except Classroom.DoesNotExist:
                self.stderr.write(self.style.ERROR(f'Classroom {options["remove_classroom"]} not found'))
            return

        if options['remove_department']:
            try:
                dept = Department.objects.get(id=options['remove_department'])
                remove_department_group(dept)
                self.stdout.write(self.style.SUCCESS(f'Removed department group: {dept.name}'))
            except Department.DoesNotExist:
                self.stderr.write(self.style.ERROR(f'Department {options["remove_department"]} not found'))
            return

        if options['classroom']:
            try:
                classroom = Classroom.objects.get(id=options['classroom'])
                room = sync_classroom_group(classroom)
                if room:
                    self.stdout.write(self.style.SUCCESS(f'Synced classroom group: {classroom.name}'))
                else:
                    self.stderr.write(self.style.WARNING(f'Classroom {classroom.name} has no teacher assigned'))
            except Classroom.DoesNotExist:
                self.stderr.write(self.style.ERROR(f'Classroom {options["classroom"]} not found'))
            return

        if options['department']:
            try:
                dept = Department.objects.get(id=options['department'])
                room = sync_department_group(dept)
                if room:
                    self.stdout.write(self.style.SUCCESS(f'Synced department group: {dept.name}'))
                else:
                    self.stderr.write(self.style.WARNING(f'Department {dept.name} has no head assigned'))
            except Department.DoesNotExist:
                self.stderr.write(self.style.ERROR(f'Department {options["department"]} not found'))
            return

        if options['faculty_only']:
            room = sync_faculty_group()
            if room:
                self.stdout.write(self.style.SUCCESS('Synced faculty group'))
            return

        # Full sync
        self.stdout.write('Syncing all system groups...')
        stats = sync_all_system_groups()
        self.stdout.write(self.style.SUCCESS(
            f'Sync complete: '
            f'{stats["classrooms"]} classroom groups, '
            f'{stats["subjects"]} subject groups, '
            f'{stats["departments"]} department groups, '
            f'{stats["faculty"]} faculty group'
        ))
