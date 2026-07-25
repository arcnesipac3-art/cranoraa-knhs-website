from django.db import models
from django.utils import timezone

from .user import User
from .academic import Classroom, Subject, SystemSetting


class Assignment(models.Model):
    ASSIGNMENT_TYPE_CHOICES = [
        ('homework', 'Homework'),
        ('quiz', 'Quiz'),
        ('exam', 'Exam'),
        ('project', 'Project'),
        ('performance_task', 'Performance Task'),
        ('laboratory', 'Laboratory'),
        ('activity', 'Activity'),
        ('other', 'Other'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='assignments')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='assignments')
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_assignments')

    assignment_type = models.CharField(max_length=20, choices=ASSIGNMENT_TYPE_CHOICES, default='homework')
    points = models.IntegerField(default=100)
    percentage_weight = models.DecimalField(max_digits=5, decimal_places=2, default=0,
        help_text="Weight of this assignment in the grade component (0 = use all equally)")

    file = models.URLField(max_length=1000, null=True, blank=True, help_text="Supabase Storage URL")
    original_filename = models.CharField(max_length=255, blank=True)
    file_size_bytes = models.PositiveIntegerField(null=True, blank=True)

    due_date = models.DateTimeField()
    is_published = models.BooleanField(default=True, help_text="Draft assignments are hidden from students")
    publish_at = models.DateTimeField(null=True, blank=True, help_text="Schedule future publication")

    allow_late_submissions = models.BooleanField(default=True)
    max_late_submissions = models.IntegerField(default=0, help_text="0 = unlimited, N = max N late submissions allowed per student")

    grade_component = models.CharField(max_length=30, blank=True, default='',
        choices=[('', 'Not linked'), ('written_work', 'Written Work'), ('performance_task', 'Performance Task'), ('quarterly_assessment', 'Quarterly Assessment')],
        help_text="Link this assignment to a grade component for auto-grade propagation")

    is_template = models.BooleanField(default=False, help_text="Template assignments are reusable")
    template_name = models.CharField(max_length=200, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-due_date']

    def __str__(self):
        return f"{self.title} - {self.classroom.name}"

    @property
    def is_visible_to_students(self):
        if not self.is_published:
            return False
        if self.publish_at and self.publish_at > timezone.now():
            return False
        return True


class Submission(models.Model):
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='submissions')
    file = models.URLField(max_length=1000, help_text="Supabase Storage URL")
    original_filename = models.CharField(max_length=255, blank=True)
    file_size_bytes = models.PositiveIntegerField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    grade = models.IntegerField(null=True, blank=True)
    feedback = models.TextField(blank=True, null=True)
    is_late = models.BooleanField(default=False)
    graded_at = models.DateTimeField(null=True, blank=True)
    graded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='graded_submissions')

    class Meta:
        unique_together = ['assignment', 'student']
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.student.username} - {self.assignment.title}"

    def save(self, *args, **kwargs):
        if not self.pk:
            if timezone.now() > self.assignment.due_date:
                self.is_late = True
        super().save(*args, **kwargs)


class Grade(models.Model):
    GRADE_TYPE_CHOICES = [
        ('written_work', 'Written Work'),
        ('performance_task', 'Performance Task'),
        ('quarterly_assessment', 'Quarterly Assessment'),
        ('final_grade', 'Final Grade'),
    ]

    COMPONENT_CHOICES = [
        ('', 'None'),
        ('music_arts', 'Music and Arts'),
        ('pe_health', 'Physical Education and Health'),
    ]

    TERM_CHOICES = [
        (1, 'Term 1'),
        (2, 'Term 2'),
        (3, 'Term 3'),
        (4, 'Term 4 (Legacy)'),
    ]

    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='subject_grades')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='subject_grades')
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='subject_grades', null=True, blank=True)
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_subject_grades')

    grade_type = models.CharField(max_length=30, choices=GRADE_TYPE_CHOICES, default='written_work')
    component = models.CharField(max_length=20, choices=COMPONENT_CHOICES, blank=True, default='',
        help_text="Sub-component for composite subjects like MAPEH (music_arts or pe_health)")
    quarter = models.IntegerField(choices=TERM_CHOICES)

    raw_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_score = models.DecimalField(max_digits=5, decimal_places=2, default=100)

    final_grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    remarks = models.TextField(blank=True, null=True)
    computed_remarks = models.CharField(max_length=50, blank=True, null=True)

    academic_year = models.CharField(max_length=20, default='2025-2026')
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_locked = models.BooleanField(default=False, help_text="Prevents further edits after submission")

    class Meta:
        unique_together = ['student', 'subject', 'component', 'grade_type', 'quarter', 'academic_year']
        ordering = ['-academic_year', '-quarter', 'subject__name', 'grade_type']

    def __str__(self):
        comp = f" ({self.get_component_display()})" if self.component else ''
        return f"{self.student.username} - {self.subject.code}{comp} - Q{self.quarter} ({self.academic_year})"

    def save(self, *args, **kwargs):
        if self.raw_score is not None:
            self.compute_remarks()
        super().save(*args, **kwargs)

    def compute_remarks(self):
        passing = float(SystemSetting.get_settings().passing_grade)
        if self.raw_score is None:
            self.computed_remarks = "No Grade"
        elif self.raw_score >= 90:
            self.computed_remarks = "Outstanding"
        elif self.raw_score >= 85:
            self.computed_remarks = "Very Satisfactory"
        elif self.raw_score >= 80:
            self.computed_remarks = "Satisfactory"
        elif self.raw_score >= passing:
            self.computed_remarks = "Fairly Satisfactory"
        else:
            self.computed_remarks = "Did Not Meet Expectations"

        return self.computed_remarks

    def get_percentage(self):
        if self.raw_score is not None and self.total_score > 0:
            return round((self.raw_score / self.total_score) * 100, 2)
        return None
