from django.db import models
from django.conf import settings


class ComplianceType(models.Model):
    FREQUENCY_CHOICES = [
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES)
    deadline_day = models.PositiveIntegerField(
        default=5,
        help_text="Day of period: 5=Friday for weekly, 15 for monthly"
    )
    max_file_size_mb = models.PositiveIntegerField(default=50)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_frequency_display()})"


class ComplianceSubmission(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('reviewed', 'Reviewed'),
        ('rejected', 'Rejected'),
        ('overdue', 'Overdue'),
    ]

    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='compliance_submissions'
    )
    compliance_type = models.ForeignKey(
        ComplianceType,
        on_delete=models.CASCADE,
        related_name='submissions'
    )
    academic_year = models.ForeignKey(
        'AcademicYear',
        on_delete=models.CASCADE,
        related_name='compliance_submissions'
    )
    semester = models.ForeignKey(
        'Semester',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='compliance_submissions'
    )
    period_number = models.PositiveIntegerField(
        help_text="Auto-calculated: week/month/term number"
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='compliance_reviews'
    )
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [
            'teacher', 'compliance_type', 'academic_year', 'semester', 'period_number'
        ]
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'compliance_type']),
            models.Index(fields=['teacher', 'status']),
            models.Index(fields=['academic_year', 'semester']),
        ]

    def __str__(self):
        teacher_name = self.teacher.get_full_name() or self.teacher.username
        return f"{teacher_name} - {self.compliance_type.name} (P{self.period_number})"


class ComplianceFile(models.Model):
    submission = models.ForeignKey(
        ComplianceSubmission,
        on_delete=models.CASCADE,
        related_name='files'
    )
    file_url = models.URLField(max_length=1000)
    original_filename = models.CharField(max_length=255)
    file_size_bytes = models.PositiveBigIntegerField(default=0)
    content_type = models.CharField(max_length=100, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['uploaded_at']

    def __str__(self):
        return self.original_filename


class ComplianceComment(models.Model):
    submission = models.ForeignKey(
        ComplianceSubmission,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='compliance_comments'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        author_name = self.author.get_full_name() or self.author.username
        return f"Comment by {author_name}"
