# FUNCTIONAL BLACK-BOX TESTING TEMPLATE

## PRISM: School Information Management System

---

## TEST CASE TEMPLATE

### Test Case [MODULE-ID]: [Test Case Title]

**Test Case ID**: [MODULE]-[NUMBER]  
**Module**: [Module Name]  
**Priority**: 🔴 Critical / 🟡 High / 🟢 Medium / ⚪ Low  
**Test Type**: Functional / Security / Integration / Regression  

**Objective**: [Brief description of what this test validates]

**Preconditions**: 
- [Condition 1]
- [Condition 2]
- [Condition 3]

**Test Steps**:
1. [Action to perform]
2. [Action to perform]
3. [Action to perform]
4. [Action to perform]
5. [Action to perform]

**Test Data**:
| Field | Value |
|-------|-------|
| [Field name] | [Test value] |
| [Field name] | [Test value] |
| [Field name] | [Test value] |

**Expected Results**:
- [Expected outcome 1]
- [Expected outcome 2]
- [Expected outcome 3]
- [Expected outcome 4]

**Actual Results**:
- [What actually happened]
- [What actually happened]
- [What actually happened]

**Status**: ✅ PASS / ❌ FAIL / ⏸️ BLOCKED / ⏭️ SKIP

**Test Date**: [YYYY-MM-DD]  
**Tester**: [Name]  
**Environment**: Development / Staging / Production  

**Notes/Comments**:
[Any additional observations, issues, or recommendations]

**Defect ID** (if applicable): [Link to bug tracking system]

---

## QUICK REFERENCE TABLE FORMAT

### Test Summary Table

| Test ID | Test Case Name | Priority | Status | Date | Tester | Notes |
|---------|---------------|----------|--------|------|--------|-------|
| AUTH-001 | Valid Admin Login | 🔴 Critical | ✅ PASS | 2025-01-15 | John Doe | - |
| AUTH-002 | Invalid Password | 🔴 Critical | ✅ PASS | 2025-01-15 | John Doe | - |
| AUTH-003 | SQL Injection Test | 🔴 Critical | ✅ PASS | 2025-01-15 | John Doe | - |
| ENR-001 | Process Enrollment | 🔴 Critical | ❌ FAIL | 2025-01-15 | Jane Smith | See BUG-123 |
| GRD-001 | Grade Entry | 🔴 Critical | ✅ PASS | 2025-01-16 | John Doe | - |

---

## MODULE-SPECIFIC TEMPLATES

### 1. AUTHENTICATION MODULE

#### Test Case AUTH-[ID]: [Test Name]

**Test Case ID**: AUTH-[NUMBER]  
**Priority**: 🔴 Critical  

**Objective**: [Verify authentication functionality]

**Preconditions**: 
- User account exists/does not exist in system
- User is logged out/logged in

**Test Steps**:
1. Navigate to login page
2. Enter credentials
3. Select role
4. Click login button
5. Verify redirect

**Test Data**:
| Field | Value |
|-------|-------|
| Email | user@knhs.edu.ph |
| Password | Test@123 |
| Role | Admin / Faculty / Student / Parent |

**Expected Results**:
- [ ] Appropriate redirect occurs
- [ ] JWT token stored in localStorage
- [ ] User dashboard displays correctly
- [ ] Role-based menu appears

**Actual Results**: [Record here]

**Status**: ⬜ Not Tested / ✅ PASS / ❌ FAIL

---

### 2. ENROLLMENT MODULE

#### Test Case ENR-[ID]: [Test Name]

**Test Case ID**: ENR-[NUMBER]  
**Priority**: 🔴 Critical  

**Objective**: [Verify enrollment workflow]

**Preconditions**: 
- Admin is logged in
- Application exists with specific status

**Test Steps**:
1. Navigate to Enrollment Management
2. Filter applications by status
3. Select an application
4. Review application details
5. Verify documents
6. Change status
7. Assign section
8. Complete enrollment

**Test Data**:
| Field | Value |
|-------|-------|
| Applicant Name | Pedro Garcia |
| Grade Level | 7 |
| Section | Grade 7 - Rizal |
| Parent Email | parent@email.com |

**Expected Results**:
- [ ] Status transitions work correctly
- [ ] Document verification functional
- [ ] Section assignment saves
- [ ] Student account created
- [ ] Parent account created and linked
- [ ] Credentials displayed
- [ ] Email notification sent

**Actual Results**: [Record here]

**Status**: ⬜ Not Tested / ✅ PASS / ❌ FAIL

---

### 3. GRADE MANAGEMENT MODULE

#### Test Case GRD-[ID]: [Test Name]

**Test Case ID**: GRD-[NUMBER]  
**Priority**: 🔴 Critical  

**Objective**: [Verify grade entry and computation]

**Preconditions**: 
- Teacher is logged in
- Grading period is open
- Students are enrolled in class

**Test Steps**:
1. Navigate to Grade Submission
2. Select subject and class
3. Click Enter Grades
4. Input Written Work score
5. Input Performance Task score
6. Input Quarterly Assessment score
7. Verify auto-computation
8. Save grades

**Test Data**:
| Component | Score | Weight |
|-----------|-------|--------|
| Written Work | 38/40 | 40% |
| Performance Task | 36/40 | 40% |
| Quarterly Assessment | 18/20 | 20% |

**Expected Results**:
- [ ] Raw scores accept valid input
- [ ] Percentage calculated correctly
- [ ] Weighted average computed: [Expected value]
- [ ] DepEd transmutation applied
- [ ] Final grade displays automatically
- [ ] Save confirmation appears

**Actual Results**: [Record here]

**Computation Check**:
- Percentage = [(38/40 × 0.40) + (36/40 × 0.40) + (18/20 × 0.20)] × 100 = ____%
- Transmuted Grade = _____

**Status**: ⬜ Not Tested / ✅ PASS / ❌ FAIL

---

### 4. ATTENDANCE MODULE

#### Test Case ATT-[ID]: [Test Name]

**Test Case ID**: ATT-[NUMBER]  
**Priority**: 🔴 Critical  

**Objective**: [Verify attendance marking and notifications]

**Preconditions**: 
- Teacher is logged in
- Teacher assigned to class
- Class schedule exists

**Test Steps**:
1. Navigate to My Classes
2. Select a class
3. Click Attendance tab
4. Select date
5. Mark student statuses (P/A/L/E)
6. Save attendance
7. Verify notifications sent

**Test Data**:
| Field | Value |
|-------|-------|
| Class | Grade 10 - Rizal |
| Date | 2025-01-15 |
| Total Students | 40 |
| Present | 35 |
| Absent | 3 |
| Late | 2 |

**Expected Results**:
- [ ] All students listed correctly
- [ ] Status buttons functional
- [ ] Keyboard shortcuts work
- [ ] Save confirmation appears
- [ ] Parent notifications sent for Absent/Late
- [ ] Attendance recorded in database

**Actual Results**: [Record here]

**Status**: ⬜ Not Tested / ✅ PASS / ❌ FAIL

---

### 5. SCHOOL FORMS MODULE

#### Test Case FORM-[ID]: [Test Name]

**Test Case ID**: FORM-[NUMBER]  
**Priority**: 🟡 High  

**Objective**: [Verify school form generation]

**Preconditions**: 
- Required data exists in system
- User has appropriate permissions

**Test Steps**:
1. Navigate to School Forms
2. Select form type (SF1/SF2/SF9/SF10)
3. Apply filters (year, grade, section, student)
4. Click Export PDF/Excel
5. Verify downloaded file

**Test Data**:
| Field | Value |
|-------|-------|
| Form Type | SF9 / SF2 / SF1 / SF10 |
| Academic Year | 2024-2025 |
| Student/Class | [Name/Section] |
| Format | PDF / Excel |

**Expected Results**:
- [ ] File generates within 10 seconds
- [ ] Format matches DepEd template
- [ ] All data fields populated correctly
- [ ] Calculations accurate
- [ ] School header/logo present
- [ ] File downloads successfully

**Actual Results**: [Record here]

**File Verification**:
- File name: _________________
- File size: _________________
- Generation time: _________________

**Status**: ⬜ Not Tested / ✅ PASS / ❌ FAIL

---

### 6. COMPLIANCE MODULE

#### Test Case CMP-[ID]: [Test Name]

**Test Case ID**: CMP-[NUMBER]  
**Priority**: 🟡 High  

**Objective**: [Verify compliance document submission and review]

**Preconditions**: 
- Compliance types are configured
- User is logged in (Teacher/Admin)

**Test Steps**:
1. Navigate to Compliance Hub / My Compliance
2. Find pending requirement
3. Click Submit
4. Upload files (test max file count and size)
5. Submit for review
6. Admin reviews and approves/rejects
7. Verify status updates

**Test Data**:
| Field | Value |
|-------|-------|
| Document Type | Weekly Lesson Plan |
| Files | 5 PDF files |
| Total Size | 25 MB |
| Deadline | 15th of month |

**Expected Results**:
- [ ] Multiple file upload works
- [ ] File size validation enforces limit
- [ ] Status changes to "Pending Review"
- [ ] Admin receives notification
- [ ] Admin can preview files
- [ ] Approval/rejection updates status
- [ ] Teacher receives notification

**Actual Results**: [Record here]

**Status**: ⬜ Not Tested / ✅ PASS / ❌ FAIL

---

### 7. CLASSROOM MANAGEMENT MODULE

#### Test Case CLR-[ID]: [Test Name]

**Test Case ID**: CLR-[NUMBER]  
**Priority**: 🔴 Critical  

**Objective**: [Verify classroom creation and assignment]

**Preconditions**: 
- Admin is logged in
- Academic year is set
- Teachers and subjects exist

**Test Steps**:
1. Navigate to Class Management
2. Select academic year
3. Click Add Class
4. Enter grade level and section name
5. Assign adviser
6. Save class
7. Assign subjects and teachers
8. Verify access

**Test Data**:
| Field | Value |
|-------|-------|
| Academic Year | 2024-2025 |
| Grade Level | 10 |
| Section | Grade 10 - Mabini |
| Adviser | Ms. Maria Santos |
| Subject | Mathematics |
| Teacher | Mr. Juan Reyes |

**Expected Results**:
- [ ] Class created successfully
- [ ] Adviser assigned correctly
- [ ] Subject-teacher assignments saved
- [ ] Class appears in dropdowns
- [ ] Teacher can access class
- [ ] Students can be enrolled

**Actual Results**: [Record here]

**Status**: ⬜ Not Tested / ✅ PASS / ❌ FAIL

---

### 8. YEAR ROLLOVER MODULE

#### Test Case ROLL-[ID]: [Test Name]

**Test Case ID**: ROLL-[NUMBER]  
**Priority**: 🔴 Critical  

**Objective**: [Verify academic year rollover functionality]

**Preconditions**: 
- Admin is logged in
- Source year has complete classroom data
- Target year exists

**Test Steps**:
1. Navigate to Class Management
2. Click Year Rollover
3. Select source year
4. Select target year
5. Choose what to copy (teachers, subjects, etc.)
6. Click Create Classrooms
7. Verify results
8. Confirm student data not copied

**Test Data**:
| Field | Value |
|-------|-------|
| Source Year | 2024-2025 |
| Target Year | 2025-2026 |
| Copy Advisers | ✓ Yes |
| Copy Subjects | ✓ Yes |
| Copy Students | ✗ No |

**Expected Results**:
- [ ] All classrooms copied to new year
- [ ] Teacher-adviser assignments preserved
- [ ] Subject-teacher assignments preserved
- [ ] Student tables empty for new year
- [ ] Grade tables empty for new year
- [ ] Success message shows count
- [ ] No data corruption

**Actual Results**: [Record here]

**Verification**:
- Classes created: ___ / Expected: ___
- Advisers preserved: ✓ Yes / ✗ No
- Students copied: ✓ Yes / ✗ No (should be No)

**Status**: ⬜ Not Tested / ✅ PASS / ❌ FAIL

---

## SECURITY TESTING TEMPLATES

### Test Case SEC-[ID]: [Security Test Name]

**Test Case ID**: SEC-[NUMBER]  
**Priority**: 🔴 Critical  
**Test Type**: Security  

**Objective**: [Verify security control]

**Attack Vectors to Test**:
- [ ] SQL Injection
- [ ] XSS (Cross-Site Scripting)
- [ ] CSRF (Cross-Site Request Forgery)
- [ ] Authentication bypass
- [ ] Authorization bypass
- [ ] Session hijacking
- [ ] File upload vulnerabilities

**Test Steps**:
1. Identify input field
2. Inject malicious payload
3. Observe system response
4. Verify security control activates

**Test Data (Payloads)**:
| Attack Type | Payload |
|-------------|---------|
| SQL Injection | `' OR '1'='1` |
| XSS | `<script>alert('XSS')</script>` |
| Path Traversal | `../../etc/passwd` |

**Expected Results**:
- [ ] Malicious input sanitized
- [ ] No code execution occurs
- [ ] Appropriate error message shown
- [ ] Security event logged
- [ ] User not given sensitive error details

**Actual Results**: [Record here]

**Status**: ⬜ Not Tested / ✅ PASS / ❌ FAIL

---

## INTEGRATION TESTING TEMPLATE

### Test Case INT-[ID]: [Integration Test Name]

**Test Case ID**: INT-[NUMBER]  
**Priority**: 🟡 High  
**Test Type**: Integration  

**Objective**: [Verify interaction between modules]

**Modules Involved**:
- Module A: [Name]
- Module B: [Name]

**Integration Points**:
1. [Data flow from A to B]
2. [Shared functionality]

**Test Steps**:
1. Perform action in Module A
2. Verify data propagates to Module B
3. Perform action in Module B
4. Verify results reflect in Module A

**Expected Results**:
- [ ] Data flows correctly between modules
- [ ] No data loss or corruption
- [ ] Both modules update appropriately
- [ ] No conflicts or race conditions

**Actual Results**: [Record here]

**Status**: ⬜ Not Tested / ✅ PASS / ❌ FAIL

---

## REGRESSION TESTING CHECKLIST

### Regression Test Suite: [Feature/Module Name]

**Last Updated**: [Date]  
**Triggered By**: [Bug fix / New feature / Release]

| Test ID | Test Case | Status | Notes |
|---------|-----------|--------|-------|
| REG-001 | [Existing feature 1] | ⬜ | - |
| REG-002 | [Existing feature 2] | ⬜ | - |
| REG-003 | [Existing feature 3] | ⬜ | - |
| REG-004 | [Existing feature 4] | ⬜ | - |

**Status Legend**:
- ⬜ Not Tested
- ✅ PASS (No regression)
- ❌ FAIL (Regression detected)
- ⏸️ BLOCKED
- ⏭️ SKIP

---

## TEST EXECUTION SUMMARY

### Test Execution Report

**Project**: PRISM School Information Management System  
**Test Cycle**: [Sprint/Release Number]  
**Start Date**: [YYYY-MM-DD]  
**End Date**: [YYYY-MM-DD]  
**Tested By**: [Names]  
**Environment**: Development / Staging / Production  

#### Overall Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| Total Test Cases | 0 | 100% |
| Executed | 0 | 0% |
| Passed | 0 | 0% |
| Failed | 0 | 0% |
| Blocked | 0 | 0% |
| Skipped | 0 | 0% |

#### Test Results by Priority

| Priority | Total | Passed | Failed | Pass Rate |
|----------|-------|--------|--------|-----------|
| 🔴 Critical | 0 | 0 | 0 | 0% |
| 🟡 High | 0 | 0 | 0 | 0% |
| 🟢 Medium | 0 | 0 | 0 | 0% |
| ⚪ Low | 0 | 0 | 0 | 0% |

#### Test Results by Module

| Module | Total | Passed | Failed | Pass Rate |
|--------|-------|--------|--------|-----------|
| Authentication | 0 | 0 | 0 | 0% |
| Enrollment | 0 | 0 | 0 | 0% |
| Grade Management | 0 | 0 | 0 | 0% |
| Attendance | 0 | 0 | 0 | 0% |
| School Forms | 0 | 0 | 0 | 0% |
| Compliance | 0 | 0 | 0 | 0% |
| Classroom Mgmt | 0 | 0 | 0 | 0% |

#### Critical Defects Found

| Defect ID | Module | Severity | Description | Status |
|-----------|--------|----------|-------------|--------|
| BUG-001 | [Module] | Critical | [Description] | Open |
| BUG-002 | [Module] | High | [Description] | In Progress |

#### Test Environment Issues

| Issue | Impact | Resolution |
|-------|--------|------------|
| [Environment issue] | [Impact description] | [How resolved] |

#### Recommendations

1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

#### Sign-off

**Tested By**: _________________ Date: _______  
**Reviewed By**: _________________ Date: _______  
**Approved By**: _________________ Date: _______

---

## TESTING BEST PRACTICES

### Before Testing
- [ ] Review requirements and specifications
- [ ] Prepare test data
- [ ] Set up test environment
- [ ] Clear browser cache/cookies
- [ ] Use incognito/private mode when testing authentication

### During Testing
- [ ] Follow test steps exactly as written
- [ ] Document actual results in detail
- [ ] Take screenshots of failures
- [ ] Record timestamps
- [ ] Note any deviations from expected behavior
- [ ] Test both positive and negative scenarios

### After Testing
- [ ] Update test case status
- [ ] Log defects with clear steps to reproduce
- [ ] Attach evidence (screenshots, logs)
- [ ] Communicate critical issues immediately
- [ ] Update test summary report

### Evidence Collection
- Screenshots of UI states
- Console error messages
- Network request/response logs
- Database query results
- Error stack traces

---

## APPENDIX: TEST DATA SETS

### User Accounts for Testing

| Role | Email | Password | Status |
|------|-------|----------|--------|
| Admin | admin@knhs.edu.ph | Admin@123 | Active |
| Faculty | teacher@knhs.edu.ph | Teacher@123 | Active |
| Student | student@knhs.edu.ph | Student@123 | Active |
| Parent | parent@email.com | Parent@123 | Active |

### Sample Academic Data

| Data Type | Sample Values |
|-----------|---------------|
| Academic Years | 2024-2025, 2025-2026 |
| Grade Levels | 7, 8, 9, 10, 11, 12 |
| Sections | Rizal, Bonifacio, Mabini, Aguinaldo |
| Subjects | Math, Science, English, Filipino, MAPEH, TLE, ESP, AP |

---

## NOTES

- Update this template as testing standards evolve
- Customize for specific project needs
- Archive completed test cases with execution reports
- Review and update regression test suites regularly

---

**Document Version**: 1.0  
**Last Updated**: [Date]  
**Maintained By**: [Team Name]
