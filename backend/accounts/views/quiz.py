import random
from decimal import Decimal

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from ..models.quiz import (
    QuestionBank,
    Question,
    Quiz,
    QuizQuestion,
    QuizAttempt,
    QuizAnswer,
)
from ..models import StudentClassEnrollment
from ..serializers.quiz import (
    QuestionBankSerializer,
    QuestionSerializer,
    QuizListSerializer,
    QuizDetailSerializer,
    QuizAttemptSerializer,
    QuizAnswerSerializer,
)
from ..serializers import full_name
from ..utils import log_audit_action


class QuestionBankViewSet(viewsets.ModelViewSet):
    serializer_class = QuestionBankSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return QuestionBank.objects.select_related('subject', 'created_by').all()
        if user.role == 'staff':
            return QuestionBank.objects.select_related('subject', 'created_by').filter(
                Q(created_by=user) | Q(is_shared=True)
            )
        return QuestionBank.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def questions(self, request, pk=None):
        bank = self.get_object()
        queryset = bank.questions.select_related('created_by').all()
        serializer = QuestionSerializer(queryset, many=True)
        return Response(serializer.data)


class QuestionViewSet(viewsets.ModelViewSet):
    serializer_class = QuestionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['content']

    def get_queryset(self):
        user = self.request.user
        queryset = Question.objects.select_related('bank', 'created_by').all()
        if user.role == 'staff':
            queryset = queryset.filter(created_by=user)
        elif user.role != 'admin':
            return Question.objects.none()

        question_type = self.request.query_params.get('question_type')
        difficulty = self.request.query_params.get('difficulty')
        bank = self.request.query_params.get('bank')
        if question_type:
            queryset = queryset.filter(question_type=question_type)
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        if bank:
            queryset = queryset.filter(bank_id=bank)
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class QuizViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'description']

    def get_serializer_class(self):
        if self.action in ('list',):
            return QuizListSerializer
        return QuizDetailSerializer

    def get_queryset(self):
        user = self.request.user
        now = timezone.now()

        if user.role == 'admin':
            return Quiz.objects.select_related('classroom', 'subject', 'created_by').all()

        if user.role == 'staff':
            classroom_ids = list(
                StudentClassEnrollment.objects.filter(
                    classroom__teacher=user
                ).values_list('classroom_id', flat=True)
            )
            return Quiz.objects.select_related('classroom', 'subject', 'created_by').filter(
                Q(created_by=user) | Q(classroom_id__in=classroom_ids)
            ).distinct()

        if user.role == 'student':
            enrolled_ids = list(
                StudentClassEnrollment.objects.filter(
                    student=user
                ).values_list('classroom_id', flat=True)
            )
            return Quiz.objects.select_related('classroom', 'subject', 'created_by').filter(
                Q(classroom_id__in=enrolled_ids),
                Q(status__in=['published', 'active']),
                Q(start_at__isnull=True) | Q(start_at__lte=now),
                Q(end_at__isnull=True) | Q(end_at__gte=now),
            )

        return Quiz.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role not in ('admin', 'staff'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers and admins can create quizzes")
        quiz = serializer.save(created_by=self.request.user)
        quiz.compute_totals()

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        quiz = self.get_object()
        user = request.user

        if user.role != 'student':
            return Response(
                {'error': 'Only students can start quiz attempts'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not quiz.is_available:
            return Response(
                {'error': 'This quiz is not currently available'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_count = QuizAttempt.objects.filter(
            quiz=quiz, student=user
        ).count()

        if existing_count >= quiz.max_attempts:
            return Response(
                {'error': 'Maximum attempts reached'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=user,
            attempt_number=existing_count + 1,
            max_score=quiz.total_points,
        )

        qq_qs = quiz.quiz_questions.select_related('question').all()
        if quiz.shuffle_questions:
            qq_list = list(qq_qs)
            random.shuffle(qq_list)
            qq_qs = qq_list

        questions_data = []
        for qq in qq_qs:
            q = qq.question
            questions_data.append({
                'id': q.id,
                'question_type': q.question_type,
                'difficulty': q.difficulty,
                'content': q.content,
                'points': q.points,
                'options': q.options if q.question_type in ('multiple_choice', 'true_false') else [],
                'order': qq.order,
            })

        return Response({
            'attempt_id': attempt.id,
            'quiz': quiz.id,
            'attempt_number': attempt.attempt_number,
            'started_at': attempt.started_at,
            'time_limit_minutes': quiz.time_limit_minutes,
            'questions': questions_data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        quiz = self.get_object()
        user = request.user

        if user.role != 'student':
            return Response(
                {'error': 'Only students can submit quiz answers'},
                status=status.HTTP_403_FORBIDDEN,
            )

        answers_data = request.data.get('answers', [])
        if not answers_data:
            return Response(
                {'error': 'No answers provided'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attempt = QuizAttempt.objects.filter(
            quiz=quiz, student=user, is_submitted=False
        ).order_by('-attempt_number').first()

        if not attempt:
            return Response(
                {'error': 'No active attempt found. Start the quiz first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            for ans in answers_data:
                question_id = ans.get('question_id')
                answer_value = ans.get('answer')

                try:
                    question = Question.objects.get(id=question_id)
                except Question.DoesNotExist:
                    continue

                is_correct, points = question.check_answer(answer_value)

                QuizAnswer.objects.update_or_create(
                    attempt=attempt,
                    question=question,
                    defaults={
                        'answer': answer_value,
                        'is_correct': is_correct,
                        'points_earned': Decimal(str(points)) if points is not None else Decimal('0'),
                    },
                )

            attempt.submitted_at = timezone.now()
            attempt.is_submitted = True
            attempt.save()

            total, max_pts, pct = attempt.compute_score()

        log_audit_action(
            user=user,
            action='submit',
            model_name='QuizAttempt',
            object_id=attempt.id,
            object_repr=f'{quiz.title} - Attempt {attempt.attempt_number}',
            description=f'Submitted quiz attempt with score {total}/{max_pts}',
            request=request,
        )

        return Response({
            'attempt_id': attempt.id,
            'total_score': float(total),
            'max_score': float(max_pts),
            'percentage': float(pct),
            'is_submitted': True,
        })

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        quiz = self.get_object()
        user = request.user

        if user.role in ('admin', 'staff'):
            attempts = QuizAttempt.objects.filter(quiz=quiz).select_related('student')
        elif user.role == 'student':
            attempts = QuizAttempt.objects.filter(
                quiz=quiz, student=user, is_submitted=True
            ).select_related('student')
        else:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        serializer = QuizAttemptSerializer(attempts, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        quiz = self.get_object()
        user = request.user

        if user.role not in ('admin', 'staff'):
            return Response(
                {'error': 'Only teachers and admins can publish quizzes'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if quiz.status == 'draft':
            quiz.status = 'active'
        elif quiz.status in ('active', 'published'):
            quiz.status = 'closed'
        elif quiz.status == 'closed':
            quiz.status = 'active'
        else:
            quiz.status = 'active'

        quiz.save(update_fields=['status', 'updated_at'])

        log_audit_action(
            user=user,
            action='update',
            model_name='Quiz',
            object_id=quiz.id,
            object_repr=quiz.title,
            description=f'Quiz status changed to {quiz.status}',
            request=request,
        )

        return Response({'status': quiz.status})

    @action(detail=True, methods=['post'])
    def grade_essay(self, request, pk=None):
        quiz = self.get_object()
        user = request.user

        if user.role not in ('admin', 'staff'):
            return Response(
                {'error': 'Only teachers and admins can grade essays'},
                status=status.HTTP_403_FORBIDDEN,
            )

        answer_id = request.data.get('answer_id')
        points_earned = request.data.get('points_earned')

        if answer_id is None or points_earned is None:
            return Response(
                {'error': 'answer_id and points_earned are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            quiz_answer = QuizAnswer.objects.select_related(
                'attempt', 'question'
            ).get(id=answer_id, attempt__quiz=quiz)
        except QuizAnswer.DoesNotExist:
            return Response(
                {'error': 'Answer not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if quiz_answer.question.question_type != 'essay':
            return Response(
                {'error': 'Can only grade essay questions'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            points_earned = Decimal(str(points_earned))
        except (TypeError, ValueError):
            return Response(
                {'error': 'points_earned must be a number'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if points_earned < 0 or points_earned > quiz_answer.question.points:
            return Response(
                {'error': f'points_earned must be between 0 and {quiz_answer.question.points}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        quiz_answer.points_earned = points_earned
        quiz_answer.is_correct = points_earned == quiz_answer.question.points
        quiz_answer.save()

        attempt = quiz_answer.attempt
        attempt.compute_score()

        log_audit_action(
            user=user,
            action='grade',
            model_name='QuizAnswer',
            object_id=quiz_answer.id,
            object_repr=f'Essay graded: {points_earned}/{quiz_answer.question.points}',
            description=f'Essay answer graded for attempt {attempt.id}',
            request=request,
        )

        return Response({
            'answer_id': quiz_answer.id,
            'points_earned': float(quiz_answer.points_earned),
            'attempt_total_score': float(attempt.total_score),
            'attempt_percentage': float(attempt.percentage),
        })


class QuizAttemptViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = QuizAttemptSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return QuizAttempt.objects.filter(student=user).select_related('quiz')
        elif user.role in ('admin', 'staff'):
            return QuizAttempt.objects.filter(
                quiz__created_by=user
            ).select_related('quiz', 'student')
        return QuizAttempt.objects.none()
