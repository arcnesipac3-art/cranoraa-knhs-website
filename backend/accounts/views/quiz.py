import random
from decimal import Decimal

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count, Q, Sum, Avg, F
from django.utils import timezone

from ..models.quiz import (
    QuestionBank,
    Question,
    Quiz,
    QuizQuestion,
    QuizAttempt,
    QuizAnswer,
    IntegrityLog,
)
from ..models import StudentClassEnrollment
from ..serializers.quiz import (
    QuestionBankSerializer,
    QuestionSerializer,
    QuizListSerializer,
    QuizDetailSerializer,
    QuizAttemptSerializer,
    QuizAnswerSerializer,
    IntegrityLogSerializer,
)
from ..serializers import full_name
from ..utils import log_audit_action
from ..permissions import IsAdminOrStaff


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
        tag = self.request.query_params.get('tag')
        search_content = self.request.query_params.get('search')

        if question_type:
            queryset = queryset.filter(question_type=question_type)
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        if bank:
            queryset = queryset.filter(bank_id=bank)
        if tag:
            queryset = queryset.filter(tags__contains=[tag])
        if search_content:
            queryset = queryset.filter(
                Q(content__icontains=search_content) |
                Q(explanation__icontains=search_content)
            )
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        questions_data = request.data.get('questions', [])
        if not questions_data:
            return Response({'error': 'No questions provided'}, status=status.HTTP_400_BAD_REQUEST)

        created = []
        errors = []
        with transaction.atomic():
            for idx, q_data in enumerate(questions_data):
                q_data['created_by'] = request.user.id
                serializer = QuestionSerializer(data=q_data)
                if serializer.is_valid():
                    serializer.save()
                    created.append(serializer.data)
                else:
                    errors.append({'index': idx, 'errors': serializer.errors})

        return Response({
            'created': len(created),
            'errors': errors,
            'questions': created,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def duplicate(self, request):
        question_id = request.data.get('question_id')
        if not question_id:
            return Response({'error': 'question_id required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            original = Question.objects.get(id=question_id)
        except Question.DoesNotExist:
            return Response({'error': 'Question not found'}, status=status.HTTP_404_NOT_FOUND)

        new_q = Question.objects.create(
            bank=original.bank,
            created_by=request.user,
            question_type=original.question_type,
            difficulty=original.difficulty,
            category=original.category,
            content=original.content,
            points=original.points,
            options=original.options,
            correct_answer=original.correct_answer,
            model_answer=original.model_answer,
            explanation=original.explanation,
            tags=original.tags,
            learning_competency=original.learning_competency,
        )
        return Response(QuestionSerializer(new_q).data, status=status.HTTP_201_CREATED)


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

    def perform_update(self, serializer):
        quiz = serializer.save()
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
            'time_remaining': attempt.time_remaining,
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

            now = timezone.now()
            attempt.submitted_at = now
            attempt.is_submitted = True
            time_spent = (now - attempt.started_at).total_seconds()
            attempt.time_spent_seconds = int(time_spent)
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

    @action(detail=True, methods=['post'])
    def autosave(self, request, pk=None):
        quiz = self.get_object()
        user = request.user

        if user.role != 'student':
            return Response(
                {'error': 'Only students can autosave answers'},
                status=status.HTTP_403_FORBIDDEN,
            )

        answers_data = request.data.get('answers', [])
        if not answers_data:
            return Response({'error': 'No answers to save'}, status=status.HTTP_400_BAD_REQUEST)

        attempt = QuizAttempt.objects.filter(
            quiz=quiz, student=user, is_submitted=False
        ).order_by('-attempt_number').first()

        if not attempt:
            return Response(
                {'error': 'No active attempt found'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        saved_count = 0
        with transaction.atomic():
            for ans in answers_data:
                question_id = ans.get('question_id')
                answer_value = ans.get('answer')

                try:
                    question = Question.objects.get(id=question_id)
                except Question.DoesNotExist:
                    continue

                QuizAnswer.objects.update_or_create(
                    attempt=attempt,
                    question=question,
                    defaults={
                        'answer': answer_value,
                        'answered_at': timezone.now(),
                    },
                )
                saved_count += 1

        return Response({
            'saved': saved_count,
            'attempt_id': attempt.id,
            'time_remaining': attempt.time_remaining,
        })

    @action(detail=True, methods=['post'])
    def log_integrity(self, request, pk=None):
        quiz = self.get_object()
        user = request.user

        if user.role != 'student':
            return Response(
                {'error': 'Only students can log integrity events'},
                status=status.HTTP_403_FORBIDDEN,
            )

        event_type = request.data.get('event_type')
        details = request.data.get('details', {})

        valid_events = [c[0] for c in IntegrityLog.EVENT_TYPES]
        if event_type not in valid_events:
            return Response(
                {'error': f'Invalid event type. Valid: {valid_events}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attempt = QuizAttempt.objects.filter(
            quiz=quiz, student=user, is_submitted=False
        ).order_by('-attempt_number').first()

        if not attempt:
            return Response(
                {'error': 'No active attempt found'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ip_address = request.META.get('REMOTE_ADDR') or request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip() or None
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]

        log = IntegrityLog.objects.create(
            attempt=attempt,
            event_type=event_type,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return Response({
            'logged': True,
            'event_type': event_type,
            'timestamp': log.timestamp,
        })

    @action(detail=True, methods=['get'])
    def results(self, request, pk=None):
        quiz = self.get_object()
        user = request.user

        if user.role in ('admin', 'staff'):
            attempts = QuizAttempt.objects.filter(quiz=quiz, is_submitted=True).select_related('student')
        elif user.role == 'student':
            attempts = QuizAttempt.objects.filter(
                quiz=quiz, student=user, is_submitted=True
            ).select_related('student')
        else:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        serializer = QuizAttemptSerializer(attempts, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        quiz = self.get_object()
        user = request.user

        if user.role not in ('admin', 'staff'):
            return Response(
                {'error': 'Only teachers and admins can view analytics'},
                status=status.HTTP_403_FORBIDDEN,
            )

        attempts = QuizAttempt.objects.filter(quiz=quiz, is_submitted=True)

        stats = attempts.aggregate(
            total_attempts=Count('id'),
            avg_score=Avg('percentage'),
            max_score=Avg('percentage'),
        )

        score_distribution = {
            '0-25': attempts.filter(percentage__lt=25).count(),
            '25-50': attempts.filter(percentage__gte=25, percentage__lt=50).count(),
            '50-75': attempts.filter(percentage__gte=50, percentage__lt=75).count(),
            '75-100': attempts.filter(percentage__gte=75).count(),
        }

        pass_rate = 0
        if quiz.passing_score:
            passed = attempts.filter(percentage__gte=quiz.passing_score).count()
            pass_rate = round((passed / stats['total_attempts'] * 100), 1) if stats['total_attempts'] > 0 else 0

        question_stats = []
        for qq in quiz.quiz_questions.select_related('question').all():
            q = qq.question
            q_answers = QuizAnswer.objects.filter(
                attempt__quiz=quiz, attempt__is_submitted=True, question=q
            )
            total_answered = q_answers.count()
            correct_count = q_answers.filter(is_correct=True).count()
            question_stats.append({
                'question_id': q.id,
                'content': q.content[:100],
                'question_type': q.question_type,
                'total_answered': total_answered,
                'correct_count': correct_count,
                'accuracy': round((correct_count / total_answered * 100), 1) if total_answered > 0 else 0,
                'points': q.points,
            })

        avg_time = attempts.exclude(time_spent_seconds__isnull=True).aggregate(
            avg_time=Avg('time_spent_seconds')
        )

        integrity_count = IntegrityLog.objects.filter(
            attempt__quiz=quiz
        ).count()

        return Response({
            'quiz_id': quiz.id,
            'quiz_title': quiz.title,
            'total_attempts': stats['total_attempts'] or 0,
            'average_score': round(float(stats['avg_score'] or 0), 1),
            'pass_rate': pass_rate,
            'passing_score': float(quiz.passing_score) if quiz.passing_score else None,
            'score_distribution': score_distribution,
            'question_stats': question_stats,
            'average_time_seconds': avg_time['avg_time'],
            'integrity_events_count': integrity_count,
        })

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        quiz = self.get_object()
        user = request.user

        if user.role not in ('admin', 'staff'):
            return Response(
                {'error': 'Only teachers and admins can publish quizzes'},
                status=status.HTTP_403_FORBIDDEN,
            )

        target_status = request.data.get('status')

        if target_status:
            if target_status not in ['draft', 'published', 'active', 'closed']:
                return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
            quiz.status = target_status
        else:
            transitions = {
                'draft': 'active',
                'active': 'closed',
                'published': 'closed',
                'closed': 'active',
            }
            quiz.status = transitions.get(quiz.status, 'active')

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
    def duplicate(self, request, pk=None):
        original = self.get_object()
        user = request.user

        if user.role not in ('admin', 'staff'):
            return Response(
                {'error': 'Only teachers and admins can duplicate quizzes'},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_quiz = Quiz.objects.create(
            title=f"{original.title} (Copy)",
            description=original.description,
            classroom=original.classroom,
            subject=original.subject,
            created_by=user,
            status='draft',
            time_limit_minutes=original.time_limit_minutes,
            max_attempts=original.max_attempts,
            shuffle_questions=original.shuffle_questions,
            show_correct_answers=original.show_correct_answers,
            passing_score=original.passing_score,
            grade_component=original.grade_component,
        )

        for qq in original.quiz_questions.all():
            QuizQuestion.objects.create(
                quiz=new_quiz,
                question=qq.question,
                order=qq.order,
            )

        new_quiz.compute_totals()

        return Response(QuizDetailSerializer(new_quiz, context={'request': request}).data,
                       status=status.HTTP_201_CREATED)

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
        comment = request.data.get('comment', '')

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
        if comment:
            quiz_answer.answer = quiz_answer.answer or {}
            if isinstance(quiz_answer.answer, dict):
                quiz_answer.answer['_teacher_comment'] = comment
            else:
                quiz_answer.answer = {'value': quiz_answer.answer, '_teacher_comment': comment}
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

    @action(detail=True, methods=['post'])
    def bulk_grade_essay(self, request, pk=None):
        quiz = self.get_object()
        user = request.user

        if user.role not in ('admin', 'staff'):
            return Response(
                {'error': 'Only teachers and admins can grade essays'},
                status=status.HTTP_403_FORBIDDEN,
            )

        grades = request.data.get('grades', [])
        if not grades:
            return Response({'error': 'No grades provided'}, status=status.HTTP_400_BAD_REQUEST)

        graded = []
        errors = []
        with transaction.atomic():
            for idx, item in enumerate(grades):
                answer_id = item.get('answer_id')
                points = item.get('points_earned')
                comment = item.get('comment', '')

                try:
                    qa = QuizAnswer.objects.select_related('attempt', 'question').get(
                        id=answer_id, attempt__quiz=quiz, question__question_type='essay'
                    )
                except QuizAnswer.DoesNotExist:
                    errors.append({'index': idx, 'error': 'Answer not found'})
                    continue

                try:
                    points = Decimal(str(points))
                except (TypeError, ValueError):
                    errors.append({'index': idx, 'error': 'Invalid points'})
                    continue

                if points < 0 or points > qa.question.points:
                    errors.append({'index': idx, 'error': f'Points must be 0-{qa.question.points}'})
                    continue

                qa.points_earned = points
                qa.is_correct = points == qa.question.points
                if comment:
                    qa.answer = qa.answer or {}
                    if isinstance(qa.answer, dict):
                        qa.answer['_teacher_comment'] = comment
                    else:
                        qa.answer = {'value': qa.answer, '_teacher_comment': comment}
                qa.save()
                graded.append(answer_id)

            if graded:
                attempt_ids = QuizAnswer.objects.filter(id__in=graded).values_list('attempt_id', flat=True).distinct()
                for aid in attempt_ids:
                    try:
                        a = QuizAttempt.objects.get(id=aid)
                        a.compute_score()
                    except QuizAttempt.DoesNotExist:
                        continue

        return Response({
            'graded': len(graded),
            'errors': errors,
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

    @action(detail=True, methods=['get'])
    def integrity_logs(self, request, pk=None):
        attempt = self.get_object()
        user = request.user

        if user.role in ('admin', 'staff'):
            logs = attempt.integrity_logs.all()
        elif user.role == 'student' and attempt.student == user:
            logs = attempt.integrity_logs.all()
        else:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        serializer = IntegrityLogSerializer(logs, many=True)
        return Response(serializer.data)

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
