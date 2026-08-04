"""
Preservation Property Tests for Tracking Endpoint

**Validates: Requirements 3.1, 3.2, 3.3**

These tests run on UNFIXED code to capture baseline behavior that must be preserved.
They test non-buggy scenarios (valid applications with complete data, invalid numbers, 
email-based tracking) to ensure the fix doesn't cause regressions.

Property 2: Preservation - Non-Buggy Tracking Behavior Unchanged

For any enrollment tracking request that does not involve the bug condition
(invalid number, authenticated vs unauthenticated access, email-based tracking),
the track() function SHALL produce the same response format and error codes as
the original function, preserving all existing tracking functionality.

EXPECTED OUTCOME: These tests should PASS on UNFIXED code (establishing baseline)
and continue to PASS on FIXED code (confirming no regressions).
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import date
from hypothesis import given, settings, strategies as st
from hypothesis.extra.django import TestCase as HypothesisTestCase

from accounts.models import EnrollmentApplication, Classroom, EnrollmentDocument

User = get_user_model()


class TrackingEndpointPreservationTest(TestCase):
    """
    Preservation Tests for Tracking Endpoint - Non-Buggy Scenarios
    
    These tests document and verify baseline behavior on UNFIXED code.
    They ensure the fix preserves all existing correct functionality.
    """

    def setUp(self):
        """Set up test data for preservation tests."""
        self.client = APIClient()
        
        # Create classroom for complete applications
        self.classroom = Classroom.objects.create(
            name='11-STEM-A',
            school_year='2026-2027'
        )
        
        # Create an enrolled student user
        self.enrolled_student = User.objects.create_user(
            username='enrolled_student',
            email='enrolled@example.com',
            password='testpass123',
            role='student',
            is_approved=True
        )
        
        # Create an admin user for authenticated tests
        self.admin_user = User.objects.create_user(
            username='admin_user',
            email='admin@example.com',
            password='adminpass123',
            role='admin',
            is_staff=True,
            is_approved=True
        )

    def test_track_complete_application_unauthenticated(self):
        """
        Preservation: Tracking a complete application (all fields set) as unauthenticated user.
        
        This represents the baseline "happy path" - everything works correctly.
        Expected to PASS on both unfixed and fixed code.
        """
        # Create complete enrollment application
        app = EnrollmentApplication.objects.create(
            first_name='Alice',
            last_name='Johnson',
            middle_name='B',
            sex='female',
            date_of_birth=date(2008, 4, 15),
            street_address='123 Main St',
            barangay='Central',
            city_municipality='Test City',
            province='Test Province',
            grade_level='11',
            strand='STEM',
            email='alice.johnson@example.com',
            phone_number='09123456789',
            emergency_contact_name='Bob Johnson',
            emergency_contact_relationship='Father',
            emergency_contact_phone='09198765432',
            status='approved',
            assigned_classroom=self.classroom,
            enrolled_student=self.enrolled_student,
        )
        
        # Track without authentication
        response = self.client.get(
            f'/api/v1/enrollment-applications/track/?number={app.enrollment_number}'
        )
        
        # Verify baseline behavior
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify response structure (standard fields for unauthenticated)
        self.assertIn('id', response.data)
        self.assertIn('enrollment_number', response.data)
        self.assertIn('status', response.data)
        self.assertIn('full_name', response.data)
        self.assertIn('grade_level', response.data)
        self.assertIn('strand', response.data)
        self.assertIn('submitted_at', response.data)
        self.assertIn('assigned_classroom_name', response.data)
        self.assertIn('remarks', response.data)
        
        # Verify data values
        self.assertEqual(response.data['enrollment_number'], app.enrollment_number)
        self.assertEqual(response.data['status'], 'approved')
        self.assertEqual(response.data['full_name'], 'Alice B Johnson')
        self.assertEqual(response.data['grade_level'], '11')
        self.assertEqual(response.data['strand'], 'STEM')
        self.assertEqual(response.data['assigned_classroom_name'], self.classroom.name)
        
        # Verify authenticated-only fields are NOT present
        self.assertNotIn('enrolled_student_email', response.data)
        self.assertNotIn('documents', response.data)
        self.assertNotIn('status_history', response.data)
        self.assertNotIn('lrn', response.data)

    def test_track_complete_application_authenticated(self):
        """
        Preservation: Tracking a complete application as authenticated admin.
        
        Authenticated users get additional fields (documents, status_history, enrolled_student_email).
        Expected to PASS on both unfixed and fixed code.
        """
        self.client.force_authenticate(user=self.admin_user)
        
        # Create complete enrollment application
        app = EnrollmentApplication.objects.create(
            first_name='Bob',
            last_name='Smith',
            sex='male',
            date_of_birth=date(2008, 6, 20),
            street_address='456 Oak Ave',
            barangay='South District',
            city_municipality='Test City',
            province='Test Province',
            grade_level='10',
            lrn='123456789012',
            email='bob.smith@example.com',
            phone_number='09123456788',
            emergency_contact_name='Jane Smith',
            emergency_contact_relationship='Mother',
            emergency_contact_phone='09198765433',
            status='enrolled',
            assigned_classroom=self.classroom,
            enrolled_student=self.enrolled_student,
        )
        
        # Create some documents for the application
        EnrollmentDocument.objects.create(
            application=app,
            document_type='birth_certificate',
            file_url='https://example.com/docs/birth.pdf',
            file_name='birth_cert.pdf',
            verification_status='verified'
        )
        EnrollmentDocument.objects.create(
            application=app,
            document_type='report_card',
            file_url='https://example.com/docs/report.pdf',
            file_name='report_card.pdf',
            verification_status='pending'
        )
        
        # Track with authentication
        response = self.client.get(
            f'/api/v1/enrollment-applications/track/?number={app.enrollment_number}'
        )
        
        # Verify baseline behavior
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify standard fields
        self.assertEqual(response.data['enrollment_number'], app.enrollment_number)
        self.assertEqual(response.data['status'], 'enrolled')
        self.assertEqual(response.data['full_name'], 'Bob Smith')
        self.assertEqual(response.data['assigned_classroom_name'], self.classroom.name)
        
        # Verify authenticated-only fields ARE present
        self.assertIn('enrolled_student_email', response.data)
        self.assertIn('documents', response.data)
        self.assertIn('status_history', response.data)
        self.assertIn('lrn', response.data)
        
        # Verify LRN is included for authenticated users
        self.assertEqual(response.data['lrn'], '123456789012')
        
        # Verify enrolled_student_email is populated
        self.assertEqual(response.data['enrolled_student_email'], self.enrolled_student.email)
        
        # Verify documents array structure
        self.assertIsInstance(response.data['documents'], list)
        self.assertEqual(len(response.data['documents']), 2)
        
        # Verify document fields
        doc1 = response.data['documents'][0]
        self.assertIn('id', doc1)
        self.assertIn('document_type', doc1)
        self.assertIn('document_type_display', doc1)
        self.assertIn('file_url', doc1)
        self.assertIn('file_name', doc1)
        self.assertIn('verification_status', doc1)
        self.assertIn('verification_status_display', doc1)
        
        # Verify status_history array exists (may be empty if no history records)
        self.assertIsInstance(response.data['status_history'], list)

    def test_track_invalid_enrollment_number(self):
        """
        Preservation: Tracking with invalid/non-existent enrollment number returns 404.
        
        Requirement 3.2: Invalid enrollment numbers should continue to return 404.
        Expected to PASS on both unfixed and fixed code.
        """
        # Try to track with non-existent enrollment number
        response = self.client.get(
            '/api/v1/enrollment-applications/track/?number=ENR-9999-999999'
        )
        
        # Verify baseline behavior: 404 error
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Verify error message format
        self.assertIn('error', response.data)
        self.assertEqual(
            response.data['error'],
            'No application found with that enrollment number or email.'
        )

    def test_track_by_email(self):
        """
        Preservation: Tracking by email instead of enrollment number.
        
        Requirement 3.3: Email-based tracking should continue to work.
        Expected to PASS on both unfixed and fixed code.
        """
        # Create enrollment application
        app = EnrollmentApplication.objects.create(
            first_name='Charlie',
            last_name='Brown',
            sex='male',
            date_of_birth=date(2009, 2, 10),
            street_address='789 Pine Rd',
            barangay='North District',
            city_municipality='Test City',
            province='Test Province',
            grade_level='9',
            email='charlie.brown@example.com',
            phone_number='09123456787',
            emergency_contact_name='Lucy Brown',
            emergency_contact_relationship='Sister',
            emergency_contact_phone='09198765434',
            status='pending',
            assigned_classroom=self.classroom,
        )
        
        # Track by EMAIL instead of enrollment number
        response = self.client.get(
            f'/api/v1/enrollment-applications/track/?email={app.email}'
        )
        
        # Verify baseline behavior
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify correct application is returned
        self.assertEqual(response.data['enrollment_number'], app.enrollment_number)
        self.assertEqual(response.data['status'], 'pending')
        self.assertEqual(response.data['full_name'], 'Charlie Brown')
        
        # Verify same response structure as tracking by number
        self.assertIn('id', response.data)
        self.assertIn('grade_level', response.data)
        self.assertIn('submitted_at', response.data)
        self.assertIn('assigned_classroom_name', response.data)

    def test_track_invalid_email(self):
        """
        Preservation: Tracking with invalid/non-existent email returns 404.
        
        Email-based tracking with non-existent email should return 404.
        Expected to PASS on both unfixed and fixed code.
        """
        # Try to track with non-existent email
        response = self.client.get(
            '/api/v1/enrollment-applications/track/?email=nonexistent@example.com'
        )
        
        # Verify baseline behavior: 404 error
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Verify error message format
        self.assertIn('error', response.data)
        self.assertEqual(
            response.data['error'],
            'No application found with that enrollment number or email.'
        )

    def test_track_missing_parameters(self):
        """
        Preservation: Tracking without number or email parameters returns 400.
        
        Endpoint should reject requests without tracking parameters.
        Expected to PASS on both unfixed and fixed code.
        """
        # Try to track without any parameters
        response = self.client.get('/api/v1/enrollment-applications/track/')
        
        # Verify baseline behavior: 400 error
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Verify error message
        self.assertIn('error', response.data)
        self.assertEqual(
            response.data['error'],
            'Provide enrollment number or email'
        )

    def test_track_case_insensitive_number(self):
        """
        Preservation: Tracking is case-insensitive for enrollment numbers.
        
        The endpoint uses __iexact lookup, so case shouldn't matter.
        Expected to PASS on both unfixed and fixed code.
        """
        # Create enrollment application
        app = EnrollmentApplication.objects.create(
            first_name='Diana',
            last_name='Prince',
            sex='female',
            date_of_birth=date(2008, 8, 25),
            street_address='111 Wonder Way',
            barangay='Paradise',
            city_municipality='Test City',
            province='Test Province',
            grade_level='11',
            strand='HUMSS',
            email='diana.prince@example.com',
            phone_number='09123456786',
            emergency_contact_name='Hippolyta',
            emergency_contact_relationship='Mother',
            emergency_contact_phone='09198765435',
            status='approved',
            assigned_classroom=self.classroom,
        )
        
        # Track with lowercase enrollment number
        response = self.client.get(
            f'/api/v1/enrollment-applications/track/?number={app.enrollment_number.lower()}'
        )
        
        # Verify it works (case-insensitive)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['enrollment_number'], app.enrollment_number)

    def test_track_case_insensitive_email(self):
        """
        Preservation: Tracking is case-insensitive for email addresses.
        
        The endpoint uses __iexact lookup for email too.
        Expected to PASS on both unfixed and fixed code.
        """
        # Create enrollment application
        app = EnrollmentApplication.objects.create(
            first_name='Eve',
            last_name='Adams',
            sex='female',
            date_of_birth=date(2009, 1, 5),
            street_address='222 Garden St',
            barangay='Eden',
            city_municipality='Test City',
            province='Test Province',
            grade_level='10',
            email='Eve.Adams@Example.COM',  # Mixed case
            phone_number='09123456785',
            emergency_contact_name='Adam Adams',
            emergency_contact_relationship='Father',
            emergency_contact_phone='09198765436',
            status='under_review',
            assigned_classroom=self.classroom,
        )
        
        # Track with different case email
        response = self.client.get(
            '/api/v1/enrollment-applications/track/?email=eve.adams@example.com'
        )
        
        # Verify it works (case-insensitive)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['enrollment_number'], app.enrollment_number)

    def test_track_application_without_documents(self):
        """
        Preservation: Applications without documents return empty documents array for authenticated users.
        
        Authenticated users should get an empty documents array, not an error.
        Expected to PASS on both unfixed and fixed code.
        """
        self.client.force_authenticate(user=self.admin_user)
        
        # Create application WITHOUT any documents
        app = EnrollmentApplication.objects.create(
            first_name='Frank',
            last_name='Miller',
            sex='male',
            date_of_birth=date(2008, 11, 30),
            street_address='333 No Docs Ave',
            barangay='Incomplete',
            city_municipality='Test City',
            province='Test Province',
            grade_level='11',
            email='frank.miller@example.com',
            phone_number='09123456784',
            emergency_contact_name='Mary Miller',
            emergency_contact_relationship='Mother',
            emergency_contact_phone='09198765437',
            status='pending',
            assigned_classroom=self.classroom,
        )
        
        # Track as authenticated user
        response = self.client.get(
            f'/api/v1/enrollment-applications/track/?number={app.enrollment_number}'
        )
        
        # Verify baseline behavior
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify documents array exists and is empty
        self.assertIn('documents', response.data)
        self.assertIsInstance(response.data['documents'], list)
        self.assertEqual(len(response.data['documents']), 0)


class TrackingEndpointPropertyBasedTest(HypothesisTestCase):
    """
    Property-Based Tests for Tracking Endpoint Preservation
    
    Uses Hypothesis to generate many test cases automatically, providing stronger
    guarantees that valid tracking requests work correctly across different inputs.
    """

    def setUp(self):
        """Set up test data for property-based tests."""
        self.client = APIClient()
        
        # Create a classroom
        self.classroom = Classroom.objects.create(
            name='Test-Classroom',
            school_year='2026-2027'
        )
        
        # Create an enrolled student
        self.enrolled_student = User.objects.create_user(
            username='pbt_student',
            email='pbt@example.com',
            password='testpass',
            role='student',
            is_approved=True
        )

    @given(
        grade_level=st.sampled_from(['7', '8', '9', '10', '11', '12']),
        strand=st.sampled_from(['Academic', 'STEM', 'HUMSS', 'ABM', 'GAS', 'TVL']),
        status=st.sampled_from(['pending', 'under_review', 'approved', 'rejected', 'enrolled']),
        sex=st.sampled_from(['male', 'female']),
    )
    @settings(max_examples=20, deadline=5000)
    def test_property_complete_applications_return_200(self, grade_level, strand, status, sex):
        """
        Property: For all valid complete applications, tracking returns 200 with expected structure.
        
        This property-based test generates many valid enrollment applications and verifies
        that tracking always returns 200 and includes all required fields.
        """
        # Create enrollment application with generated values
        app = EnrollmentApplication.objects.create(
            first_name='Property',
            last_name='Test',
            sex=sex,
            date_of_birth=date(2008, 5, 15),
            street_address='Test Address',
            barangay='Test Barangay',
            city_municipality='Test City',
            province='Test Province',
            grade_level=grade_level,
            strand=strand if grade_level in ['11', '12'] else None,
            email=f'property.test.{grade_level}.{status}@example.com',
            phone_number='09123456789',
            emergency_contact_name='Test Contact',
            emergency_contact_relationship='Parent',
            emergency_contact_phone='09198765432',
            status=status,
            assigned_classroom=self.classroom,
            enrolled_student=self.enrolled_student if status == 'enrolled' else None,
        )
        
        # Track the application
        response = self.client.get(
            f'/api/v1/enrollment-applications/track/?number={app.enrollment_number}'
        )
        
        # Property: Should always return 200 for valid complete applications
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            f"Complete application with grade={grade_level}, strand={strand}, status={status} "
            f"should return 200. Got {response.status_code}"
        )
        
        # Property: Response must include all required fields
        required_fields = [
            'id', 'enrollment_number', 'status', 'full_name',
            'grade_level', 'strand', 'submitted_at',
            'assigned_classroom_name', 'remarks'
        ]
        for field in required_fields:
            self.assertIn(
                field,
                response.data,
                f"Response must include '{field}' for all valid applications"
            )
        
        # Property: assigned_classroom_name should match the classroom
        self.assertEqual(
            response.data['assigned_classroom_name'],
            self.classroom.name,
            "assigned_classroom_name should match the assigned classroom"
        )
        
        # Property: status should match application status
        self.assertEqual(
            response.data['status'],
            status,
            "Response status should match application status"
        )
        
        # Clean up for next test case
        app.delete()

    @given(
        invalid_number=st.text(
            alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
            min_size=5,
            max_size=20
        ).filter(lambda x: not x.startswith('ENR-2'))
    )
    @settings(max_examples=10, deadline=3000)
    def test_property_invalid_numbers_return_404(self, invalid_number):
        """
        Property: For all invalid enrollment numbers, tracking returns 404.
        
        This property-based test generates many invalid enrollment numbers and verifies
        that tracking always returns 404 with the appropriate error message.
        """
        # Track with invalid enrollment number
        response = self.client.get(
            f'/api/v1/enrollment-applications/track/?number={invalid_number}'
        )
        
        # Property: Should always return 404 for invalid numbers
        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
            f"Invalid enrollment number '{invalid_number}' should return 404. "
            f"Got {response.status_code}"
        )
        
        # Property: Error message should be consistent
        self.assertIn('error', response.data)
        self.assertEqual(
            response.data['error'],
            'No application found with that enrollment number or email.',
            "Error message should be consistent for all invalid numbers"
        )

    @given(
        first_name=st.text(alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ', min_size=2, max_size=20),
        last_name=st.text(alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ', min_size=2, max_size=20),
    )
    @settings(max_examples=15, deadline=4000)
    def test_property_full_name_construction(self, first_name, last_name):
        """
        Property: For all valid names, full_name is constructed correctly.
        
        This property-based test generates many name combinations and verifies
        that the full_name field is always constructed correctly.
        """
        # Create application with generated names
        app = EnrollmentApplication.objects.create(
            first_name=first_name.capitalize(),
            last_name=last_name.capitalize(),
            sex='male',
            date_of_birth=date(2008, 5, 15),
            street_address='Test Address',
            barangay='Test Barangay',
            city_municipality='Test City',
            province='Test Province',
            grade_level='10',
            email=f'{first_name.lower()}.{last_name.lower()}@example.com',
            phone_number='09123456789',
            emergency_contact_name='Test Contact',
            emergency_contact_relationship='Parent',
            emergency_contact_phone='09198765432',
            status='pending',
            assigned_classroom=self.classroom,
        )
        
        # Track the application
        response = self.client.get(
            f'/api/v1/enrollment-applications/track/?number={app.enrollment_number}'
        )
        
        # Property: full_name should be "FirstName LastName"
        expected_full_name = f"{first_name.capitalize()} {last_name.capitalize()}"
        self.assertEqual(
            response.data['full_name'],
            expected_full_name,
            f"full_name should be '{expected_full_name}' for "
            f"first_name={first_name}, last_name={last_name}"
        )
        
        # Clean up
        app.delete()
