"""
Management command to backfill EnrollmentDocument records from URL fields.

This creates EnrollmentDocument records for existing enrollment applications
that have document URLs in the legacy URL fields but no EnrollmentDocument records.

Usage:
    python manage.py backfill_documents
    python manage.py backfill_documents --dry-run  # Preview without making changes
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from accounts.models import EnrollmentApplication, EnrollmentDocument
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Backfill EnrollmentDocument records from legacy URL fields'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without saving to database',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be saved'))
            self.stdout.write('')
        
        # Document field mapping
        doc_field_map = {
            'birth_certificate': 'birth_certificate',
            'report_card': 'report_card',
            'form_138': 'form_138',
            'certificate_of_completion': 'certificate_of_completion',
            'good_moral_certificate': 'good_moral',
            'id_picture': 'id_picture',
            'last_school_attended_cert': 'last_school_attended',
        }
        
        # Get all applications
        applications = EnrollmentApplication.objects.all()
        total_apps = applications.count()
        
        self.stdout.write(f'Found {total_apps} enrollment applications')
        self.stdout.write('')
        
        created_count = 0
        skipped_count = 0
        error_count = 0
        
        for app in applications:
            try:
                # Check each document field
                docs_to_create = []
                
                for field_name, doc_type in doc_field_map.items():
                    # Get the URL from the field
                    url = getattr(app, field_name, None)
                    
                    if url:
                        # Check if EnrollmentDocument already exists for this type
                        existing = EnrollmentDocument.objects.filter(
                            application=app,
                            document_type=doc_type
                        ).exists()
                        
                        if not existing:
                            # Extract filename from URL if possible
                            file_name = url.split('/')[-1] if '/' in url else 'document'
                            
                            docs_to_create.append({
                                'application': app,
                                'document_type': doc_type,
                                'file_url': url,
                                'file_name': file_name,
                                'verification_status': 'submitted',
                            })
                
                if docs_to_create:
                    if not dry_run:
                        with transaction.atomic():
                            for doc_data in docs_to_create:
                                EnrollmentDocument.objects.create(**doc_data)
                    
                    created_count += len(docs_to_create)
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  ✓ {app.enrollment_number} ({app.full_name}): '
                            f'Created {len(docs_to_create)} document record(s)'
                        )
                    )
                else:
                    skipped_count += 1
                    
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(
                        f'  ✗ {app.enrollment_number} ({app.full_name}): Error - {str(e)}'
                    )
                )
        
        # Summary
        self.stdout.write('')
        self.stdout.write('=' * 60)
        self.stdout.write(self.style.SUCCESS('BACKFILL COMPLETE'))
        self.stdout.write('=' * 60)
        self.stdout.write(f'Total applications processed: {total_apps}')
        self.stdout.write(f'Document records created: {created_count}')
        self.stdout.write(f'Applications skipped (no URLs or already have records): {skipped_count}')
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'Errors: {error_count}'))
        
        if dry_run:
            self.stdout.write('')
            self.stdout.write(self.style.WARNING('DRY RUN - No changes were saved'))
            self.stdout.write(self.style.WARNING('Run without --dry-run to apply changes'))
