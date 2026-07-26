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

    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='medium')
    category = models.CharField(max_length=20, choices=QuestionBank.CATEGORY_CHOICES, default='other')

    content = models.TextField(help_text="The question text")
    points = models.IntegerField(default=1)

    # Multiple choice / True-False options stored as JSON
    # For MC: [{"label": "A", "text": "Option A", "is_correct": true}, ...]
    # For T/F: [{"label": "True", "text": "True", "is_correct": true}, {"label": "False", "text": "False", "is_correct": false}]
    options = models.JSONField(default=list, blank=True, help_text="JSON array of options for MC/TF questions")

    # Correct answer for identification / fill-in-the-blank
    correct_answer = models.CharField(max_length=500, blank=True, help_text="Correct answer for identification/fill-blank")

    # Essay rubric / model answer
    model_answer = models.TextField(blank=True, help_text="Model answer or rubric for essay questions")

    explanation = models.TextField(blank=True, help_text="Explanation shown after answering")

    is_active = models.BooleanField(default=True)
    usage_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['difficulty', 'created_at']

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
            is_correct = student_answer.strip().lower() == self.correct_answer.strip().lower()
        else:
            # Essay questions are not auto-graded
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

    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='draft')

    time_limit_minutes = models.IntegerField(null=True, blank=True, help_text="Null = no time limit")
    max_attempts = models.IntegerField(default=1, help_text="Number of allowed attempts")
    shuffle_questions = models.BooleanField(default=False)
    show_correct_answers = models.BooleanField(default=True, help_text="Show correct answers after submission")

    start_at = models.DateTimeField(null=True, blank=True)
    end_at = models.DateTimeField(null=True, blank=True)

    grade_component = models.CharField(max_length=30, blank=True, default='',
        choices=[('', 'Not linked'), ('written_work', 'Written Work'), ('performance_task', 'Performance Task'), ('quarterly_assessment', 'Quarterly Assessment')])

    total_points = models.IntegerField(default=0)
    question_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.classroom.name}"

    def compute_totals(self):
        total = sum(q.points for q in self.quiz_questions.all())
        count = self.quiz_questions.count()
        Quiz.objects.filter(pk=self.pk).update(total_points=total, question_count=count)

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


class QuizQuestion(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='quiz_questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='quiz_assignments')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
        unique_together = ['quiz', 'question']

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

    def __str__(self):
        return f"{self.student.username} - {self.quiz.title} (Attempt {self.attempt_number})"

    def compute_score(self):
        answers = self.answers.all()
        total = sum(a.points_earned for a in answers)
        max_pts = sum(a.question.points for a in answers)
        pct = round((total / max_pts * 100), 2) if max_pts > 0 else 0

        QuizAttempt.objects.filter(pk=self.pk).update(
            total_score=total,
            max_score=max_pts,
            percentage=pct,
            is_graded=True,
        )
        return total, max_pts, pct


class QuizAnswer(models.Model):
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='quiz_answers')

    # For MC/TF: label(s), for identification/fill-blank: text
    answer = models.JSONField(null=True, blank=True, help_text="Student answer (string or array)")

    is_correct = models.BooleanField(null=True, blank=True)
    points_earned = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['attempt', 'question']

    def __str__(self):
        return f"Attempt {self.attempt.id} - Q{self.question.id}: {self.answer}"
