from django.db import models

from .user import User


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    head = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='accounts_headed_departments')
    # Portal modules this department may access. Keys only — labels and grouping
    # live in accounts.modules, which is the single source of truth.
    #   None  -> not yet configured: grants ALL modules (pre-upgrade departments)
    #   []    -> explicitly granted nothing
    #   [...] -> exactly these modules
    # Membership is organisational: it never alters a user's role or account type.
    module_keys = models.JSONField(
        null=True, blank=True, default=None,
        help_text="Portal module keys this department may access. "
                  "null means not yet configured (all modules); [] means none."
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class StaffPerformance(models.Model):
    RATING_CHOICES = [
        (1, 'Needs Improvement'),
        (2, 'Below Expectations'),
        (3, 'Meets Expectations'),
        (4, 'Exceeds Expectations'),
        (5, 'Outstanding'),
    ]

    staff = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='performance_records')
    academic_year = models.CharField(max_length=20)
    evaluated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='evaluations_given')

    teaching_quality = models.PositiveSmallIntegerField(choices=RATING_CHOICES, default=3)
    student_engagement = models.PositiveSmallIntegerField(choices=RATING_CHOICES, default=3)
    classroom_management = models.PositiveSmallIntegerField(choices=RATING_CHOICES, default=3)
    lesson_planning = models.PositiveSmallIntegerField(choices=RATING_CHOICES, default=3)
    professional_development = models.PositiveSmallIntegerField(choices=RATING_CHOICES, default=3)

    average_student_grade = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    attendance_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="Teacher attendance rate (%)")
    students_passed_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="% of students who passed")

    comments = models.TextField(blank=True)
    overall_rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['staff', 'academic_year']
        ordering = ['-academic_year']

    def __str__(self):
        return f"Performance: {self.staff.username} ({self.academic_year})"

    def compute_overall_rating(self):
        scores = [
            self.teaching_quality, self.student_engagement,
            self.classroom_management, self.lesson_planning,
            self.professional_development,
        ]
        self.overall_rating = round(sum(scores) / len(scores), 2)
        self.save(update_fields=['overall_rating'])
