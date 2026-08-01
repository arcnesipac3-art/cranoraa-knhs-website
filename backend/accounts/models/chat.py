from django.db import models

from .user import User


class ChatRoom(models.Model):
    GROUP_TYPE_CHOICES = [
        ('manual', 'Manual'),
        ('system', 'System'),
    ]
    SOURCE_TYPE_CHOICES = [
        ('classroom', 'Classroom'),
        ('subject', 'Subject'),
        ('department', 'Department'),
        ('faculty', 'Faculty'),
    ]

    name = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    avatar = models.URLField(max_length=1000, blank=True, null=True)
    is_group = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    group_type = models.CharField(max_length=10, choices=GROUP_TYPE_CHOICES, default='manual')
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES, blank=True, null=True)
    source_id = models.PositiveIntegerField(blank=True, null=True, help_text='ID of the source object (Classroom, Subject, Department)')
    participants = models.ManyToManyField(User, related_name='chat_rooms')
    pinned_by = models.ManyToManyField(User, related_name='pinned_rooms', blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_rooms')
    owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_chat_rooms')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    last_action_type = models.CharField(max_length=20, default='message')
    last_action_sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='last_actions')
    last_action_content = models.TextField(blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['source_type', 'source_id'],
                condition=models.Q(source_type__isnull=False, source_id__isnull=False),
                name='unique_source_room',
            ),
        ]

    def __str__(self):
        if self.is_group:
            return self.name or f"Group {self.id}"
        return f"Private Chat {self.id}"


class ChatMessage(models.Model):
    MESSAGE_TYPES = [
        ('text', 'Text'),
        ('image', 'Image'),
        ('file', 'File'),
    ]

    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_messages')
    content = models.TextField(blank=True)
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default='text')
    attachment_url = models.URLField(max_length=1000, null=True, blank=True, help_text='Supabase Storage URL')
    attachment_filename = models.CharField(max_length=255, blank=True)
    attachment_content_type = models.CharField(max_length=120, blank=True)
    file_size_bytes = models.PositiveIntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    is_delivered = models.BooleanField(default=False)
    is_read = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False)
    is_edited = models.BooleanField(default=False)

    parent_message = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"{self.sender.username}: {self.content[:20]}..."


class MessageReaction(models.Model):
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='message_reactions')
    emoji = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user', 'emoji')

    def __str__(self):
        return f"{self.user.username} reacted {self.emoji} to message {self.message.id}"


class ChatMember(models.Model):
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('member', 'Member'),
    ]
    chat_room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='chat_members')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_memberships')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='member')
    nickname = models.CharField(max_length=100, blank=True, null=True)
    muted = models.BooleanField(default=False)
    last_read_message = models.ForeignKey(
        ChatMessage, on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('chat_room', 'user')
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user.username} in {self.chat_room} ({self.role})"


class Mention(models.Model):
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, related_name='mentions')
    mentioned_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_mentions')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'mentioned_user')


class ReportedMessage(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]
    message = models.ForeignKey(ChatMessage, on_delete=models.SET_NULL, null=True, related_name='reports')
    reported_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_reports')
    message_content_snapshot = models.TextField(blank=True, null=True)

    reporter = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='filed_reports')
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    moderator_note = models.TextField(blank=True, null=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_reports')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.reported_user and self.message:
            self.reported_user = self.message.sender
        if not self.message_content_snapshot and self.message:
            self.message_content_snapshot = self.message.content
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Report by {self.reporter.username} on {self.reported_user.username if self.reported_user else 'deleted message'}"


class UserBlock(models.Model):
    blocker = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='blocking')
    blocked = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='blocked_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('blocker', 'blocked')

    def __str__(self):
        return f"{self.blocker.username} blocked {self.blocked.username}"


class EmergencyMessage(models.Model):
    PRIORITY_CHOICES = [
        ('info', 'Informational'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]
    AUDIENCE_CHOICES = [
        ('all', 'All'),
        ('students', 'Students'),
        ('parents', 'Parents'),
        ('teachers', 'Teachers'),
        ('staff', 'Staff'),
    ]

    title = models.CharField(max_length=200)
    message = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='warning')
    target_audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='all')
    sent_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='emergency_messages_sent')
    is_active = models.BooleanField(default=True)
    sent_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"[{self.priority.upper()}] {self.title}"
