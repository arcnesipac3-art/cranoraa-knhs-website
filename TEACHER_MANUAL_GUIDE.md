# KNHS School Portal — Teacher's Manual Guide

Kiwalan National High School Digital Campus

---

## Table of Contents

1. [Logging In](#1-logging-in)
2. [Dashboard Overview](#2-dashboard-overview)
3. [My Classes](#3-my-classes)
4. [Taking Attendance](#4-taking-attendance)
5. [Grading](#5-grading)
6. [Uploading Learning Materials](#6-uploading-learning-materials)
7. [Posting Announcements](#7-posting-announcements)
8. [Adding a Student to a Class](#8-adding-a-student-to-a-class)
9. [Enrollment](#9-enrollment)
10. [Tips & Troubleshooting](#10-tips--troubleshooting)

---

## 1. Logging In

1. Open your browser and go to the KNHS School Portal website.
2. Click **Login** on the top-right corner of the page.
3. Enter your **email** and **password** provided by the school administrator.
4. Click **Sign In**. You will be redirected to your **Dashboard**.

> **Note:** Your account role is set to **Faculty/Staff**. You will see teacher-specific pages in the sidebar.

---

## 2. Dashboard Overview

After logging in, the **Dashboard** shows an overview of your classes, recent activity, and quick links.

**Sidebar Navigation (Teacher):**

| Section | Menu Items |
|---------|------------|
| Workspaces | Dashboard, My Classes, My Schedule |
| Teaching | Grade Submission, Attendance Dashboard, My Compliance |
| Communication | Messages, Announcements, Notifications |
| Resources | Enrollment, Schedules, School Forms, Calendar |
| Account | Settings |

---

## 3. My Classes

**Route:** `/my-classes`

### Viewing Your Classes

1. Click **My Classes** in the sidebar.
2. You will see a grid of classroom cards assigned to you.
3. Each card displays:
   - Classroom name and grade level
   - Number of subjects you teach
   - Number of enrolled students

### Opening a Classroom

Click on any classroom card to enter it. The classroom has **7 tabs**:

| Tab | Purpose |
|-----|---------|
| Stream | Class announcements and feed |
| Materials | Upload and manage learning materials |
| People | View enrolled student roster |
| Attendance | Take daily attendance |
| History | View past attendance records |
| Grades | Input and manage student grades |
| Analytics | View class performance analytics |

---

## 4. Taking Attendance

There are three ways to access attendance:

- **Attendance Dashboard** (`/attendance-dashboard`) — overview of all your periods for any day with completion status.
- **My Classes** → select a class → **Attendance** tab — see your scheduled periods for that class and mark attendance.
- **Direct link** from the dashboard — click any period card to go directly to attendance entry.

### Step-by-Step: Taking Schedule-Based Attendance

1. **Open the Attendance Dashboard** from the sidebar.

2. **Navigate dates** using the arrow buttons or date picker. Click **Today** to return to the current date.

3. **View your scheduled periods** — each card shows:
   - Subject name and classroom
   - Time period (e.g., 8:00 AM - 9:00 AM)
   - Student count and recording progress
   - Completion status (Completed / Pending)

4. **Click a period card** to open attendance entry for that specific subject/time slot.

5. **Mark attendance** for each student:
   - Click one of the 4 status buttons: **Present** (green), **Absent** (red), **Late** (amber), **Excused** (blue)
   - Add optional **Remarks** in the text field

6. **Use Bulk Actions** (optional):
   - Click **"All Present"** to mark every student as Present.
   - Click **"Clear"** to reset all marks.

7. **Save** your work:
   - Click **Save** to save as draft (you can continue editing later).
   - Click **Submit** to finalize and send to admin for review.

### Time-Window Access

- Teachers can mark attendance starting **15 minutes before** the period starts.
- Attendance can be marked until the end of the school day (5:00 PM).
- Admins can mark attendance at any time without restrictions.

### Dual Attendance Types

| Type | When Used | Description |
|------|-----------|-------------|
| **Schedule-Based** | Subject teachers | Marks attendance for a specific subject period (linked to a schedule) |
| **Class-Level (Homeroom)** | Advisory teachers | Marks attendance for the entire class without a schedule link |

### Attendance Statuses (Workflow)

```
Draft → Submitted → (Admin reviews) → Approved / Locked
```

- **Draft:** You can still edit. Use "Save" to keep working.
- **Submitted:** Sent to admin. You can click **Reopen** to move it back to draft if needed.
- **Locked:** Admin has approved. No further edits possible.

### Viewing Attendance History

Click the **History** tab in the classroom to see past attendance records by date.

### Student Calendar View

Students see their attendance as a **monthly calendar** with:
- Color-coded dates showing attendance status
- Click any date to expand and see period-by-period details
- Toggle between **Calendar** and **List** views
- Filter by month using navigation arrows

---

## 5. Grading

### Accessing the Grade Dashboard

1. Click **Grade Submission** in the sidebar, or go to `/teacher-grade-dashboard`.
2. You'll see:
   - Active grading period info with deadline countdown
   - Cards for each subject/classroom showing grading progress
   - Filters: Pending, Submitted, Overdue, Approved/Locked, All

### Step-by-Step: Inputting Grades

1. From the Grade Dashboard, click **"Enter Grades"** on a subject card.
   - This opens the **Grades** tab in My Classes for that classroom.

2. **Select the subject** from the dropdown.

3. **Select the term** (T1, T2, or T3) using the toggle buttons.

4. **Enter grades** for each student:
   - Type a score from **0 to 100** in the input field next to each student name.
   - If a grade already exists, you'll see an **"Overwrite"** warning when entering a new value.

5. **Bulk fill** (optional):
   - Click **"Fill All with Same Grade"** to apply one grade value to all students at once.

6. Click **Submit** to save and submit the grades.

### Grade Submission Workflow

```
Draft / In Progress → Submitted → Reviewed → Approved → Locked
```

- **Draft / In Progress:** Grades are editable.
- **Submitted:** Sent to admin for review. Read-only.
- **Approved:** Admin approved your grades.
- **Locked:** Grades are final. To edit, you must **Request Reopening** with a reason.

### Viewing Grade Summary

Click the **Manage** card in the Grades tab to see a table of all students with their Q1, Q2, Q3, Final Grade, and Remarks.

| Remarks Range | Label |
|--------------|-------|
| 90–100 | Outstanding |
| 85–89 | Very Satisfactory |
| 80–84 | Satisfactory |
| 75–79 | Fairly Satisfactory |
| Below 75 | Did Not Meet Expectations |

### Important Notes

- Grade input is only available during **open grading periods**. If the period is closed, you'll see a locked screen.
- You can **export grades** as CSV or SF10 PDF from the Manage view.
- To request reopening of locked grades, click **"Request Reopening"** and provide a reason.

---

## 6. Uploading Learning Materials

**Where:** My Classes → select a class → **Materials** tab.

### Step-by-Step: Uploading a Material

1. Click the **"Upload"** button in the Materials tab header.
2. Fill in the upload form:

   | Field | Required | Description |
   |-------|----------|-------------|
   | **Title** | Yes | Name of the material |
   | **Description** | No | Brief description of the content |
   | **Type** | Yes | Select from: DLP, DLL, Learning Module, Activity Sheet, Assessment, Other |
   | **File** | Yes | Upload any file (PDF, DOCX, PPTX, etc.) |
   | **Term** | No | 1st Term, 2nd Term, or 3rd Term |
   | **Week** | No | Week number for organization |

3. Click **"Upload"** in the modal to save.

### Material Types

| Type | Full Name | Typical Use |
|------|-----------|-------------|
| DLP | Daily Lesson Plan | Detailed lesson planning |
| DLL | Daily Lesson Log | Quick lesson logging |
| Module | Learning Module | Student learning packets |
| Activity | Activity Sheet | Exercises and worksheets |
| Assessment | Assessment | Tests and quizzes |
| Other | Other | Any other resource |

### Managing Materials

- **Search:** Use the search bar to filter materials by title or description.
- **Delete:** Click the trash icon on a material card and confirm deletion.

---

## 7. Posting Announcements

You can post announcements in two places:

- **School-wide:** The Announcements page (`/announcements`) — visible to all users or targeted audiences.
- **Class-specific:** The Stream tab inside a specific classroom — visible only to that class.

### Option A: School-Wide Announcement

1. Click **Announcements** in the sidebar.
2. Click the **"Create a school announcement..."** card at the top of the feed.
3. The **Post Composer** opens with 3 tabs:

   **Tab 1 — Compose:**
   - Enter a **Title** (max 150 characters).
   - Write the **Content** (main body).
   - Optionally attach files (PDF, DOC, XLS) or images (JPG, PNG, GIF, WEBP).

   **Tab 2 — Audience:**
   - Select **Target Audience**: All Users, Students, Faculty, or Parents.
   - Optionally select specific **Sections** (classrooms) to target.

   **Tab 3 — Settings:**
   - **Category:** General, Academics, Events, Examinations, Guidance, Sports, Emergency, Holiday, System.
   - **Priority:** Normal, Important, or Urgent.
   - **Status:** Publish now or Save as draft.
   - **Pin to top:** Check to keep the announcement at the top of the feed.
   - **Show on public website:** Check to display on the school's public homepage.
   - **Schedule Post:** Set a future date/time to auto-publish.
   - **Expires:** Set a date/time to auto-archive.

4. Click **Post** to publish.

### Option B: Class-Specific Announcement

1. Open a class from **My Classes**.
2. Click the **Stream** tab.
3. Type your announcement content in the text area.
4. Optionally add a **title** and **file attachments** (up to 5 files).
5. Click **Post**.

### Managing Announcements

- **Edit:** Hover over your announcement → click the edit (pencil) icon.
- **Delete:** Hover → click the delete (trash) icon → confirm.
- **Pin/Unpin:** Hover → click the pin icon.
- **Archive:** Hover → click the archive icon.

---

## 8. Adding a Student to a Class

Students are added to classes through the **Enrollment Hub** or by **changing sections**. Teachers can view students in the **People** tab but adding/enrolling is done via the enrollment system.

### Method 1: Assigning an Approved Applicant to a Section

1. Click **Enrollment** in the sidebar (or go to `/enrollment-hub`).
2. In the **Applications** tab, find the approved applicant.
3. Click **"Assign Section"** on the application row.
4. Select a **classroom** from the dropdown (shows current enrollment count vs. capacity).
5. Confirm the assignment.

### Method 2: Enrolling a Student from an Approved Application

1. In the Enrollment Hub → **Applications** tab, find an **Approved** application.
2. Click **"Enroll"** on the row.
3. In the enrollment modal:
   - **Assign Section:** Select the classroom.
   - **Parent Email:** (Optional) Enter parent email to link their account.
4. Click **"Enroll Now"**.
5. A confirmation modal will show the student's:
   - Email address
   - LRN (Learner Reference Number)
   - Temporary password
   - Assigned section

### Method 3: Directly Adding Students to a Classroom (Bulk)

1. Click **Enrollment** in the sidebar.
2. Switch to the **"Enroll Students"** tab.
3. Click on a **classroom card** to see its student list.
4. Click **"Add Students"**.
5. In the modal:
   - Search for students by **name**, **LRN**, or **email**.
   - Check the boxes next to the students you want to add.
   - Or use **"Select all"** to add all listed students.
6. Click **"Enroll N Student(s)"** to confirm.

### Changing a Student's Section

1. Go to Enrollment Hub → **Enroll Students** tab → select a classroom.
2. Find the student in the enrolled list.
3. Click **"Change Section"**.
4. Select the new classroom.
5. Confirm the transfer.

### Withdrawing a Student

1. Find the student in the enrolled list.
2. Click **"Withdraw"**.
3. Select a **reason type**: Transferred Out, Withdrawn, Dropped, or Other.
4. Enter a **reason** (required).
5. Confirm withdrawal.

---

## 9. Enrollment

The enrollment system manages the full lifecycle: application → review → approval → enrollment.

### Viewing Enrollment Applications

1. Click **Enrollment** in the sidebar → `/enrollment-hub`.
2. The **Applications** tab shows:
   - **6 stat cards:** Total, Pending, Under Review, Approved, Enrolled, Rejected
   - **Filters:** Search, Status, Grade Level, Enrollment Type, School Year
   - **Application table** with action buttons

### Application Statuses

| Status | Meaning |
|--------|---------|
| Pending | New application, awaiting review |
| Under Review | Being reviewed by staff |
| Pending Requirements | Additional documents needed |
| Approved | Ready to be enrolled |
| Enrolled | Student is officially enrolled |
| Rejected | Application denied |
| Cancelled | Applicant cancelled |
| Withdrawn | Enrolled student withdrawn |

### Processing an Application

1. **Start Review:** Click on a Pending application → **"Start Review"** → status changes to Under Review.

2. **Request Documents** (if needed):
   - Click **"Request Documents"** on the application.
   - Select the required document types (Birth Certificate, Report Card, Form 138, etc.).
   - Add a message explaining what's needed.
   - The applicant is notified.

3. **Approve:**
   - Click **"Approve"** on a reviewed application.
   - Optionally add remarks.
   - Status changes to Approved.

4. **Reject:**
   - Click **"Reject"** on an application.
   - Enter a **reason** (required).
   - The applicant is notified.

5. **Enroll:**
   - Once approved, click **"Enroll"**.
   - Assign a section (classroom).
   - Optionally link a parent email.
   - Click **"Enroll Now"**.

### Bulk Actions

- Select multiple applications using checkboxes.
- Click **"Approve All"** or **"Reject All"** to process in bulk.

### Exporting

- Click **CSV** to download the application list as a spreadsheet.
- Click **PDF** to generate a PDF report.

---

## 10. Tips & Troubleshooting

### General Tips

- **Save frequently** when taking attendance or entering grades. Click "Save" often to avoid losing work.
- **Check grading deadlines** on the Grade Dashboard. Overdue submissions are highlighted in red.
- **Use "All Present"** as a starting point, then mark exceptions (absent, late, excused) — faster than marking each student.
- **Attach files** when posting announcements to provide additional context or documents.

### Common Issues

| Issue | Solution |
|-------|----------|
| Cannot enter grades | Check if a grading period is open. Grade input is locked when no active period exists. |
| Attendance shows locked | Admin has approved/locked attendance. Request reopening if changes are needed. |
| Student not appearing in class | Verify the student is enrolled in that section via the Enrollment Hub. |
| Material upload fails | Check file size and format. Supported: any common file type (PDF, DOCX, PPTX, etc.). |
| Cannot post announcement | Ensure you are logged in as Faculty/Admin. Students have read-only access. |
| Grade submission button disabled | You must enter at least one grade before submitting. |
| "No classes today" message | Check if the date is a holiday in the school calendar. |

### Keyboard Shortcuts

- Use **Enter** to confirm inline grade edits.
- Use **Escape** to cancel inline editing.

### Getting Help

- For technical issues, contact the school IT administrator.
- For account access problems, visit the **Settings** page to update your profile or request a password reset.

---

*This guide is for the KNHS School Portal (Kiwalan National High School Digital Campus). Features and interface elements may be updated over time. Refer to the latest version of the portal for any changes.*
