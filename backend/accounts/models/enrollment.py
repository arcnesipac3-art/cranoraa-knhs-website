from django.db import models
from django.utils import timezone

from .user import User
from .academic import Classroom


class EnrollmentApplication(models.Model):
    GRADE_LEVEL_CHOICES = [
        ('7', 'Grade 7'),
        ('8', 'Grade 8'),
        ('9', 'Grade 9'),
        ('10', 'Grade 10'),
        ('11', 'Grade 11'),
        ('12', 'Grade 12'),
    ]

    ENROLLMENT_TYPE_CHOICES = [
        ('new', 'New Student'),
        ('returning', 'Returning Student'),
        ('transferee', 'Transferee'),
        ('sh_applicant', 'SHS Applicant'),
        ('parent_assisted', 'Parent-Assisted Enrollment'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('under_review', 'Under Review'),
        ('pending_requirements', 'Pending Requirements'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
        ('enrolled', 'Enrolled'),
        ('withdrawn', 'Withdrawn'),
    ]

    SEX_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    SHS_TRACK_CHOICES = [
        ('Academic', 'Academic Track'),
        ('TechPro', 'Technical-Professional Track'),
    ]

    enrollment_number = models.CharField(max_length=20, unique=True, blank=True, null=True, help_text="Auto-generated ENR-YYYY-XXXXXX")
    enrollment_type = models.CharField(max_length=20, choices=ENROLLMENT_TYPE_CHOICES, default='new')
    school_year = models.CharField(max_length=20, blank=True, null=True, help_text="School year applying for (e.g., 2026-2027)")

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    sex = models.CharField(max_length=10, choices=SEX_CHOICES)
    date_of_birth = models.DateField()
    place_of_birth = models.CharField(max_length=200, blank=True, null=True)
    nationality = models.CharField(max_length=50, default='Filipino')
    religion = models.CharField(max_length=50, blank=True, null=True)

    street_address = models.CharField(max_length=200)
    barangay = models.CharField(max_length=100)
    city_municipality = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=10, blank=True, null=True)

    father_name = models.CharField(max_length=200, blank=True, null=True)
    father_occupation = models.CharField(max_length=100, blank=True, null=True)
    father_contact = models.CharField(max_length=20, blank=True, null=True)
    father_email = models.EmailField(blank=True, null=True)
    mother_name = models.CharField(max_length=200, blank=True, null=True)
    mother_occupation = models.CharField(max_length=100, blank=True, null=True)
    mother_contact = models.CharField(max_length=20, blank=True, null=True)
    mother_email = models.EmailField(blank=True, null=True)
    guardian_name = models.CharField(max_length=200, blank=True, null=True)
    guardian_relationship = models.CharField(max_length=50, blank=True, null=True)
    guardian_contact = models.CharField(max_length=20, blank=True, null=True)
    guardian_email = models.EmailField(blank=True, null=True)

    grade_level = models.CharField(max_length=2, choices=GRADE_LEVEL_CHOICES)
    strand = models.CharField(max_length=20, choices=SHS_TRACK_CHOICES, blank=True, null=True, help_text="Required for Grades 11-12")
    previous_school = models.CharField(max_length=200, blank=True, null=True)
    previous_school_address = models.TextField(blank=True, null=True)
    lrn = models.CharField(max_length=12, blank=True, null=True, help_text="Learner Reference Number")
    lrn_request_reason = models.CharField(max_length=200, blank=True, null=True, help_text="Reason for not having LRN")
    is_als = models.BooleanField(default=False, help_text="Alternative Learning System applicant")

    birth_certificate = models.URLField(max_length=1000, blank=True, null=True)
    report_card = models.URLField(max_length=1000, blank=True, null=True)
    form_138 = models.URLField(max_length=1000, blank=True, null=True, help_text="Grade 6 Candidate for Graduation Certificate")
    certificate_of_completion = models.URLField(max_length=1000, blank=True, null=True, help_text="Grade 10 Candidate for Completion Certificate")
    good_moral_certificate = models.URLField(max_length=1000, blank=True, null=True)
    id_picture = models.URLField(max_length=1000, blank=True, null=True, help_text="Student ID Picture")
    last_school_attended_cert = models.URLField(max_length=1000, blank=True, null=True, help_text="For ALS applicants")

    email = models.EmailField()
    phone_number = models.CharField(max_length=20)

    emergency_contact_name = models.CharField(max_length=200)
    emergency_contact_relationship = models.CharField(max_length=50)
    emergency_contact_phone = models.CharField(max_length=20)

    enrolled_student = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='enrollment_applications')
    assigned_classroom = models.ForeignKey('Classroom', on_delete=models.SET_NULL, blank=True, null=True)
    temp_password_display = models.CharField(max_length=100, blank=True, null=True, help_text="Temporary password shown to applicant after enrollment")

    linked_parent = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='child_enrollment_applications', help_text="Parent account linked during enrollment")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    remarks = models.TextField(blank=True, null=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True, related_name='reviewed_applications', help_text="Admin who last reviewed this application")

    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    reviewed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['enrollment_number']),
            models.Index(fields=['grade_level']),
            models.Index(fields=['school_year']),
            models.Index(fields=['lrn']),
            models.Index(fields=['email']),
            models.Index(fields=['enrollment_type', 'status']),
            models.Index(fields=['school_year', 'status']),
        ]

    def save(self, *args, **kwargs):
        if not self.enrollment_number:
            self.enrollment_number = self._generate_enrollment_number()
        super().save(*args, **kwargs)

    def _generate_enrollment_number(self):
        from django.db import transaction
        year = timezone.now().year
        prefix = f"ENR-{year}-"
        with transaction.atomic():
            last = EnrollmentApplication.objects.select_for_update().filter(
                enrollment_number__startswith=prefix
            ).order_by('id').last()
            if last and last.enrollment_number:
                parts = last.enrollment_number.split('-')
                seq = int(parts[-1]) + 1
            else:
                seq = 1
            return f"{prefix}{seq:06d}"

    @property
    def age(self):
        from datetime import date
        if not self.date_of_birth:
            return None
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

    @property
    def full_name(self):
        parts = [self.first_name]
        if self.middle_name:
            parts.append(self.middle_name)
        parts.append(self.last_name)
        return ' '.join(parts)

    @property
    def is_duplicate(self):
        return EnrollmentApplication.objects.filter(
            first_name__iexact=self.first_name,
            last_name__iexact=self.last_name,
            date_of_birth=self.date_of_birth,
            status__in=['pending', 'under_review', 'pending_requirements', 'approved', 'enrolled']
        ).exclude(pk=self.pk).exists()

    def __str__(self):
        return f"{self.enrollment_number or 'N/A'} - {self.last_name}, {self.first_name}"


class EnrollmentDocument(models.Model):
    DOCUMENT_TYPES = [
        ('birth_certificate', 'PSA Birth Certificate'),
        ('report_card', 'Report Card'),
        ('form_138', 'Form 138 / Grade 6 Certificate'),
        ('certificate_of_completion', 'Certificate of Completion'),
        ('good_moral', 'Good Moral Certificate'),
        ('id_picture', 'ID Picture'),
        ('last_school_attended', 'Last School Attended Certificate'),
        ('other', 'Other Document'),
    ]

    VERIFICATION_STATUS = [
        ('submitted', 'Submitted'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
        ('missing', 'Missing'),
    ]

    application = models.ForeignKey(EnrollmentApplication, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPES)
    file_url = models.URLField(max_length=1000)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_STATUS, default='submitted')
    admin_notes = models.TextField(blank=True, null=True, help_text="Admin notes about this document")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['document_type', 'uploaded_at']

    def __str__(self):
        return f"{self.get_document_type_display()} - {self.application.enrollment_number}"


class EnrollmentStatusHistory(models.Model):
    STATUS_CHOICES = EnrollmentApplication.STATUS_CHOICES

    application = models.ForeignKey(EnrollmentApplication, on_delete=models.CASCADE, related_name='status_history')
    from_status = models.CharField(max_length=20, choices=STATUS_CHOICES, blank=True, null=True)
    to_status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        verbose_name_plural = 'Enrollment status histories'

    def __str__(self):
        return f"{self.application.enrollment_number}: {self.from_status or 'new'} → {self.to_status}"


class EnrollmentWaitlist(models.Model):
    classroom = models.ForeignKey('Classroom', on_delete=models.CASCADE, related_name='waitlist')
    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='enrollment_waitlists')
    application = models.ForeignKey(EnrollmentApplication, on_delete=models.CASCADE, related_name='waitlist_entries', null=True, blank=True)
    position = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=[
        ('waiting', 'Waiting'),
        ('offered', 'Offered'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
    ], default='waiting')
    offered_at = models.DateTimeField(null=True, blank=True)
    response_deadline = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['position']
        unique_together = ['classroom', 'student']

    def __str__(self):
        return f"Waitlist #{self.position}: {self.student.username} → {self.classroom.name}"


class ParentLink(models.Model):
    parent = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='parent_links')
    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_parent_links')
    application = models.ForeignKey(EnrollmentApplication, on_delete=models.CASCADE, related_name='parent_links')
    relationship = models.CharField(max_length=50, default='parent', help_text="Relationship to student (parent, guardian, etc.)")
    is_primary = models.BooleanField(default=False, help_text="Primary contact parent")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['parent', 'student']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.parent.username} → {self.student.username}"


class EnrollmentChecklist(models.Model):
    application = models.OneToOneField(EnrollmentApplication, on_delete=models.CASCADE, related_name='checklist')
    documents_complete = models.BooleanField(default=False)
    lrn_verified = models.BooleanField(default=False)
    parent_linked = models.BooleanField(default=False)
    classroom_assigned = models.BooleanField(default=False)
    profile_complete = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Enrollment checklists'

    def __str__(self):
        return f"Checklist for {self.application.enrollment_number}"

    @property
    def is_complete(self):
        return all([
            self.documents_complete,
            self.lrn_verified,
            self.parent_linked,
            self.classroom_assigned,
            self.profile_complete,
        ])

    def evaluate(self):
        app = self.application
        self.documents_complete = not app.documents.exclude(verification_status='verified').exclude(verification_status='missing').filter(verification_status='submitted').exists()
        lrn = (app.lrn or '').strip()
        self.lrn_verified = bool(lrn and len(lrn) == 12 and lrn.isdigit()) or bool(app.lrn_request_reason)
        self.parent_linked = app.linked_parent is not None
        self.classroom_assigned = app.assigned_classroom is not None
        self.profile_complete = bool(app.first_name and app.last_name and app.date_of_birth and app.grade_level)
        if self.is_complete and not self.completed_at:
            self.completed_at = timezone.now()
        self.save()
        return self.is_complete


class EnrollmentDocumentVersion(models.Model):
    document = models.ForeignKey(EnrollmentDocument, on_delete=models.CASCADE, related_name='versions')
    file_url = models.URLField(max_length=1000)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_hash = models.CharField(max_length=64, blank=True, help_text="SHA-256 hash for deduplication")
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Enrollment document versions'

    def __str__(self):
        return f"Version of {self.document.get_document_type_display()} - {self.document.application.enrollment_number}"
