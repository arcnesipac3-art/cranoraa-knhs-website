import os
from django.core.management import call_command
import django

# Use a throwaway key for squashing only — never commit real secrets
os.environ.setdefault('DJANGO_SECRET_KEY', os.urandom(32).hex())
os.environ['DJANGO_SETTINGS_MODULE'] = 'school_portal.settings'

django.setup()

# Squash migrations
call_command('squashmigrations', 'accounts', '0001', '0091', '--noinput')
