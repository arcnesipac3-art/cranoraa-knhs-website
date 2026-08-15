from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import FacultyMember, Profile


class Command(BaseCommand):
    help = "Sync profile_picture from User Profile to FacultyMember.photo"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be updated without writing to the database.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        updated = []
        skipped = []
        no_profile = []
        no_user = []

        for fm in FacultyMember.objects.select_related("user__profile").all():
            if not fm.user:
                no_user.append(fm.name)
                continue

            profile = getattr(fm.user, "profile", None)
            if not profile:
                no_profile.append(fm.name)
                continue

            photo_url = profile.profile_picture
            if not photo_url:
                skipped.append(fm.name)
                continue

            if fm.photo == photo_url:
                skipped.append(fm.name)
                continue

            if dry_run:
                self.stdout.write(f"  [DRY RUN] Would update {fm.name}: {photo_url}")
                updated.append(fm.name)
            else:
                with transaction.atomic():
                    fm.photo = photo_url
                    fm.save(update_fields=["photo"])
                self.stdout.write(self.style.SUCCESS(f"  ✓  Updated {fm.name}"))
                updated.append(fm.name)

        self.stdout.write("\n" + "─" * 60)
        self.stdout.write(self.style.SUCCESS(f"Updated: {len(updated)}"))
        self.stdout.write(self.style.WARNING(f"Skipped (no change): {len(skipped)}"))
        self.stdout.write(self.style.WARNING(f"No profile: {len(no_profile)}"))
        self.stdout.write(self.style.WARNING(f"No user linked: {len(no_user)}"))

        if dry_run:
            self.stdout.write(self.style.NOTICE("\nRun without --dry-run to apply changes."))