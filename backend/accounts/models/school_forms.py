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
