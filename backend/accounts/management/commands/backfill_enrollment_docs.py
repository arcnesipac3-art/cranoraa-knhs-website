"""
Backfill EnrollmentDocument records from existing URL fields on EnrollmentApplication.
Run once after deploying the EnrollmentDocument model:
    python manage.py backfill_enrollment_docs
"""
from django.core.management.base import BaseCommand
from accounts.models import EnrollmentApplication, EnrollmentDocument


FIELD_TO_DOC_TYPE = {
    'birth_certificate': 'birth_certificate',
    'report_card': 'report_card',
    'form_138': 'form_138',
    'certificate_of_completion': 'certificate_of_completion',
    'good_moral_certificate': 'good_moral',
    'id_picture': 'id_picture',
    'last_school_attended_cert': 'last_school_attended',
}


class Command(BaseCommand):
    help = 'Backfill EnrollmentDocument records from EnrollmentApplication URL fields'

    def handle(self, *args, **options):
        created = 0
        skipped = 0
        apps = EnrollmentApplication.objects.all()
        total = apps.count()

        for app in apps:
            existing_types = set(
                app.documents.values_list('document_type', flat=True)
            )

            for field_name, doc_type in FIELD_TO_DOC_TYPE.items():
                url = getattr(app, field_name, None)
                if not url or doc_type in existing_types:
                    continue

                EnrollmentDocument.objects.create(
                    application=app,
                    document_type=doc_type,
                    file_url=url,
                    file_name=f'{doc_type}_{app.enrollment_number}',
                    verification_status='submitted',
                )
                created += 1

            skipped += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done. {created} documents created across {total} applications.'
        ))
