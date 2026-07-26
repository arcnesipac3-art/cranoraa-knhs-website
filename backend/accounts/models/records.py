from django.db import models
from django.utils import timezone

from .user import User
from .academic import SystemSetting
from .assignments import Grade
from .academic import StudentClassEnrollment


class Transcript(models.Model):
    TRANSCRIPT_STATUS = [
        ('draft', 'Draft'),
        ('final', 'Final'),
        ('archived', 'Archived'),
    ]

    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='transcripts')
    school_year = models.CharField(max_length=20)
    general_average = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_subjects = models.IntegerField(default=0)
    passed_subjects = models.IntegerField(default=0)
    failed_subjects = models.IntegerField(default=0)
    status = models.CharField(max_length=10, choices=TRANSCRIPT_STATUS, default='draft')
    remarks = models.TextField(blank=True, null=True)
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='generated_transcripts')
    pdf_url = models.URLField(max_length=1000, blank=True, null=True)
    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['student', 'school_year']
        ordering = ['-school_year', 'student__username']

    def __str__(self):
        return f"Transcript: {self.student.username} - {self.school_year}"

    def generate_from_grades(self):
        grades = Grade.objects.filter(
            student=self.student,
            academic_year=self.school_year,
            grade_type='final_grade',
            raw_score__isnull=False,
        )
        if not grades.exists():
            return

        passing = float(SystemSetting.get_settings().passing_grade)
        scores = [float(g.raw_score) for g in grades]
        self.general_average = round(sum(scores) / len(scores), 2)
        self.total_subjects = len(scores)
        self.passed_subjects = sum(1 for s in scores if s >= passing)
        self.failed_subjects = self.total_subjects - self.passed_subjects

        if self.general_average >= 90:
            self.remarks = "With High Honors"
        elif self.general_average >= 85:
            self.remarks = "With Honors"
        elif self.general_average >= passing:
            self.remarks = "Promoted"
        else:
            self.remarks = "For Review"

        self.save()


class TranscriptLineItem(models.Model):
    transcript = models.ForeignKey(Transcript, on_delete=models.CASCADE, related_name='items')
    subject = models.ForeignKey('accounts.Subject', on_delete=models.CASCADE)
    q1 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    q2 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    q3 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    q4 = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    final_average = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    remarks = models.CharField(max_length=50, blank=True)

    class Meta:
        unique_together = ['transcript', 'subject']
        ordering = ['subject__name']

    def __str__(self):
        return f"{self.subject.code} - Avg: {self.final_average}"

    def compute_final(self):
        scores = [float(s) for s in [self.q1, self.q2, self.q3, self.q4] if s is not None]
        if scores:
            self.final_average = round(sum(scores) / len(scores), 2)
            passing = float(SystemSetting.get_settings().passing_grade)
            if self.final_average >= 90:
                self.remarks = "Outstanding"
            elif self.final_average >= 85:
                self.remarks = "Very Satisfactory"
            elif self.final_average >= 80:
                self.remarks = "Satisfactory"
            elif self.final_average >= passing:
                self.remarks = "Fairly Satisfactory"
            else:
                self.remarks = "Did Not Meet Expectations"
        else:
            self.final_average = None
            self.remarks = "No Grade"
        self.save()


class TransferCertificate(models.Model):
    TC_STATUS = [
        ('requested', 'Requested'),
        ('processing', 'Processing'),
        ('ready', 'Ready for Pickup'),
        ('released', 'Released'),
        ('cancelled', 'Cancelled'),
    ]

    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='transfer_certificates')
    reference_number = models.CharField(max_length=30, unique=True)
    school_year_from = models.CharField(max_length=20, help_text="School year student is transferring from")
    school_year_to = models.CharField(max_length=20, blank=True, help_text="School year student is transferring to")
    destination_school = models.CharField(max_length=200, blank=True, help_text="School the student is transferring to")
    last_grade_completed = models.CharField(max_length=20, blank=True)
    last_school_attended = models.CharField(max_length=200, blank=True, default='Kiwalan National High School')
    general_average = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    place_of_birth = models.CharField(max_length=200, blank=True)
    nationality = models.CharField(max_length=100, blank=True, default='Filipino')
    status = models.CharField(max_length=15, choices=TC_STATUS, default='requested')
    reason = models.TextField(blank=True, help_text="Reason for transfer")
    remarks = models.TextField(blank=True)
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='issued_tcs')
    issued_at = models.DateTimeField(null=True, blank=True)
    pdf_url = models.URLField(max_length=1000, blank=True, null=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-requested_at']

    def __str__(self):
        return f"TC {self.reference_number} - {self.student.username}"

    def save(self, *args, **kwargs):
        if not self.reference_number:
            import random, string
            year = timezone.now().year
            seq = ''.join(random.choices(string.digits, k=6))
            self.reference_number = f"TC-{year}-{seq}"
        if not self.last_grade_completed:
            enrollment = StudentClassEnrollment.objects.filter(
                student=self.student
            ).select_related('classroom').order_by('-enrolled_at').first()
            if enrollment:
                self.last_grade_completed = enrollment.classroom.grade_level or ''
        if not self.general_average:
            grades = Grade.objects.filter(
                student=self.student,
                grade_type='final_grade',
                raw_score__isnull=False,
            ).order_by('-academic_year')[:1]
            if grades:
                self.general_average = grades.first().raw_score
        super().save(*args, **kwargs)


class CharacterCertificate(models.Model):
    CC_STATUS = [
        ('requested', 'Requested'),
        ('approved', 'Approved'),
        ('ready', 'Ready for Pickup'),
        ('released', 'Released'),
        ('cancelled', 'Cancelled'),
    ]

    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='character_certificates')
    reference_number = models.CharField(max_length=30, unique=True)
    purpose = models.CharField(max_length=200, blank=True, help_text="Purpose of the certificate")
    school_year = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=15, choices=CC_STATUS, default='requested')
    character_rating = models.CharField(max_length=50, default='Excellent',
        choices=[('Excellent', 'Excellent'), ('Very Good', 'Very Good'), ('Good', 'Good'), ('Fair', 'Fair'), ('Poor', 'Poor')])
    remarks = models.TextField(blank=True)
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='issued_ccs')
    issued_at = models.DateTimeField(null=True, blank=True)
    pdf_url = models.URLField(max_length=1000, blank=True, null=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-requested_at']

    def __str__(self):
        return f"CC {self.reference_number} - {self.student.username}"

    def save(self, *args, **kwargs):
        if not self.reference_number:
            import random, string
            year = timezone.now().year
            seq = ''.join(random.choices(string.digits, k=6))
            self.reference_number = f"CC-{year}-{seq}"
        super().save(*args, **kwargs)


class AchievementRecord(models.Model):
    CATEGORY_CHOICES = [
        ('academic', 'Academic'),
        ('sports', 'Sports'),
        ('arts', 'Arts & Culture'),
        ('leadership', 'Leadership'),
        ('community', 'Community Service'),
        ('competition', 'Competition'),
        ('other', 'Other'),
    ]

    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='achievement_records')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='academic')
    date_achieved = models.DateField()
    awarded_by = models.CharField(max_length=200, blank=True, help_text="Organization or person who gave the award")
    school_year = models.CharField(max_length=20, blank=True)
    grade_level = models.CharField(max_length=20, blank=True)
    evidence_url = models.URLField(max_length=1000, blank=True, null=True, help_text="URL to supporting document")
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_achievements')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_achieved']

    def __str__(self):
        return f"{self.student.username} - {self.title} ({self.date_achieved})"


class RecordRequest(models.Model):
    RECORD_TYPE_CHOICES = [
        ('transcript', 'Official Transcript'),
        ('transfer_certificate', 'Transfer Certificate'),
        ('character_certificate', 'Character Certificate'),
        ('enrollment_verification', 'Enrollment Verification'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('ready', 'Ready for Pickup'),
        ('released', 'Released'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    requestor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='record_requests')
    record_type = models.CharField(max_length=30, choices=RECORD_TYPE_CHOICES)
    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='requests_for_student')
    purpose = models.CharField(max_length=300, blank=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, help_text="Requestor notes")
    admin_notes = models.TextField(blank=True, help_text="Staff/admin internal notes")
    handled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='handled_requests')
    copies = models.PositiveIntegerField(default=1)
    reference_record_id = models.IntegerField(null=True, blank=True, help_text="ID of the generated record (Transcript, TC, CC)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Request #{self.id} - {self.get_record_type_display()} for {self.student or self.requestor}"


class StudentPromotionRecord(models.Model):
    PROMOTION_STATUS = [
        ('promoted', 'Promoted'),
        ('retained', 'Retained'),
        ('conditional', 'Conditionally Promoted'),
        ('graduated', 'Graduated'),
        ('transferred', 'Transferred'),
        ('dropped', 'Dropped'),
    ]

    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='promotion_records')
    from_classroom = models.ForeignKey('Classroom', on_delete=models.SET_NULL, null=True, related_name='promotions_from')
    to_classroom = models.ForeignKey('Classroom', on_delete=models.SET_NULL, null=True, blank=True, related_name='promotions_to')
    from_school_year = models.CharField(max_length=20)
    to_school_year = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=PROMOTION_STATUS)
    general_average = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    decision_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='promotion_decisions')
    decided_at = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True)
    is_final = models.BooleanField(default=False, help_text="True after bulk promotion confirmation")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-decided_at']
        indexes = [
            models.Index(fields=['student', 'from_school_year']),
            models.Index(fields=['status']),
            models.Index(fields=['is_final']),
        ]

    def __str__(self):
        return f"{self.student}: {self.get_status_display()} ({self.from_school_year} → {self.to_school_year})"
