from django.db import models
from django.utils import timezone

from .user import User
from .academic import Classroom, Subject


class QuestionBank(models.Model):
    CATEGORY_CHOICES = [
        ('conceptual', 'Conceptual Understanding'),
        ('procedural', 'Procedural Fluency'),
        ('application', 'Application'),
        ('analysis', 'Analysis'),
        ('evaluation', 'Evaluation'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='question_banks', null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='question_banks')
    is_shared = models.BooleanField(default=False, help_text="Visible to all teachers")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['subject', 'created_at']),
            models.Index(fields=['created_by', 'created_at']),
            models.Index(fields=['is_shared']),
        ]

    def __str__(self):
        return self.name


class Question(models.Model):
    QUESTION_TYPE_CHOICES = [
        ('multiple_choice', 'Multiple Choice'),
        ('identification', 'Identification'),
        ('essay', 'Essay'),
        ('true_false', 'True or False'),
        ('fill_blank', 'Fill in the Blank'),
    ]

    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    ]

    bank = models.ForeignKey(QuestionBank, on_delete=models.CASCADE, related_name='questions', null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='questions')

    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES, db_index=True)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='medium', db_index=True)
    category = models.CharField(max_length=20, choices=QuestionBank.CATEGORY_CHOICES, default='other')

    content = models.TextField(help_text="The question text")
    points = models.IntegerField(default=1)

    options = models.JSONField(default=list, blank=True, help_text="JSON array of options for MC/TF questions")
    correct_answer = models.CharField(max_length=500, blank=True, help_text="Correct answer for identification/fill-blank")
    model_answer = models.TextField(blank=True, help_text="Model answer or rubric for essay questions")
    explanation = models.TextField(blank=True, help_text="Explanation shown after answering")

    tags = models.JSONField(default=list, blank=True, help_text="Tags for categorization e.g. ['algebra','chapter1']")
    learning_competency = models.CharField(max_length=300, blank=True, help_text="Learning competency reference")

    is_active = models.BooleanField(default=True)
    usage_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['difficulty', 'created_at']
        indexes = [
            models.Index(fields=['bank', 'question_type']),
            models.Index(fields=['created_by', 'is_active']),
            models.Index(fields=['question_type', 'difficulty']),
        ]

    def __str__(self):
        return f"[{self.get_question_type_display()}] {self.content[:80]}"

    def check_answer(self, student_answer):
        """Check if a student answer is correct. Returns (is_correct, points_earned)."""
        if self.question_type in ('multiple_choice', 'true_false'):
            correct_labels = [opt['label'] for opt in self.options if opt.get('is_correct')]
            if isinstance(student_answer, list):
                is_correct = set(student_answer) == set(correct_labels)
            else:
                is_correct = student_answer in correct_labels
        elif self.question_type in ('identification', 'fill_blank'):
            if not student_answer or not isinstance(student_answer, str):
                return False, 0
            is_correct = student_answer.strip().lower() == self.correct_answer.strip().lower()
        else:
            return None, 0

        return is_correct, self.points if is_correct else 0


class Quiz(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('active', 'Active'),
        ('closed', 'Closed'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name='quizzes')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='quizzes')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_quizzes')

    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='draft', db_index=True)

    time_limit_minutes = models.IntegerField(null=True, blank=True, help_text="Null = no time limit")
    max_attempts = models.IntegerField(default=1, help_text="Number of allowed attempts")
    shuffle_questions = models.BooleanField(default=False)
    show_correct_answers = models.BooleanField(default=True, help_text="Show correct answers after submission")
    passing_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Minimum percentage to pass (null = no passing score)")

    start_at = models.DateTimeField(null=True, blank=True)
    end_at = models.DateTimeField(null=True, blank=True)

    grade_component = models.CharField(max_length=30, blank=True, default='',
        choices=[
            ('', 'Not linked'),
            ('quiz', 'Quiz'),
            ('exam', 'Exam'),
            ('activity', 'Activity'),
            ('written_work', 'Written Work'),
            ('performance_task', 'Performance Task'),
            ('quarterly_assessment', 'Quarterly Assessment'),
        ])

    total_points = models.IntegerField(default=0)
    question_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['classroom', 'status']),
            models.Index(fields=['subject', 'status']),
            models.Index(fields=['created_by', 'status']),
            models.Index(fields=['status', 'start_at', 'end_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.classroom.name}"

    def compute_totals(self):
        agg = self.quiz_questions.aggregate(
            total=models.Sum('question__points'),
            count=models.Count('question')
        )
        Quiz.objects.filter(pk=self.pk).update(
            total_points=agg['total'] or 0,
            question_count=agg['count'] or 0,
        )

    @property
    def is_available(self):
        now = timezone.now()
        if self.status != 'active':
            return False
        if self.start_at and now < self.start_at:
            return False
        if self.end_at and now > self.end_at:
            return False
        return True

    @property
    def time_remaining_from_start(self):
        if not self.start_at or not self.time_limit_minutes:
            return None
        end = self.start_at + timezone.timedelta(minutes=self.time_limit_minutes)
        remaining = (end - timezone.now()).total_seconds()
        return max(0, int(remaining))


class QuizQuestion(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='quiz_questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='quiz_assignments')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
        unique_together = ['quiz', 'question']
        indexes = [
            models.Index(fields=['quiz', 'order']),
        ]

    def __str__(self):
        return f"{self.quiz.title} - Q{self.order}: {self.question.content[:50]}"


class QuizAttempt(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='quiz_attempts')
    attempt_number = models.IntegerField(default=1)

    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    time_spent_seconds = models.IntegerField(null=True, blank=True)

    total_score = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    max_score = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    is_submitted = models.BooleanField(default=False)
    is_graded = models.BooleanField(default=False)

    class Meta:
        unique_together = ['quiz', 'student', 'attempt_number']
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['quiz', 'student', 'is_submitted']),
            models.Index(fields=['student', 'is_submitted']),
            models.Index(fields=['quiz', 'is_submitted']),
        ]

    def __str__(self):
        return f"{self.student.username} - {self.quiz.title} (Attempt {self.attempt_number})"

    def compute_score(self):
        from django.db.models import Sum
        agg = self.answers.aggregate(
            total=Sum('points_earned'),
        )
        total = agg['total'] or 0
        max_pts = self.max_score or 1
        pct = round((float(total) / float(max_pts) * 100), 2) if max_pts > 0 else 0

        QuizAttempt.objects.filter(pk=self.pk).update(
            total_score=total,
            max_score=max_pts,
            percentage=pct,
            is_graded=True,
        )
        return total, max_pts, pct

    @property
    def time_remaining(self):
        if not self.quiz.time_limit_minutes:
            return None
        elapsed = (timezone.now() - self.started_at).total_seconds()
        limit_seconds = self.quiz.time_limit_minutes * 60
        return max(0, int(limit_seconds - elapsed))


class QuizAnswer(models.Model):
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='quiz_answers')

    answer = models.JSONField(null=True, blank=True, help_text="Student answer (string or array)")
    is_correct = models.BooleanField(null=True, blank=True)
    points_earned = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['attempt', 'question']
        indexes = [
            models.Index(fields=['attempt', 'question']),
        ]

    def __str__(self):
        return f"Attempt {self.attempt.id} - Q{self.question.id}: {self.answer}"


class IntegrityLog(models.Model):
    EVENT_TYPES = [
        ('tab_switch', 'Tab Switch'),
        ('tab_blur', 'Tab Blur'),
        ('window_blur', 'Window Blur'),
        ('fullscreen_exit', 'Fullscreen Exit'),
        ('browser_refresh', 'Browser Refresh'),
        ('multiple_logins', 'Multiple Logins'),
        ('device_change', 'Device Change'),
        ('suspicious_time', 'Suspicious Completion Time'),
        ('copy_attempt', 'Copy Attempt'),
        ('paste_attempt', 'Paste Attempt'),
        ('right_click', 'Right Click'),
        ('devtools_open', 'DevTools Open'),
    ]

    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='integrity_logs')
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES, db_index=True)
    details = models.JSONField(default=dict, blank=True, help_text="Additional event metadata")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['attempt', 'event_type']),
            models.Index(fields=['attempt', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.attempt} - {self.get_event_type_display()} at {self.timestamp}"
