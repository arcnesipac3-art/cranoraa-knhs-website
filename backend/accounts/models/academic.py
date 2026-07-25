from django.db import models
from django.core.exceptions import ValidationError
from decimal import Decimal

from .user import User


class Classroom(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    grade_level = models.CharField(max_length=20, blank=True, null=True, help_text="Academic grade level for this classroom (e.g., Grade 7)")
    capacity = models.PositiveIntegerField(default=40, help_text="Maximum number of students allowed in this classroom")
    teacher = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='teaching_classroom',
        limit_choices_to={'role': 'staff'},
        help_text="The advisory teacher for this classroom. Each teacher can only have one advisory classroom."
    )

    academic_year = models.ForeignKey('portal.AcademicYear', on_delete=models.SET_NULL, null=True, blank=True, related_name='classrooms')
    semester = models.ForeignKey('portal.Semester', on_delete=models.SET_NULL, null=True, blank=True, related_name='classrooms')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        teacher_name = self.teacher.username if self.teacher else "No Teacher"
        return f"{self.name} - {teacher_name}"

    def get_average_gpa(self):
        enrollments = self.enrollments.all()
        if enrollments:
            total_gpa = sum(e.gpa for e in enrollments if e.gpa is not None)
            count = sum(1 for e in enrollments if e.gpa is not None)
            return total_gpa / count if count > 0 else None
        return None


class Subject(models.Model):
    COMPONENT_CHOICES = [
        ('', 'None'),
        ('music_arts', 'Music and Arts'),
        ('pe_health', 'Physical Education and Health'),
    ]

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True, null=True)
    grade_level = models.CharField(max_length=20, help_text="Grade level this subject is for")
    component = models.CharField(max_length=20, choices=COMPONENT_CHOICES, blank=True, default='',
        help_text="For composite subjects like MAPEH. Set to 'music_arts' or 'pe_health' for sub-components.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['grade_level', 'name']

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def has_components(self):
        return self.component == ''

    def get_components(self):
        if not self.has_components:
            return []
        return list(Subject.objects.filter(
            grade_level=self.grade_level,
            component__in=['music_arts', 'pe_health'],
            name__icontains=self.name.split()[0] if self.name else '',
        ).order_by('component'))


class ClassroomSubject(models.Model):
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='classroom_subjects')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='classroom_subjects')
    teacher = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_classroom_subjects', limit_choices_to={'role': 'staff'})
    assigned_at = models.DateTimeField(auto_now_add=True)

    ww_weight = models.DecimalField(max_digits=5, decimal_places=2, default=30.00,
        help_text="Written Work weight (%)")
    pt_weight = models.DecimalField(max_digits=5, decimal_places=2, default=50.00,
        help_text="Performance Task weight (%)")
    qa_weight = models.DecimalField(max_digits=5, decimal_places=2, default=20.00,
        help_text="Quarterly Assessment weight (%)")

    class Meta:
        unique_together = ['classroom', 'subject']
        ordering = ['classroom__name', 'subject__name']

    def clean(self):
        total = self.ww_weight + self.pt_weight + self.qa_weight
        if total != Decimal('100.00'):
            raise ValidationError(
                f'Grade weights must sum to 100%. Current total: {total}%'
            )


class SystemSetting(models.Model):
    site_name = models.CharField(max_length=255, default='School Portal')
    school_address = models.TextField(blank=True, null=True)
    school_phone = models.CharField(max_length=20, blank=True, null=True)
    school_email = models.EmailField(blank=True, null=True)
    school_logo = models.URLField(max_length=1000, null=True, blank=True, help_text="Supabase Storage URL")

    primary_color = models.CharField(max_length=7, default='#2D1B4D')
    secondary_color = models.CharField(max_length=7, default='#9F7AEA')

    maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(default='The portal is currently undergoing maintenance. Please check back later.')
    enrollment_open = models.BooleanField(default=True)

    ACADEMIC_LEVEL_CHOICES = [
        ('jhs', 'Junior High School (Grades 7-10)'),
        ('shs', 'Senior High School (Grades 11-12)'),
    ]
    academic_level = models.CharField(max_length=3, choices=ACADEMIC_LEVEL_CHOICES, default='jhs')
    current_quarter = models.CharField(max_length=1, default='1', choices=[('1', 'Term 1'), ('2', 'Term 2'), ('3', 'Term 3'), ('4', 'Term 4 (Legacy)')])
    academic_year = models.CharField(max_length=9, default='2025-2026')

    default_ww_weight = models.DecimalField(max_digits=5, decimal_places=2, default=30.00, help_text="Default Written Work weight (%)")
    default_pt_weight = models.DecimalField(max_digits=5, decimal_places=2, default=50.00, help_text="Default Performance Task weight (%)")
    default_qa_weight = models.DecimalField(max_digits=5, decimal_places=2, default=20.00, help_text="Default Quarterly Assessment weight (%)")
    passing_grade = models.DecimalField(max_digits=5, decimal_places=2, default=75.00, help_text="Minimum passing grade (%)")

    allow_student_chat = models.BooleanField(default=True)
    allow_teacher_chat = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return "Global System Settings"

    @classmethod
    def get_settings(cls):
        settings, created = cls.objects.get_or_create(id=1)
        return settings


class StudentClassEnrollment(models.Model):
    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='enrollments')
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='enrollments')
    q1 = models.IntegerField(null=True, blank=True)
    q2 = models.IntegerField(null=True, blank=True)
    q3 = models.IntegerField(null=True, blank=True)
    q4 = models.IntegerField(null=True, blank=True)
    gpa = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['student', 'classroom']
        ordering = ['student__username']

    def __str__(self):
        return f"{self.student.username} in {self.classroom.name}"

    def calculate_general_average(self):
        quarters = [self.q1, self.q2, self.q3, self.q4]
        valid_quarters = [q for q in quarters if q is not None]
        if valid_quarters:
            return round(sum(valid_quarters) / len(valid_quarters))
        return None

    def get_descriptive_equivalent(self):
        from .academic import SystemSetting
        avg = self.calculate_general_average()
        passing = float(SystemSetting.get_settings().passing_grade)
        if avg is None:
            return "No Grades"
        if avg >= 90:
            return "Outstanding"
        if avg >= 85:
            return "Very Satisfactory"
        if avg >= 80:
            return "Satisfactory"
        if avg >= passing:
            return "Fairly Satisfactory"
        return "Did Not Meet Expectations"
