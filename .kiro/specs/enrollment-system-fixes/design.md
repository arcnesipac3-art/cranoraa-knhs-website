# Enrollment System Fixes Bugfix Design

## Overview

This design addresses three critical defects in the enrollment system that prevent proper tracking, document display, and enrollment validation:

1. **Tracking Endpoint 500 Error**: The `/api/v1/enrollment-applications/track/` endpoint returns a 500 Internal Server Error when querying applications, preventing users from tracking their enrollment status.

2. **Missing Documents in Admin View**: Documents uploaded during enrollment submission are not displayed in the admin interface, even though they are stored in EnrollmentDocument records.

3. **Missing Section Assignment Validation**: The enrollment endpoint allows enrolling students without a section assignment, leading to incomplete enrollment records.

The fixes are targeted, minimal, and preserve all existing functionality while resolving the defects.

## Glossary

- **Bug_Condition_1 (C1)**: The condition that triggers the tracking endpoint error - when any enrollment number is queried
- **Bug_Condition_2 (C2)**: The condition that triggers missing documents - when admin views an enrollment application with uploaded documents
- **Bug_Condition_3 (C3)**: The condition that triggers validation failure - when admin attempts to enroll a student without assigned_classroom
- **Property (P)**: The desired behavior when bug conditions are met - endpoints work correctly, documents display, validation prevents incomplete enrollment
- **Preservation**: All existing enrollment workflows, document upload flows, and API responses must remain unchanged
- **EnrollmentApplication**: The model in `backend/accounts/models/enrollment.py` that stores enrollment application data
- **EnrollmentDocument**: The model that stores document records with document_type, file_url, verification_status
- **track() action**: The method in `backend/accounts/views/enrollment.py` (line 282) that handles enrollment tracking requests
- **enroll_student() action**: The method in `backend/accounts/views/enrollment.py` (line 453) that processes student enrollment
- **documents relationship**: The reverse ForeignKey relationship from EnrollmentApplication to EnrollmentDocument records
- **assigned_classroom**: The ForeignKey field on EnrollmentApplication that links to a Classroom (section)

## Bug Details

### Bug Condition 1: Tracking Endpoint Failure

The tracking endpoint fails with a 500 Internal Server Error when querying any enrollment application. The error occurs during the construction of the response data in the `track()` method.

**Formal Specification:**
```
FUNCTION isBugCondition1(input)
  INPUT: input of type HTTPRequest with query parameter 'number' or 'email'
  OUTPUT: boolean
  
  RETURN input.query_params.get('number') IS NOT NULL 
         OR input.query_params.get('email') IS NOT NULL
END FUNCTION
```

**Hypothesized Root Causes:**
1. **Unsafe Attribute Access**: The code attempts to access attributes on related objects that may be None without proper null checking
2. **Exception in Data Construction**: An unhandled exception occurs when building the response dictionary (lines 300-322)
3. **Related Object Query Failure**: Accessing `app.assigned_classroom`, `app.enrolled_student`, or `app.documents.all()` may raise exceptions

### Examples

- **Input**: `GET /api/v1/enrollment-applications/track/?number=ENR-2026-000010`
- **Current Behavior**: Returns 500 Internal Server Error, logs "Enrollment track error: ENR-2026-000010 - [exception details]"
- **Expected Behavior**: Returns 200 with application data: `{ id, enrollment_number, status, full_name, grade_level, strand, submitted_at, assigned_classroom_name, remarks }`

- **Input**: `GET /api/v1/enrollment-applications/track/?email=student@example.com`
- **Current Behavior**: Returns 500 Internal Server Error
- **Expected Behavior**: Returns 200 with application data or 404 if not found

- **Edge Case - Invalid Number**: `GET /api/v1/enrollment-applications/track/?number=INVALID`
- **Current Behavior**: May return 500 or 404 (inconsistent)
- **Expected Behavior**: Returns 404 with error message "No application found with that enrollment number or email."

### Bug Condition 2: Missing Document Display

Documents uploaded during enrollment submission are stored in EnrollmentDocument records but do not appear in the admin enrollment view. The `documents` field in the serializer response is empty or missing.

**Formal Specification:**
```
FUNCTION isBugCondition2(input)
  INPUT: input of type EnrollmentApplication retrieved through admin API
  OUTPUT: boolean
  
  RETURN input.documents.count() > 0
         AND serialized_response.documents IS EMPTY
         AND admin_view_displays_documents = false
END FUNCTION
```

**Hypothesized Root Causes:**
1. **Missing Prefetch**: The queryset in `EnrollmentApplicationViewSet.get_queryset()` does not prefetch the `documents` relationship efficiently
2. **Serializer Not Included in Admin Context**: The admin view may be using a different serializer or queryset that doesn't include documents
3. **Frontend Display Logic**: The frontend component `EnrollmentManagement.jsx` may be falling back to URL fields instead of showing EnrollmentDocument records

### Examples

- **Scenario**: Student uploads 5 required documents (birth certificate, report card, Form 138, good moral, ID picture) during enrollment submission
- **Current Behavior**: 
  - Backend: EnrollmentDocument records created successfully (verified by logs: "EnrollmentDocument created: birth_certificate for app ENR-2026-000010")
  - Admin View: `app.documents` array is empty or shows no documents
  - Frontend: Falls back to displaying URL fields instead of EnrollmentDocument records
- **Expected Behavior**: Admin view displays all 5 EnrollmentDocument records with document type, verification status, file URL, and download links

- **Edge Case - No Documents**: Application submitted without any documents
- **Current Behavior**: `app.documents` is empty (correct)
- **Expected Behavior**: `app.documents` should remain empty (preserve this behavior)

### Bug Condition 3: Missing Section Assignment Validation

The `enroll_student` endpoint allows enrolling students without verifying that `assigned_classroom` is set, resulting in incomplete enrollment records where students have no section.

**Formal Specification:**
```
FUNCTION isBugCondition3(input)
  INPUT: input of type EnrollmentApplication with status='approved'
  OUTPUT: boolean
  
  RETURN input.status == 'approved'
         AND input.assigned_classroom IS NULL
         AND enroll_student_called = true
END FUNCTION
```

**Hypothesized Root Causes:**
1. **Missing Validation Logic**: The `enroll_student()` method (line 453 in views/enrollment.py) does not check if `assigned_classroom` is null before proceeding
2. **Auto-Assignment Failure**: The `_auto_assign_section()` method (line 670) is called but may return None if no sections are available, and this is not validated
3. **Silent Failure**: When `classroom_id` from request is empty, the auto-assignment is attempted but its failure is not treated as an error

### Examples

- **Scenario**: Admin clicks "Enroll Student" for an approved application without assigning a section first
- **Current Behavior**: 
  - Student account created successfully
  - `assigned_classroom` remains NULL
  - Student has no classroom enrollment record
  - Status changes to 'enrolled' but student cannot access any classes
- **Expected Behavior**: Returns 400 error with message "Section must be assigned before enrollment"

- **Scenario**: Admin assigns section, then clicks "Enroll Student"
- **Current Behavior**: Works correctly (preserve this)
- **Expected Behavior**: Works correctly - student enrolled with section

- **Edge Case - Auto-Assignment When No Capacity**: All sections at capacity, no `classroom_id` provided
- **Current Behavior**: `_auto_assign_section()` returns None, enrollment proceeds without section
- **Expected Behavior**: Returns 400 error with message "Section must be assigned before enrollment" or "No sections available with capacity"

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

**Issue 1: Tracking Endpoint**
- Valid enrollment number queries that don't trigger exceptions should continue to return application data in the same format
- Email-based tracking should continue to work exactly as before
- 404 errors for non-existent enrollment numbers should remain unchanged
- Authenticated user tracking with full details (documents, status_history) should remain unchanged
- Unauthenticated tracking with limited details should remain unchanged

**Issue 2: Document Display**
- Document upload flow during enrollment submission should remain unchanged
- EnrollmentDocument record creation should continue as before
- Document URLs stored in both EnrollmentApplication fields (birth_certificate, report_card, etc.) and EnrollmentDocument records should remain unchanged
- Document verification endpoints (`verify_document`, `reject_document`) should continue to work
- URL-based document fallback display should remain available when EnrollmentDocument records don't exist

**Issue 3: Section Assignment**
- Enrollment workflow for applications in non-'approved' status should continue to return appropriate errors
- Duplicate enrollment prevention for applications with existing student accounts should remain unchanged
- Student account creation, profile setup, parent linking, and notification sending should remain unchanged
- The `assign_section` endpoint should continue to work for pre-enrollment section assignment
- Auto-assignment of sections when capacity is available should continue to work

**Scope:**
All inputs that do NOT involve these specific bug conditions should be completely unaffected by the fixes:
- Enrollment application submission and document upload
- Application status transitions (pending → under_review → approved)
- Document verification workflows
- Bulk actions and exports
- Analytics and reporting
- Parent account creation and linking

## Hypothesized Root Cause

Based on the code analysis, the most likely issues are:

### Issue 1: Tracking Endpoint 500 Error

1. **Unsafe Attribute Access in Response Construction**: The `track()` method (lines 300-322) constructs a response dictionary by accessing attributes on related objects without proper null checks:
   - Line 311-316: `app.assigned_classroom.name` when `app.assigned_classroom` is None
   - Line 319-323: `app.enrolled_student.email` when `app.enrolled_student` is None
   - Line 343-349: `app.documents.all()` iteration without exception handling

2. **AttributeError on None Objects**: When `assigned_classroom` or `enrolled_student` is None, attempting to access `.name` or `.email` raises an AttributeError that is caught by the generic exception handler

3. **Related Query Failures**: The prefetch of `documents` relationship may not be working correctly, causing N+1 queries or query errors

### Issue 2: Missing Document Display

1. **Queryset Does Not Include Non-Admin Users**: The `get_queryset()` method (lines 140-172) only prefetches `documents` for admin users. The line 172 shows:
   ```python
   return qs.select_related(...).prefetch_related('documents', ...)
   ```
   But for non-admin users (line 173), it returns:
   ```python
   return EnrollmentApplication.objects.filter(email=user.email)
   ```
   This missing prefetch may not be the issue since we're testing with admin users, but it's worth noting.

2. **Frontend Display Logic Issue**: In `EnrollmentManagement.jsx` (lines 305-314), the `getAppDocs()` function shows:
   ```javascript
   if (app?.documents && app.documents.length > 0) return app.documents;
   // Falls back to URL fields
   ```
   If `app.documents` exists but is an empty array, it falls back to URL fields instead of showing "no documents"

3. **Serializer Context Issue**: The `EnrollmentApplicationSerializer` includes `documents = EnrollmentDocumentSerializer(many=True, read_only=True)` but the queryset may not be properly loading this relationship for all admin views

### Issue 3: Missing Section Assignment Validation

1. **No Validation in enroll_student()**: Lines 453-665 of the `enroll_student()` method show that it creates student accounts, profiles, and parent links without checking if `assigned_classroom` is set. The check for `classroom_id` (line 629) only comes AFTER all the student setup:
   ```python
   classroom_id = request.data.get('classroom_id')
   if not classroom_id:
       try: classroom_id = self._auto_assign_section(application)
       except Exception as ae: logger.error(f"Auto-assign error: {ae}")
   ```
   If auto-assignment fails and returns None, the code continues without error.

2. **Silent Auto-Assignment Failure**: The `_auto_assign_section()` method (line 670) can return None if no sections with capacity are available, but this is not treated as an error condition.

3. **Section Assignment is Optional**: Lines 632-640 show that if `classroom_id` is None, the enrollment still succeeds but without a section:
   ```python
   if classroom_id:
       # assign section
   # continues regardless
   ```

## Correctness Properties

Property 1: Bug Condition - Tracking Endpoint Returns Valid Response

_For any_ enrollment tracking request where a valid enrollment number or email is provided, the fixed track() function SHALL return a 200 response with application data including status, full name, grade level, strand, submission date, assigned classroom name (or null), and remarks, without raising any unhandled exceptions.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition - Documents Display in Admin View

_For any_ enrollment application retrieved through the admin API where EnrollmentDocument records exist, the fixed serializer and queryset SHALL include all associated documents with their document_type, file_url, file_name, and verification_status in the response.

**Validates: Requirements 2.4, 2.5, 2.6**

Property 3: Bug Condition - Section Assignment Required for Enrollment

_For any_ enrollment request where the application status is 'approved' and assigned_classroom is null, the fixed enroll_student() function SHALL return a 400 error with the message "Section must be assigned before enrollment" and NOT create a student account.

**Validates: Requirements 2.7, 2.8, 2.9**

Property 4: Preservation - Non-Buggy Tracking Behavior Unchanged

_For any_ enrollment tracking request that does not involve the bug condition (invalid number, authenticated vs unauthenticated access, email-based tracking), the fixed track() function SHALL produce the same response format and error codes as the original function, preserving all existing tracking functionality.

**Validates: Requirements 3.1, 3.2, 3.3**

Property 5: Preservation - Document Upload and Verification Unchanged

_For any_ enrollment submission with document uploads or document verification action, the fixed system SHALL produce the same EnrollmentDocument records, store the same file URLs, and process verification requests exactly as before, preserving all existing document handling functionality.

**Validates: Requirements 3.4, 3.5, 3.6**

Property 6: Preservation - Enrollment Workflow Unchanged

_For any_ enrollment request where assigned_classroom is set and all other conditions are met, the fixed enroll_student() function SHALL produce the same student accounts, profiles, classroom enrollments, and notifications as the original function, preserving all existing enrollment functionality.

**Validates: Requirements 3.7, 3.8, 3.9**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

#### Issue 1: Tracking Endpoint 500 Error

**File**: `backend/accounts/views/enrollment.py`

**Function**: `track()` (lines 282-392)

**Specific Changes**:

1. **Add Null-Safe Attribute Access**: Wrap all related object attribute access in safe checks
   - Replace `app.assigned_classroom.name` with `app.assigned_classroom.name if app.assigned_classroom else None`
   - Replace `app.enrolled_student.email` with `app.enrolled_student.email if app.enrolled_student else None`
   - Add try-except blocks around document and status_history iterations

2. **Improve Error Handling**: Add more specific logging for each potential failure point
   - Log the specific attribute access that fails
   - Include the application ID and enrollment number in error context
   - Avoid catching the entire block with a generic exception handler

3. **Add Response Data Validation**: Before constructing the response, validate that required fields exist
   - Check that `app.submitted_at` exists before calling `.isoformat()`
   - Use `getattr()` with defaults for optional fields

4. **Test Exception Scenarios**: Add error handling for:
   - Applications with no `assigned_classroom`
   - Applications with no `enrolled_student`
   - Applications with no documents
   - Applications with corrupt or incomplete data

#### Issue 2: Missing Document Display

**File**: `backend/accounts/views/enrollment.py`

**Function**: `get_queryset()` (lines 140-173)

**Specific Changes**:

1. **Ensure Documents Prefetch for All Users**: Add `.prefetch_related('documents')` to both admin and non-admin querysets
   - Line 172 already has it for admin users: keep this
   - Line 173 for non-admin users: add `.prefetch_related('documents')` to the filter query

2. **Verify Serializer Inclusion**: Confirm that `EnrollmentApplicationSerializer` includes `documents` field
   - Already included in serializer (line 77 of serializers/enrollment.py)
   - Ensure the serializer is used in all admin views

3. **Test Queryset Loading**: Verify that the prefetch actually loads the documents relationship
   - Add logging to confirm document count after prefetch
   - Check if select_related or prefetch_related optimization is needed

**File**: `frontend/src/pages/EnrollmentManagement.jsx`

**Function**: `getAppDocs()` (lines 305-314)

**Specific Changes**:

1. **Fix Display Logic**: Change the condition to properly handle empty arrays
   - Current: `if (app?.documents && app.documents.length > 0) return app.documents;`
   - Fixed: Return EnrollmentDocument records if they exist, even if empty, to distinguish from "not loaded"
   - Only fall back to URL fields if `documents` property is undefined (not loaded), not if it's an empty array

2. **Add Loading State**: Distinguish between "documents not loaded yet" vs "no documents uploaded"
   - Show loading spinner if `documents === undefined`
   - Show "No documents uploaded" if `documents.length === 0`
   - Show document list if `documents.length > 0`

#### Issue 3: Missing Section Assignment Validation

**File**: `backend/accounts/views/enrollment.py`

**Function**: `enroll_student()` (lines 453-668)

**Specific Changes**:

1. **Add Section Validation at Start**: Before creating student account, validate that section is assigned
   - Add validation immediately after status and enrolled_student checks (after line 459)
   - Check: `if not application.assigned_classroom:`
   - If null, attempt auto-assignment
   - If auto-assignment fails, return 400 error: "Section must be assigned before enrollment"

2. **Improve Auto-Assignment Error Handling**: Make auto-assignment failures explicit
   - Change lines 629-631 to validate the result of `_auto_assign_section()`
   - If it returns None, log the reason (no capacity) and return error
   - Don't silently continue with null classroom_id

3. **Validate Classroom Assignment**: Ensure classroom is set before proceeding with enrollment
   - After auto-assignment attempt, check: `if not application.assigned_classroom:`
   - Return clear error message explaining that section must be assigned manually or wait for capacity

4. **Update Error Response**: Return structured error with actionable message
   - Message: "Section must be assigned before enrollment. Please assign a section or ensure sections have available capacity."
   - Include context: current grade level, available sections (if any)

5. **Preserve Existing Success Path**: Keep all existing logic for when section IS assigned
   - Lines 632-640 should still work the same way
   - Student account creation, profile setup, parent linking should be unchanged

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

#### Issue 1: Tracking Endpoint

**Test Plan**: Write tests that call the tracking endpoint with various enrollment numbers and configurations. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Track Application Without Classroom**: Create application with `assigned_classroom=None`, call track endpoint (will return 500 on unfixed code)
2. **Track Application Without Enrolled Student**: Create application with `enrolled_student=None`, call track endpoint (will return 500 on unfixed code)
3. **Track Application With All Fields Set**: Create complete application, call track endpoint (may work on unfixed code)
4. **Track Non-Existent Application**: Call track with invalid enrollment number (should return 404, may return 500 on unfixed code)

**Expected Counterexamples**:
- 500 errors when accessing `assigned_classroom.name` on None
- 500 errors when accessing `enrolled_student.email` on None
- Exception logged: "AttributeError: 'NoneType' object has no attribute 'name'" or similar

#### Issue 2: Document Display

**Test Plan**: Create enrollment applications with uploaded documents, then query them through the admin API. Observe whether documents appear in the response.

**Test Cases**:
1. **Upload Documents and Check Response**: Submit enrollment with 5 documents, retrieve via admin API (documents array will be empty on unfixed code)
2. **Check Document Count**: Verify that EnrollmentDocument.objects.filter(application=app).count() returns 5, but serializer response shows 0 (confirms backend has data but API doesn't return it)
3. **Check Admin View**: Open admin enrollment view, observe that documents section is empty or missing (will fail on unfixed code)
4. **Check Non-Admin User**: Submit as non-admin, check if documents appear in tracking response (may also fail on unfixed code)

**Expected Counterexamples**:
- Backend logs show "EnrollmentDocument created" but API response has empty `documents` array
- Database query confirms records exist but serializer doesn't include them
- Frontend displays URL fallback instead of EnrollmentDocument records

#### Issue 3: Section Assignment Validation

**Test Plan**: Attempt to enroll approved students without assigning sections. Observe whether enrollment succeeds without section.

**Test Cases**:
1. **Enroll Without Section**: Create approved application with `assigned_classroom=None`, call enroll_student (will succeed on unfixed code, creating incomplete enrollment)
2. **Enroll With Section**: Create approved application with assigned section, call enroll_student (should work correctly)
3. **Enroll When No Capacity**: Create approved application, fill all sections to capacity, call enroll_student without classroom_id (will succeed on unfixed code with null section)
4. **Check Auto-Assignment**: Call enroll_student without classroom_id when capacity exists, verify section is assigned (should work on unfixed code)

**Expected Counterexamples**:
- Student account created with status='enrolled' but `assigned_classroom=None`
- No StudentClassEnrollment record created for the student
- Student cannot access any classes in their dashboard
- Auto-assignment silently fails and logs "Auto-assign error" but enrollment proceeds

### Fix Checking

**Goal**: Verify that for all inputs where the bug conditions hold, the fixed functions produce the expected behavior.

#### Issue 1: Tracking Endpoint Fix

**Pseudocode:**
```
FOR ALL enrollment_number WHERE isBugCondition1(enrollment_number) DO
  response := track_fixed(enrollment_number)
  ASSERT response.status_code == 200 OR response.status_code == 404
  ASSERT response.status_code != 500
  IF application_exists(enrollment_number) THEN
    ASSERT response.data contains all required fields
    ASSERT response.data.assigned_classroom_name IS NULL OR STRING
    ASSERT no AttributeError raised
  END IF
END FOR
```

**Property-Based Test Approach**:
- Generate random enrollment applications with various combinations of null/set fields
- Test with `assigned_classroom=None`, `enrolled_student=None`, incomplete data
- Verify all requests return 200 or 404, never 500

#### Issue 2: Document Display Fix

**Pseudocode:**
```
FOR ALL application WHERE isBugCondition2(application) DO
  response := get_application_fixed(application.id)
  ASSERT response.data.documents.length == EnrollmentDocument.objects.filter(application=application).count()
  ASSERT each document in response.data.documents has correct document_type, file_url, verification_status
END FOR
```

**Property-Based Test Approach**:
- Generate random enrollment applications with 0-10 uploaded documents
- Retrieve through admin API
- Verify `documents` array length matches database count
- Verify all document fields are correctly serialized

#### Issue 3: Section Assignment Validation Fix

**Pseudocode:**
```
FOR ALL application WHERE isBugCondition3(application) DO
  response := enroll_student_fixed(application.id)
  ASSERT response.status_code == 400
  ASSERT response.data.error == "Section must be assigned before enrollment"
  ASSERT NOT User.objects.filter(id=application.enrolled_student_id).exists()
  ASSERT application.status == 'approved' (unchanged)
END FOR
```

**Property-Based Test Approach**:
- Generate random approved applications without assigned sections
- Attempt enrollment
- Verify all requests return 400 error
- Verify no student accounts created

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed functions produce the same results as the original functions.

#### Issue 1: Tracking Endpoint Preservation

**Pseudocode:**
```
FOR ALL enrollment_number WHERE NOT isBugCondition1(enrollment_number) DO
  ASSERT track_original(enrollment_number) == track_fixed(enrollment_number)
END FOR
```

**Testing Approach**: Property-based testing is recommended because:
- It generates many test cases automatically across different enrollment states
- It catches edge cases in response formatting
- It provides strong guarantees that valid tracking requests work identically

**Test Plan**: Test various valid tracking scenarios on BOTH unfixed and fixed code, verify identical responses:

**Test Cases**:
1. **Track by Valid Email**: Test email-based tracking produces same response format
2. **Track by Invalid Number**: Verify 404 error message unchanged
3. **Track as Authenticated Admin**: Verify full details (documents, status_history) are identical
4. **Track as Unauthenticated User**: Verify limited details format unchanged

#### Issue 2: Document Display Preservation

**Pseudocode:**
```
FOR ALL application WHERE NOT isBugCondition2(application) DO
  ASSERT get_application_original(application.id) == get_application_fixed(application.id)
END FOR
```

**Testing Approach**: Verify that applications without documents, document upload flow, and document verification all work identically.

**Test Plan**: Test document workflows on BOTH unfixed and fixed code, verify identical behavior:

**Test Cases**:
1. **Submit Without Documents**: Verify application without uploads works same way
2. **Upload Documents**: Verify document upload creates same EnrollmentDocument records
3. **Verify Documents**: Verify document verification endpoint produces same results
4. **URL Fallback Display**: Verify URL-based fallback still works when EnrollmentDocument records missing

#### Issue 3: Section Assignment Preservation

**Pseudocode:**
```
FOR ALL application WHERE NOT isBugCondition3(application) DO
  ASSERT enroll_student_original(application.id) == enroll_student_fixed(application.id)
END FOR
```

**Testing Approach**: Property-based testing is recommended because:
- It generates many valid enrollment scenarios with sections assigned
- It verifies student account creation, profile setup, parent linking work identically
- It ensures notifications and status updates are unchanged

**Test Plan**: Test valid enrollment scenarios on BOTH unfixed and fixed code, verify identical outcomes:

**Test Cases**:
1. **Enroll With Assigned Section**: Verify student account, profile, classroom enrollment all created identically
2. **Enroll With Auto-Assignment**: Verify auto-assignment works same way when capacity available
3. **Enroll Non-Approved Application**: Verify error "Application must be approved before enrollment" unchanged
4. **Enroll Duplicate Student**: Verify error "Student account already exists" unchanged

### Unit Tests

#### Issue 1: Tracking Endpoint
- Test track() with various null field combinations
- Test track() with valid/invalid enrollment numbers
- Test track() with authenticated/unauthenticated requests
- Test track() error handling for each exception type

#### Issue 2: Document Display
- Test EnrollmentApplicationSerializer includes documents field
- Test get_queryset() prefetches documents for admin users
- Test get_queryset() prefetches documents for non-admin users
- Test frontend getAppDocs() handles empty vs undefined documents

#### Issue 3: Section Assignment
- Test enroll_student() validation when assigned_classroom is None
- Test enroll_student() auto-assignment when capacity available
- Test enroll_student() error handling when no capacity
- Test enroll_student() success path when section assigned

### Property-Based Tests

#### Issue 1: Tracking Endpoint
- Generate random enrollment applications with various field combinations (some null, some set)
- Test that all tracking requests return 200/404, never 500
- Generate random enrollment numbers (valid and invalid) and verify consistent responses

#### Issue 2: Document Display
- Generate random enrollment applications with 0-10 uploaded documents of various types
- Verify that documents array length always matches database count
- Verify that all document fields are correctly serialized

#### Issue 3: Section Assignment
- Generate random approved applications with and without sections
- Verify that enrollment without section always fails with 400
- Verify that enrollment with section always succeeds and creates complete records

### Integration Tests

#### Issue 1: Tracking Endpoint
- Test full enrollment flow: submit application → track by number → verify data
- Test tracking after status changes: pending → approved → enrolled
- Test tracking with authenticated admin vs unauthenticated user

#### Issue 2: Document Display
- Test full document flow: upload during submission → verify in backend → display in admin view
- Test document verification flow: upload → admin verifies → status updates → re-display
- Test document re-upload flow: reject document → applicant uploads new version → verify again

#### Issue 3: Section Assignment
- Test full enrollment flow: submit → approve → assign section → enroll student → verify classroom enrollment
- Test auto-assignment flow: submit → approve → enroll without manual section assignment → verify section assigned
- Test capacity handling: fill section to capacity → attempt enrollment → verify appropriate error or auto-assignment to different section
