from django.db import models

from .user import User


class SchoolEvent(models.Model):
    CATEGORY_CHOICES = [
        ('academic', 'Academic'),
        ('sports', 'Sports'),
        ('cultural', 'Cultural'),
        ('holiday', 'Holiday'),
        ('meeting', 'Meeting'),
        ('exam', 'Examination'),
        ('enrollment', 'Enrollment'),
        ('other', 'Other'),
    ]
    AUDIENCE_CHOICES = [
        ('all', 'All'),
        ('students', 'Students'),
        ('parents', 'Parents'),
        ('teachers', 'Teachers'),
        ('staff', 'Staff'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='academic')
    target_audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='all')

    start_date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    is_all_day = models.BooleanField(default=False)

    location = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_events')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_date', 'start_time']

    def __str__(self):
        return f"{self.title} ({self.start_date})"

    @property
    def rsvp_going_count(self):
        return self.rsvps.filter(status='going').count()

    @property
    def rsvp_maybe_count(self):
        return self.rsvps.filter(status='maybe').count()

    @property
    def rsvp_not_going_count(self):
        return self.rsvps.filter(status='not_going').count()


class EventRSVP(models.Model):
    STATUS_CHOICES = [
        ('going', 'Going'),
        ('maybe', 'Maybe'),
        ('not_going', 'Not Going'),
    ]

    event = models.ForeignKey(SchoolEvent, on_delete=models.CASCADE, related_name='rsvps')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_rsvps')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='going')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('event', 'user')

    def __str__(self):
        return f"{self.user.username} - {self.event.title} ({self.status})"


class WebsiteContent(models.Model):
    SECTION_CHOICES = [
        ('home_hero_title', 'Home Hero Title'),
        ('home_hero_subtitle', 'Home Hero Subtitle'),
        ('home_feature_1_title', 'Home Feature 1 Title'),
        ('home_feature_1_content', 'Home Feature 1 Content'),
        ('home_feature_2_title', 'Home Feature 2 Title'),
        ('home_feature_2_content', 'Home Feature 2 Content'),
        ('home_feature_3_title', 'Home Feature 3 Title'),
        ('home_feature_3_content', 'Home Feature 3 Content'),

        ('about_title', 'About Title'),
        ('about_subtitle', 'About Subtitle'),
        ('about_mission_title', 'About Mission Title'),
        ('about_mission_content', 'About Mission Content'),
        ('about_vision_title', 'About Vision Title'),
        ('about_vision_content', 'About Vision Content'),
        ('about_history_title', 'About History Title'),
        ('about_history_content', 'About History Content'),

        ('contact_title', 'Contact Title'),
        ('contact_subtitle', 'Contact Subtitle'),
        ('contact_address', 'Contact Address'),
        ('contact_email', 'Contact Email'),
        ('contact_phone', 'Contact Phone'),
        ('contact_map_url', 'Contact Map URL'),

        ('programs_title', 'Programs Title'),
        ('programs_subtitle', 'Programs Subtitle'),
        ('programs_academic_title', 'Academic Programs Title'),
        ('programs_academic_content', 'Academic Programs Content'),
        ('programs_tech_title', 'Technical Programs Title'),
        ('programs_tech_content', 'Technical Programs Content'),
        ('programs_sports_title', 'Sports Programs Title'),
        ('programs_sports_content', 'Sports Programs Content'),
        ('programs_arts_title', 'Arts Programs Title'),
        ('programs_arts_content', 'Arts Programs Content'),
    ]

    CATEGORY_CHOICES = [
        ('home', 'Home Page'),
        ('about', 'About Page'),
        ('contact', 'Contact Page'),
        ('programs', 'Programs Page'),
        ('other', 'Other'),
    ]

    section = models.CharField(max_length=100, unique=True, null=True, blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    content = models.TextField(blank=True, null=True)
    image = models.URLField(max_length=1000, null=True, blank=True, help_text="Supabase Storage URL")
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ['category', 'section']
        verbose_name = 'Website Content'
        verbose_name_plural = 'Website Contents'

    def __str__(self):
        return f"[{self.get_category_display()}] {self.get_section_display()}"
