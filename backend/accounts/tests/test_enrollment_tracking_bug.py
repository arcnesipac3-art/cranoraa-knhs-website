"""
Bug Condition Exploration Test for Tracking Endpoint Failure

**Validates: Requirements 1.1, 1.2, 2.1, 2.2**

This test MUST FAIL on unfixed code to confirm the bug exists.
The test encodes the expected behavior - when it passes after the fix,
it confirms the bug is resolved.

Property 1: Bug Condition - Tracking Endpoint Handles Null Related Objects

For any enrollment tracking request where a valid enrollment number is provided,
the track() function SHALL return a 200 response with application data including
null-safe attribute values, without raising any unhandled exceptions.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import date

from accounts.models import EnrollmentApplication, Classroom

User = get_user_model()


class TrackingEndpointBugConditionTest(TestCase):
    """
    Bug Condition Exploration Tests for Issue 1: Tracking Endpoint 500 Error
    
    CRITICAL: These tests encode the expected behavior and MUST FAIL on unfixed code.
    Failure on unfixed code confirms the bug exists (500 error instead of 200).
    When these tests PASS after implementing the fix, it confirms the bug is resolved.
    """

    def setUp(self):
        """Set up test data for tracking endpoint tests."""
        self.client = APIClient()
        
        # Create a classroom for testing
        self.classroom = Classroom.objects.create(
            name='11-STEM-A',
            school_year='2026-2027'
        )
        
        # Create a user for enrolled_student testing
        self.enrolled_user = User.objects.create_user(
            username='enrolled_student',
            email='enrolled@example.com',
            password='testpass123',
            role='student',
            is_approved=True
        )

    def test_tracking_with_null_assigned_classroom(self):
        """
        Test tracking endpoint when assigned_classroom is None.
        
        Bug Condition: Application with assigned_classroom=None
        Expected Behavior: Returns 200 with null classroom_name (not 500)
        
        On UNFIXED code: This test will FAIL because the endpoint returns 500
        (AttributeError: 'NoneType' object has no attribute 'name')
        
        On FIXED code: This test will PASS because the endpoint handles null safely
        """
        # Create enrollment application WITHOUT assigned_classroom
        app = EnrollmentApplication.objects.create(
            first_name='John',
            last_name='Doe',
            middle_name='M',
            sex='male',
            date_of_birth=date(2008, 5, 15),
            street_address='123 Main St',
            barangay='Test Barangay',
            city_municipality='Test City',
            province='Test Province',
            grade_level='11',
            strand='Academic',
            email='john.doe@example.com',
            phone_number='09123456789',
            emergency_contact_name='Jane Doe',
            emergency_contact_relationship='Mother',
            emergency_contact_phone='09198765432',
            status='pending',
            assigned_classroom=None,  # CRITICAL: This is None - the bug condition
        )
        
        # Track the application by enrollment number
        response = self.client.get(
            f'/api/v1/enrollment-applications/track/?number={app.enrollment_number}'
        )
        
        # Expected behavior: Should return 200, not 500
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            f"Expected 200 OK but got {response.status_code}. "
            f"On unfixed code, this fails with 500 due to AttributeError when accessing "
            f"assigned_classroom.name on None. Response: {response.data if hasattr(response, 'data') else response.content}"
        )
        
        # Verify response includes all required fields
        self.assertIn('id', response.data)
        self.assertIn('enrollment_number', response.data)
        self.assertIn('status', response.data)
        self.assertIn('full_name', response.data)
        self.assertIn('grade_level', response.data)
        self.assertIn('strand', response.data)
        self.assertIn('submitted_at', response.data)
        self.assertIn('assigned_classroom_name', response.data)
        self.assertIn('remarks', response.data)
        
        # Verify null-safe handling: assigned_classroom_name should be None, not cause error
        self.assertIsNone(
            response.data['assigned_classroom_name'],
            "assigned_classroom_name should be None when assigned_classroom is null"
        )
        
        # Verify other fields are correctly populated
        self.assertEqual(response.data['enrollment_number'], app.enrollment_number)
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(response.data['full_name'], 'John M Doe')
        self.assertEqual(response.data['grade_level'], '11')
        self.assertEqual(response.data['strand'], 'Academic')

    def test_tracking_with_null_enrolled_student(self):
        """
        Test tracking endpoint when enrolled_student is None (authenticated).
        
        Bug Condition: Authenticated request for application with enrolled_student=None
        Expected Behavior: Returns 200 with null enrolled_student_email (not 500)
        
        On UNFIXED code: This test will FAIL because the endpoint returns 500
        (AttributeError: 'NoneType' object has no attribute 'email')
        
        On FIXED code: This test will PASS because the endpoint handles null safely
        """
        # Create an admin user for authenticated tracking
        admin_user = User.objects.create_user(
            username='admin_tracker',
            email='admin@example.com',
            password='adminpass123',
            role='admin',
            is_staff=True,
            is_approved=True
        )
        self.client.force_authenticate(user=admin_user)
        
        # Create enrollment application WITHOUT enrolled_student
        app = EnrollmentApplication.objects.create(
            first_name='Jane',
            last_name='Smith',
            sex='female',
            date_of_birth=date(2009, 3, 20),
            street_address='456 Oak Ave',
            barangay='Test Barangay 2',
            city_municipality='Test City',
            province='Test Province',
            grade_level='10',
            email='jane.smith@example.com',
            phone_number='09123456788',
            emergency_contact_name='John Smith',
            emergency_contact_relationship='Father',
            emergency_contact_phone='09198765433',
            status='approved',
            assigned_classroom=self.classroom,
            enrolled_student=None,  # CRITICAL: This is None - the bug condition
        )
        
        # Track the application by enrollment number (authenticated)
        response = self.client.get(
            f'/api/v1/enrollment-applications/track/?number={app.enrollment_number}'
        )
        
        # Expected behavior: Should return 200, not 500
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            f"Expected 200 OK but got {response.status_code}. "
            f"On unfixed code, this fails with 500 due to AttributeError when accessing "
            f"enrolled_student.email on None. Response: {response.data if hasattr(response, 'data') else response.content}"
        )
        
        # Verify response includes base fields
        self.assertIn('id', response.data)
        self.assertIn('enrollment_number', response.data)
        self.assertIn('status', response.data)
        
        # Verify authenticated user gets additional fields
        self.assertIn('enrolled_student_email', response.data)
        self.assertIn('documents', response.data)
        self.assertIn('status_history', response.data)
        
        # Verify null-safe handling: enrolled_student_email should be None, not cause error
        self.assertIsNone(
            response.data['enrolled_student_email'],
            "enrolled_student_email should be None when enrolled_student is null"
        )
        
        # Verify documents and status_history are empty lists (no errors)
        self.assertIsInstance(response.data['documents'], list)
        self.assertIsInstance(response.data['status_history'], list)

    def test_tracking_with_both_null_fields(self):
        """
        Test tracking endpoint when BOTH assigned_classroom AND enrolled_student are None.
        
        Bug Condition: Application with both null related objects
        Expected Behavior: Returns 200 with both fields as null (not 500)
        
        This is the most comprehensive test case combining both bug conditions.
        """
        # Create an admin user for authenticated tracking
        admin_user = User.objects.create_user(
            username='admin_comprehensive',
            email='admin2@example.com',
            password='adminpass123',
            role='admin',
            is_staff=True,
            is_approved=True
        )
        self.client.force_authenticate(user=admin_user)
        
        # Create enrollment application with BOTH fields as None
        app = EnrollmentApplication.objects.create(
            first_name='Test',
            last_name='Student',
            sex='male',
            date_of_birth=date(2008, 1, 1),
            street_address='789 Test St',
            barangay='Test Barangay 3',
            city_municipality='Test City',
            province='Test Province',
            grade_level='11',
            strand='Academic',
            email='test.student@example.com',
            phone_number='09123456787',
            emergency_contact_name='Test Parent',
            emergency_contact_relationship='Guardian',
            emergency_contact_phone='09198765434',
            status='under_review',
            assigned_classroom=None,  # CRITICAL: Both fields are None
            enrolled_student=None,
        )
        
        # Track the application
        response = self.client.get(
            f'/api/v1/enrollment-applications/track/?number={app.enrollment_number}'
        )
        
        # Expected behavior: Should return 200, not 500
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            f"Expected 200 OK but got {response.status_code}. "
            f"On unfixed code, this fails with 500 due to multiple AttributeErrors. "
            f"Response: {response.data if hasattr(response, 'data') else response.content}"
        )
        
        # Verify both null fields are handled safely
        self.assertIsNone(response.data['assigned_classroom_name'])
        self.assertIsNone(response.data['enrolled_student_email'])
        
        # Verify no exceptions were raised during data construction
        self.assertEqual(response.data['status'], 'under_review')
        self.assertEqual(response.data['full_name'], 'Test Student')

    def test_tracking_with_all_fields_set_baseline(self):
        """
        Baseline test: Tracking with ALL fields properly set should work.
        
        This test verifies the tracking endpoint works correctly when no null values exist.
        This should pass on BOTH unfixed and fixed code (if the bug is truly about null handling).
        """
        # Create enrollment application WITH all fields set
        app = EnrollmentApplication.objects.create(
            first_name='Complete',
            last_name='Record',
            sex='female',
            date_of_birth=date(2008, 6, 10),
            street_address='111 Complete St',
            barangay='Complete Barangay',
            city_municipality='Complete City',
            province='Complete Province',
            grade_level='11',
            strand='Academic',
            email='complete@example.com',
            phone_number='09123456786',
            emergency_contact_name='Complete Parent',
            emergency_contact_relationship='Mother',
            emergency_contact_phone='09198765435',
            status='enrolled',
            assigned_classroom=self.classroom,  # Set
            enrolled_student=self.enrolled_user,  # Set
        )
        
        # Track the application
        response = self.client.get(
            f'/api/v1/enrollment-applications/track/?number={app.enrollment_number}'
        )
        
        # This should work on both unfixed and fixed code
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify fields are populated correctly
        self.assertEqual(response.data['assigned_classroom_name'], self.classroom.name)
        self.assertEqual(response.data['status'], 'enrolled')
