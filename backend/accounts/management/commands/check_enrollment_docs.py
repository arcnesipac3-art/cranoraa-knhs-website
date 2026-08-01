"""
Diagnostic: check enrollment document state.
    python manage.py check_enrollment_docs
"""
from django.core.management.base import BaseCommand
from accounts.models import EnrollmentApplication, EnrollmentDocument


class Command(BaseCommand):
    help = 'Diagnostic: check enrollment documents state'

    def handle(self, *args, **options):
        total = EnrollmentApplication.objects.count()
        with_docs = EnrollmentApplication.objects.filter(documents__isnull=False).distinct().count()
        without_docs = total - with_docs

        self.stdout.write(f'\nTotal applications: {total}')
        self.stdout.write(f'With EnrollmentDocument records: {with_docs}')
        self.stdout.write(f'Without EnrollmentDocument records: {without_docs}')

        self.stdout.write(f'\n--- Applications WITHOUT EnrollmentDocument records ---')
        empty_qs = EnrollmentApplication.objects.filter(documents__isnull=True)
        for app in empty_qs[:20]:
            url_fields = {
                'birth_certificate': app.birth_certificate,
                'report_card': app.report_card,
                'form_138': app.form_138,
                'certificate_of_completion': app.certificate_of_completion,
                'good_moral_certificate': app.good_moral_certificate,
                'id_picture': app.id_picture,
                'last_school_attended_cert': app.last_school_attended_cert,
            }
            has_urls = {k: bool(v) for k, v in url_fields.items() if v}
            self.stdout.write(
                f'  {app.enrollment_number} | {app.status} | '
                f'URL fields with data: {list(has_urls.keys()) if has_urls else "NONE"}'
            )

        self.stdout.write(f'\n--- Applications WITH EnrollmentDocument records ---')
        with_qs = EnrollmentApplication.objects.prefetch_related('documents').exclude(documents__isnull=True).distinct()
        for app in with_qs[:10]:
            docs = app.documents.all()
            self.stdout.write(
                f'  {app.enrollment_number} | {app.status} | '
                f'{docs.count()} docs: {[d.document_type for d in docs]}'
            )
