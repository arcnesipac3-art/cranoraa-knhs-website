from django.db import models
from django.utils import timezone as dj_timezone

from .user import User
from .academic import Classroom, Subject


class Attendance(models.Model):
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('excused', 'Excused'),
        ('school_activity', 'School Activity'),
        ('medical_leave', 'Medical Leave'),
    ]

    WORKFLOW_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('locked', 'Locked'),
    ]

    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='attendances')
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present')
    remarks = models.TextField(blank=True, null=True)
    marked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='marked_attendances')
    schedule = models.ForeignKey('Schedule', on_delete=models.SET_NULL, null=True, blank=True, related_name='attendances',
        help_text="Links attendance to a specific schedule period. Null = class-level (adviser) attendance.")
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='attendances',
        help_text="Denormalized from schedule for quick queries.")
    time_slot = models.ForeignKey('TimeSlot', on_delete=models.SET_NULL, null=True, blank=True, related_name='attendances',
        help_text="Denormalized from schedule for quick queries.")

    arrival_time = models.TimeField(null=True, blank=True, help_text="Actual arrival time (for late tracking)")
    departure_time = models.TimeField(null=True, blank=True, help_text="Actual departure time (for early departure)")
    minutes_late = models.PositiveIntegerField(default=0, help_text="Minutes late (auto-calculated if arrival_time set)")

    has_excuse = models.BooleanField(default=False)
    excuse_verified = models.BooleanField(default=False, help_text="Set to True once admin/teacher verifies the excuse")

    workflow_status = models.CharField(max_length=20, choices=WORKFLOW_CHOICES, default='draft',
        help_text="Tracks attendance lifecycle: draft → submitted → locked")
    submitted_at = models.DateTimeField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'classroom', 'date'],
                condition=models.Q(schedule__isnull=True),
                name='unique_class_level_attendance'
            ),
            models.UniqueConstraint(
                fields=['student', 'schedule', 'date'],
                condition=models.Q(schedule__isnull=False),
                name='unique_schedule_attendance'
            ),
        ]
        ordering = ['-date', 'student__username']
        indexes = [
            models.Index(fields=['date', 'classroom'], name='idx_attendance_date_classroom'),
            models.Index(fields=['workflow_status'], name='idx_attendance_workflow'),
        ]

    def __str__(self):
        scope = f" [{self.subject.code}]" if self.subject else ""
        return f"{self.student.username} - {self.date} - {self.status}{scope}"

    def save(self, *args, **kwargs):
        if self.arrival_time and self.time_slot and self.status == 'late':
            slot_start = self.time_slot.start_time
            delta_minutes = (self.arrival_time.hour * 60 + self.arrival_time.minute) - (slot_start.hour * 60 + slot_start.minute)
            self.minutes_late = max(0, delta_minutes)
        if self.status == 'excused':
            self.has_excuse = True
        super().save(*args, **kwargs)


class AttendanceDeadline(models.Model):
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='attendance_deadlines')
    date = models.DateField()
    open_time = models.TimeField(default='07:00', help_text="Time attendance becomes available")
    deadline_minutes = models.PositiveIntegerField(default=30,
        help_text="Minutes after class start to submit attendance")
    lock_minutes = models.PositiveIntegerField(default=60,
        help_text="Minutes after class start to auto-lock attendance")
    is_locked = models.BooleanField(default=False)
    locked_at = models.DateTimeField(null=True, blank=True)
    locked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['classroom', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"Deadline for {self.classroom.name} on {self.date}"


class AttendanceAuditLog(models.Model):
    ACTION_CHOICES = [
        ('create', 'Created'),
        ('update', 'Updated'),
        ('submit', 'Submitted'),
        ('reopen', 'Reopened'),
        ('lock', 'Locked'),
        ('bulk_action', 'Bulk Action'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='attendance_audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    attendance = models.ForeignKey(Attendance, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    classroom = models.ForeignKey(Classroom, on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateField(null=True, blank=True)
    previous_status = models.CharField(max_length=20, blank=True, null=True)
    new_status = models.CharField(max_length=20, blank=True, null=True)
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['classroom', 'date'], name='idx_audit_classroom_date'),
        ]

    def __str__(self):
        return f"{self.user} - {self.action} - {self.date}"


class AbsenceExcuse(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='absence_excuses')
    attendance = models.ForeignKey(Attendance, on_delete=models.CASCADE, related_name='excuses')
    reason = models.TextField()
    document_url = models.URLField(max_length=1000, null=True, blank=True, help_text="Supabase Storage URL for supporting document")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_excuses')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewer_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Excuse for {self.student.username} on {self.attendance.date} - {self.status}"


class SchoolCalendar(models.Model):
    TYPE_CHOICES = [
        ('holiday', 'Holiday'),
        ('weather', 'Weather Disruption'),
        ('break', 'School Break'),
        ('other', 'Other'),
    ]
    date = models.DateField(unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='holiday')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_holidays')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.get_type_display()}: {self.title} ({self.date})"
