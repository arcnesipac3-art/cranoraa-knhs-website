from django.core.management.base import BaseCommand
from axes.models import AccessAttempt


class Command(BaseCommand):
    help = 'Clear all Axes lockout records'

    def handle(self, *args, **options):
        count = AccessAttempt.objects.count()
        AccessAttempt.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'Cleared {count} lockout record(s)'))
