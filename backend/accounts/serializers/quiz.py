from rest_framework import serializers

from ..models.quiz import (
    Question, QuestionBank, Quiz, QuizQuestion, QuizAttempt, QuizAnswer,
)
from ._base import full_name


class QuestionSerializer(serializers.ModelSerializer):
    bank_name = serializers.CharField(source='bank.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = [
            'id', 'bank', 'bank_name', 'created_by', 'created_by_name',
            'question_type', 'difficulty', 'category', 'content', 'points',
            'options', 'correct_answer', 'model_answer', 'explanation',
            'is_active', 'usage_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'usage_count', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        return full_name(obj.created_by) if obj.created_by else ''


class QuestionBankSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True, default=None)
    created_by_name = serializers.SerializerMethodField()
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = QuestionBank
        fields = [
            'id', 'name', 'description', 'subject', 'subject_name',
            'created_by', 'created_by_name', 'is_shared',
            'question_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        return full_name(obj.created_by) if obj.created_by else ''

    def get_question_count(self, obj):
        return obj.questions.count()


class QuizQuestionSerializer(serializers.ModelSerializer):
    question = QuestionSerializer(read_only=True)

    class Meta:
        model = QuizQuestion
        fields = ['id', 'quiz', 'question', 'order']
        read_only_fields = ['id']


class QuizListSerializer(serializers.ModelSerializer):
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description',
            'classroom', 'classroom_name',
            'subject', 'subject_name',
            'created_by', 'created_by_name',
            'status', 'time_limit_minutes', 'max_attempts',
            'start_at', 'end_at',
            'total_points', 'question_count', 'created_at',
        ]
        read_only_fields = ['id', 'total_points', 'question_count', 'created_at']

    def get_created_by_name(self, obj):
        return full_name(obj.created_by) if obj.created_by else ''


class QuizDetailSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(source='quiz_questions', many=True, read_only=True)
    attempts_count = serializers.SerializerMethodField()
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description',
            'classroom', 'classroom_name',
            'subject', 'subject_name',
            'created_by', 'created_by_name',
            'status', 'time_limit_minutes', 'max_attempts',
            'shuffle_questions', 'show_correct_answers',
            'start_at', 'end_at', 'grade_component',
            'total_points', 'question_count',
            'questions', 'attempts_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'total_points', 'question_count', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        return full_name(obj.created_by) if obj.created_by else ''

    def get_attempts_count(self, obj):
        return obj.attempts.count()


class QuizAttemptSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    student_name = serializers.SerializerMethodField()
    answers = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz', 'quiz_title', 'student', 'student_name',
            'attempt_number', 'started_at', 'submitted_at',
            'time_spent_seconds', 'total_score', 'max_score', 'percentage',
            'is_submitted', 'is_graded', 'answers',
        ]
        read_only_fields = [
            'id', 'started_at', 'total_score', 'max_score', 'percentage', 'is_graded',
        ]

    def get_student_name(self, obj):
        return full_name(obj.student) if obj.student else ''

    def get_answers(self, obj):
        qs = obj.answers.select_related('question').order_by('question__question_type')
        return QuizAnswerSerializer(qs, many=True, context=self.context).data

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        request = self.context.get('request')
        if request and request.user.role == 'student' and not instance.quiz.show_correct_answers:
            for answer in rep.get('answers', []):
                answer.pop('is_correct', None)
                answer.pop('points_earned', None)
        return rep


class QuizAnswerSerializer(serializers.ModelSerializer):
    question_content = serializers.CharField(source='question.content', read_only=True)
    question_type = serializers.CharField(source='question.question_type', read_only=True)

    class Meta:
        model = QuizAnswer
        fields = [
            'id', 'attempt', 'question', 'question_content', 'question_type',
            'answer', 'is_correct', 'points_earned', 'answered_at',
        ]
        read_only_fields = ['id', 'answered_at']
