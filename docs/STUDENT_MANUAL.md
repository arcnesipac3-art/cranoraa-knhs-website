# KNHS Student Portal — User Manual

A complete guide for students using the **Cranoraa National High School** online portal.

---

## Table of Contents

1. [Logging In](#1-logging-in)
2. [Dashboard](#2-dashboard)
3. [My Classes](#3-my-classes)
4. [My Schedule](#4-my-schedule)
5. [Attendance](#5-attendance)
6. [Grades & Report Card](#6-grades--report-card)
7. [Quizzes](#7-quizzes)
8. [Announcements](#8-announcements)
9. [Communication Center (Chat)](#9-communication-center-chat)
10. [Calendar](#10-calendar)
11. [Notifications](#11-notifications)
12. [Profile & Settings](#12-profile--settings)
13. [Enrollment (New Students)](#13-enrollment-new-students)
14. [Tracking Your Enrollment](#14-tracking-your-enrollment)
15. [Search & Navigation](#15-search--navigation)
16. [Troubleshooting & FAQ](#16-troubleshooting--faq)

---

## 1. Logging In

1. Open your browser and go to the school portal URL.
2. Click **Login** or go to the login page.
3. Enter your **Student ID / LRN** (12-digit number) and your **password**.
4. Select **Student** as your role if prompted.
5. Click **Log In**.

> **First-time login:** Your temporary password was provided during enrollment. You will be asked to change it immediately after your first login.

> **Forgot password?** Click **"Forgot Password?"** on the login page and follow the instructions, or contact your administrator.

> **Account locked?** After 5 failed login attempts, your account is locked for 15 minutes. Wait and try again, or contact the admin.

---

## 2. Dashboard

**Route:** `/dashboard`

When you log in, you land on your **Dashboard** — a quick overview of everything you need.

### What You See

| Section | What It Shows |
|---|---|
| **Summary Cards** | Enrolled subjects count, grade average (%), attendance rate (%), pending tasks |
| **Today's Schedule** | Your classes for today with time, subject, and room — the current period is highlighted in green |
| **Grade Radar Chart** | A visual chart showing your performance across subjects |
| **Recent Activity** | Latest notifications and grade updates |
| **Quick Links** | Shortcuts to My Classes, My Schedule, Grades, Attendance |

### Tips
- Click any class in **Today's Schedule** to go directly to that class page.
- Check the dashboard daily to stay on top of your schedule and grades.

---

## 3. My Classes

**Route:** `/my-classes`

This is your virtual classroom — organized like Google Classroom with multiple tabs for each subject/section.

### Tabs

#### Stream (Class Feed)
- View announcements posted by your teachers for this class.
- Read comments and replies from classmates.
- See file attachments (images, documents).
- Teachers post updates, reminders, and class materials here.

#### Materials (Learning Resources)
- Browse learning materials: DLPs, modules, worksheets, presentations.
- Materials are organized by **quarter** and **week**.
- Use the search bar to find specific materials.
- Click on a material to preview it inline or download it.

#### Grades
- View your grades for each subject across all quarters.
- See **semester averages** (1st and 2nd semester).
- See your **overall average** and **performance level** (Outstanding, Very Satisfactory, etc.).
- A radar chart shows your performance across subjects.
- Use the quarter filter to focus on a specific quarter.

#### Attendance
- **Calendar view:** Monthly calendar with color-coded dots (green = present, red = absent, amber = late, blue = excused).
- **List view:** Chronological list of attendance records grouped by date.
- Monthly summary shows your present, absent, late, excused counts and attendance rate.

#### People
- View a list of your classmates and teachers in this section.

### How to Use
1. Go to **My Classes** from the sidebar.
2. Select the class/subject you want to view from the dropdown or cards.
3. Click through the tabs (Stream, Materials, Grades, Attendance, People) to navigate.

---

## 4. My Schedule

**Route:** `/my-schedule`

A weekly timetable showing all your classes.

### What You See
- A **grid layout** with days of the week on one axis and time slots on the other.
- Each cell shows the **subject name**, **room**, and **teacher**.
- The **current day** column is highlighted.
- The **current period** pulses with a green indicator.

### Tips
- Check your schedule at the start of each day to know where to go.
- The schedule updates automatically — no refresh needed.

---

## 5. Attendance

**Route:** `/student-attendance`

A dedicated page to view and track your attendance records.

### Calendar View
- Monthly calendar with color-coded days:
  - **Green** = Present
  - **Amber** = Late
  - **Red** = Absent
  - **Blue** = Excused
- Click on a day to see the detailed record.

### List View
- Chronological list of all attendance records.
- Each record shows: **date**, **status**, **remarks**, **subject**.

### Monthly Stats
- **Present count**
- **Absent count**
- **Late count**
- **Excused count**
- **Overall attendance rate (%)**

### How to Check
1. Go to **Attendance** in the sidebar.
2. Use the **date range filter** to narrow down the period.
3. Switch between **Calendar** and **List** views using the toggle.

---

## 6. Grades & Report Card

### Student Grade View
**Access:** Within My Classes → Grades tab, or `/my-classes?view=grades`

- View grades for each subject broken down by **Quarter 1, 2, 3, 4**.
- See **semester averages** (1st semester, 2nd semester).
- See your **overall average** across all subjects.
- Color-coded **performance level badges**:
  - **Outstanding** (90–100)
  - **Very Satisfactory** (85–89)
  - **Satisfactory** (80–84)
  - **Fairly Satisfactory** (75–79)
  - **Did Not Meet Expectations** (below 75)
- Radar chart visualizes your performance across subjects.
- Use the **quarter filter** to focus on a specific quarter.

### SF9 Report Card
**Route:** `/school-forms/sf9`

- View your official **DepEd SF9 Report Card**.
- Shows student info (name, LRN, grade, section, school year).
- Displays **quarterly grades** for each subject.
- Includes **attendance summary** (days present, absent, tardy).
- Includes **core values assessment**.
- Click **Download PDF** to save a copy of your report card.

---

## 7. Quizzes

**Access:** Within My Classes, or navigate to quizzes section.

### Quiz Listing
- Browse available quizzes with status badges:
  - **Available Now** — you can take this quiz
  - **Upcoming** — quiz opens at a later date
  - **Closed** — quiz is no longer available
  - **Passed / Failed** — results from completed quizzes
- Each quiz card shows: question count, total points, time limit, attempts used/max, passing score.
- Your **best score** is displayed if you've attempted the quiz before.

### Taking a Quiz
1. Click **Start Quiz** to begin.
2. Read the quiz info screen (instructions, time limit, number of questions).
3. Answer questions using the navigation sidebar or **Next/Previous** buttons.
4. **Mark for Review** — flag questions you want to come back to.
5. Answers are **autosaved every 15 seconds** — no need to worry about losing progress.
6. When done, click **Submit** and confirm.

### Question Types
| Type | How to Answer |
|---|---|
| **Multiple Choice** | Click one option |
| **True/False** | Select True or False |
| **Identification** | Type your answer in the text field |
| **Essay** | Type your answer in the text area |

### During the Quiz
- A **countdown timer** shows remaining time. The timer turns orange/red as time runs low.
- If the timer reaches zero, your quiz is **automatically submitted**.
- A **confirmation dialog** appears before submission showing unanswered and marked questions.
- The quiz monitors for tab switching, window blur, and other integrity events (these are logged but do not auto-submit).

### After Submission
- You'll see your **score** and whether you **passed or failed**.
- Review your answers: correct answers are highlighted in green, incorrect in red.
- Your best score is recorded for future reference.

---

## 8. Announcements

**Route:** `/announcements`

A social-media-style feed for school and class announcements.

### Features
- **Category filters:** General, Academic, Events, etc.
- **Media carousel:** View images/videos attached to announcements.
- **Reactions:** Like, Heart, Celebrate, Insightful.
- **Comments:** View and post comments; reply to comments in threads.
- **Bookmark:** Save announcements for later reference.
- **Pinned posts:** Important announcements appear at the top.

### How to Use
1. Go to **Announcements** in the sidebar.
2. Use category filters to find relevant posts.
3. Click an announcement to expand it and see full details.
4. React, comment, or bookmark to engage.

---

## 9. Communication Center (Chat)

**Route:** `/communication-center`

Real-time messaging for one-on-one and group conversations.

### Features
- **Direct Messages:** Chat privately with any school member.
- **Group Chats:** Create group conversations with multiple people.
- **File Sharing:** Drag-and-drop or browse to attach files (images, documents, audio, video).
- **Read Receipts:** See when your messages have been read.
- **Online Status:** See who's currently online (green dot).
- **Search:** Search across all your conversations.
- **Unread Badges:** See unread message counts per conversation.
- **Typing Indicators:** See when someone is typing a reply.

### How to Start a Conversation
1. Go to **Communication Center** in the sidebar.
2. Click the **+** or **New Chat** button.
3. Search for the person or select group members.
4. Type your message and press **Enter** or click **Send**.

### How to Create a Group
1. Click **New Group** or **Create Group**.
2. Enter a group name and optional description.
3. Select members from the list.
4. Click **Create**.

---

## 10. Calendar

**Route:** `/portal-calendar`

A monthly view of school events, exams, holidays, and activities.

### Features
- **Monthly grid:** See all events on their respective dates.
- **Event categories:** Color-coded by type (Academic, Sports, Cultural, etc.).
- **Event details:** Click any event to see full info (title, description, time, location).
- **RSVP:** Mark whether you're Going, Not Going, or Maybe.
- **Category filters:** Toggle visibility of specific event types.
- **Mini calendar:** Sidebar mini-calendar for quick date navigation.
- **Today button:** Jump to today's date.

### How to Use
1. Go to **Calendar** in the sidebar.
2. Navigate months using the **<** and **>** arrows.
3. Click any event to see details and RSVP.

---

## 11. Notifications

**Route:** `/notifications`

Stay updated on grades, attendance, messages, and system alerts.

### Features
- **Notification list:** All your notifications with tabs (All / Unread).
- **Mark read/unread:** Toggle individual notification status.
- **Mark all read:** Batch mark all as read.
- **Delete:** Remove individual notifications.
- **Push notifications:** Enable browser push notifications to get alerts even when the tab is closed.
- **Notification preferences:** Configure which types of notifications you receive via push, in-app, or email.

### Notification Types
| Type | Examples |
|---|---|
| **Announcement** | New class/school announcements |
| **Grade** | Grade posted, grade updated |
| **Attendance** | Absence alert, late mark |
| **Fee** | Fee due, payment received |
| **Message** | New chat message |
| **System** | Account approval, maintenance notice |

### How to Enable Push Notifications
1. Go to **Notifications**.
2. Click the **bell icon** or **settings gear**.
3. Enable **Push Notifications** in your browser when prompted.
4. Configure which notification types you want via each channel (push, in-app, email).

---

## 12. Profile & Settings

### Profile Page
**Route:** `/profile`

View and edit your personal information.

#### What You See
- **Profile header:** Your name, role badge, email, LRN, and profile picture.
- **Personal info:** Name (first/middle/last), sex, date of birth, age, nationality.
- **Family details:** Father's name, mother's name.
- **Contact info:** Email, phone number, address, emergency contact.
- **Academic record:** LRN, grade level.

#### How to Edit
1. Go to **Profile** in the sidebar.
2. Click **Edit** or the edit button.
3. Update your information.
4. Click **Save**.

#### Profile Picture
1. Click on your profile picture (or the camera icon).
2. Upload a new photo (JPEG, PNG, GIF, or WebP, max 5MB).
3. Crop if needed and confirm.

### Settings Page
**Route:** `/settings`

Manage your account preferences.

#### Change Password
1. Go to **Settings**.
2. Scroll to **Password** section.
3. Enter your **current password**.
4. Enter your **new password** (must meet strength requirements).
5. Confirm the new password.
6. Click **Change Password**.

#### Notification Preferences
1. Go to **Settings**.
2. Toggle email notification preferences on/off.

---

## 13. Enrollment (New Students)

**Route:** `/enroll`

A 7-step wizard for new students to apply for enrollment.

### Steps

#### Step 1: Enrollment Type
Select one:
- **New Student** — first time enrolling
- **Returning** — previously enrolled at this school
- **Transferee** — transferring from another school
- **SHS Applicant** — applying for Senior High School
- **Parent-Assisted** — parent completing the form on behalf of the student

#### Step 2: Personal Information
- First name, Middle name, Last name
- Sex (Male/Female)
- Date of birth
- Place of birth
- Nationality (default: Filipino)
- Religion

#### Step 3: Address
- Street address
- Barangay
- City/Municipality
- Province
- Zip code

#### Step 4: Parent/Guardian Information
- Father's name and contact
- Mother's name and contact
- Guardian name and contact (if applicable)
- Guardian relationship

#### Step 5: Academic Information
- **Grade level** you're applying for
- **Strand** (for SHS applicants)
- **School year**
- **LRN** (12-digit Learner Reference Number)
  - If you don't have an LRN, check **"No LRN"** and provide a reason
- **Previous school** attended
- **ALS** checkbox (if applicable)

#### Step 6: Document Upload
Upload the required documents:
| Document | Required For |
|---|---|
| PSA Birth Certificate | All students |
| Report Card / Form 138 | All students |
| Certificate of Completion | Elementary graduates |
| Good Moral Certificate | Transferees |
| ID Picture | All students |
| Last School Attended Certificate | Transferees |

- Drag and drop files or click to browse.
- Accepted formats: PDF, JPEG, PNG.
- Max file size: 5MB per document.

#### Step 7: Review & Submit
- Review all your information.
- Check the declaration checkbox.
- Click **Submit Application**.

### After Submission
- You'll receive an **enrollment reference number** (e.g., ENR-2025-XXXX).
- Save this number — you'll need it to track your application status.
- You'll be redirected to the tracking page.

### Draft Save
- Your form data is **automatically saved to your browser** (localStorage).
- If you close the browser and come back, you can continue where you left off.

---

## 14. Tracking Your Enrollment

**Route:** `/track-enrollment`

Check the status of your enrollment application.

### How to Track
1. Go to **Track Enrollment** or click the link from your enrollment confirmation.
2. Enter your **enrollment reference number** and **email address**.
3. Click **Track**.

### Status Timeline
Your application moves through these stages:

```
Pending → Under Review → Approved → Enrolled
                  ↓
         Pending Requirements
                  ↓
            Rejected
```

| Status | Meaning |
|---|---|
| **Pending** | Application submitted, awaiting review |
| **Under Review** | Admin is reviewing your application |
| **Pending Requirements** | Additional documents needed |
| **Approved** | Application approved, waiting for enrollment |
| **Rejected** | Application denied (see remarks for reason) |
| **Enrolled** | Successfully enrolled — you can now log in |

### What You Can See
- Current status with visual timeline.
- Admin remarks on your application.
- Status of each uploaded document (verified, pending, rejected).
- Complete status history with dates.

---

## 15. Search & Navigation

### Command Palette
- Press **Ctrl+K** (or **Cmd+K** on Mac) anywhere to open the global search.
- Type to search for pages, features, or actions.
- Results are filtered based on your role (student sees student-relevant items).

### Sidebar Navigation
- The left sidebar shows all available pages organized by category.
- Click any item to navigate.
- On mobile, tap the **hamburger menu** (☰) to open the sidebar.

### Breadcrumbs
- Breadcrumb navigation appears at the top of each page showing your current location.
- Click any breadcrumb to go back to a parent page.

---

## 16. Troubleshooting & FAQ

### Common Issues

**Q: I can't log in.**
- Double-check your Student ID/LRN (12 digits) and password.
- Make sure Caps Lock is off.
- If locked out, wait 15 minutes and try again.
- Contact the admin if the problem persists.

**Q: I forgot my password.**
- Click **"Forgot Password?"** on the login page.
- Enter your email to receive a reset link.
- Or contact the admin to reset your password.

**Q: My quiz timed out before I finished.**
- The quiz auto-submits when the timer reaches zero.
- Your answers up to that point are saved and graded.
- You may have remaining attempts if the quiz allows multiple tries.

**Q: I can't upload documents during enrollment.**
- Make sure files are under 5MB each.
- Accepted formats: PDF, JPEG, PNG only.
- Try a different browser if the upload keeps failing.

**Q: I don't see my grades.**
- Grades may not have been posted yet by your teacher.
- Check the Grades tab within your class page.
- Contact your teacher if grades are missing after the grading period.

**Q: How do I enable notifications?**
- Go to **Notifications** → click the settings icon.
- Enable push notifications in your browser when prompted.
- Configure which types of alerts you want via push, in-app, or email.

**Q: The page looks broken on my phone.**
- Try refreshing the page (pull down or Ctrl+F5).
- Make sure your browser is up to date.
- Clear your browser cache if issues persist.

### Getting Help
- **Technical issues:** Contact the school admin or IT support.
- **Academic questions:** Contact your teacher or class adviser.
- **Account issues:** Visit the school office for account-related concerns.

---

*Last updated: August 2025 — Cranoraa National High School*
