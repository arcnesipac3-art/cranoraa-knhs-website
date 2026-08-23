from django.db import models

from .user import User


class Badge(models.Model):
    CATEGORY_CHOICES = [
        ('academic', 'Academic'),
        ('attendance', 'Attendance'),
        ('engagement', 'Engagement'),
        ('leadership', 'Leadership'),
        ('special', 'Special'),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=10, default='🏆', help_text="Emoji icon")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='academic')
    color = models.CharField(max_length=20, default='violet', help_text="Tailwind color name")
    points = models.PositiveIntegerField(default=10, help_text="Points awarded for this badge")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.icon} {self.name}"


class StudentBadge(models.Model):
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='student_badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='awarded_to')
    awarded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='awarded_badges')
    reason = models.TextField(blank=True)
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'badge')
        ordering = ['-awarded_at']

    def __str__(self):
        return f"{self.student.username} - {self.badge.name}"


class StudentLeaderboard(models.Model):
    student = models.OneToOneField(User, on_delete=models.CASCADE, related_name='leaderboard')
    total_points = models.PositiveIntegerField(default=0)
    academic_rank = models.PositiveIntegerField(null=True, blank=True)
    attendance_streak = models.PositiveIntegerField(default=0)
    longest_attendance_streak = models.PositiveIntegerField(default=0)
    last_active_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-total_points']

    def __str__(self):
        return f"{self.student.username} - {self.total_points} pts"
