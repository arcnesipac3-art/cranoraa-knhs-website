from django.db import models
from django.utils import timezone

from .user import User
from .academic import Classroom, Subject, ClassroomSubject
from .infrastructure import AcademicYear


class GradingPeriod(models.Model):
    QUARTER_CHOICES = [
        (1, 'Term 1'),
        (2, 'Term 2'),
        (3, 'Term 3'),
    ]

    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('open', 'Open'),
        ('closing_soon', 'Closing Soon'),
        ('closed', 'Closed'),
        ('locked', 'Locked'),
    ]

    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='grading_periods')
    quarter = models.IntegerField(choices=QUARTER_CHOICES)
    start_date = models.DateField()
    submission_deadline = models.DateField()
    grace_period_days = models.IntegerField(default=0, help_text="Extra days after deadline before auto-close")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    is_manually_opened = models.BooleanField(default=False)
    is_manually_closed = models.BooleanField(default=False)
    lock_after_approval = models.BooleanField(default=True)
    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_grading_periods')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['academic_year', 'quarter']
        ordering = ['academic_year', 'quarter']

    def __str__(self):
        return f"{self.academic_year.name} - Q{self.quarter} ({self.get_status_display()})"

    @property
    def effective_deadline(self):
        from datetime import timedelta
        return self.submission_deadline + timedelta(days=self.grace_period_days)

    @property
    def days_remaining(self):
        from datetime import date
        delta = self.effective_deadline - date.today()
        return delta.days

    @property
    def is_active(self):
        return self.status in ('open', 'closing_soon')

    def update_status(self):
        from datetime import date, timedelta
        today = date.today()
        deadline = self.submission_deadline
        effective = self.effective_deadline

        if self.status == 'locked':
            return
        if self.is_manually_closed:
            self.status = 'closed'
        elif self.is_manually_opened:
            if today > effective:
                self.status = 'closed'
            elif today > deadline:
                self.status = 'closing_soon'
            else:
                self.status = 'open'
        else:
            if today < self.start_date:
                self.status = 'scheduled'
            elif today > effective:
                self.status = 'closed'
            elif today > deadline:
                self.status = 'closing_soon'
            elif today >= self.start_date:
                self.status = 'open'
            else:
                self.status = 'scheduled'
        self.save(update_fields=['status'])


class GradeSubmission(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('in_progress', 'In Progress'),
        ('submitted', 'Submitted'),
        ('reviewed', 'Reviewed'),
        ('approved', 'Approved'),
        ('locked', 'Locked'),
    ]

    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='grade_submissions')
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='grade_submissions')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='grade_submissions')
    grading_period = models.ForeignKey(GradingPeriod, on_delete=models.CASCADE, related_name='submissions')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    total_students = models.IntegerField(default=0)
    graded_count = models.IntegerField(default=0)
    missing_count = models.IntegerField(default=0)
    completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)

    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_submissions')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_submissions')

    notes = models.TextField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['teacher', 'classroom', 'subject', 'grading_period']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.teacher.get_full_name()} - {self.classroom.name} - {self.subject.code} - Q{self.grading_period.quarter}"

    def compute_progress(self):
        enrolled = self.classroom.student_enrollments.count()
        from .assignments import Grade
        graded = Grade.objects.filter(
            classroom=self.classroom,
            subject=self.subject,
            quarter=self.grading_period.quarter,
            grade_type='final_grade',
            raw_score__isnull=False,
            academic_year=self.grading_period.academic_year.name,
        ).values('student').distinct().count()

        self.total_students = enrolled
        self.graded_count = graded
        self.missing_count = max(0, enrolled - graded)
        self.completion_percentage = round((graded / enrolled * 100) if enrolled > 0 else 0, 2)
        self.save(update_fields=['total_students', 'graded_count', 'missing_count', 'completion_percentage'])

    def validate_grades(self):
        from .assignments import Grade
        warnings = []
        enrolled = self.classroom.student_enrollments.select_related('student')
        subjects = ClassroomSubject.objects.filter(
            classroom=self.classroom,
            subject=self.subject,
        )

        for enrollment in enrolled:
            student = enrollment.student
            grade = Grade.objects.filter(
                student=student,
                classroom=self.classroom,
                subject=self.subject,
                quarter=self.grading_period.quarter,
                grade_type='final_grade',
                academic_year=self.grading_period.academic_year.name,
            ).first()

            if not grade:
                warnings.append({
                    'student_id': student.id,
                    'student_name': student.get_full_name(),
                    'type': 'missing_final',
                    'message': f'No final grade for {student.get_full_name()}'
                })
            elif grade.raw_score is None:
                warnings.append({
                    'student_id': student.id,
                    'student_name': student.get_full_name(),
                    'type': 'blank_score',
                    'message': f'Blank score for {student.get_full_name()}'
                })

            for cs in subjects:
                for gtype in ['written_work', 'performance_task']:
                    if gtype == 'performance_task' and self.subject.has_components:
                        continue
                    exists = Grade.objects.filter(
                        student=student,
                        classroom=self.classroom,
                        subject=self.subject,
                        quarter=self.grading_period.quarter,
                        grade_type=gtype,
                        academic_year=self.grading_period.academic_year.name,
                    ).exists()
                    if not exists:
                        warnings.append({
                            'student_id': student.id,
                            'student_name': student.get_full_name(),
                            'type': 'missing_assessment',
                            'message': f'Missing {gtype} for {student.get_full_name()}'
                        })

        return warnings


class GradeReopeningRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reopening_requests')
    submission = models.ForeignKey(GradeSubmission, on_delete=models.CASCADE, related_name='reopening_requests')
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_reopening_requests')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewer_notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Reopening: {self.teacher.get_full_name()} - {self.submission} ({self.get_status_display()})"
