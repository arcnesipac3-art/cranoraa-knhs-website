from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone

from .user import User


class SchoolForm1(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('final', 'Final'),
        ('archived', 'Archived'),
    ]

    school_year = models.CharField(max_length=20, db_index=True)
    grade_level = models.CharField(max_length=20, db_index=True)
    section = models.CharField(max_length=100)
    adviser = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sf1_advised', limit_choices_to={'role': 'staff'},
    )
    total_male = models.PositiveIntegerField(default=0)
    total_female = models.PositiveIntegerField(default=0)
    total_learners = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    generated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sf1_generated',
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['school_year', 'grade_level', 'section']
        ordering = ['-generated_at']

    def __str__(self):
        return f"SF1 {self.school_year} - {self.grade_level} {self.section}"

    def recalculate_totals(self):
        totals = self.students.aggregate(
            male_count=models.Count('id', filter=models.Q(student__profile__sex='male')),
            female_count=models.Count('id', filter=models.Q(student__profile__sex='female')),
        )
        self.total_male = totals['male_count']
        self.total_female = totals['female_count']
        self.total_learners = self.total_male + self.total_female
        self.save(update_fields=['total_male', 'total_female', 'total_learners'])


class SchoolForm1Student(models.Model):
    sf1 = models.ForeignKey(SchoolForm1, on_delete=models.CASCADE, related_name='students')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sf1_entries')
    enrollment = models.ForeignKey(
        'StudentClassEnrollment', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='sf1_entries',
    )
    remarks = models.TextField(blank=True, default='')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ['sf1', 'student']
        ordering = ['order', 'student__last_name', 'student__first_name']

    def __str__(self):
        return f"{self.student} in SF1 {self.sf1}"


# ─── SF5: Report on Promotion and Learning Progress ──────────────────────────
class SchoolForm5(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('final', 'Final'),
        ('archived', 'Archived'),
    ]

    school_year = models.CharField(max_length=20, db_index=True)
    grade_level = models.CharField(max_length=20, db_index=True)
    section = models.CharField(max_length=100)
    adviser = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sf5_advised', limit_choices_to={'role': 'staff'},
    )
    total_promoted = models.PositiveIntegerField(default=0)
    total_retained = models.PositiveIntegerField(default=0)
    total_conditional = models.PositiveIntegerField(default=0)
    total_male = models.PositiveIntegerField(default=0)
    total_female = models.PositiveIntegerField(default=0)
    total_learners = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    generated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sf5_generated',
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['school_year', 'grade_level', 'section']
        ordering = ['-generated_at']

    def __str__(self):
        return f"SF5 {self.school_year} - {self.grade_level} {self.section}"


class SchoolForm5Student(models.Model):
    PROMOTION_CHOICES = [
        ('promoted', 'Promoted'),
        ('conditional', 'Conditionally Promoted'),
        ('retained', 'Retained'),
        ('completed', 'Completed'),
    ]

    sf5 = models.ForeignKey(SchoolForm5, on_delete=models.CASCADE, related_name='students')
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sf5_entries')
    enrollment = models.ForeignKey(
        'StudentClassEnrollment', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='sf5_entries',
    )
    general_average = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_subjects = models.PositiveIntegerField(default=0)
    passed_subjects = models.PositiveIntegerField(default=0)
    failed_subjects = models.PositiveIntegerField(default=0)
    promotion_status = models.CharField(max_length=15, choices=PROMOTION_CHOICES, default='promoted')
    remarks = models.TextField(blank=True, default='')
    awards = models.CharField(max_length=200, blank=True, default='')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ['sf5', 'student']
        ordering = ['order', 'student__last_name', 'student__first_name']

    def __str__(self):
        return f"{self.student} in SF5 {self.sf5}"


# ─── SF9: Learner's Progress Report Card ─────────────────────────────────────
class SchoolForm9(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('final', 'Final'),
        ('archived', 'Archived'),
    ]

    school_year = models.CharField(max_length=20, db_index=True)
    grade_level = models.CharField(max_length=20, db_index=True)
    section = models.CharField(max_length=100)
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='sf9_records',
    )
    adviser = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='sf9_advised', limit_choices_to={'role': 'staff'},
    )
    general_average = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_subjects = models.PositiveIntegerField(default=0)
    passed_subjects = models.PositiveIntegerField(default=0)
    failed_subjects = models.PositiveIntegerField(default=0)
    promotion_status = models.CharField(max_length=20, blank=True, default='')
    days_present = models.PositiveIntegerField(default=0)
    days_absent = models.PositiveIntegerField(default=0)
    days_tardy = models.PositiveIntegerField(default=0)
    adviser_remarks = models.TextField(blank=True, default='')
    principal_remarks = models.TextField(blank=True, default='')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    generated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sf9_generated',
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['school_year', 'grade_level', 'section', 'student']
        ordering = ['-generated_at', 'student__last_name']

    def __str__(self):
        return f"SF9 {self.school_year} - {self.student} ({self.grade_level} {self.section})"


class SchoolForm9Subject(models.Model):
    sf9 = models.ForeignKey(SchoolForm9, on_delete=models.CASCADE, related_name='subjects')
    subject = models.ForeignKey('Subject', on_delete=models.CASCADE)
    q1 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    q2 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    q3 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    q4 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    final_rating = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    remarks = models.CharField(max_length=50, blank=True, default='')

    class Meta:
        unique_together = ['sf9', 'subject']
        ordering = ['subject__name']

    def __str__(self):
        return f"{self.subject.name} - Final: {self.final_rating}"


# ─── SF10: Learner's Permanent Academic Record ────────────────────────────────
class SchoolForm10(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('final', 'Final'),
        ('archived', 'Archived'),
    ]

    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='sf10_records',
    )
    school_year_from = models.CharField(max_length=20, blank=True, default='')
    school_year_to = models.CharField(max_length=20, blank=True, default='')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    generated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sf10_generated',
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-generated_at']

    def __str__(self):
        return f"SF10 - {self.student}"


class SchoolForm10Record(models.Model):
    sf10 = models.ForeignKey(SchoolForm10, on_delete=models.CASCADE, related_name='academic_records')
    school_year = models.CharField(max_length=20)
    grade_level = models.CharField(max_length=20)
    section = models.CharField(max_length=100, blank=True, default='')
    school_name = models.CharField(max_length=200, blank=True, default='')
    general_average = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    promotion_status = models.CharField(max_length=20, blank=True, default='')
    total_subjects = models.PositiveIntegerField(default=0)
    passed_subjects = models.PositiveIntegerField(default=0)
    failed_subjects = models.PositiveIntegerField(default=0)
    remarks = models.TextField(blank=True, default='')
    awards = models.CharField(max_length=300, blank=True, default='')
    date_of_transfer = models.DateField(null=True, blank=True)
    receiving_school = models.CharField(max_length=200, blank=True, default='')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'school_year']

    def __str__(self):
        return f"{self.school_year} - {self.grade_level}"


class SchoolForm10Subject(models.Model):
    record = models.ForeignKey(SchoolForm10Record, on_delete=models.CASCADE, related_name='subjects')
    subject = models.ForeignKey('Subject', on_delete=models.CASCADE)
    q1 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    q2 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    q3 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    q4 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    final_rating = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    remarks = models.CharField(max_length=50, blank=True, default='')

    class Meta:
        unique_together = ['record', 'subject']
        ordering = ['subject__name']

    def __str__(self):
        return f"{self.subject.name} - Final: {self.final_rating}"
