from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import FacultyMember


class Command(BaseCommand):
    help = "Sync faculty photos from faculty roster to FacultyMember records"

    def add_arguments(self, parser):
        parser.add_argument(
            "--base-url",
            default="https://kiwalannhs.vercel.app",
            help="Vercel frontend base URL",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be updated without writing to database.",
        )

    def handle(self, *args, **options):
        base_url = options["base_url"].rstrip("/")
        dry_run = options["dry_run"]

        # Define faculty roster matching frontend/src/data/facultyData.js structure
        persons = [
            # Administration
            {"id": "sanny-delfin", "name": "Sanny O. Delfin", "position": "School Principal I", "photo": "/faculty/sanny-delfin.jpg"},
            {"id": "jaylen-navato", "name": "Jaylen S. Navato", "position": "School Guidance Designate", "photo": "/faculty/jaylen-navato.JPG"},
            {"id": "michelyn-biera", "name": "Michelyn B. Biera", "position": "Administrative Officer I", "photo": "/faculty/michelyn-biera.jpg"},
            {"id": "cherry-sagrado", "name": "Cherry B. Sagrado", "position": "Administrative Assistant III", "photo": "/faculty/cherry-sagrado.jpg"},

            # Faculty
            {"id": "beverly-perez", "name": "Beverly S. Perez", "position": "Master Teacher I", "photo": "/faculty/beverly-perez.JPG"},
            {"id": "jessica-actub", "name": "Jessica B. Actub", "position": "Special Science Teacher I", "photo": "/faculty/jessica-actub.JPG"},
            {"id": "rusty-bartolata", "name": "Rusty D. Bartolata", "position": "Teacher VI", "photo": "/faculty/rusty-bartolata.JPG"},
            {"id": "tahany-rangaig", "name": "Tahany A. Rangaig", "position": "Teacher VI", "photo": "/faculty/tahany-rangaig.JPG"},
            {"id": "jonathan-tatoy", "name": "Jonathan B. Tatoy", "position": "Teacher VI", "photo": "/faculty/jonathan-tatoy.JPG"},
            {"id": "ellen-gedaro", "name": "Ellen E. Gedaro", "position": "Teacher V", "photo": "/faculty/ellen-gedaro.JPG"},
            {"id": "mildred-gomez", "name": "Mildred P. Gomez", "position": "Teacher V", "photo": "/faculty/mildred-gomez.JPG"},
            {"id": "janice-valdez", "name": "Janice May E. Valdez", "position": "Teacher V", "photo": "/faculty/janice-valdez.JPG"},
            {"id": "kimberly-acaso", "name": "Kimberly B. Acaso", "position": "Teacher IV", "photo": "/faculty/kimberly-acaso.JPG"},
            {"id": "lucelle-catubig", "name": "Lucelle B. Catubig", "position": "Teacher IV", "photo": "/faculty/lucelle-catubig.JPG"},
            {"id": "clarence-pabillar", "name": "Clarence P. Pabillar", "position": "Teacher IV", "photo": "/faculty/clarence-pabillar.JPG"},
            {"id": "mark-bacus", "name": "Mark Ryan J. Bacus", "position": "Teacher III", "photo": None},
            {"id": "norhata-casana", "name": "Norhata B. Casana", "position": "Teacher III", "photo": "/faculty/norhata-casana.JPG"},
            {"id": "clarice-cena", "name": "Clarice C. Cena", "position": "Teacher III", "photo": "/faculty/clarice-cena.JPG"},
            {"id": "jellieta-clordealta", "name": "Jellieta L. Clordealta", "position": "Teacher III", "photo": "/faculty/jellieta-clordealta.JPG"},
            {"id": "hegenia-coca", "name": "Hegenia C. Coca", "position": "Teacher III", "photo": "/faculty/hegenia-coca.JPG"},
            {"id": "monalissa-dicol", "name": "Monalissa D. Dicol", "position": "Teacher III", "photo": "/faculty/monalissa-dicol.JPG"},
            {"id": "leo-garma", "name": "Leo Ann S. Garma", "position": "Teacher III", "photo": "/faculty/leo-garma.JPG"},
            {"id": "daisy-layos", "name": "Daisy M. Layos", "position": "Teacher III", "photo": None},
            {"id": "mary-nunez", "name": "Mary Jean M. Nuñez", "position": "Teacher III", "photo": "/faculty/mary-nunez.JPG"},
            {"id": "krystine-pastidio", "name": "Krystine Mae T. Pastidio", "position": "Teacher III", "photo": "/faculty/krystine-pastidio.JPG"},
            {"id": "maria-turtosa", "name": "Maria Cristina F. Turtosa", "position": "Teacher II", "photo": "/faculty/maria-turtosa.JPG"},
            {"id": "grace-macatol", "name": "Grace H. Macatol", "position": "Teacher II", "photo": "/faculty/grace-macatol.JPG"},
            {"id": "tasneemah-amer", "name": "Tasneemah S. Amer", "position": "Teacher I", "photo": "/faculty/tasneemah-amer.JPG"},
            {"id": "elizalde-cabual", "name": "Elizalde D. Cabual", "position": "Teacher I", "photo": "/faculty/elizalde-cabual.JPG"},
            {"id": "shane-cadiz", "name": "Shane Phoebe Olive B. Cadiz", "position": "Teacher I", "photo": "/faculty/shane-cadiz.JPG"},
            {"id": "annabel-cantila", "name": "Annabel V. Cantila", "position": "Teacher I", "photo": "/faculty/annabel-cantila.JPG"},
            {"id": "darwin-castillon", "name": "Darwin A. Castillon", "position": "Teacher I", "photo": "/faculty/darwin-castillon.JPG"},
            {"id": "julius-paler", "name": "Julius Caesar R. Paler", "position": "Teacher I", "photo": "/faculty/julius-paler.JPG"},
            {"id": "chozily-tatoy", "name": "Chozily G. Tatoy", "position": "Teacher I", "photo": "/faculty/chozily-tatoy.JPG"},
            {"id": "aldrin-maghinay", "name": "Aldrin L. Maghinay", "position": "ALS Teacher", "photo": "/faculty/aldrin-maghinay.JPG"},
        ]

        updated = []
        skipped = []
        not_found = []

        for person in persons:
            person_id = person.get('id')

            # Find matching FacultyMember by name
            try:
                fm = FacultyMember.objects.get(name=person['name'])
            except FacultyMember.DoesNotExist:
                not_found.append(f"{person['name']} (not in DB)")
                continue
            except FacultyMember.MultipleObjectsReturned:
                fm = FacultyMember.objects.filter(name=person['name']).first()
                not_found.append(f"{person['name']} (duplicate)")

            photo_path = person.get('photo')
            if not photo_path:
                skipped.append(f"{person['name']} (no photo in data)")
                continue

            # Build photo URL: {base_url}/faculty/{path}
            photo_url = f"{base_url}/faculty/{photo_path.lstrip('/')}"

            if fm.photo == photo_url:
                skipped.append(f"{person['name']} (already correct)")
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
        self.stdout.write(self.style.WARNING(f"Skipped: {len(skipped)}"))
        self.stdout.write(self.style.ERROR(f"Not found in DB: {len(not_found)}"))

        if dry_run:
            self.stdout.write(self.style.NOTICE("\nRun without --dry-run to apply changes."))