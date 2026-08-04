# Implementation Plan: Phase 1 - Compliance System Integration

## Problem Statement
The compliance system currently operates in isolation from the core school management features. Teachers submit documents (DLPs, reports) at a global level without connection to their specific teaching assignments (subjects/classrooms). Additionally, there's no proactive reminder system, and the admin dashboard lacks actionable insights for monitoring compliance across subjects and teachers.

## Requirements

### Core Requirements
1. **ClassroomSubject-Specific Compliance**: Link compliance submissions to specific teaching assignments (subject + classroom)
2. **Automated Notification System**: Send deadline reminders and overdue alerts to teachers
3. **Enhanced Admin Dashboard**: Visual analytics showing compliance rates by subject, teacher, and period
4. **Backward Compatibility**: Maintain support for existing global compliance submissions
5. **Granular Tracking**: Admin can see which specific subjects/classrooms have missing compliance
6. **Teacher Dashboard**: Teachers see compliance status per subject they teach
7. **Audit Trail**: Track all compliance-related actions (submissions, reviews, reminders sent)

### Technical Context
**Backend:**
- Models: `ComplianceType`, `ComplianceSubmission`, `ComplianceFile`
- Existing relationships: Teacher → Submission → Type
- Available models: `ClassroomSubject`, `Schedule`, `Notification`, `AcademicYear`, `Semester`
- Celery/scheduled tasks available for periodic jobs

**Frontend:**
- `ComplianceHub.jsx` (Admin): Tabs for Types, Submissions, Dashboard
- `TeacherCompliancePage.jsx` (Teachers): List of compliance types with submission status
- Existing UI components: Card, Badge, Modal, Chart components available

## Background

### Current System Analysis

**What Works:**
- Teachers can submit files per compliance type (weekly/monthly/quarterly)
- Admin can review and approve/reject submissions
- Files stored in Supabase with proper metadata
- Status workflow (Draft → Submitted → Reviewed/Rejected/Overdue)

**What's Missing:**
- No link between submissions and teaching assignments
- Teachers teaching 3 subjects submit ONE submission per type (should be 3)
- No proactive deadline notifications
- Admin dashboard lacks actionable insights
- No way to see "Which teacher hasn't submitted Math DLP for Grade 9-A?"

**Integration Points:**
- `ClassroomSubject`: Links teacher + subject + classroom
- `Schedule`: Links teaching periods to specific times
- `Notification`: System for alerts (already integrated)
- `AcademicYear` + `Semester`: Existing filtering mechanism

## Proposed Solution

### High-Level Architecture

```
Enhanced Flow:
1. Teacher is assigned to subjects via ClassroomSubject
2. Compliance types are assigned to specific subjects (optional) or all teachers
3. Teacher sees compliance dashboard: one card per subject assignment
4. Teacher submits DLP for "Math - Grade 9-A" separately from "Math - Grade 9-B"
5. Scheduled job runs daily: checks deadlines, sends notifications
6. Admin dashboard shows matrix: Teacher × Subject × Compliance Status
7. Admin can drill down: "Show me all missing Math DLPs this week"
```

### Data Model Changes

```python
# New model for subject-specific compliance requirements
class ComplianceTypeSubjectAssignment(models.Model):
    compliance_type = models.ForeignKey(ComplianceType, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    is_required = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['compliance_type', 'subject']
    
# Enhanced ComplianceSubmission
class ComplianceSubmission(models.Model):
    # ... existing fields
    classroom_subject = models.ForeignKey(
        ClassroomSubject, 
        null=True, blank=True,
        on_delete=models.CASCADE
    )  # NEW: If null = old global submission
    
# New model for audit trail
class ComplianceAuditLog(models.Model):
    submission = models.ForeignKey(ComplianceSubmission, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=20)  # create, submit, approve, reject, reminder_sent
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### Component Architecture

```
Frontend Components:

TeacherCompliancePage.jsx (Enhanced)
├── ComplianceOverviewCard (new) - Summary stats per teacher
├── SubjectComplianceCard (new) - Per-subject compliance list
│   ├── ComplianceTypeCard - Existing, enhanced with subject context
│   └── SubmissionHistoryList - Existing
└── UploadModal - Existing, enhanced with subject selection

ComplianceHub.jsx (Admin - Enhanced)
├── Dashboard Tab (enhanced)
│   ├── ComplianceRateChart (new) - By subject/teacher
│   ├── TeacherComplianceMatrix (new) - Table view
│   └── RecentActivityFeed (new) - Latest submissions/reviews
├── Submissions Tab (enhanced)
│   └── Filters: Subject, Classroom, Status
└── Types Tab (existing)
    └── Enhanced: Subject assignment management
```

## Task Breakdown

[Full task details included in the complete document above - Tasks 1-10 covering:
1. Subject Assignment to Compliance Types
2. Link Submissions to ClassroomSubject
3. Enhanced Teacher Dashboard
4. Notification System
5. Admin Dashboard
6. Subject Filters
7. Type Management UI
8. Migration Strategy
9. Audit Trail
10. Documentation and Deployment]

## Technical Notes

### Database Schema Summary

```sql
-- New table
CREATE TABLE compliance_type_subject_assignment (
    id SERIAL PRIMARY KEY,
    compliance_type_id INT REFERENCES compliance_type(id),
    subject_id INT REFERENCES subject(id),
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(compliance_type_id, subject_id)
);

-- Modified table
ALTER TABLE compliance_submission 
ADD COLUMN classroom_subject_id INT REFERENCES classroom_subject(id);

-- New index
CREATE INDEX idx_compliance_submission_classroom_subject 
ON compliance_submission(classroom_subject_id);

-- New table
CREATE TABLE compliance_audit_log (
    id SERIAL PRIMARY KEY,
    submission_id INT REFERENCES compliance_submission(id),
    user_id INT REFERENCES auth_user(id),
    action VARCHAR(20),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoint Summary

```
Enhanced Endpoints:

GET /api/compliance/my-compliance-status/
    → Returns grouped by classroom_subject
    
GET /api/compliance/dashboard/
    → Returns stats by subject, teacher matrix, missing submissions
    
GET /api/compliance/submissions/
    → Supports subject_id, classroom_id filters
    
POST /api/compliance/bulk_assign_classroom_subject/
    → Bulk assign legacy submissions
    
POST /api/compliance/check_overdue/
    → Manual trigger for overdue check (admin only)

Management Command:
python manage.py send_compliance_reminders
    → Run daily via cron/celery beat
```

### Performance Considerations

- **Indexes**: Added on `classroom_subject_id`, `status`, `period_number`
- **Caching**: Consider caching dashboard stats (invalidate on submission)
- **Query optimization**: Use `select_related` and `prefetch_related`
- **Background jobs**: Deadline checks run async, don't block requests

## Success Criteria

✅ **Task 1-3 Complete**: Teachers see subject-grouped compliance, can submit per assignment
✅ **Task 4 Complete**: Automated reminders sending daily without errors
✅ **Task 5-6 Complete**: Admin dashboard shows actionable insights with filters
✅ **Task 7-8 Complete**: Subject assignment working, legacy data migrated
✅ **Task 9-10 Complete**: Audit trail logging, documentation published

**Metrics to Track:**
- Compliance submission rate (before vs after)
- Average time to submit after reminder
- Admin time spent monitoring (should decrease)
- Teacher satisfaction (survey)

---

**Ready to implement?** Start with Task 1 (Subject Assignment) as it provides the foundation for all other features. Each task builds incrementally and delivers working functionality.
