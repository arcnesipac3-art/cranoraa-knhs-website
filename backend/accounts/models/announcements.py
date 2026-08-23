from django.db import models
from django.utils import timezone

from .user import User
from .academic import Classroom


class Announcement(models.Model):
    CATEGORY_CHOICES = [
        ('general', 'General'),
        ('system_update', 'System Update'),
        ('emergency', 'Emergency'),
        ('academic', 'Academic'),
        ('events', 'Events'),
        ('holiday', 'Holiday'),
    ]

    PRIORITY_CHOICES = [
        ('urgent', 'Urgent'),
        ('high', 'High'),
        ('normal', 'Normal'),
        ('low', 'Low'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('live', 'Live'),
        ('expired', 'Expired'),
    ]

    TARGET_AUDIENCE_CHOICES = [
        ('all', 'All Users'),
        ('admins', 'Admins'),
        ('students', 'Students'),
        ('teachers', 'Teachers'),
        ('parents', 'Parents'),
    ]

    title = models.CharField(max_length=200)
    content = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='info')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    target_audience = models.CharField(max_length=20, choices=TARGET_AUDIENCE_CHOICES, default='all')
    target_classrooms = models.ManyToManyField(Classroom, blank=True, related_name='announcements')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='account_announcements')
    is_pinned = models.BooleanField(default=False)
    is_public = models.BooleanField(default=False)
    event_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    attachment = models.URLField(max_length=1000, null=True, blank=True, help_text="Supabase Storage URL")
    read_by = models.ManyToManyField(User, related_name='read_announcements', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return f"{self.title} - {self.author.username}"

    @property
    def is_expired(self):
        compare_date = self.end_date if self.end_date else self.event_date
        if compare_date:
            return timezone.now() > compare_date
        return False


class AnnouncementAttachment(models.Model):
    announcement = models.ForeignKey(
        Announcement, on_delete=models.CASCADE, related_name='attachments'
    )
    file = models.URLField(max_length=1000, blank=False, help_text="Supabase Storage URL")
    filename = models.CharField(max_length=255, blank=True)
    file_size_bytes = models.PositiveIntegerField(null=True, blank=True)
    content_type = models.CharField(max_length=100, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.announcement.title} - {self.filename}"

    @property
    def is_image(self):
        return self.filename.lower().split('.')[-1] in ['jpg', 'jpeg', 'png', 'gif', 'webp']

    @property
    def url(self):
        return self.file or ''


class AnnouncementComment(models.Model):
    announcement = models.ForeignKey(
        Announcement, on_delete=models.CASCADE, related_name='comments'
    )
    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='announcement_comments'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author_id} on announcement {self.announcement_id}"
