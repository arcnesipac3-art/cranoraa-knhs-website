"""
Management command: seed_faculty_accounts

Creates portal staff accounts for every faculty member listed on the
public /people page, and sets their profile_picture to the matching
photo already hosted on the Vercel frontend.

Usage:
    python manage.py seed_faculty_accounts
    python manage.py seed_faculty_accounts --dry-run
    python manage.py seed_faculty_accounts --base-url https://cranoraa-eng-cranoraa-knhs-website.vercel.app
    python manage.py seed_faculty_accounts --reset-photos   # update photos only, no new accounts

Run this once after deployment. Re-running is safe — existing usernames are skipped.
"""

import secrets
import string

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import User, Profile


# ---------------------------------------------------------------------------
# Faculty roster — mirrors frontend/src/data/facultyData.js
# photo_file: the filename in /faculty/ on the Vercel public folder.
#             None = no photo yet.
# ---------------------------------------------------------------------------
FACULTY_ROSTER = [
    # ── Administration ──────────────────────────────────────────────────────
    {
        "username":    "sanny.delfin",
        "first_name":  "Sanny",
        "last_name":   "Delfin",
        "middle_name": "O.",
        "position":    "School Principal I",
        "staff_title": "principal",
        "photo_file":  "sanny-delfin.jpg",
    },
    {
        "username":    "jaylen.navato",
        "first_name":  "Jaylen",
        "last_name":   "Navato",
        "middle_name": "S.",
        "position":    "School Guidance Designate",
        "staff_title": "guidance_counselor",
        "photo_file":  "jaylen-navato.JPG",
    },
    {
        "username":    "michelyn.biera",
        "first_name":  "Michelyn",
        "last_name":   "Biera",
        "middle_name": "B.",
        "position":    "Administrative Officer I",
        "staff_title": "administrative_officer",
        "photo_file":  "michelyn-biera.jpg",
    },
    {
        "username":    "cherry.sagrado",
        "first_name":  "Cherry",
        "last_name":   "Sagrado",
        "middle_name": "B.",
        "position":    "Administrative Assistant III",
        "staff_title": "admin_assistant",
        "photo_file":  "cherry-sagrado.jpg",
    },

    # ── Master / Special Science ─────────────────────────────────────────────
    {
        "username":    "beverly.perez",
        "first_name":  "Beverly",
        "last_name":   "Perez",
        "middle_name": "S.",
        "position":    "Master Teacher I",
        "staff_title": "master_teacher_i",
        "photo_file":  "beverly-perez.JPG",
    },
    {
        "username":    "jessica.actub",
        "first_name":  "Jessica",
        "last_name":   "Actub",
        "middle_name": "B.",
        "position":    "Special Science Teacher I",
        "staff_title": "special_science_teacher_i",
        "photo_file":  "jessica-actub.JPG",
    },

    # ── Teacher VI ───────────────────────────────────────────────────────────
    {
        "username":    "rusty.bartolata",
        "first_name":  "Rusty",
        "last_name":   "Bartolata",
        "middle_name": "D.",
        "position":    "Teacher VI",
        "staff_title": "teacher_vi",
        "photo_file":  "rusty-bartolata.JPG",
    },
    {
        "username":    "tahany.rangaig",
        "first_name":  "Tahany",
        "last_name":   "Rangaig",
        "middle_name": "A.",
        "position":    "Teacher VI",
        "staff_title": "teacher_vi",
        "photo_file":  "tahany-rangaig.JPG",
    },
    {
        "username":    "jonathan.tatoy",
        "first_name":  "Jonathan",
        "last_name":   "Tatoy",
        "middle_name": "B.",
        "position":    "Teacher VI",
        "staff_title": "teacher_vi",
        "photo_file":  "jonathan-tatoy.JPG",
    },

    # ── Teacher V ────────────────────────────────────────────────────────────
    {
        "username":    "ellen.gedaro",
        "first_name":  "Ellen",
        "last_name":   "Gedaro",
        "middle_name": "E.",
        "position":    "Teacher V",
        "staff_title": "teacher_v",
        "photo_file":  "ellen-gedaro.JPG",
    },
    {
        "username":    "mildred.gomez",
        "first_name":  "Mildred",
        "last_name":   "Gomez",
        "middle_name": "P.",
        "position":    "Teacher V",
        "staff_title": "teacher_v",
        "photo_file":  "mildred-gomez.JPG",
    },
    {
        "username":    "janice.valdez",
        "first_name":  "Janice",
        "last_name":   "Valdez",
        "middle_name": "E.",
        "position":    "Teacher V",
        "staff_title": "teacher_v",
        "photo_file":  "janice-valdez.JPG",
    },

    # ── Teacher IV ───────────────────────────────────────────────────────────
    {
        "username":    "kimberly.acaso",
        "first_name":  "Kimberly",
        "last_name":   "Acaso",
        "middle_name": "B.",
        "position":    "Teacher IV",
        "staff_title": "teacher_iv",
        "photo_file":  "kimberly-acaso.JPG",
    },
    {
        "username":    "lucelle.catubig",
        "first_name":  "Lucelle",
        "last_name":   "Catubig",
        "middle_name": "B.",
        "position":    "Teacher IV",
        "staff_title": "teacher_iv",
        "photo_file":  "lucelle-catubig.JPG",
    },
    {
        "username":    "clarence.pabillar",
        "first_name":  "Clarence",
        "last_name":   "Pabillar",
        "middle_name": "P.",
        "position":    "Teacher IV",
        "staff_title": "teacher_iv",
        "photo_file":  "clarence-pabillar.JPG",
    },

    # ── Teacher III ──────────────────────────────────────────────────────────
    {
        "username":    "markryan.bacus",
        "first_name":  "Mark Ryan",
        "last_name":   "Bacus",
        "middle_name": "J.",
        "position":    "Teacher III",
        "staff_title": "teacher_iii",
        "photo_file":  None,
    },
    {
        "username":    "norhata.casana",
        "first_name":  "Norhata",
        "last_name":   "Casana",
        "middle_name": "B.",
        "position":    "Teacher III",
        "staff_title": "teacher_iii",
        "photo_file":  "norhata-casana.JPG",
    },
    {
        "username":    "clarice.cena",
        "first_name":  "Clarice",
        "last_name":   "Cena",
        "middle_name": "C.",
        "position":    "Teacher III",
        "staff_title": "teacher_iii",
        "photo_file":  "clarice-cena.JPG",
    },
    {
        "username":    "jellieta.clordealta",
        "first_name":  "Jellieta",
        "last_name":   "Clordealta",
        "middle_name": "L.",
        "position":    "Teacher III",
        "staff_title": "teacher_iii",
        "photo_file":  "jellieta-clordealta.JPG",
    },
    {
        "username":    "hegenia.coca",
        "first_name":  "Hegenia",
        "last_name":   "Coca",
        "middle_name": "C.",
        "position":    "Teacher III",
        "staff_title": "teacher_iii",
        "photo_file":  "hegenia-coca.JPG",
    },
    {
        "username":    "monalissa.dicol",
        "first_name":  "Monalissa",
        "last_name":   "Dicol",
        "middle_name": "D.",
        "position":    "Teacher III",
        "staff_title": "teacher_iii",
        "photo_file":  "monalissa-dicol.JPG",
    },
    {
        "username":    "leoann.garma",
        "first_name":  "Leo Ann",
        "last_name":   "Garma",
        "middle_name": "S.",
        "position":    "Teacher III",
        "staff_title": "teacher_iii",
        "photo_file":  "leo-garma.JPG",
    },
    {
        "username":    "daisy.layos",
        "first_name":  "Daisy",
        "last_name":   "Layos",
        "middle_name": "M.",
        "position":    "Teacher III",
        "staff_title": "teacher_iii",
        "photo_file":  None,
    },
    {
        "username":    "maryjean.nunez",
        "first_name":  "Mary Jean",
        "last_name":   "Nunez",
        "middle_name": "M.",
        "position":    "Teacher III",
        "staff_title": "teacher_iii",
        "photo_file":  "mary-nunez.JPG",
    },
    {
        "username":    "krystinemae.pastidio",
        "first_name":  "Krystine Mae",
        "last_name":   "Pastidio",
        "middle_name": "T.",
        "position":    "Teacher III",
        "staff_title": "teacher_iii",
        "photo_file":  "krystine-pastidio.JPG",
    },

    # ── Teacher II ───────────────────────────────────────────────────────────
    {
        "username":    "mariacristina.turtosa",
        "first_name":  "Maria Cristina",
        "last_name":   "Turtosa",
        "middle_name": "F.",
        "position":    "Teacher II",
        "staff_title": "teacher_ii",
        "photo_file":  "maria-turtosa.JPG",
    },
    {
        "username":    "grace.macatol",
        "first_name":  "Grace",
        "last_name":   "Macatol",
        "middle_name": "H.",
        "position":    "Teacher II",
        "staff_title": "teacher_ii",
        "photo_file":  "grace-macatol.JPG",
    },

    # ── Teacher I ────────────────────────────────────────────────────────────
    {
        "username":    "tasneemah.amer",
        "first_name":  "Tasneemah",
        "last_name":   "Amer",
        "middle_name": "S.",
        "position":    "Teacher I",
        "staff_title": "teacher_i",
        "photo_file":  "tasneemah-amer.JPG",
    },
    {
        "username":    "elizalde.cabual",
        "first_name":  "Elizalde",
        "last_name":   "Cabual",
        "middle_name": "D.",
        "position":    "Teacher I",
        "staff_title": "teacher_i",
        "photo_file":  "elizalde-cabual.JPG",
    },
    {
        "username":    "shane.cadiz",
        "first_name":  "Shane Phoebe Olive",
        "last_name":   "Cadiz",
        "middle_name": "B.",
        "position":    "Teacher I",
        "staff_title": "teacher_i",
        "photo_file":  "shane-cadiz.JPG",
    },
    {
        "username":    "annabel.cantila",
        "first_name":  "Annabel",
        "last_name":   "Cantila",
        "middle_name": "V.",
        "position":    "Teacher I",
        "staff_title": "teacher_i",
        "photo_file":  "annabel-cantila.JPG",
    },
    {
        "username":    "darwin.castillon",
        "first_name":  "Darwin",
        "last_name":   "Castillon",
        "middle_name": "A.",
        "position":    "Teacher I",
        "staff_title": "teacher_i",
        "photo_file":  "darwin-castillon.JPG",
    },
    {
        "username":    "julius.paler",
        "first_name":  "Julius Caesar",
        "last_name":   "Paler",
        "middle_name": "R.",
        "position":    "Teacher I",
        "staff_title": "teacher_i",
        "photo_file":  "julius-paler.JPG",
    },
    {
        "username":    "chozily.tatoy",
        "first_name":  "Chozily",
        "last_name":   "Tatoy",
        "middle_name": "G.",
        "position":    "Teacher I",
        "staff_title": "teacher_i",
        "photo_file":  "chozily-tatoy.JPG",
    },

    # ── ALS ──────────────────────────────────────────────────────────────────
    {
        "username":    "aldrin.maghinay",
        "first_name":  "Aldrin",
        "last_name":   "Maghinay",
        "middle_name": "L.",
        "position":    "ALS Teacher",
        "staff_title": "als_teacher",
        "photo_file":  "aldrin-maghinay.JPG",
    },
]


def _make_password(length: int = 12) -> str:
    chars = string.ascii_letters + string.digits + "!@#$"
    while True:
        pwd = "".join(secrets.choice(chars) for _ in range(length))
        # ensure at least one of each character class
        if (any(c.isupper() for c in pwd)
                and any(c.islower() for c in pwd)
                and any(c.isdigit() for c in pwd)):
            return pwd


class Command(BaseCommand):
    help = "Create portal staff accounts for all KNHS faculty with profile photos from the public website."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be created without writing to the database.",
        )
        parser.add_argument(
            "--base-url",
            default="https://cranoraa-eng-cranoraa-knhs-website.vercel.app",
            help="Base URL of the Vercel frontend (default: Vercel production URL).",
        )
        parser.add_argument(
            "--reset-photos",
            action="store_true",
            help="Only update profile_picture on existing accounts; do not create new accounts.",
        )

    def handle(self, *args, **options):
        dry_run    = options["dry_run"]
        base_url   = options["base_url"].rstrip("/")
        reset_only = options["reset_photos"]

        created_accounts = []
        skipped          = []
        photos_updated   = []

        for person in FACULTY_ROSTER:
            username   = person["username"]
            photo_url  = (
                f"{base_url}/faculty/{person['photo_file']}"
                if person["photo_file"]
                else None
            )

            existing = User.objects.filter(username=username).first()

            # ── Photo-update-only mode ──────────────────────────────────────
            if reset_only:
                if existing:
                    if photo_url:
                        if not dry_run:
                            profile, _ = Profile.objects.get_or_create(user=existing)
                            profile.profile_picture = photo_url
                            profile.save(update_fields=["profile_picture"])
                        photos_updated.append(username)
                        self.stdout.write(f"  📷  Updated photo for {username}")
                    else:
                        self.stdout.write(f"  —   No photo for {username}, skipped.")
                else:
                    self.stdout.write(
                        self.style.WARNING(f"  ⚠   Account not found for {username} (run without --reset-photos to create it)")
                    )
                continue

            # ── Normal create mode ──────────────────────────────────────────
            if existing:
                skipped.append(username)
                self.stdout.write(f"  ↷   {username} already exists — skipped")
                continue

            password = _make_password()

            if dry_run:
                self.stdout.write(
                    f"  [DRY RUN] Would create: {username} ({person['first_name']} {person['last_name']}) "
                    f"— {person['position']}  photo={'yes' if photo_url else 'none'}"
                )
                continue

            try:
                with transaction.atomic():
                    user = User(
                        username=username,
                        first_name=person["first_name"],
                        last_name=person["last_name"],
                        role="staff",
                        staff_title=person["staff_title"],
                        is_verified=False,
                        is_approved=True,
                        must_change_password=True,
                        account_status="active",
                    )
                    user.set_password(password)
                    user.save()

                    profile, _ = Profile.objects.get_or_create(user=user)
                    profile.middle_name    = person.get("middle_name", "")
                    profile.employee_id    = None      # admin can fill later
                    profile.profile_picture = photo_url
                    profile.save()

                created_accounts.append({
                    "username": username,
                    "name":     f"{person['first_name']} {person['last_name']}",
                    "position": person["position"],
                    "password": password,
                    "photo":    "✓" if photo_url else "—",
                })
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  ✓   Created {username}  pwd={password}  photo={'✓' if photo_url else '—'}"
                    )
                )
            except Exception as exc:
                self.stdout.write(
                    self.style.ERROR(f"  ✗   Failed to create {username}: {exc}")
                )

        # ── Summary ────────────────────────────────────────────────────────
        self.stdout.write("\n" + "─" * 60)
        if reset_only:
            self.stdout.write(self.style.SUCCESS(f"Photos updated: {len(photos_updated)}"))
            return

        self.stdout.write(self.style.SUCCESS(f"Accounts created : {len(created_accounts)}"))
        self.stdout.write(self.style.WARNING(f"Already existed  : {len(skipped)}"))

        if created_accounts:
            self.stdout.write("\n┌─ CREDENTIALS (save these now — shown only once) ─────────────┐")
            for acc in created_accounts:
                self.stdout.write(
                    f"│  {acc['username']:<28}  pwd: {acc['password']:<14}  photo: {acc['photo']} │"
                )
            self.stdout.write("└───────────────────────────────────────────────────────────────┘")
            self.stdout.write(
                "\nAll accounts are set to must_change_password=True so each teacher\n"
                "will be prompted to set their own password on first login.\n"
            )
