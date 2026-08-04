# Bugfix Requirements Document

## Introduction

The enrollment system currently has three critical defects that prevent proper operation:

1. **Tracking Endpoint Failure**: The enrollment tracking endpoint returns a 500 Internal Server Error when querying applications by enrollment number
2. **Missing Document Display**: Documents uploaded during enrollment submission are not visible in the admin enrollment view
3. **Missing Section Assignment Validation**: Students can be enrolled without being assigned to a section, leading to incomplete enrollment records

These issues prevent stakeholders from tracking enrollment applications, verifying uploaded documents, and ensuring complete student enrollment data.

## Bug Analysis

### Current Behavior (Defect)

#### Issue 1: Tracking Endpoint Failure

1.1 WHEN an enrollment number (format: ENR-YYYY-XXXXXX) is provided to the tracking endpoint (`GET /api/v1/enrollment-applications/track/?number=ENR-2026-000010`) THEN the system returns a 500 Internal Server Error

1.2 WHEN the frontend receives a 500 error from the tracking endpoint THEN the system displays "Unable to retrieve application. Please try again later or contact the admissions office."

#### Issue 2: Missing Document Display

1.3 WHEN a student uploads required documents (birth certificate, report card, Form 138, etc.) during enrollment submission THEN the documents are stored with file URLs in the EnrollmentApplication model fields

1.4 WHEN an admin views the enrollment application in the admin interface THEN the uploaded documents do not appear or show as empty/missing

1.5 WHEN the system creates EnrollmentDocument records during submission THEN these records may not be properly linked or queried for display in the admin view

#### Issue 3: Missing Section Assignment Validation

1.6 WHEN an admin attempts to enroll a student (transition from approved to enrolled status) THEN the system does not verify that a section (classroom) has been assigned

1.7 WHEN a student is enrolled without an assigned_classroom value THEN the system creates an incomplete enrollment record

### Expected Behavior (Correct)

#### Issue 1: Tracking Endpoint Failure

2.1 WHEN an enrollment number (format: ENR-YYYY-XXXXXX) is provided to the tracking endpoint THEN the system SHALL return a 200 response with the application details including status, full name, grade level, strand, submission date, assigned classroom, and remarks

2.2 WHEN the tracking endpoint encounters an error while retrieving application data THEN the system SHALL log the specific error with full context (enrollment number, exception details) and return a descriptive error message

2.3 WHEN the frontend receives a successful response from the tracking endpoint THEN the system SHALL display the application tracking information to the user

#### Issue 2: Missing Document Display

2.4 WHEN a student uploads required documents during enrollment submission THEN the system SHALL create corresponding EnrollmentDocument records with document_type, file_url, and file_name

2.5 WHEN an admin views an enrollment application THEN the system SHALL display all associated EnrollmentDocument records with their verification status, document type, and download links

2.6 WHEN the serializer includes document data in the response THEN the system SHALL query the related EnrollmentDocument records through the `documents` relationship

#### Issue 3: Missing Section Assignment Validation

2.7 WHEN an admin attempts to enroll a student (via the `enroll_student` endpoint) THEN the system SHALL verify that `assigned_classroom` is not null before proceeding

2.8 WHEN a student does not have an assigned classroom THEN the system SHALL return a 400 error with the message "Section must be assigned before enrollment"

2.9 WHEN a student has an assigned classroom THEN the system SHALL proceed with the enrollment process and create the student account

### Unchanged Behavior (Regression Prevention)

#### Issue 1: Tracking Endpoint

3.1 WHEN a valid enrollment number is provided and no error occurs THEN the system SHALL CONTINUE TO return application data in the same format as before (id, enrollment_number, status, full_name, grade_level, strand, submitted_at, assigned_classroom_name, remarks)

3.2 WHEN an invalid or non-existent enrollment number is provided THEN the system SHALL CONTINUE TO return a 404 error with "No application found with that enrollment number or email."

3.3 WHEN tracking by email instead of enrollment number THEN the system SHALL CONTINUE TO support email-based tracking

#### Issue 2: Document Display

3.4 WHEN documents are uploaded during enrollment submission THEN the system SHALL CONTINUE TO store file URLs in both the EnrollmentApplication fields (birth_certificate, report_card, etc.) and EnrollmentDocument records

3.5 WHEN a document upload fails THEN the system SHALL CONTINUE TO collect all upload errors and return them in the response

3.6 WHEN the tracking endpoint is called by an authenticated user THEN the system SHALL CONTINUE TO include document details in the response

#### Issue 3: Section Assignment

3.7 WHEN an enrollment application is in any status other than 'approved' THEN the system SHALL CONTINUE TO prevent enrollment with the error "Application must be approved before enrollment"

3.8 WHEN a student account already exists for an application THEN the system SHALL CONTINUE TO prevent duplicate enrollment with the error "Student account already exists"

3.9 WHEN enrollment succeeds THEN the system SHALL CONTINUE TO create student accounts, profiles, status history records, and notifications as before
