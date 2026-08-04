# Implementation Plan

## Issue 1: Tracking Endpoint 500 Error Fix

- [x] 1. Write bug condition exploration test for tracking endpoint failure
  - **Property 1: Bug Condition** - Tracking Endpoint Handles Null Related Objects
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test implementation details from Bug Condition 1 in design:
    - Create enrollment application with `assigned_classroom=None`
    - Call tracking endpoint with enrollment number
    - Assert response status is 200 (not 500)
    - Assert response includes all required fields with null-safe values
    - Create enrollment application with `enrolled_student=None`
    - Call tracking endpoint with enrollment number
    - Assert response status is 200 (not 500)
  - The test assertions should match the Expected Behavior Properties from design (Property 1)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS with AttributeError (e.g., "'NoneType' object has no attribute 'name'")
  - Document counterexamples found to understand root cause (e.g., "Tracking ENR-2026-000010 with null classroom crashes with AttributeError at line 311")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Write preservation property tests for tracking endpoint (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Tracking Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs:
    - Track application with all fields set (assigned_classroom, enrolled_student present)
    - Track with invalid enrollment number
    - Track with email instead of number
    - Track as authenticated vs unauthenticated user
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - For all valid enrollment numbers with complete data, response format matches expected structure
    - For all invalid enrollment numbers, 404 error is returned
    - For all email-based tracking, same response format applies
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3. Fix tracking endpoint to handle null related objects

  - [-] 3.1 Implement the fix in `backend/accounts/views/enrollment.py` track() method
    - Add null-safe attribute access for `app.assigned_classroom.name`
      - Replace: `app.assigned_classroom.name`
      - With: `app.assigned_classroom.name if app.assigned_classroom else None`
    - Add null-safe attribute access for `app.enrolled_student.email`
      - Replace: `app.enrolled_student.email`
      - With: `app.enrolled_student.email if app.enrolled_student else None`
    - Add try-except blocks around document and status_history iterations
    - Add logging for specific attribute access failures
    - Validate response data before construction (check required fields exist)
    - _Bug_Condition: isBugCondition1(input) - when enrollment number queried and assigned_classroom or enrolled_student is None_
    - _Expected_Behavior: expectedBehavior(result) - returns 200 with application data, null-safe attribute values_
    - _Preservation: Non-buggy tracking requests (valid numbers with complete data, invalid numbers, email-based) return same responses as before_
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Tracking Endpoint Handles Null Related Objects
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed - no more 500 errors)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Buggy Tracking Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3_

## Issue 2: Missing Documents in Admin View Fix

- [x] 4. Write bug condition exploration test for missing documents
  - **Property 1: Bug Condition** - Documents Display in Admin View
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test implementation details from Bug Condition 2 in design:
    - Create enrollment application
    - Upload 5 required documents (birth certificate, report card, Form 138, good moral, ID picture)
    - Verify EnrollmentDocument records created in database (count should be 5)
    - Retrieve application through admin API (`/api/v1/enrollment-applications/{id}/`)
    - Assert response includes `documents` array with length == 5
    - Assert each document has correct document_type, file_url, file_name, verification_status
  - The test assertions should match the Expected Behavior Properties from design (Property 2)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (response.documents is empty [] despite 5 records in database)
  - Document counterexamples found to understand root cause (e.g., "EnrollmentDocument.objects.count() = 5 but serializer response.documents = []")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.3, 1.4, 1.5, 2.4, 2.5_

- [~] 5. Write preservation property tests for document display (BEFORE implementing fix)
  - **Property 2: Preservation** - Document Upload and Verification Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs:
    - Submit application without documents (documents array should be empty)
    - Upload documents and verify EnrollmentDocument record creation
    - Test document verification endpoints (verify_document, reject_document)
    - Test URL-based document fallback display
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - For all applications without documents, documents array is empty (correct)
    - For all document uploads, EnrollmentDocument records created with correct fields
    - For all document verification actions, status updates correctly
    - For all URL-based fallback displays, original URLs are accessible
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.4, 3.5, 3.6_

- [ ] 6. Fix document display in admin view

  - [~] 6.1 Implement backend fix in `backend/accounts/views/enrollment.py`
    - Ensure `get_queryset()` prefetches documents for all users
      - Verify line 172 has `.prefetch_related('documents')` for admin users (already exists)
      - Add `.prefetch_related('documents')` to line 173 for non-admin users
    - Add logging to confirm document count after prefetch
    - Verify `EnrollmentApplicationSerializer` includes `documents` field (already at line 77 of serializers)
    - _Bug_Condition: isBugCondition2(input) - when admin views application with uploaded EnrollmentDocument records_
    - _Expected_Behavior: expectedBehavior(result) - serializer response includes all documents with correct fields_
    - _Preservation: Document upload flow, EnrollmentDocument record creation, verification endpoints unchanged_
    - _Requirements: 1.3, 1.4, 1.5, 2.4, 2.5, 2.6, 3.4, 3.5, 3.6_

  - [~] 6.2 Implement frontend fix in `frontend/src/pages/EnrollmentManagement.jsx`
    - Fix `getAppDocs()` function (lines 305-314) display logic
    - Change condition to distinguish "documents not loaded" from "no documents uploaded"
      - If `documents === undefined`: show loading state
      - If `documents.length === 0`: show "No documents uploaded"
      - If `documents.length > 0`: show document list
    - Only fall back to URL fields if `documents` property is undefined (not loaded)
    - Add loading state UI component
    - _Bug_Condition: isBugCondition2(input) - when frontend displays application with EnrollmentDocument records_
    - _Expected_Behavior: expectedBehavior(result) - frontend displays all EnrollmentDocument records, not URL fallback_
    - _Preservation: URL-based fallback still works when EnrollmentDocument records don't exist_
    - _Requirements: 1.4, 2.5, 3.4_

  - [~] 6.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Documents Display in Admin View
    - **IMPORTANT**: Re-run the SAME test from task 4 - do NOT write a new test
    - The test from task 4 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 4
    - **EXPECTED OUTCOME**: Test PASSES (confirms documents array length == 5 with correct fields)
    - _Requirements: 2.4, 2.5, 2.6_

  - [~] 6.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Document Upload and Verification Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 5 - do NOT write new tests
    - Run preservation property tests from step 5
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.4, 3.5, 3.6_

## Issue 3: Missing Section Assignment Validation Fix

- [~] 7. Write bug condition exploration test for section assignment validation
  - **Property 1: Bug Condition** - Section Assignment Required for Enrollment
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test implementation details from Bug Condition 3 in design:
    - Create approved enrollment application with `assigned_classroom=None`
    - Authenticate as admin
    - Call `enroll_student` endpoint (`POST /api/v1/enrollment-applications/{id}/enroll_student/`)
    - Assert response status is 400 (not 200)
    - Assert response message is "Section must be assigned before enrollment"
    - Assert no student account created (User.objects.filter with application email does not exist)
    - Assert application status remains 'approved' (unchanged)
  - The test assertions should match the Expected Behavior Properties from design (Property 3)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (enrollment succeeds with status 200, student account created with null section)
  - Document counterexamples found to understand root cause (e.g., "Enrolled student without section - User created but assigned_classroom=None")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.6, 1.7, 2.7, 2.8_

- [~] 8. Write preservation property tests for section assignment (BEFORE implementing fix)
  - **Property 2: Preservation** - Enrollment Workflow Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs:
    - Enroll approved application WITH assigned_classroom (should succeed)
    - Enroll non-approved application (should fail with "must be approved" error)
    - Enroll duplicate student (should fail with "already exists" error)
    - Test auto-assignment when capacity available
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements:
    - For all approved applications with assigned_classroom, enrollment succeeds and creates student account, profile, classroom enrollment
    - For all non-approved applications, enrollment fails with appropriate error
    - For all duplicate enrollments, appropriate error returned
    - For all auto-assignment scenarios with capacity, section is assigned automatically
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.7, 3.8, 3.9_

- [ ] 9. Fix section assignment validation in enrollment

  - [~] 9.1 Implement the fix in `backend/accounts/views/enrollment.py` enroll_student() method
    - Add section validation immediately after status and enrolled_student checks (after line 459)
    - Check: `if not application.assigned_classroom:`
    - Attempt auto-assignment: `classroom_id = self._auto_assign_section(application)`
    - Validate auto-assignment result: `if not classroom_id:`
    - Return 400 error with message: "Section must be assigned before enrollment. Please assign a section or ensure sections have available capacity."
    - Log the validation failure with application context
    - Do NOT create student account if validation fails
    - _Bug_Condition: isBugCondition3(input) - when enrollment attempted with assigned_classroom=None_
    - _Expected_Behavior: expectedBehavior(result) - returns 400 error, no student account created_
    - _Preservation: Enrollment with assigned_classroom succeeds and creates complete records as before_
    - _Requirements: 1.6, 1.7, 2.7, 2.8, 2.9, 3.7, 3.8, 3.9_

  - [~] 9.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Section Assignment Required for Enrollment
    - **IMPORTANT**: Re-run the SAME test from task 7 - do NOT write a new test
    - The test from task 7 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 7
    - **EXPECTED OUTCOME**: Test PASSES (confirms 400 error returned, no student account created)
    - _Requirements: 2.7, 2.8, 2.9_

  - [~] 9.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Enrollment Workflow Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 8 - do NOT write new tests
    - Run preservation property tests from step 8
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.7, 3.8, 3.9_

- [~] 10. Checkpoint - Ensure all tests pass
  - Run all exploration tests (tasks 1, 4, 7) - should PASS on fixed code
  - Run all preservation tests (tasks 2, 5, 8) - should PASS on fixed code
  - Verify no regressions in enrollment tracking, document display, or enrollment workflow
  - If any issues arise, ask the user for guidance
