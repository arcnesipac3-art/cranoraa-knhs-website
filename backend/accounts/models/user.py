from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('staff', 'Staff'),
        ('student', 'Student'),
        ('parent', 'Parent'),
    ]

    STAFF_TITLE_CHOICES = [
        # ── DepEd teaching ranks ───────────────────────────────────────────
        ('teacher_i',             'Teacher I'),
        ('teacher_ii',            'Teacher II'),
        ('teacher_iii',           'Teacher III'),
        ('teacher_iv',            'Teacher IV'),
        ('teacher_v',             'Teacher V'),
        ('teacher_vi',            'Teacher VI'),
        ('master_teacher_i',      'Master Teacher I'),
        ('master_teacher_ii',     'Master Teacher II'),
        ('special_science_teacher_i', 'Special Science Teacher I'),
        ('als_teacher',           'ALS Teacher'),
        # ── Administrative / non-teaching ─────────────────────────────────
        ('principal',             'School Principal I'),
        ('guidance_counselor',    'Guidance Counselor'),
        ('administrative_officer','Administrative Officer I'),
        ('admin_assistant',       'Administrative Assistant'),
        ('registrar',             'Registrar'),
        ('librarian',             'Librarian'),
        ('it_staff',              'IT Staff'),
        ('cashier',               'Cashier'),
        # ── Legacy / fallback ─────────────────────────────────────────────
        ('teacher',               'Teacher'),
        ('advisory',              'Advisory'),
        ('other',                 'Other'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('suspended', 'Suspended'),
        ('pending_reset', 'Pending Password Reset'),
    ]

    email = models.EmailField(unique=True, null=True, blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='student', db_index=True)
    staff_title = models.CharField(max_length=30, choices=STAFF_TITLE_CHOICES, null=True, blank=True, db_index=True)
    additional_roles = models.TextField(blank=True, default='', help_text="Comma-separated additional staff titles e.g. teacher,guidance_counselor")
    is_verified = models.BooleanField(default=False)
    is_approved = models.BooleanField(default=False)
    last_activity = models.DateTimeField(null=True, blank=True)

    must_change_password = models.BooleanField(default=False)
    account_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['role']

    groups = models.ManyToManyField(
        'auth.Group',
        related_name='accounts_user_groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        verbose_name='groups',
    )

    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='accounts_user_permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )

    def __str__(self):
        return f"{self.username} ({self.role})"

    @property
    def is_online(self):
        if not self.last_activity:
            return False
        from django.utils import timezone
        import datetime
        now = timezone.now()
        return self.last_activity > now - datetime.timedelta(minutes=5)


class OTP(models.Model):
    OTP_TYPES = [
        ('signup', 'Signup'),
        ('password_reset', 'Password Reset'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    hashed_code = models.CharField(max_length=128, default='')
    otp_type = models.CharField(max_length=20, choices=OTP_TYPES, default='signup')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True)
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"{self.otp_type} OTP for {self.user.email or self.user.username}"


class OnboardingStatus(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='onboarding_status')
    completed_tours = models.JSONField(default=list, blank=True, help_text="List of completed tour IDs")
    dismissed_tooltips = models.JSONField(default=list, blank=True, help_text="List of dismissed tooltip IDs")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Onboarding Status'
        verbose_name_plural = 'Onboarding Statuses'

    def __str__(self):
        return f"Onboarding status for {self.user.username}"


class DashboardPreferences(models.Model):
    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('auto', 'Auto'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='dashboard_preferences')
    layout = models.JSONField(default=list, blank=True, help_text="Widget positions and configuration")
    theme = models.CharField(max_length=10, choices=THEME_CHOICES, default='light')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = 'Dashboard Preference'
        verbose_name_plural = 'Dashboard Preferences'

    def __str__(self):
        return f"Dashboard preferences for {self.user.username}"


class Profile(models.Model):
    TITLE_CHOICES = [
        ('Mr.', 'Mr.'),
        ('Ms.', 'Ms.'),
        ('Mrs.', 'Mrs.'),
        ('Dr.', 'Dr.'),
        ('Prof.', 'Prof.'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    lrn = models.CharField(max_length=12, blank=True, null=True, db_index=True, help_text="Learner Reference Number (12 digits)")
    title = models.CharField(max_length=10, choices=TITLE_CHOICES, blank=True, null=True, help_text="Honorific title for teachers")
    grade_level = models.CharField(max_length=20, blank=True, null=True, help_text="For students")
    employee_id = models.CharField(max_length=20, blank=True, null=True, help_text="For teachers")
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    registration_number = models.CharField(max_length=20, blank=True, null=True, unique=True, help_text="Auto-generated unique registration number for students")
    profile_picture = models.URLField(max_length=500, blank=True, null=True, help_text="Supabase Storage URL for profile picture")

    sex = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')], blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    nationality = models.CharField(max_length=100, blank=True, null=True)
    middle_name = models.CharField(max_length=100, blank=True, null=True)
    father_name = models.CharField(max_length=100, blank=True, null=True)
    mother_name = models.CharField(max_length=100, blank=True, null=True)
    contact_information = models.TextField(blank=True, null=True, help_text="Additional contact details")
    mother_tongue = models.CharField(max_length=100, blank=True, null=True, help_text="Mother tongue / primary language")
    indigenous_people = models.CharField(max_length=100, blank=True, null=True, help_text="Indigenous People affiliation, if any")
    religion = models.CharField(max_length=100, blank=True, null=True)
    extension_name = models.CharField(max_length=20, blank=True, null=True, help_text="Name extension (e.g., Jr., Sr., III)")

    emergency_contact_name = models.CharField(max_length=200, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    emergency_contact_relationship = models.CharField(max_length=50, blank=True, null=True)
    medical_alerts = models.TextField(blank=True, null=True, help_text="Allergies, medical conditions")
    special_education_needs = models.BooleanField(default=False)

    enrollment_status = models.CharField(max_length=20, default='active', choices=[
        ('active', 'Active'),
        ('graduated', 'Graduated'),
        ('transferred', 'Transferred'),
        ('dropped', 'Dropped'),
        ('inactive', 'Inactive'),
    ], db_index=True)
    graduation_date = models.DateField(null=True, blank=True)

    mute_until = models.DateTimeField(null=True, blank=True)
    is_suspended = models.BooleanField(default=False)

    linked_students = models.ManyToManyField(User, blank=True, related_name='parent_profiles', limit_choices_to={'role': 'student'})

    def __str__(self):
        return f"{self.user.username}'s Profile"

    def save(self, *args, **kwargs):
        if self.user.role == 'student':
            if self.lrn:
                self.registration_number = self.lrn
            elif not self.registration_number:
                self.registration_number = self.generate_registration_number()
        super().save(*args, **kwargs)

    def generate_registration_number(self):
        import secrets
        year = str(self.user.date_joined.year if self.user.date_joined else 2026)
        random_num = f"{secrets.randbelow(10**6):06d}"
        return f"KNHS{year}{random_num}"
