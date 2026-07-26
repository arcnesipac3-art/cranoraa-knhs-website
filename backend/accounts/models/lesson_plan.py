from django.db import models

from .user import User
from .academic import Classroom, Subject


class CurriculumStandard(models.Model):
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField()
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='curriculum_standards')
    grade_level = models.CharField(max_length=20)
    quarter = models.IntegerField(null=True, blank=True, choices=[(1, 'Q1'), (2, 'Q2'), (3, 'Q3')])
    semester = models.IntegerField(null=True, blank=True, choices=[(1, '1st Semester'), (2, '2nd Semester')])
    strand = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.description[:60]}"


class LessonPlan(models.Model):
    PLAN_TYPE_CHOICES = [
        ('dlp', 'Daily Lesson Plan (DLP)'),
        ('dll', 'Daily Lesson Log (DLL)'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('revision_needed', 'Revision Needed'),
    ]

    title = models.CharField(max_length=200)
    plan_type = models.CharField(max_length=5, choices=PLAN_TYPE_CHOICES, default='dlp')
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='lesson_plans')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='lesson_plans')
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='lesson_plans')
    date = models.DateField()
    quarter = models.IntegerField(choices=[(1, 'Q1'), (2, 'Q2'), (3, 'Q3')])
    week = models.IntegerField(null=True, blank=True)

    objectives = models.TextField(help_text="IPI - Intention, Purpose, Importance")
    content = models.TextField(help_text="Content/Topic")
    materials_needed = models.TextField(blank=True, default='')
    procedure = models.JSONField(default=list, blank=True,
        help_text="Structured steps: [{step, description, time_minutes}]")
    values_integration = models.TextField(blank=True, default='')
    remarks = models.TextField(blank=True, default='')

    submitted_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='submitted_lesson_plans')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    feedback = models.TextField(blank=True, default='')

    curriculum_standards = models.ManyToManyField(CurriculumStandard,
        blank=True, related_name='lesson_plans')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.get_plan_type_display()} - {self.title} ({self.date})"


class WeeklyPlan(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
    ]

    title = models.CharField(max_length=200)
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='weekly_plans')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='weekly_plans')
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='weekly_plans')
    week_start = models.DateField()
    week_end = models.DateField()
    quarter = models.IntegerField(choices=[(1, 'Q1'), (2, 'Q2'), (3, 'Q3')])
    goals = models.TextField(help_text="Weekly goals")
    lesson_plans = models.ManyToManyField(LessonPlan, blank=True, related_name='weekly_plans')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-week_start']

    def __str__(self):
        return f"{self.title} ({self.week_start} - {self.week_end})"
