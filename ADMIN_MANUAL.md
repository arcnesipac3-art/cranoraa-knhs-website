# KNHS School Portal - Admin Manual Guide

**Kiwalan National High School Digital Campus**

Welcome to the KNHS School Portal Admin Manual! This guide covers everything you need to manage the school portal as an administrator. From setting up the school year to monitoring teacher compliance and managing student enrollment, you'll find detailed, step-by-step instructions for every task.

> **Tip:** The **Quick Reference Card** at the end of this manual summarizes all key URLs, shortcuts, and status colors for fast lookup.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Admin Dashboard](#2-admin-dashboard)
3. [Compliance Monitoring](#3-compliance-monitoring)
4. [Enrollment Management](#4-enrollment-management)
5. [Announcements](#5-announcements)
6. [Class Management](#6-class-management)
7. [Subject Management](#7-subject-management)
8. [User Management](#8-user-management)
9. [Performance Testing](#9-performance-testing)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Getting Started

### Logging In

1. Open your browser and navigate to the portal URL (e.g., `https://kiwalannhs.vercel.app`).
2. Click **Log In** or navigate to the login page.
3. Enter your admin email and password.
4. Click **Log In** to access the admin dashboard.

### First-Time Setup Checklist

If this is your first time accessing the portal as admin, follow this checklist to set up the school year:

- [ ] **Verify admin account is active** — Check your account status in Settings.
- [ ] **Set up the academic year** — Go to Class Management → Year Rollover to create or update the current academic year.
- [ ] **Create classrooms/sections** — In Class Management, add each grade level section (e.g., "Grade 7 - Rizal", "Grade 8 - Mabini").
- [ ] **Add subjects** — In Subject Management, create all subjects offered (e.g., Mathematics, English, Science, Filipino, AP, ESP).
- [ ] **Assign subjects to sections** — In Subject Management → Assignments, map each subject to the appropriate sections and assign teachers.
- [ ] **Set up compliance types** — In Compliance Hub → Types, define the document types teachers must submit (e.g., Daily Lesson Plan, Daily Lesson Log).
- [ ] **Configure announcements** — Set up default categories and verify announcement settings.

> **Important:** Complete the setup checklist in order — some features depend on earlier steps (e.g., you need classrooms before you can assign subjects).

---

## 2. Admin Dashboard

The dashboard is your central command center. It provides a bird's-eye view of the entire school's operations at a glance.

### What You See

The dashboard is organized into several sections:

**Stat Cards** — Key metrics at the top of the page:
- **Students** — Total number of enrolled students
- **Faculty** — Total number of teacher accounts
- **Classrooms** — Total number of sections/classrooms
- **Announcements** — Total announcements posted
- **Pending Approvals** — Applications or accounts awaiting your review
- **Active Attendance** — Current day's attendance tracking status

**Academic Performance** — A summary of overall academic metrics:
- Average grade across all classes
- Attendance rate percentage
- Passing rate (students meeting the minimum grade threshold)
- Grade distribution chart (visual breakdown of grade ranges)

**Today's Attendance** — Real-time attendance data:
- Current day's attendance percentage
- 7-day trend line showing how attendance has changed over the past week

**Critical Alerts** — Items that need your immediate attention:
- Pending enrollments that need processing
- Low attendance warnings for specific classes
- Overdue compliance submissions

**System Utilities** — Quick links to administrative tools:
- Audit Logs — View system activity history
- System Health — Check backend server status
- Settings — Configure portal settings
- Backups — Manage data backups

### Quick Actions

- **Click any stat card** to navigate directly to the relevant section (e.g., click "Students" to view the student list).
- **Use the Refresh button** to manually update all statistics on the dashboard.
- **Quick Access tiles** provide shortcuts to the most common admin tasks.

---

## 3. Compliance Monitoring

Compliance monitoring ensures that teachers submit required documents (like lesson plans and lesson logs) on time. As an admin, you set up the requirements, review submissions, and track overall compliance rates.

### 3.1 Setting Up Compliance Types

Before teachers can submit compliance documents, you must define what types of documents are required and when they are due.

**Steps:**

1. Navigate to **Compliance Hub** from the sidebar.
2. Click the **Types** tab.
3. Click **New Type** to create a new compliance document type.
4. Fill in the form with the following details:

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | The name of the document type as it will appear to teachers | "Lesson Plan" |
| **Description** | A brief explanation of what this document is for (optional) | "Weekly lesson plans for all subjects" |
| **Frequency** | How often this document is due | Weekly, Monthly, Quarterly, Yearly |
| **Deadline Day** | The day of the period when the document is due (1-31) | 15 (for monthly, due on the 15th of each month) |
| **Max File Size** | The maximum allowed upload size in megabytes | 50 |
| **Display Order** | The order in which this type appears to teachers (lower numbers appear first) | 1 |

5. Click **Save** to create the compliance type.

**Managing Compliance Types:**

- **Toggle Active/Inactive:** Use the switch on each type card to hide it from teachers (inactive) or show it (active). Hiding a type doesn't delete it — you can reactivate it anytime.
- **Edit:** Click the Edit button on a type card to modify its settings (name, frequency, deadline, etc.).
- **Delete:** You can only delete a type if no submissions exist for it. If teachers have already submitted documents of that type, you must first delete all submissions or keep the type active.

> **Best Practice:** Create compliance types at the start of each school year or quarter, and make sure the frequency and deadline day match your school's official compliance schedule.

### 3.2 Reviewing Compliance Submissions

Once teachers have submitted their compliance documents, you need to review and approve or reject them.

**Steps:**

1. Navigate to **Compliance Hub** from the sidebar.
2. The **Submissions** tab shows all teacher submissions in a table.
3. Use the filters at the top to narrow down the results:
   - **Status:** Filter by Submitted, Reviewed, Rejected, Overdue, or Draft.
   - **Compliance Type:** Filter by a specific document type (e.g., only show Lesson Plans).
   - **Teacher:** Filter by a specific teacher's name.

**Reviewing a Single Submission:**

1. Click **Review** on any row in the submissions table.
2. The review modal opens, showing:
   - **Teacher info** — Name and email of the submitting teacher
   - **Submission period** — Which grading period or month the submission covers
   - **Submission date** — When the teacher uploaded the document
   - **All uploaded files** — Each file has **Preview** and **Download** buttons
   - **Previous rejection remarks** — If this submission was previously rejected, you'll see the remarks so you can see what was wrong
   - **Comment thread** — A conversation area where you can add notes or feedback
3. Click **Preview** on any file to view it inline:
   - **Images** (JPG, PNG, GIF) display directly in the preview pane.
   - **PDFs** render inside an embedded viewer.
   - **Office files** (DOCX, XLSX, PPTX) open via Google Docs Viewer — no need to download.
4. Make your decision:
   - Click **Approve** to accept the submission. The teacher will be notified.
   - Click **Reject** and enter remarks (required) to send the submission back to the teacher with feedback on what needs to be corrected.
5. Optionally add a **comment** to the thread for ongoing communication with the teacher.
6. Click the **Approve** or **Reject** button to confirm your decision.

**Bulk Actions:**

If you need to review multiple submissions at once:

1. Check the boxes next to the submissions you want to act on.
2. Click **Approve All** or **Reject All** in the bulk actions bar that appears at the bottom.
3. Confirm the action when prompted.

> **Tip:** Use the **Status** filter to quickly find all "Submitted" documents that are waiting for your review.

### 3.3 Compliance Dashboard

The Compliance Dashboard gives you a high-level overview of compliance across all teachers.

**What You'll See:**

- **Stat Cards:** Total submissions, Reviewed count, Pending count, Overdue count, Rejected count.
- **Compliance Rate:** An overall percentage with color-coded indicators:
  - **Green (≥80%)** — Healthy compliance rate
  - **Amber (50-79%)** — Moderate compliance — some teachers are falling behind
  - **Red (<50%)** — Low compliance — immediate attention needed
- **By Type:** A bar chart showing compliance rates broken down by each document type (e.g., how many teachers have submitted Lesson Plans vs. Daily Lesson Logs).
- **Per-Teacher Table:** A detailed table showing each teacher's individual compliance rate, so you can identify who needs follow-up.

**How to Use This:**

- Use the dashboard to identify teachers with overdue submissions or document types with low compliance rates.
- Click on any teacher's row in the Per-Teacher Table to jump directly to their submissions for review.
- Use the By Type chart to see if certain document types are consistently being missed — this may indicate that the type needs to be updated or that teachers need additional guidance.

---

## 4. Enrollment Management

The enrollment system manages the complete lifecycle of a student application: from initial submission through review, approval, and final enrollment. As an admin, you oversee this entire process.

### 4.1 Viewing Applications

**Steps:**

1. Navigate to **Enrollment** from the sidebar.
2. You'll see an analytics overview at the top with these stat cards:
   - **Total** — All applications in the system
   - **Pending** — New applications awaiting review
   - **Under Review** — Applications currently being processed
   - **Approved** — Applications that have been approved
   - **Enrolled** — Students who have been officially enrolled
   - **Rejected** — Applications that were denied
3. Use the filters to narrow down the list:
   - **Search:** By student name, email address, or enrollment number.
   - **Status:** Filter by any enrollment status (see the status flow below).
   - **Grade Level:** Filter by grade (7-12).
   - **Enrollment Type:** New, Returning, Transferee, SHS, or Parent-Assisted.
   - **School Year:** Filter by academic year.
   - **View Mode:** Switch between **List** (table view) and **Kanban** (board view with columns for each status).

### 4.2 Processing an Application (Complete Workflow)

This is the full workflow for processing a single student application from start to finish.

**Step 1: Review the Application**

1. Click **View** on any application row.
2. Review the student's personal information (name, age, gender, address, etc.).
3. Review the parents/guardian details (names, contact info, occupation).
4. Check the uploaded documents section to see what documents have been submitted.

**Step 2: Verify Documents**

For each document the applicant has uploaded:

1. Click **Verify** (green checkmark) if the document is valid and complete.
2. Click **Reject** (red X) if the document is invalid, blurry, or incomplete.
3. Document statuses are tracked as:
   - **Submitted** — The applicant uploaded the document
   - **Verified** — You have confirmed the document is valid
   - **Rejected** — The document was found to be invalid
   - **Missing** — The applicant hasn't uploaded this document yet

> **Important:** All required documents must be verified before you can move the application to **Approved** status.

**Step 3: Change Application Status**

You can move the application through different statuses as you process it:

| From Status | To Status | When to Use |
|-------------|-----------|-------------|
| Pending | Under Review | When you begin actively reviewing the application |
| Under Review | Pending Requirements | When documents are missing or incomplete |
| Under Review | Approved | When all documents are verified and the application meets requirements |
| Pending Requirements | Under Review | When the applicant submits the missing documents |
| Approved | Enrolled | When you assign a section and complete enrollment |

**Step 4: Assign a Section**

1. Click **Set Section** when the application is in Pending, Under Review, or Approved status.
2. Select a classroom from the dropdown list.
3. Click **Assign** to confirm.

**Step 5: Enroll the Student**

1. Click **Enroll Student** — this button is only available when the application status is **Approved**.
2. Select a **section** (classroom) from the dropdown.
3. Optionally enter a **parent email address** to link the parent's account to the student.
4. Click **Enroll**.
5. **Important:** A confirmation dialog will appear showing the student's credentials — **save this information securely**:
   - Email address (their login credential)
   - Temporary password (they must change this on first login)
   - LRN (Learner Reference Number)
   - Assigned section

> **Tip:** Communicate the student's credentials to the parent/guardian through a secure channel.

### 4.3 Bulk Actions

When you need to process multiple applications at once:

1. Check the boxes next to the applications you want to act on.
2. Use the bulk actions bar at the bottom of the table:
   - **Approve All** — Approve all selected applications at once.
   - **Reject All** — Reject all selected applications (you'll need to enter a reason for each).
   - **Enroll All** — Enroll all selected approved applications in one go.
   - **Clear** — Deselect all checked applications.

### 4.4 Exporting Data

- **CSV Export:** Click the CSV button to download the filtered application list as a spreadsheet. Useful for offline review or sharing with other staff.
- **PDF Report:** Click the PDF button to generate a formatted PDF summary report for official records.

### Enrollment Status Flow

Here's the complete flow of enrollment statuses:

```
Pending → Under Review → Approved → Enrolled
    ↓           ↓
 Rejected    Pending Requirements
    ↓           ↓
 Cancelled   Rejected
                 ↓
             Withdrawn
```

**Understanding the Flow:**

- A new application starts as **Pending**.
- You move it to **Under Review** when you begin processing it.
- If documents are missing, move it to **Pending Requirements** so the applicant knows what to submit.
- Once everything is in order, move it to **Approved**.
- Finally, **Enroll** the student to complete the process.
- **Rejected** applications can be cancelled by the applicant or withdrawn by the school.
- **Withdrawn** is the final status for students who leave the school.

---

## 5. Announcements

As an admin, you can create and manage announcements that reach the entire school community or specific groups.

### 5.1 Creating an Announcement

**Steps:**

1. Navigate to **Announcements** from the sidebar.
2. Click the composer card or **New Announcement** button.
3. Fill in the form with the following fields:

| Field | Options | Description |
|-------|---------|-------------|
| **Title** | Text | The headline of the announcement — make it clear and descriptive |
| **Category** | General, Academics, Events, Examinations, Guidance, Sports, Emergency, Holiday, System Update | The topic category — helps users filter and identify the type of announcement |
| **Priority** | Info (Normal), Important, Urgent | The urgency level — determines the visual indicator on the announcement card |
| **Status** | Live, Draft | **Live** publishes immediately; **Draft** saves it for later review |
| **Target Audience** | All, Students, Teachers, Parents | Who will see this announcement — choose "All" for school-wide announcements |
| **Target Classrooms** | Multi-select | Specific sections/classrooms to target (optional — leave blank to target all classrooms in the selected audience) |
| **Content** | Textarea | The full body text of the announcement — provide clear, complete information |
| **Is Pinned** | Toggle | When enabled, the announcement stays at the top of the feed so it's always visible |
| **Is Public** | Toggle | When enabled, the announcement is visible on the school's public website even to non-logged-in users |
| **Event Date** | Date picker | The date of the event being announced (optional) |
| **End Date** | Date picker | The date the event ends (optional — useful for multi-day events) |
| **Attachments** | File upload | Upload supporting files or images — multiple files are supported |

4. Click **Publish** to make the announcement live, or **Save as Draft** to review and publish later.

### 5.2 Managing Announcements

After an announcement is posted, you can manage it by hovering over the post:

- **Pin/Unpin** — Toggle whether the announcement stays at the top of the feed.
- **Publish** — For draft posts, make them live and visible to the target audience.
- **Archive** — For live posts, hide them from the active feed. Archived posts are still accessible but not prominently displayed.
- **Edit** — Modify the title, content, settings, or attachments of the announcement.
- **Delete** — Permanently remove the announcement. This action requires confirmation.

**Bulk Actions:**

1. Check multiple posts using the checkboxes in the sidebar list.
2. Click **Delete selected** to permanently remove all checked announcements at once.

### 5.3 Announcement Categories and Priority

**Categories — When to Use Each One:**

| Category | When to Use | Example |
|----------|-------------|---------|
| General | School-wide updates and general news | "School will be closed on Monday for a teacher in-service day" |
| Academics | Academic schedules, curriculum changes, and academic policies | "New grading system effective this quarter" |
| Events | School events, programs, and activities | "Annual Sports Day this Friday" |
| Examinations | Exam schedules, policies, and reminders | "Quarterly exams start next Monday" |
| Guidance | Counseling services, career guidance, and student support | "Career orientation session for Grade 10 students" |
| Sports | Sports events, tryouts, and athletic programs | "Basketball tryouts for Grade 7-10" |
| Emergency | Urgent safety announcements and critical alerts | "Emergency drill scheduled for Wednesday" |
| Holiday | Holiday schedules and special non-working days | "School closed on November 30 for Bonifacio Day" |
| System Update | Portal maintenance, new features, and technical notices | "Portal maintenance scheduled for Saturday 2-4 AM" |

**Priority Levels — Visual Indicators:**

| Priority | Visual Indicator | When to Use |
|----------|------------------|-------------|
| Info (Normal) | No special border | Standard announcements with no time sensitivity |
| Important | Orange left border | Announcements that require attention but aren't urgent |
| Urgent | Red left border | Critical announcements that need immediate attention (e.g., emergencies, closures) |

---

## 6. Class Management

Class management is where you create and organize the classrooms (sections) that make up the school's academic structure.

### 6.1 Creating a Class

**Steps:**

1. Navigate to **Class Management** from the sidebar.
2. Select the **Academic Year** from the dropdown at the top — this determines which school year the class belongs to.
3. Click **Add Class**.
4. Fill in the class details:
   - **Grade Level:** Select from 7 to 12 (the four high school grade levels in the Philippine K-12 system).
   - **Class/Section Name:** Enter a descriptive name, following your school's naming convention. Example: "Grade 7 - Rizal" or "Grade 10 - Bonifacio".
   - **Adviser:** Select a teacher from the dropdown to assign as the homeroom adviser for this class. This is optional — you can assign an adviser later.
5. Click **Save** to create the class.

> **Tip:** Use a consistent naming convention across all sections to make them easy to identify and manage.

### 6.2 Assigning Subjects to a Class

Each class needs subjects assigned to it, along with a teacher for each subject.

**Steps to Assign a Subject:**

1. Click **Subjects** on the row of the class you want to modify.
2. A slide-over panel opens showing the subjects already assigned to this class.
3. Click **Assign** to add a new subject.
4. In the assignment dialog:
   - **Subject:** Select a subject from the searchable list. Subjects are grouped by grade level.
   - **Teacher:** Select a staff member from the dropdown to teach this subject in this class.
5. Click **Save** to confirm the assignment.

**To Remove a Subject Assignment:**

1. Click **Subjects** on the class row.
2. Hover over the subject assignment you want to remove.
3. Click **Remove** and confirm the deletion.

> **Note:** A teacher can be assigned to multiple classes and multiple subjects. The system supports multi-section teachers.

### 6.3 Bulk Enrolling Students

Once classes are created and subjects are assigned, you can enroll students into the classes.

**Steps:**

1. Click **Enroll** on the row of the class you want to add students to.
2. A modal will appear showing all available students who are not yet enrolled in this class.
3. **Check the boxes** next to the students you want to enroll.
4. Use **Select All** at the top of the list to check all available students at once.
5. Click **Enroll N Student(s)** (the number updates based on how many students you selected) to confirm.

### 6.4 Academic Year Rollover

At the end of each school year, you can copy the classroom structure (sections, teacher assignments, subject assignments) to the next academic year. This saves time by not requiring you to recreate everything from scratch.

**Steps:**

1. Click **Year Rollover** (admin-only feature) from the sidebar.
2. Select the **Source Year** — the academic year you want to copy FROM (e.g., "2024-2025").
3. Select the **Target Year** — the academic year you want to copy TO (e.g., "2025-2026").
4. Choose which data to copy:
   - **[x] Copy teacher/adviser assignments** (recommended) — Preserves which teachers are assigned to which classes as advisers.
   - **[ ] Copy subject assignments** (optional) — If checked, also copies which subjects are assigned to which classes and which teachers teach them.
5. Click **Create Classrooms** to execute the rollover.

**Important Notes:**

- **Students and grades are NOT copied** — only the classroom structure and assignments are duplicated. You will need to enroll new students for the new school year.
- Make sure the target year doesn't already have classrooms before running the rollover.
- Review the created classrooms after the rollover to ensure everything was copied correctly.

---

## 7. Subject Management

Subject management is where you define the academic subjects offered by the school and assign them to specific sections.

### 7.1 Adding a Subject

**Steps:**

1. Navigate to **Subjects Hub** from the sidebar.
2. Ensure you're on the **Subjects** tab.
3. Click **Add Subject**.
4. Fill in the subject details:
   - **Subject Code:** A short identifier for the subject (e.g., "MATH7" for Grade 7 Mathematics). The system automatically converts this to uppercase.
   - **Grade Level:** Select the grade level this subject is for (7-12).
   - **Subject Name:** The full name of the subject (e.g., "Mathematics", "English", "Science").
   - **Description:** A brief overview of the subject (optional).
5. Click **Save** to create the subject.

> **Tip:** Use consistent subject codes across grade levels (e.g., MATH7, MATH8, MATH9) to make them easy to identify and assign.

### 7.2 Assigning Subjects to Sections

Once subjects are created, you need to assign them to specific sections (classrooms) and assign a teacher for each.

**Steps:**

1. Switch to the **Assignments** tab in the Subjects Hub.
2. Click **Assign Subject**.
3. Fill in the assignment details:
   - **Section:** Select a classroom from the dropdown. Classrooms are grouped by grade level for easy navigation.
   - **Subject:** Select a subject from the list. Subjects are also grouped by grade level.
   - **Teacher:** Select a staff member who will teach this subject in this section.
4. Click **Save** to confirm the assignment.

**Important:** The system prevents duplicate assignments — you cannot assign the same subject to the same section twice. If you need to change the teacher for a subject assignment, remove the existing assignment and create a new one.

---

## 8. User Management

### Viewing Users

1. Navigate to the **People** section from the sidebar.
2. Use the tabs to switch between:
   - **Students** — View all student accounts
   - **Teachers/Faculty** — View all teacher accounts
3. Use the **search bar** to find users by name or email.
4. Use the **role filter** to narrow down the list by user role.

### Account Moderation

1. Check **Pending Approvals** on the dashboard for new account requests.
2. Review each new account request:
   - Verify the user's name, email, and role.
   - Approve the account to grant access, or reject it if the request is invalid.
3. Approved accounts can log in immediately. Rejected accounts are notified of the decision.

### User Roles

| Role | Access Level | What They Can Do |
|------|-------------|------------------|
| **Admin** | Full system access | Manage everything: users, classes, subjects, compliance, enrollment, announcements, system settings |
| **Staff/Teacher** | Teaching tools | Take attendance, submit grades, upload learning materials, manage compliance documents, post class announcements |
| **Student** | Learning tools | View grades, attendance, announcements, learning materials, and class information |
| **Parent** | Child-focused view | View their child's grades, attendance, and announcements only |

---

## 9. Troubleshooting

### Common Issues and Solutions

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| Cannot log in | Incorrect email/password or account not approved | Verify your credentials. If the account is new, check with the admin to ensure it has been approved. |
| Enrollment tracking shows error | Enrollment number format is incorrect | Enrollment numbers must follow the format `ENR-YYYY-XXXXXX` (e.g., ENR-2025-000001). |
| Documents not showing in compliance | Files may not have been uploaded successfully | Ask the teacher to re-upload the documents and verify the upload completed. |
| Compliance types are empty | No compliance types have been created yet | As admin, go to Compliance Hub → Types and create the required document types before teachers can submit. |
| Announcements not visible to users | The post may be in Draft status or targeting the wrong audience | Check that the announcement is set to "Live" and that the Target Audience includes the intended users. |
| Section assignment fails | The classroom may not exist for the selected grade level | Ensure the classroom/section exists and is assigned to the correct grade level before assigning it to an application. |
| Year rollover not working | Source and target years may be the same | Ensure the Source Year and Target Year are different. The system requires two distinct years. |
| Teacher not appearing in subject assignment dropdown | The teacher may not have a valid account or role | Verify the teacher's account is active and has the Staff/Teacher role assigned. |

### Getting Help

- **Check System Health** — Go to the System Admin page to see if the backend servers are running properly.
- **Review Audit Logs** — Check the audit logs for a record of recent system activity, which can help diagnose issues.
- **Account issues** — Contact the system administrator for help with user accounts, permissions, or access problems.
- **Report bugs** — If you encounter a software bug, report it at: https://github.com/anomalyco/opencode/issues

---

## Quick Reference Card

### Key URLs

| Page | URL Path |
|------|----------|
| Dashboard | `/dashboard` |
| Compliance Hub | `/compliance` |
| Compliance Types | `/compliance/types` |
| Compliance Submissions | `/compliance/submissions` |
| Compliance Dashboard | `/compliance/dashboard` |
| Enrollment Management | `/enrollment` |
| Enrollment Tracking | `/enrollment/track` |
| Announcements | `/announcements` |
| Class Management | `/classes` |
| Subjects Hub | `/subjects` |
| People/Users | `/people` |
| Settings | `/settings` |
| System Admin | `/system-admin` |

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Refresh dashboard | Click the Refresh button |
| Search | Use the search bars in each section |
| Bulk select | Check individual boxes or use "Select All" |

### Status Colors Reference

| Status | Color |
|--------|-------|
| Pending | Amber |
| Under Review | Violet |
| Approved | Emerald |
| Enrolled | Violet |
| Rejected | Rose |
| Cancelled | Gray |
| Withdrawn | Orange |
| Submitted | Blue |
| Reviewed | Green |
| Overdue | Red |
| Draft | Gray |

---

*This guide is for the KNHS School Portal (Kiwalan National High School Digital Campus). Features and interface elements may be updated over time. Refer to the latest version of the portal for any changes.*


---

## 9. Performance Testing

As the portal grows and more users access it simultaneously, it's crucial to understand how the system performs under load. Performance testing helps you identify bottlenecks, plan capacity, and ensure smooth operation during peak usage periods like enrollment season or report card release.

### 9.1 Why Performance Testing Matters

**Ensure Reliability**
- Verify the portal can handle all students, teachers, and parents logging in at once
- Identify breaking points before they impact real users
- Plan infrastructure upgrades based on actual capacity needs

**Optimize User Experience**
- Ensure pages load quickly even during peak usage
- Identify and fix slow endpoints before users complain
- Maintain responsive performance as the school grows

**Plan for Growth**
- Understand current system capacity
- Forecast infrastructure needs for next school year
- Budget for necessary upgrades

### 9.2 Getting Started with Load Testing

The portal includes a comprehensive load testing suite using k6, an industry-standard performance testing tool.

**Prerequisites:**
1. k6 installed on your system (see QUICKSTART.md in load-tests directory)
2. Backend server running
3. Test users created in database

**Quick Start:**
```powershell
# Navigate to load-tests directory
cd load-tests

# Setup test data (first time only)
python setup-test-data.py

# Run a quick smoke test
.\run-tests.ps1 smoke

# Run a full load test
.\run-tests.ps1 load
```

**For detailed instructions, see:**
- `load-tests/QUICKSTART.md` — 5-minute quick start guide
- `load-tests/README.md` — Complete documentation
- `load-tests/performance-checklist.md` — Pre/post-test checklist

### 9.3 Understanding Test Scenarios

The load testing suite includes several predefined scenarios:

**Smoke Test (1 minute)**
- Purpose: Quick validation that everything works
- Users: 1 concurrent user
- When to use: After deployments, before major tests

**Load Test (24 minutes) — Recommended**
- Purpose: Test normal operating capacity
- Users: Gradually increases to 100 concurrent users
- When to use: Monthly capacity checks, before peak periods

**Stress Test (28 minutes)**
- Purpose: Find the breaking point
- Users: Up to 300 concurrent users
- When to use: Capacity planning, infrastructure decisions

**Spike Test (8 minutes)**
- Purpose: Test sudden traffic surges
- Users: Sudden jump to 200 users
- When to use: Before enrollment opening, report card release

**Endpoint Test (5 minutes)**
- Purpose: Identify which specific APIs are slow
- Users: 20 concurrent users testing each endpoint
- When to use: Performance optimization, debugging

### 9.4 Reading Test Results

After each test, k6 generates a detailed HTML report (`load-test-summary.html`) and console output.

**Key Metrics to Watch:**

| Metric | What It Means | Good | Acceptable | Poor |
|--------|---------------|------|------------|------|
| **http_req_duration (avg)** | Average response time | < 500ms | < 1000ms | > 1000ms |
| **http_req_duration (p95)** | 95% of requests complete within | < 1000ms | < 2000ms | > 2000ms |
| **http_req_failed** | Percentage of failed requests | < 2% | < 5% | > 5% |
| **iterations** | Complete user journeys | Higher is better | - | - |
| **checks** | Successful validation checks | > 95% | > 90% | < 90% |

**Example Output:**
```
✓ health check status is 200
✓ login status is 200
✓ student profile status is 200

checks.........................: 95.23% ✓ 1234      ✗ 62
http_req_duration..............: avg=245ms  p(95)=850ms  max=3s
http_req_failed................: 2.45%  ✓ 62        ✗ 2472
iterations.....................: 456    1.5/s
vus............................: 100    min=0       max=100
```

**Interpreting Results:**
- ✅ **Excellent**: All metrics in "Good" range, no errors
- ⚠️ **Needs Attention**: Metrics in "Acceptable" range, minor issues
- ❌ **Critical**: Metrics in "Poor" range, immediate action needed

### 9.5 Common Performance Issues and Solutions

**Slow Response Times (avg > 1000ms)**

*Symptoms:*
- Pages take several seconds to load
- Users experience lag when navigating
- p95 metric is very high

*Solutions:*
1. **Enable Redis caching** — Dramatically speeds up repeated queries
2. **Add database indexes** — Especially on frequently queried fields
3. **Optimize queries** — Use `select_related()` and `prefetch_related()`
4. **Implement pagination** — Limit result set sizes
5. **Review slow query logs** — Identify and optimize expensive queries

**High Error Rates (> 5%)**

*Symptoms:*
- Many 500/502/503 errors during test
- Database connection errors
- Timeout errors

*Solutions:*
1. **Increase database connection pool** — Set `conn_max_age` in settings
2. **Add more workers** — Increase gunicorn/uvicorn workers
3. **Check Django logs** — Fix application errors
4. **Adjust rate limits** — Ensure they're not too aggressive
5. **Monitor system resources** — CPU/memory may be exhausted

**Database Bottlenecks**

*Symptoms:*
- High database CPU usage
- Connection pool exhausted
- Slow queries dominate response time

*Solutions:*
1. **Add indexes** — Run `python manage.py dbshell` and analyze slow queries
2. **Use connection pooling** — Install PgBouncer for PostgreSQL
3. **Implement query caching** — Cache frequent, expensive queries
4. **Consider read replicas** — For read-heavy workloads
5. **Optimize complex queries** — Review Django ORM usage

**Memory Leaks**

*Symptoms:*
- Memory usage grows continuously during test
- System becomes unresponsive over time
- Out of Memory (OOM) errors

*Solutions:*
1. **Use iterator()** — For processing large querysets
2. **Close file handles** — Ensure proper cleanup
3. **Review WebSocket cleanup** — Check Channels layer
4. **Process data in chunks** — Don't load entire datasets
5. **Profile memory usage** — Use Django Debug Toolbar

### 9.6 Capacity Planning

Based on test results, you can estimate infrastructure needs:

**Current Capacity Assessment:**
1. Run load test to determine maximum concurrent users
2. Note the point where errors exceed 5%
3. Record resource usage (CPU, memory, database connections)

**Example:**
```
Current capacity: 150 concurrent users
At 150 users: avg response = 1.2s, error rate = 4%
Breaking point: 200 users (error rate jumps to 15%)
```

**Infrastructure Recommendations:**

| Concurrent Users | CPU Cores | RAM | Workers | Database Connections |
|-----------------|-----------|-----|---------|---------------------|
| < 50 | 2 | 2GB | 2-3 | 20 |
| 50-100 | 4 | 4GB | 4-6 | 40 |
| 100-200 | 8 | 8GB | 8-12 | 80 |
| 200+ | 16+ | 16GB+ | 12-20 | 100+ |

### 9.7 Best Practices

**Regular Testing Schedule:**
- **Monthly**: Run load test to establish baseline
- **Before major events**: Test before enrollment, grade releases
- **After major changes**: Test after infrastructure or code changes
- **Quarterly**: Run stress test to verify capacity

**Pre-Test Checklist:**
- [ ] Backend is running
- [ ] Test users are created
- [ ] Database has representative data
- [ ] Monitoring tools are ready
- [ ] No other heavy processes running

**During Test:**
- [ ] Monitor system resources (CPU, memory)
- [ ] Watch database connections
- [ ] Observe error logs
- [ ] Record any anomalies

**Post-Test:**
- [ ] Review HTML report
- [ ] Document findings
- [ ] Create optimization tasks
- [ ] Update capacity plan
- [ ] Archive results for comparison

### 9.8 Automated Performance Testing

The portal includes a GitHub Actions workflow that automatically runs performance tests:

**Triggers:**
- Pull requests to main branch (smoke test only)
- Manual trigger via GitHub Actions UI
- Weekly schedule (Sunday at 2 AM UTC)

**To run manually:**
1. Go to GitHub repository
2. Click Actions tab
3. Select "Performance Testing" workflow
4. Click "Run workflow"
5. Choose scenario and click "Run"

Results are uploaded as artifacts and can be downloaded from the workflow run.

### 9.9 Resources and Support

**Documentation:**
- Quick start: `load-tests/QUICKSTART.md`
- Full guide: `load-tests/README.md`
- Checklist: `load-tests/performance-checklist.md`
- k6 documentation: https://k6.io/docs/

**Getting Help:**
1. Check Django logs: `backend/logs/`
2. Review test output for specific errors
3. Consult performance checklist
4. Review this manual's troubleshooting section

**Recommended Tools:**
- **k6**: Load testing (already included)
- **Django Debug Toolbar**: Query analysis (dev only)
- **PgBouncer**: PostgreSQL connection pooling
- **Redis**: Caching layer
- **Sentry**: Error monitoring (if configured)

---

