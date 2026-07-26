from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from ..models import (
    CurriculumStandard,
    LessonPlan,
    WeeklyPlan,
    StudentClassEnrollment,
    Classroom,
    ClassroomSubject,
)
from ..serializers import (
    CurriculumStandardSerializer,
    LessonPlanSerializer,
    LessonPlanListSerializer,
    WeeklyPlanSerializer,
    WeeklyPlanListSerializer,
    full_name,
)
from ..utils import log_audit_action


class CurriculumStandardViewSet(viewsets.ModelViewSet):
    serializer_class = CurriculumStandardSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['code', 'description']

    def get_queryset(self):
        queryset = CurriculumStandard.objects.select_related('subject')

        subject_id = self.request.query_params.get('subject')
        grade_level = self.request.query_params.get('grade_level')
        quarter = self.request.query_params.get('quarter')
        semester = self.request.query_params.get('semester')

        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        if grade_level:
            queryset = queryset.filter(grade_level=grade_level)
        if quarter:
            queryset = queryset.filter(quarter=quarter)
        if semester:
            queryset = queryset.filter(semester=semester)

        return queryset

    def perform_create(self, serializer):
        if self.request.user.role not in ['admin', 'staff']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins and staff can create curriculum standards")

        instance = serializer.save()
        log_audit_action(
            user=self.request.user,
            action='create',
            model_name='CurriculumStandard',
            object_id=instance.id,
            object_repr=str(instance),
            description=f'Created curriculum standard: {instance.code}',
            request=self.request,
        )

    def perform_update(self, serializer):
        if self.request.user.role not in ['admin', 'staff']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins and staff can update curriculum standards")

        instance = serializer.save()
        log_audit_action(
            user=self.request.user,
            action='update',
            model_name='CurriculumStandard',
            object_id=instance.id,
            object_repr=str(instance),
            description=f'Updated curriculum standard: {instance.code}',
            request=self.request,
        )

    def perform_destroy(self, instance):
        if self.request.user.role not in ['admin', 'staff']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only admins and staff can delete curriculum standards")

        log_audit_action(
            user=self.request.user,
            action='delete',
            model_name='CurriculumStandard',
            object_id=instance.id,
            object_repr=str(instance),
            description=f'Deleted curriculum standard: {instance.code}',
            request=self.request,
        )
        instance.delete()


class LessonPlanViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return LessonPlanListSerializer
        return LessonPlanSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = LessonPlan.objects.select_related(
            'classroom', 'subject', 'teacher', 'submitted_to',
        )

        if user.role == 'student':
            enrolled_ids = list(
                StudentClassEnrollment.objects.filter(student=user)
                .values_list('classroom_id', flat=True)
            )
            queryset = queryset.filter(
                classroom_id__in=enrolled_ids, status='approved',
            )
        elif user.role == 'staff':
            teacher_classroom_ids = list(
                Classroom.objects.filter(teacher=user).values_list('id', flat=True)
            )
            subject_classroom_ids = list(
                ClassroomSubject.objects.filter(teacher=user)
                .values_list('classroom_id', flat=True)
            )
            all_classroom_ids = set(teacher_classroom_ids + subject_classroom_ids)
            queryset = queryset.filter(
                Q(teacher=user) | Q(classroom_id__in=all_classroom_ids),
            )
        # admin sees all

        classroom_id = self.request.query_params.get('classroom')
        subject_id = self.request.query_params.get('subject')
        quarter = self.request.query_params.get('quarter')
        week = self.request.query_params.get('week')
        plan_type = self.request.query_params.get('plan_type')
        plan_status = self.request.query_params.get('status')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        if quarter:
            queryset = queryset.filter(quarter=quarter)
        if week:
            queryset = queryset.filter(week=week)
        if plan_type:
            queryset = queryset.filter(plan_type=plan_type)
        if plan_status:
            queryset = queryset.filter(status=plan_status)
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        return queryset.order_by('-date')

    def perform_create(self, serializer):
        if self.request.user.role not in ['admin', 'staff']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers and admins can create lesson plans")

        instance = serializer.save(teacher=self.request.user)

        log_audit_action(
            user=self.request.user,
            action='create',
            model_name='LessonPlan',
            object_id=instance.id,
            object_repr=instance.title,
            description=f'Created lesson plan: {instance.title}',
            request=self.request,
        )

    @action(detail=True, methods=['post'])
    def submit_for_review(self, request, pk=None):
        lesson_plan = self.get_object()
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        if lesson_plan.status not in ['draft', 'revision_needed']:
            return Response(
                {'error': 'Only draft or revision_needed plans can be submitted'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lesson_plan.status = 'submitted'
        lesson_plan.submitted_to = request.user
        lesson_plan.save()

        log_audit_action(
            user=request.user,
            action='update',
            model_name='LessonPlan',
            object_id=lesson_plan.id,
            object_repr=lesson_plan.title,
            description=f'Submitted lesson plan for review: {lesson_plan.title}',
            request=request,
        )

        serializer = self.get_serializer(lesson_plan)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        lesson_plan = self.get_object()
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        if lesson_plan.status != 'submitted':
            return Response(
                {'error': 'Only submitted plans can be approved'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lesson_plan.status = 'approved'
        lesson_plan.feedback = request.data.get('feedback', '')
        lesson_plan.save()

        log_audit_action(
            user=request.user,
            action='update',
            model_name='LessonPlan',
            object_id=lesson_plan.id,
            object_repr=lesson_plan.title,
            description=f'Approved lesson plan: {lesson_plan.title}',
            request=request,
        )

        serializer = self.get_serializer(lesson_plan)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def request_revision(self, request, pk=None):
        lesson_plan = self.get_object()
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        if lesson_plan.status != 'submitted':
            return Response(
                {'error': 'Only submitted plans can be sent back for revision'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lesson_plan.status = 'revision_needed'
        lesson_plan.feedback = request.data.get('feedback', '')
        lesson_plan.save()

        log_audit_action(
            user=request.user,
            action='update',
            model_name='LessonPlan',
            object_id=lesson_plan.id,
            object_repr=lesson_plan.title,
            description=f'Requested revision for lesson plan: {lesson_plan.title}',
            request=request,
        )

        serializer = self.get_serializer(lesson_plan)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        user = request.user
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if not date_from or not date_to:
            return Response(
                {'error': 'date_from and date_to query parameters are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        queryset = LessonPlan.objects.select_related(
            'classroom', 'subject', 'teacher',
        ).filter(date__gte=date_from, date__lte=date_to)

        if user.role == 'student':
            enrolled_ids = list(
                StudentClassEnrollment.objects.filter(student=user)
                .values_list('classroom_id', flat=True)
            )
            queryset = queryset.filter(
                classroom_id__in=enrolled_ids, status='approved',
            )
        elif user.role == 'staff':
            teacher_classroom_ids = list(
                Classroom.objects.filter(teacher=user).values_list('id', flat=True)
            )
            subject_classroom_ids = list(
                ClassroomSubject.objects.filter(teacher=user)
                .values_list('classroom_id', flat=True)
            )
            all_classroom_ids = set(teacher_classroom_ids + subject_classroom_ids)
            queryset = queryset.filter(
                Q(teacher=user) | Q(classroom_id__in=all_classroom_ids),
            )

        plans = list(queryset.values(
            'id', 'title', 'plan_type', 'date', 'status',
            'classroom__name', 'subject__name', 'teacher__first_name', 'teacher__last_name',
        ))

        calendar_events = []
        for plan in plans:
            calendar_events.append({
                'id': plan['id'],
                'title': plan['title'],
                'date': plan['date'].isoformat(),
                'plan_type': plan['plan_type'],
                'status': plan['status'],
                'classroom': plan['classroom__name'],
                'subject': plan['subject__name'],
                'teacher': f"{plan['teacher__first_name']} {plan['teacher__last_name']}",
            })

        return Response(calendar_events)


class WeeklyPlanViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return WeeklyPlanListSerializer
        return WeeklyPlanSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = WeeklyPlan.objects.select_related(
            'classroom', 'subject', 'teacher',
        )

        if user.role == 'student':
            enrolled_ids = list(
                StudentClassEnrollment.objects.filter(student=user)
                .values_list('classroom_id', flat=True)
            )
            queryset = queryset.filter(
                classroom_id__in=enrolled_ids, status='approved',
            )
        elif user.role == 'staff':
            teacher_classroom_ids = list(
                Classroom.objects.filter(teacher=user).values_list('id', flat=True)
            )
            subject_classroom_ids = list(
                ClassroomSubject.objects.filter(teacher=user)
                .values_list('classroom_id', flat=True)
            )
            all_classroom_ids = set(teacher_classroom_ids + subject_classroom_ids)
            queryset = queryset.filter(
                Q(teacher=user) | Q(classroom_id__in=all_classroom_ids),
            )
        # admin sees all

        classroom_id = self.request.query_params.get('classroom')
        subject_id = self.request.query_params.get('subject')
        quarter = self.request.query_params.get('quarter')
        plan_status = self.request.query_params.get('status')

        if classroom_id:
            queryset = queryset.filter(classroom_id=classroom_id)
        if subject_id:
            queryset = queryset.filter(subject_id=subject_id)
        if quarter:
            queryset = queryset.filter(quarter=quarter)
        if plan_status:
            queryset = queryset.filter(status=plan_status)

        return queryset.order_by('-week_start')

    def perform_create(self, serializer):
        if self.request.user.role not in ['admin', 'staff']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only teachers and admins can create weekly plans")

        instance = serializer.save(teacher=self.request.user)

        log_audit_action(
            user=self.request.user,
            action='create',
            model_name='WeeklyPlan',
            object_id=instance.id,
            object_repr=instance.title,
            description=f'Created weekly plan: {instance.title}',
            request=self.request,
        )

    @action(detail=True, methods=['post'])
    def submit_for_review(self, request, pk=None):
        weekly_plan = self.get_object()
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        if weekly_plan.status != 'draft':
            return Response(
                {'error': 'Only draft plans can be submitted'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        weekly_plan.status = 'submitted'
        weekly_plan.save()

        log_audit_action(
            user=request.user,
            action='update',
            model_name='WeeklyPlan',
            object_id=weekly_plan.id,
            object_repr=weekly_plan.title,
            description=f'Submitted weekly plan for review: {weekly_plan.title}',
            request=request,
        )

        serializer = self.get_serializer(weekly_plan)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        weekly_plan = self.get_object()
        if request.user.role not in ['admin', 'staff']:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        if weekly_plan.status != 'submitted':
            return Response(
                {'error': 'Only submitted plans can be approved'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        weekly_plan.status = 'approved'
        weekly_plan.notes = request.data.get('notes', weekly_plan.notes)
        weekly_plan.save()

        log_audit_action(
            user=request.user,
            action='update',
            model_name='WeeklyPlan',
            object_id=weekly_plan.id,
            object_repr=weekly_plan.title,
            description=f'Approved weekly plan: {weekly_plan.title}',
            request=request,
        )

        serializer = self.get_serializer(weekly_plan)
        return Response(serializer.data)
