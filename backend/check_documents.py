#!/usr/bin/env python
"""
Quick script to check if EnrollmentDocument records exist in the database.
Run this to verify documents were actually created during enrollment submission.

Usage:
    python check_documents.py
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'knhs.settings')
django.setup()

from accounts.models import EnrollmentApplication, EnrollmentDocument

def main():
    print("=" * 60)
    print("ENROLLMENT DOCUMENTS CHECK")
    print("=" * 60)
    print()
    
    # Get all applications
    applications = EnrollmentApplication.objects.all().order_by('-submitted_at')[:10]
    
    if not applications:
        print("❌ No enrollment applications found in database.")
        return
    
    print(f"✅ Found {applications.count()} recent applications")
    print()
    
    # Check each application for documents
    for app in applications:
        print(f"📋 {app.enrollment_number} - {app.full_name} ({app.status})")
        print(f"   Submitted: {app.submitted_at.strftime('%Y-%m-%d %H:%M')}")
        
        # Get documents using the related manager
        docs = app.documents.all()
        doc_count = docs.count()
        
        if doc_count > 0:
            print(f"   ✅ Has {doc_count} document(s):")
            for doc in docs:
                print(f"      - {doc.get_document_type_display()}")
                print(f"        Status: {doc.get_verification_status_display()}")
                print(f"        File: {doc.file_name or 'N/A'}")
                print(f"        URL: {doc.file_url[:60]}...")
        else:
            print(f"   ⚠️  No documents found")
            
            # Check if URL fields have data (old way)
            url_fields = {
                'birth_certificate': app.birth_certificate,
                'report_card': app.report_card,
                'form_138': app.form_138,
                'good_moral_certificate': app.good_moral_certificate,
                'id_picture': app.id_picture,
            }
            
            has_urls = any(url_fields.values())
            if has_urls:
                print(f"   📎 But has URL fields set (old format):")
                for field, url in url_fields.items():
                    if url:
                        print(f"      - {field}: {url[:50]}...")
        
        print()
    
    # Summary
    total_docs = EnrollmentDocument.objects.count()
    print("=" * 60)
    print(f"TOTAL: {total_docs} EnrollmentDocument records in database")
    print("=" * 60)
    
    if total_docs == 0:
        print()
        print("⚠️  WARNING: No EnrollmentDocument records found!")
        print("This means documents are being stored in URL fields only.")
        print("Check the create() method in enrollment view to ensure")
        print("EnrollmentDocument.objects.create() is being called.")

if __name__ == '__main__':
    main()
