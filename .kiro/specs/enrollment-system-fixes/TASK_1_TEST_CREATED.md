# Task 1: Bug Condition Exploration Test Created

## Status: Test Written, Awaiting Execution

I have created the bug condition exploration test for the tracking endpoint failure as specified in the design document.

## Test File Created

**Location:** `backend/accounts/tests/test_enrollment_tracking_bug.py`

## Test Cases Implemented

The test file contains 4 comprehensive test cases that encode the expected behavior:

### 1. `test_tracking_with_null_assigned_classroom()`
- **Bug Condition:** Application with `assigned_classroom=None`
- **Expected Behavior:** Returns 200 with null `classroom_name` (not 500)
- **On UNFIXED code:** Will FAIL with 500 error (AttributeError: 'NoneType' object has no attribute 'name')
- **On FIXED code:** Will PASS with 200 response and null-safe values

### 2. `test_tracking_with_null_enrolled_student()`
- **Bug Condition:** Authenticated request for application with `enrolled_student=None`
- **Expected Behavior:** Returns 200 with null `enrolled_student_email` (not 500)
- **On UNFIXED code:** Will FAIL with 500 error (AttributeError: 'NoneType' object has no attribute 'email')
- **On FIXED code:** Will PASS with 200 response and null-safe values

### 3. `test_tracking_with_both_null_fields()`
- **Bug Condition:** Application with BOTH `assigned_classroom=None` AND `enrolled_student=None`
- **Expected Behavior:** Returns 200 with both fields as null (not 500)
- **Comprehensive test combining both bug conditions**

### 4. `test_tracking_with_all_fields_set_baseline()`
- **Baseline test:** Tracking with ALL fields properly set
- **Should pass on BOTH unfixed and fixed code**
- **Verifies the bug is specifically about null handling**

## Property Validated

**Property 1: Bug Condition - Tracking Endpoint Handles Null Related Objects**

_For any_ enrollment tracking request where a valid enrollment number is provided, the fixed track() function SHALL return a 200 response with application data including null-safe attribute values, without raising any unhandled exceptions.

**Validates: Requirements 1.1, 1.2, 2.1, 2.2**

## Running the Test

To execute this test on the UNFIXED code (to confirm it fails as expected):

```bash
cd backend
python manage.py test accounts.tests.test_enrollment_tracking_bug -v 2
```

## Expected Outcome on UNFIXED Code

The tests should FAIL with errors similar to:

```
FAIL: test_tracking_with_null_assigned_classroom
Expected 200 OK but got 500. On unfixed code, this fails with 500 due to AttributeError 
when accessing assigned_classroom.name on None.

FAIL: test_tracking_with_null_enrolled_student
Expected 200 OK but got 500. On unfixed code, this fails with 500 due to AttributeError 
when accessing enrolled_student.email on None.
```

## Counterexamples to Document

Once the test is run on unfixed code, document the specific errors:

1. **Tracking with null classroom:**
   - Enrollment number: ENR-2026-XXXXXX
   - Error: AttributeError at line 311 in views/enrollment.py
   - Message: 'NoneType' object has no attribute 'name'

2. **Tracking with null enrolled_student:**
   - Enrollment number: ENR-2026-XXXXXX
   - Error: AttributeError at line 319-323 in views/enrollment.py
   - Message: 'NoneType' object has no attribute 'email'

## Next Steps

1. **Execute the test** on unfixed code to observe and document failures
2. **Document counterexamples** found (enrollment numbers, specific error messages, line numbers)
3. **Mark task complete** when test is written, run, and failure is documented
4. Proceed to Task 2 (preservation tests) before implementing the fix

## Test Implementation Quality

✅ **Scoped PBT Approach:** Tests are scoped to concrete failing cases for deterministic bugs  
✅ **Expected Behavior Encoded:** Tests describe exactly what should happen (200 with null-safe values)  
✅ **Bug Condition Clear:** Tests create specific conditions that trigger the bug (null related objects)  
✅ **Comprehensive Coverage:** Tests cover single null fields, both null fields, and baseline case  
✅ **Detailed Assertions:** Tests verify response structure, status codes, and null-safe handling  
✅ **Documentation:** Each test has clear docstrings explaining purpose and expected outcomes  

## Python Environment Issue

Note: Encountered difficulty locating a working Python environment on this system. The tests are properly structured and ready to run, but require a configured Python environment with Django and dependencies installed.

To set up the environment:
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
python manage.py migrate
```
