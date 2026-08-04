# KNHS School Portal - Admin Manual Guide

## Table of Contents
1. [Getting Started](#1-getting-started)
2. [Admin Dashboard](#2-admin-dashboard)
3. [Compliance Monitoring](#3-compliance-monitoring)
4. [Enrollment Management](#4-enrollment-management)
5. [Announcements](#5-announcements)
6. [Class Management](#6-class-management)
7. [Subject Management](#7-subject-management)
8. [User Management](#8-user-management)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Getting Started

### Logging In
1. Go to the portal URL (e.g. `https://kiwalannhs.vercel.app`)
2. Click **Log In** or navigate to the login page
3. Enter your admin email and password
4. Click **Log In**

### First-Time Setup Checklist
- [ ] Verify admin account is active
- [ ] Set up academic year (Class Management > Year Rollover)
- [ ] Create classrooms/sections (Class Management)
- [ ] Add subjects (Subject Management)
- [ ] Assign subjects to sections (Subject Management > Assignments)
- [ ] Set up compliance types (Compliance Hub > Types)
- [ ] Configure announcements settings

---

## 2. Admin Dashboard

The dashboard is your central command center showing school-wide statistics and quick navigation.

### What You See
- **Stat Cards**: Students, Faculty, Classrooms, Announcements, Pending Approvals, Active Attendance
- **Academic Performance**: Average grade, attendance rate, passing rate, grade distribution chart
- **Today's Attendance**: Current day's attendance percentage with 7-day trend
- **Critical Alerts**: Pending enrollments, low attendance warnings
- **System Utilities**: Links to Audit Logs, System Health, Settings, Backups

### Quick Actions
- Click any stat card to navigate to the relevant section
- Use **Refresh** button to update all statistics
- Use **Quick Access** tiles for common tasks

---

## 3. Compliance Monitoring

### 3.1 Setting Up Compliance Types

Before teachers can submit compliance documents, you must define the types of documents required.

**Steps:**
1. Navigate to **Compliance Hub** from the sidebar
2. Click the **Types** tab
3. Click **New Type**
4. Fill in the form:

| Field | Description | Example |
|-------|-------------|---------|
| Name | Document type name | "Lesson Plan" |
| Description | Brief description (optional) | "Weekly lesson plans for all subjects" |
| Frequency | How often it's due | Weekly, Monthly, Quarterly, Yearly |
| Deadline Day | Day of period when due (1-31) | 15 (for monthly, due on the 15th) |
| Max File Size | Maximum upload size in MB | 50 |
| Display Order | Sort order (lower = first) | 1 |

5. Click **Save**

**Managing Types:**
- **Toggle Active/Inactive**: Use the switch on each card to hide/show from teachers
- **Edit**: Click the Edit button to modify settings
- **Delete**: Only possible if no submissions exist for that type

### 3.2 Reviewing Compliance Submissions

**Steps:**
1. Navigate to **Compliance Hub** from the sidebar
2. The **Submissions** tab shows all teacher submissions
3. Use filters to narrow results:
   - **Status**: Submitted, Reviewed, Rejected, Overdue, Draft
   - **Compliance Type**: Filter by specific document type
   - **Teacher**: Filter by specific teacher

**Reviewing a Single Submission:**
1. Click **Review** on any row
2. The review modal opens showing:
   - Teacher info, submission period, date
   - All uploaded files with **Preview** and **Download** buttons
   - Previous rejection remarks (if any)
   - Comment thread
3. Click **Preview** on any file to view it inline:
   - Images display directly
   - PDFs render in an iframe
   - Office files (docx, xlsx, pptx) open via Google Docs Viewer
4. Make your decision:
   - Click **Approve** to accept the submission
   - Click **Reject** and enter remarks (required) to send back
5. Optionally add a comment to the thread
6. Click the Approve/Reject button to confirm

**Bulk Actions:**
1. Check the boxes next to multiple submissions
2. Click **Approve All** or **Reject All** in the bulk actions bar
3. Confirm the action

### 3.3 Compliance Dashboard

View compliance statistics across all teachers:

- **Stat Cards**: Total, Reviewed, Pending, Overdue, Rejected counts
- **Compliance Rate**: Overall percentage with color coding (Green >=80%, Amber 50-79%, Red <50%)
- **By Type**: Bar chart showing compliance per document type
- **Per-Teacher Table**: Individual teacher compliance rates

Use this to identify teachers with overdue submissions or types with low compliance.

---

## 4. Enrollment Management

### 4.1 Viewing Applications

**Steps:**
1. Navigate to **Enrollment** from the sidebar
2. View the analytics overview (Total, Pending, Under Review, Approved, Enrolled, Rejected)
3. Use filters to narrow results:
   - **Search**: By name, email, or enrollment number
   - **Status**: All enrollment statuses
   - **Grade Level**: Specific grade
   - **Enrollment Type**: New, Returning, Transferee, SHS, Parent-Assisted
   - **School Year**: Academic year
   - **View Mode**: List (table) or Kanban (board view)

### 4.2 Processing an Application

**Complete Workflow:**

1. **Review Application**
   - Click **View** on any application
   - Review personal information, parents/guardian details
   - Check uploaded documents

2. **Verify Documents**
   - For each document, click **Verify** (green checkmark) or **Reject** (red X)
   - Document statuses: Submitted, Verified, Rejected, Missing
   - **All documents must be verified before you can Approve**

3. **Change Status**
   - From **Pending**: Move to **Under Review** to start processing
   - From **Under Review**: Move to **Pending Requirements** if documents are incomplete
   - From **Under Review**: Move to **Approved** when all documents verified

4. **Assign Section**
   - Click **Set Section** when application is Pending, Under Review, or Approved
   - Select a classroom from the dropdown
   - Click **Assign**

5. **Enroll Student**
   - Click **Enroll Student** (only available when status is Approved)
   - Select a section from the dropdown
   - Optionally enter a parent email to link accounts
   - Click **Enroll**
   - **Important**: Save the student credentials shown (email, temporary password, LRN)

### 4.3 Bulk Actions

1. Check multiple applications in the table
2. Use the bulk actions bar:
   - **Approve All**: Approve all selected
   - **Reject All**: Reject all selected (requires reason)
   - **Enroll All**: Enroll all selected approved applications
   - **Clear**: Deselect all

### 4.4 Exporting Data

- **CSV**: Click CSV button to download filtered applications
- **PDF Report**: Click PDF button to download a summary report

### Enrollment Status Flow

```
Pending → Under Review → Approved → Enrolled
    ↓           ↓
Rejected    Pending Requirements
    ↓           ↓
Cancelled   Rejected
                ↓
            Withdrawn
```

---

## 5. Announcements

### 5.1 Creating an Announcement

**Steps:**
1. Navigate to **Announcements** from the sidebar
2. Click the composer card or **New Announcement**
3. Fill in the form:

| Field | Options | Description |
|-------|---------|-------------|
| Title | Text | Announcement headline |
| Category | General, Academics, Events, Examinations, Guidance, Sports, Emergency, Holiday, System Update | Topic category |
| Priority | Info (Normal), Important, Urgent | Visual urgency indicator |
| Status | Live, Draft | Live publishes immediately |
| Target Audience | All, Students, Teachers, Parents | Who sees this |
| Target Classrooms | Multi-select | Specific sections (optional) |
| Content | Textarea | Full announcement text |
| Is Pinned | Toggle | Pins to top of feed |
| Is Public | Toggle | Visible to non-logged-in users |
| Event Date | Date picker | When the event occurs (optional) |
| End Date | Date picker | When the event ends (optional) |
| Attachments | File upload | Multiple files/images |

4. Click **Publish** (or save as Draft)

### 5.2 Managing Announcements

**On each post, hover to see admin actions:**
- **Pin/Unpin**: Toggle pinning to top of feed
- **Publish**: For draft posts, make them live
- **Archive**: For live posts, hide from feed
- **Edit**: Modify the post
- **Delete**: Permanently remove (with confirmation)

**Bulk Actions:**
- Check multiple posts in the sidebar
- Click **Delete selected** to bulk delete

### 5.3 Announcement Categories and Priority

| Category | When to Use |
|----------|-------------|
| General | School-wide updates |
| Academics | Academic schedules, curriculum changes |
| Events | School events, programs |
| Examinations | Exam schedules, policies |
| Guidance | Counseling, career guidance |
| Sports | Sports events, tryouts |
| Emergency | Urgent safety announcements |
| Holiday | Holiday schedules |
| System Update | Portal maintenance, new features |

| Priority | Visual Indicator |
|----------|------------------|
| Info (Normal) | No special border |
| Important | Orange left border |
| Urgent | Red left border |

---

## 6. Class Management

### 6.1 Creating a Class

**Steps:**
1. Navigate to **Class Management** from the sidebar
2. Select the **Academic Year** from the dropdown
3. Click **Add Class**
4. Fill in:
   - **Grade Level**: Select 7-12
   - **Class/Section Name**: e.g. "Grade 7 - Rizal"
   - **Adviser**: Select a teacher (optional)
5. Click **Save**

### 6.2 Assigning Subjects to a Class

**Steps:**
1. Click **Subjects** on any class row
2. A slide-over panel opens showing assigned subjects
3. Click **Assign**
4. Select a **Subject** from the searchable list
5. Select a **Teacher** from the dropdown
6. Click **Save**

**To Remove a Subject:**
1. Click **Subjects** on the class row
2. Hover over the subject assignment
3. Click **Remove** and confirm

### 6.3 Bulk Enrolling Students

**Steps:**
1. Click **Enroll** on any class row
2. A modal shows all available students not yet enrolled in this class
3. Check the boxes next to students to enroll
4. Use **Select All** to check all students
5. Click **Enroll N Student(s)**

### 6.4 Academic Year Rollover

At the end of each school year, copy classroom structure to the next year:

1. Click **Year Rollover** (admin only)
2. Select **Source Year** (the year to copy FROM)
3. Select **Target Year** (the year to copy TO)
4. Choose options:
   - [x] Copy teacher/adviser assignments (recommended)
   - [ ] Copy subject assignments (optional)
5. Click **Create Classrooms**

**Note:** Students and grades are NOT copied, only classroom structure and assignments.

---

## 7. Subject Management

### 7.1 Adding a Subject

**Steps:**
1. Navigate to **Subjects Hub** from the sidebar
2. Ensure you're on the **Subjects** tab
3. Click **Add Subject**
4. Fill in:
   - **Subject Code**: e.g. "MATH7" (will be uppercased)
   - **Grade Level**: Select 7-12
   - **Subject Name**: e.g. "Mathematics"
   - **Description**: Brief overview (optional)
5. Click **Save**

### 7.2 Assigning Subjects to Sections

**Steps:**
1. Switch to the **Assignments** tab
2. Click **Assign Subject**
3. Fill in:
   - **Section**: Select a classroom (grouped by grade level)
   - **Subject**: Select from the list (grouped by grade level)
   - **Teacher**: Select a staff member
4. Click **Save**

**Note:** Duplicate assignments (same subject to same section) are prevented.

---

## 8. User Management

### Viewing Users
- Navigate to the **People** section from the sidebar
- Use tabs to switch between **Students** and **Teachers/Faculty**
- Search by name or email
- Filter by role

### Account Moderation
- Check **Pending Approvals** on the dashboard
- Review new account requests
- Approve or reject accounts

### User Roles
| Role | Access Level |
|------|-------------|
| Admin | Full system access |
| Staff/Teacher | Teaching tools, compliance, attendance |
| Student | Grades, attendance, announcements |
| Parent | Child's grades, attendance, announcements |

---

## 9. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Cannot log in | Check email/password; ensure account is approved |
| Enrollment tracking shows error | Ensure enrollment number format is correct (ENR-YYYY-XXXXXX) |
| Documents not showing | Verify files were uploaded during submission |
| Compliance types empty | Admin must create types before teachers can submit |
| Announcements not visible | Check if post is set to "Live" and targeting correct audience |
| Section assignment fails | Ensure classroom exists for the correct grade level |
| Year rollover not working | Ensure source and target years are different |

### Getting Help
- Check the **System Health** page for backend status
- Review **Audit Logs** for system activity
- Contact the system administrator for account issues
- Report bugs at: https://github.com/anomalyco/opencode/issues

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
| Refresh dashboard | Click Refresh button |
| Search | Use search bars in each section |
| Bulk select | Check individual boxes or use Select All |

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
