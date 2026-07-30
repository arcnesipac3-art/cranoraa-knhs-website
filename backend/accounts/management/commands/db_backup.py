"""
Management command: db_backup

Creates a backup of the database and retains only the last 7 daily backups.

Usage:
    python manage.py db_backup
"""
import os
import shutil
import glob
import logging
from datetime import datetime

from django.core.management.base import BaseCommand
from django.conf import settings

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Create a database backup and retain the last 7 daily backups.'

    def handle(self, *args, **options):
        backup_dir = os.path.join(settings.BASE_DIR, 'backups')
        os.makedirs(backup_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        db_settings = settings.DATABASES['default']
        db_engine = db_settings['ENGINE']

        success = False

        if 'postgres' in db_engine:
            success = self._backup_postgres(db_settings, backup_dir, timestamp)
        elif 'sqlite' in db_engine:
            success = self._backup_sqlite(db_settings, backup_dir, timestamp)
        else:
            self.stderr.write(self.style.ERROR(f'Unsupported database engine: {db_engine}'))
            return

        if success:
            self._cleanup_old_backups(backup_dir)
            self.stdout.write(self.style.SUCCESS(f'Backup completed successfully.'))

    def _backup_postgres(self, db_settings, backup_dir, timestamp):
        backup_file = os.path.join(backup_dir, f'backup_{timestamp}.sql')

        pg_dump_cmd = shutil.which('pg_dump')
        if pg_dump_cmd:
            env = os.environ.copy()
            env['PGPASSWORD'] = db_settings.get('PASSWORD', '')
            cmd = [
                pg_dump_cmd,
                '-h', db_settings.get('HOST', 'localhost'),
                '-p', str(db_settings.get('PORT', 5432)),
                '-U', db_settings.get('USER', ''),
                '-d', db_settings.get('NAME', ''),
                '-f', backup_file,
                '--no-owner',
                '--no-privileges',
            ]
            import subprocess
            result = subprocess.run(cmd, env=env, capture_output=True, text=True)
            if result.returncode == 0:
                self.stdout.write(f'pg_dump backup saved to: {backup_file}')
                return True
            else:
                self.stderr.write(self.style.WARNING(f'pg_dump failed: {result.stderr}'))
                self.stdout.write('Falling back to Django dumpdata...')
                return self._backup_dumpdata(backup_file)
        else:
            self.stdout.write('pg_dump not found, using Django dumpdata...')
            return self._backup_dumpdata(backup_file)

    def _backup_sqlite(self, db_settings, backup_dir, timestamp):
        db_path = db_settings.get('NAME', '')
        if not os.path.exists(db_path):
            self.stderr.write(self.style.ERROR(f'SQLite database not found: {db_path}'))
            return False

        backup_file = os.path.join(backup_dir, f'backup_{timestamp}.sqlite3')
        shutil.copy2(db_path, backup_file)
        self.stdout.write(f'SQLite backup saved to: {backup_file}')
        return True

    def _backup_dumpdata(self, backup_file):
        from django.core.management import call_command
        try:
            with open(backup_file, 'w') as f:
                call_command('dumpdata', '--natural-foreign', '--natural-primary', stdout=f)
            self.stdout.write(f'dumpdata backup saved to: {backup_file}')
            return True
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'dumpdata failed: {e}'))
            if os.path.exists(backup_file):
                os.remove(backup_file)
            return False

    def _cleanup_old_backups(self, backup_dir):
        backups = sorted(glob.glob(os.path.join(backup_dir, 'backup_*')))
        if len(backups) > 7:
            for old_backup in backups[:-7]:
                os.remove(old_backup)
                self.stdout.write(f'Removed old backup: {old_backup}')
