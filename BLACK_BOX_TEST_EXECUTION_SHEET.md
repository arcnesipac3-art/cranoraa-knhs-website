# BLACK BOX TESTING - TEST EXECUTION SHEET
## PRISM School Information Management System

**Testing Phase**: Functional Black-Box Testing  
**Test Cycle**: [Enter Cycle Number]  
**Start Date**: [YYYY-MM-DD]  
**End Date**: [YYYY-MM-DD]  

---

## TEST EXECUTION TRACKING

### Legend
- **Priority**: P1 = Critical, P2 = High, P3 = Medium, P4 = Low
- **Status**: Not Tested / Passed / Failed / Blocked / Skipped
- **Test Type**: Functional / Security / Integration / Regression

---

## PRIORITY 1: CRITICAL TEST CASES

### 1. Authentication & Security Module

#### AUTH-001: Valid Login for All Roles
- **Priority**: P1 - Critical
- **Test Type**: Functional
- **Objective**: Valid login for all roles (Admin/Faculty/Student/Parent)

**Preconditions**:
- User account exists and is active
- User is logged out

**Test Steps**:
1. Navigate to login page
2. Enter valid email and password
3. Select role
4. Click Login
5. Verify redirect

**Test Data**:
- Email: `user@knhs.edu.ph`
- Password: `Test@123`
- Role: Admin / Faculty / Student / Parent

**Expected Result**:
- User authenticated
- Redirected to correct role-based dashboard
- Role-based menu appears

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

#### AUTH-002: Invalid Login Credentials Rejected
- **Priority**: P1 - Critical
- **Test Type**: Functional
- **Objective**: Invalid login credentials are rejected

**Preconditions**:
- User account exists
- User is logged out

**Test Steps**:
1. Navigate to login page
2. Enter valid email with incorrect password
3. Click Login

**Test Data**:
- Email: `user@knhs.edu.ph`
- Password: `WrongPass123`

**Expected Result**:
- Login rejected
- Generic error message shown (e.g., "Invalid credentials")
- No session/token created

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

#### AUTH-003: SQL Injection Prevention
- **Priority**: P1 - Critical
- **Test Type**: Security
- **Objective**: SQL injection prevention on login fields

**Preconditions**:
- Login page is accessible

**Test Steps**:
1. Navigate to login page
2. Enter SQL injection payload in email/password fields
3. Submit

**Test Data**:
- Payload: `' OR '1'='1`

**Expected Result**:
- Input sanitized/rejected
- Login denied
- No unauthorized access or database error exposed

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

#### AUTH-004: Session Management
- **Priority**: P1 - Critical
- **Test Type**: Functional
- **Objective**: Session management (timeout, logout, token handling)

**Preconditions**:
- User is logged in with valid session/token

**Test Steps**:
1. Log in successfully
2. Remain idle past session timeout OR click Logout
3. Attempt to access a protected page

**Test Data**:
- Session timeout duration per system config

**Expected Result**:
- Session/token invalidated
- User redirected to login
- Protected pages inaccessible without re-authentication

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

### 2. Student Enrollment Module

#### ADM-001: Enrollment Application Processing
- **Priority**: P1 - Critical
- **Test Type**: Functional
- **Objective**: Enrollment application processing, document verification, account creation

**Preconditions**:
- Admin is logged in
- Application exists with 'Pending' status

**Test Steps**:
1. Navigate to Enrollment Management
2. Filter applications by status
3. Select application
4. Review details and verify documents
5. Change status to Approved
6. Assign section
7. Complete enrollment

**Test Data**:
- Applicant: Pedro Garcia
- Grade Level: 7
- Section: Grade 7 - Rizal
- Parent Email: parent@email.com

**Expected Result**:
- Status transitions correctly
- Documents verified
- Section assigned
- Student and parent accounts created and linked
- Credentials generated
- Notification sent

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

### 3. Grade Management Module

#### TCH-002: Grade Entry with Auto-Computation
- **Priority**: P1 - Critical
- **Test Type**: Functional
- **Objective**: Grade entry with auto-computation and DepEd transmutation

**Preconditions**:
- Teacher is logged in
- Grading period is open
- Students enrolled in class

**Test Steps**:
1. Navigate to Grade Submission
2. Select subject and class
3. Enter Written Work, Performance Task, Quarterly Assessment scores
4. Verify auto-computation
5. Save grades

**Test Data**:
- Written Work: 38/40 (40%)
- Performance Task: 36/40 (40%)
- Quarterly Assessment: 18/20 (20%)

**Computation Check**:
- WW %: (38/40) × 100 = 95%
- PT %: (36/40) × 100 = 90%
- QA %: (18/20) × 100 = 90%
- Weighted Average: (95 × 0.40) + (90 × 0.40) + (90 × 0.20) = 38 + 36 + 18 = **92%**
- DepEd Transmutation: 92% = **Outstanding (Grade depends on transmutation table)**

**Expected Result**:
- Percentage and weighted average computed correctly per configured weights
- DepEd transmutation applied
- Final grade auto-displayed and saved

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

#### STU-001: Grade Viewing (Student Perspective)
- **Priority**: P1 - Critical
- **Test Type**: Functional
- **Objective**: Grade viewing from student perspective

**Preconditions**:
- Student is logged in
- Grades have been submitted by teacher

**Test Steps**:
1. Log in as student
2. Navigate to Grades
3. Select subject/quarter

**Test Data**:
- Student account with published grades

**Expected Result**:
- Correct grades displayed per subject/quarter matching teacher-submitted records
- Unpublished grades not visible

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

#### ADM-005: Grade Accuracy Validation
- **Priority**: P1 - Critical
- **Test Type**: Functional
- **Objective**: Grade accuracy validation across roles (teacher entry vs. admin/student view)

**Preconditions**:
- Grades submitted by teacher for a given student

**Test Steps**:
1. Log in as Admin
2. Navigate to student grade record
3. Compare with teacher-submitted values

**Test Data**:
- Same student/subject/quarter used in TCH-002

**Expected Result**:
- Grade values match exactly across teacher, admin, and student views
- No discrepancy or rounding error

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

### 4. Attendance Tracking Module

#### TCH-001: Daily Attendance Marking
- **Priority**: P1 - Critical
- **Test Type**: Functional
- **Objective**: Daily attendance marking

**Preconditions**:
- Teacher is logged in
- Assigned to class
- Class schedule exists

**Test Steps**:
1. Navigate to My Classes
2. Select class
3. Open Attendance tab
4. Select date
5. Mark student statuses (Present/Absent/Late/Excused)
6. Save

**Test Data**:
- Class: Grade 10 - Rizal
- Date: 2025-01-15
- Total Students: 40
  - Present: 35
  - Absent: 3
  - Late: 2

**Expected Result**:
- All students listed correctly
- Statuses saved accurately
- Save confirmation shown
- Record persisted in database

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

#### PAR-002: Parent Notifications
- **Priority**: P1 - Critical
- **Test Type**: Integration
- **Objective**: Parent notifications on Absent/Late marking

**Preconditions**:
- Attendance marked as Absent/Late for a student with linked parent account

**Test Steps**:
1. Mark student Absent or Late (per TCH-001)
2. Save attendance
3. Check parent account for notification

**Test Data**:
- Same class/date used in TCH-001

**Expected Result**:
- Parent notified (in-app and/or email) for each Absent/Late student
- Notification received within expected time window

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

## PRIORITY 2: HIGH IMPORTANCE TEST CASES

### 5. School Forms Generation Module

#### FORM-001: Generate SF9 (Report Card)
- **Priority**: P2 - High
- **Test Type**: Functional
- **Objective**: Generate SF9 (Report Card)

**Preconditions**:
- Required student data and complete grades exist

**Test Steps**:
1. Navigate to School Forms
2. Select SF9
3. Apply filters (year, grade, section, student)
4. Export PDF/Excel
5. Verify downloaded file

**Test Data**:
- Form Type: SF9
- Academic Year: 2024-2025
- Student: [selected]

**Expected Result**:
- File generates within 10 seconds
- Format matches DepEd SF9 template
- All fields and calculations correct
- School header/logo present

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

#### FORM-002: Generate SF2 (Attendance Report)
- **Priority**: P2 - High
- **Test Type**: Functional
- **Objective**: Generate SF2 (Attendance Report)

**Preconditions**:
- Required attendance data exists for selected period

**Test Steps**:
1. Navigate to School Forms
2. Select SF2
3. Apply filters (year, grade, section, month)
4. Export PDF/Excel
5. Verify downloaded file

**Test Data**:
- Form Type: SF2
- Academic Year: 2024-2025
- Class: [selected]
- Month: [selected]

**Expected Result**:
- File generates correctly
- Format matches DepEd SF2 template
- Attendance counts match source records

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

### 6. Compliance Document System Module

#### TCH-004: Teacher Compliance Document Submission
- **Priority**: P2 - High
- **Test Type**: Functional
- **Objective**: Teacher compliance document submission workflow

**Preconditions**:
- Compliance requirement is configured with a deadline
- Teacher is logged in

**Test Steps**:
1. Navigate to My Compliance
2. Find pending requirement
3. Upload file(s)
4. Submit for review

**Test Data**:
- Document Type: Weekly Lesson Plan
- Files: up to 5 PDFs, total 25MB

**Expected Result**:
- Multiple file upload works
- File size/type validated
- Status changes to 'Pending Review'
- Admin notified

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

#### ADM-003: Admin Compliance Document Review
- **Priority**: P2 - High
- **Test Type**: Functional
- **Objective**: Admin review process for submitted compliance documents

**Preconditions**:
- Teacher has submitted a compliance document (per TCH-004)

**Test Steps**:
1. Log in as Admin
2. Navigate to Compliance Hub
3. Open submission
4. Preview files
5. Approve or reject with remarks

**Test Data**:
- Submission from TCH-004

**Expected Result**:
- Admin can preview all files
- Approval/rejection updates status correctly
- Teacher receives notification with remarks if rejected

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

#### ADM-004: Compliance Deadline Tracking
- **Priority**: P2 - High
- **Test Type**: Functional
- **Objective**: Compliance deadline tracking

**Preconditions**:
- Compliance requirement configured with a due date

**Test Steps**:
1. Advance/observe system date relative to deadline
2. Check compliance status indicators for pending submissions

**Test Data**:
- Deadline: 15th of month

**Expected Result**:
- Status correctly reflects On-Time / Due Soon / Overdue based on current date vs. deadline
- Overdue items flagged for admin

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

## PRIORITY 3: MEDIUM IMPORTANCE TEST CASES

### 7. Academic Year Rollover Module

#### ADM-006: Classroom Structure Rollover
- **Priority**: P3 - Medium
- **Test Type**: Functional
- **Objective**: Classroom structure copying vs. data preservation on rollover

**Preconditions**:
- Admin is logged in
- Source year has complete classroom data
- Target year exists

**Test Steps**:
1. Navigate to Class Management
2. Click Year Rollover
3. Select source and target year
4. Choose items to copy (advisers, subjects)
5. Execute rollover
6. Verify results

**Test Data**:
- Source Year: 2024-2025
- Target Year: 2025-2026
- Copy Advisers: Yes
- Copy Subjects: Yes
- Copy Students: No

**Expected Result**:
- Classroom structure, adviser and subject-teacher assignments copied to new year
- Student and grade tables empty for new year
- No data corruption
- Success message shows count

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

### 8. Classroom Management Module

#### ADM-002: Class Creation and Assignment
- **Priority**: P3 - Medium
- **Test Type**: Functional
- **Objective**: Class creation and subject/teacher assignment

**Preconditions**:
- Admin is logged in
- Academic year is set
- Teachers and subjects exist

**Test Steps**:
1. Navigate to Class Management
2. Select academic year
3. Add Class (grade level, section name)
4. Assign adviser
5. Save
6. Assign subjects and teachers
7. Verify access

**Test Data**:
- Academic Year: 2024-2025
- Grade Level: 10
- Section: Grade 10 - Mabini
- Adviser: Ms. Maria Santos
- Subject: Mathematics / Teacher: Mr. Juan Reyes

**Expected Result**:
- Class created successfully
- Adviser assigned
- Subject-teacher assignments saved
- Class appears in dropdowns
- Assigned teacher can access class

**Actual Result**: _[Fill in after testing]_

**Status**: ☐ Not Tested | ☐ Passed | ☐ Failed | ☐ Blocked | ☐ Skipped

**Test Date**: ___________  
**Tester**: ___________  
**Environment**: ☐ Development | ☐ Staging | ☐ Production

**Notes/Remarks**: 
_______________________________________________________________________________
_______________________________________________________________________________

**Defect ID** (if failed): ___________

---

## TEST SUMMARY

### Execution Statistics

| Status | Count | Percentage |
|--------|-------|------------|
| Not Tested | ___ | ___% |
| Passed | ___ | ___% |
| Failed | ___ | ___% |
| Blocked | ___ | ___% |
| Skipped | ___ | ___% |
| **Total** | **18** | **100%** |

### Results by Priority

| Priority | Total | Passed | Failed | Pass Rate |
|----------|-------|--------|--------|-----------|
| P1 - Critical | 10 | ___ | ___ | ___% |
| P2 - High | 6 | ___ | ___ | ___% |
| P3 - Medium | 2 | ___ | ___ | ___% |

### Critical Issues

| Defect ID | Test Case | Severity | Description |
|-----------|-----------|----------|-------------|
| ___ | ___ | ___ | ___ |
| ___ | ___ | ___ | ___ |

---

## SIGN-OFF

**Test Lead**: _______________________ Date: __________

**QA Manager**: _______________________ Date: __________

**Project Manager**: _______________________ Date: __________

---

**Document Version**: 1.0  
**Last Updated**: [Date]
