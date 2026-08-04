# Compliance System — Phase 1 Guide

## Overview

The compliance system tracks teacher document submissions (Lesson Plans, Class Records, etc.)
per subject and classroom assignment, with admin review workflows and automated reminders.

---

## For Teachers

### My Compliance page (`/my-compliance`)

Your compliance page is grouped by the subjects you teach.
Each card shows one subject + classroom, with the compliance types that apply to it.

**Submitting a document:**
1. Open **My Compliance**
2. Find the subject/classroom card (e.g. *Math — Grade 9-A*)
3. Click **Submit** on the compliance type (e.g. *Lesson Plan*)
4. Drag-and-drop or select your file(s)
5. Click **Upload & Submit**

Your submission goes to *Submitted* status and notifies admins for review.

**Status meanings:**
| Status | Meaning |
|---|---|
| Not submitted | No file uploaded for this period yet |
| Submitted | Uploaded, pending admin review |
| Reviewed | Approved by admin ✅ |
| Rejected | Needs correction — see the rejection remark |
| Overdue | Past the deadline and still not submitted |

**Notifications:**
- 2 days before deadline → *Compliance Reminder*
- Day of deadline → *Compliance Due Today*
- Past deadline → *Compliance Overdue* (sent daily until submitted)

---

## For Admins

### Compliance Hub (`/compliance`)

Four tabs:

| Tab | Purpose |
|---|---|
| **Submissions** | Review, approve, reject individual submissions |
| **Types** | Create/edit compliance types and assign them to subjects |
| **Dashboard** | Analytics — rates by type, subject, teacher; missing list |
| **Legacy** | Assign old submissions (no subject link) to the right classroom/subject |

---

### Compliance Types

Each type has:
- **Frequency** — Weekly / Monthly / Quarterly / Yearly
- **Deadline Day** — Day of the period (e.g. 5 = Friday for weekly, 15 for monthly)
- **Assigned Subjects** — Leave empty → applies to ALL teachers. Select subjects → only those teachers see it.

**Example:**
- *Lesson Plan* → no subjects selected → every teacher sees it
- *Laboratory Report* → Science, Chemistry → only those subject teachers see it

---

### Reviewing Submissions

1. Go to **Submissions** tab
2. Use filters: Status · Type · Teacher · Subject · Classroom
3. Click **Review** on a row
4. See uploaded files → Preview or download
5. Choose **Approve** or **Reject** (rejection requires remarks)
6. Teacher receives a notification instantly

**Bulk review:** Check multiple rows → *Approve All* or *Reject All*

---

### Dashboard

**Filters:** Academic Year · Semester · Subject

**Sections:**
- **Overview** — compliance rate per type (bar chart)
- **By Subject** — rate per subject with overdue count
- **By Teacher** — table with per-teacher breakdown
- **Missing** — searchable list of everything not yet submitted, sorted by days overdue

**Trigger Reminders button:**
- *Dry Run* — preview what would be sent without sending
- *Send Now* — immediately sends notifications to all teachers with pending/overdue items

---

### Legacy Submissions

Old submissions (created before the subject-assignment system) appear here.

1. Go to **Legacy** tab
2. For each row, select the correct *Classroom — Subject* from the dropdown
3. Click **Assign** (or use **Assign N Selected** for bulk)

Once assigned, the submission appears correctly in teacher dashboards and analytics.

---

## Cron / Scheduled Reminders

Reminders are sent automatically when you run:

```bash
python manage.py send_compliance_reminders
```

Schedule this daily at 7 AM (weekdays). See `backend/COMPLIANCE_CRON_SETUP.md` for
cron, Celery Beat, and Render.com setup instructions.

---

## API Reference (key endpoints)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/compliance/my-status/` | Teacher's compliance grouped by assignment |
| GET | `/api/v1/compliance/dashboard/` | Admin analytics (add `?subject_id=X` to filter) |
| GET | `/api/v1/compliance/submissions/` | List submissions (filters: status, teacher_id, subject_id, classroom_id) |
| POST | `/api/v1/compliance/submissions/{id}/submit/` | Teacher submits for review |
| POST | `/api/v1/compliance/submissions/{id}/review/` | Admin approves/rejects |
| POST | `/api/v1/compliance/submissions/bulk-review/` | Bulk approve/reject |
| GET | `/api/v1/compliance/audit-trail/?submission_id=X` | Submission history log |
| GET | `/api/v1/compliance/legacy/` | Submissions with no subject assignment |
| POST | `/api/v1/compliance/bulk-assign/` | Assign legacy submissions |
| POST | `/api/v1/compliance/trigger-reminders/` | Manual reminder trigger (admin) |
| POST | `/api/v1/compliance/check-overdue/` | Mark overdue submissions (admin) |

---

## Database Migrations

Run after deploying:

```bash
python manage.py migrate
```

New tables added in Phase 1:
- `compliance_type_subject_assignment` — links types to subjects
- `compliance_audit_log` — tracks all compliance actions
- `compliance_submission.classroom_subject_id` — links submissions to teaching assignments

---

## Deployment Checklist

- [ ] Run `python manage.py migrate`
- [ ] Run `python manage.py seed_compliance_types` (if first deploy)
- [ ] Set up cron for `send_compliance_reminders` (see `COMPLIANCE_CRON_SETUP.md`)
- [ ] Notify teachers of the new subject-grouped compliance page
- [ ] Admin: visit Legacy tab and assign any old submissions
