"""
Setup script for creating load testing data in the KNHS School Portal.

This script creates the necessary test users and sample data for k6 load testing.

Usage:
    python setup-test-data.py
    python setup-test-data.py --cleanup  # Remove test data
"""

import os
import sys
import django
import argparse
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).resolve().parent.parent / 'backend'
sys.path.insert(0, str(backend_dir))

# Setup Django
os.environ.setdefault('DJANGO_SECRET_KEY', 'test-secret-key-for-load-testing')
os.environ.setdefault('DEBUG', 'True')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_portal.settings')
django.setup()

from django.contrib.auth.hashers import make_password
from accounts.models import User, Profile, Classroom, Subject, StudentClassEnrollment
from django.db import transaction


class LoadTestDataSetup:
    """Setup and teardown test data for load testing."""
    
    TEST_PASSWORD = 'TestPassword123!'
    
    def __init__(self):
        self.created_users = []
        self.created_classrooms = []
        self.created_subjects = []
    
    @transaction.atomic
    def create_test_users(self):
        """Create test users for load testing."""
        print("Creating test users...")
        
        # Create test student
        if not User.objects.filter(username='test_student').exists():
            student = User.objects.create(
                username='test_student',
                password=make_password(self.TEST_PASSWORD),
                email='test_student@loadtest.local',
                role='student',
                first_name='Test',
                last_name='Student'
            )
            Profile.objects.create(
                user=student,
                registration_number='TEST-STU-001',
                grade_level='11',
                section='A'
            )
            self.created_users.append(student)
            print(f"✓ Created test student: {student.username}")
        else:
            print("✓ Test student already exists")
        
        # Create test teacher
        if not User.objects.filter(username='test_teacher').exists():
            teacher = User.objects.create(
                username='test_teacher',
                password=make_password(self.TEST_PASSWORD),
                email='test_teacher@loadtest.local',
                role='teacher',
                first_name='Test',
                last_name='Teacher'
            )
            Profile.objects.create(
                user=teacher,
                employee_id='EMP-TEST-001',
                title='Test Subject Teacher'
            )
            self.created_users.append(teacher)
            print(f"✓ Created test teacher: {teacher.username}")
        else:
            print("✓ Test teacher already exists")
        
        # Create test admin
        if not User.objects.filter(username='test_admin').exists():
            admin = User.objects.create(
                username='test_admin',
                password=make_password(self.TEST_PASSWORD),
                email='test_admin@loadtest.local',
                role='admin',
                first_name='Test',
                last_name='Admin',
                is_staff=True,
                is_superuser=True
            )
            Profile.objects.create(
                user=admin,
                employee_id='EMP-ADMIN-001',
                title='System Administrator'
            )
            self.created_users.append(admin)
            print(f"✓ Created test admin: {admin.username}")
        else:
            print("✓ Test admin already exists")
        
        print(f"\nTest credentials:")
        print(f"  Username: test_student, test_teacher, test_admin")
        print(f"  Password: {self.TEST_PASSWORD}")
    
    @transaction.atomic
    def create_sample_classroom(self):
        """Create a sample classroom for testing."""
        print("\nCreating sample classroom...")
        
        teacher = User.objects.filter(username='test_teacher').first()
        if not teacher:
            print("✗ Test teacher not found. Run create_test_users first.")
            return
        
        if not Classroom.objects.filter(name='Test Classroom 11-A').exists():
            classroom = Classroom.objects.create(
                name='Test Classroom 11-A',
                grade_level='11',
                section='A',
                adviser=teacher,
                academic_year='2024-2025',
                semester='1st Semester'
            )
            self.created_classrooms.append(classroom)
            print(f"✓ Created classroom: {classroom.name}")
            
            # Enroll test student
            student = User.objects.filter(username='test_student').first()
            if student:
                StudentClassEnrollment.objects.create(
                    student=student,
                    classroom=classroom
                )
                print(f"✓ Enrolled test student in classroom")
        else:
            print("✓ Test classroom already exists")
    
    @transaction.atomic
    def create_sample_subject(self):
        """Create a sample subject for testing."""
        print("\nCreating sample subject...")
        
        if not Subject.objects.filter(name='Load Test Subject').exists():
            subject = Subject.objects.create(
                name='Load Test Subject',
                code='TEST-101',
                description='Subject for load testing purposes',
                grade_level='11',
                track='STEM'
            )
            self.created_subjects.append(subject)
            print(f"✓ Created subject: {subject.name}")
        else:
            print("✓ Test subject already exists")
    
    @transaction.atomic
    def cleanup_test_data(self):
        """Remove all test data created for load testing."""
        print("\nCleaning up test data...")
        
        # Delete test users (cascades to profiles and enrollments)
        deleted_count = User.objects.filter(
            username__in=['test_student', 'test_teacher', 'test_admin']
        ).delete()[0]
        print(f"✓ Deleted {deleted_count} test users and related data")
        
        # Delete test classrooms
        deleted_count = Classroom.objects.filter(
            name__startswith='Test Classroom'
        ).delete()[0]
        print(f"✓ Deleted {deleted_count} test classrooms")
        
        # Delete test subjects
        deleted_count = Subject.objects.filter(
            name='Load Test Subject'
        ).delete()[0]
        print(f"✓ Deleted {deleted_count} test subjects")
        
        print("\nCleanup complete!")
    
    def verify_setup(self):
        """Verify that test data exists and is accessible."""
        print("\nVerifying test data setup...")
        
        errors = []
        
        # Check users
        for username in ['test_student', 'test_teacher', 'test_admin']:
            try:
                user = User.objects.get(username=username)
                if not hasattr(user, 'profile'):
                    errors.append(f"✗ {username} has no profile")
                else:
                    print(f"✓ {username} exists with profile")
            except User.DoesNotExist:
                errors.append(f"✗ {username} does not exist")
        
        # Check classroom
        if Classroom.objects.filter(name='Test Classroom 11-A').exists():
            print("✓ Test classroom exists")
        else:
            errors.append("✗ Test classroom does not exist")
        
        # Check subject
        if Subject.objects.filter(name='Load Test Subject').exists():
            print("✓ Test subject exists")
        else:
            errors.append("✗ Test subject does not exist")
        
        if errors:
            print("\n⚠ Verification found issues:")
            for error in errors:
                print(f"  {error}")
            return False
        else:
            print("\n✓ All test data verified successfully!")
            return True
    
    def setup_all(self):
        """Setup all test data."""
        print("="*60)
        print("KNHS School Portal - Load Test Data Setup")
        print("="*60)
        
        self.create_test_users()
        self.create_sample_classroom()
        self.create_sample_subject()
        
        print("\n" + "="*60)
        if self.verify_setup():
            print("\n✓ Load test data setup complete!")
            print("\nYou can now run k6 load tests.")
            print("See load-tests/README.md for instructions.")
        else:
            print("\n⚠ Setup completed with warnings. Review the errors above.")
        print("="*60)


def main():
    parser = argparse.ArgumentParser(
        description='Setup or cleanup load testing data for KNHS School Portal'
    )
    parser.add_argument(
        '--cleanup',
        action='store_true',
        help='Remove all test data instead of creating it'
    )
    parser.add_argument(
        '--verify',
        action='store_true',
        help='Only verify existing test data without creating new data'
    )
    
    args = parser.parse_args()
    
    setup = LoadTestDataSetup()
    
    if args.cleanup:
        print("="*60)
        print("KNHS School Portal - Load Test Data Cleanup")
        print("="*60)
        setup.cleanup_test_data()
    elif args.verify:
        print("="*60)
        print("KNHS School Portal - Load Test Data Verification")
        print("="*60)
        setup.verify_setup()
    else:
        setup.setup_all()


if __name__ == '__main__':
    main()
