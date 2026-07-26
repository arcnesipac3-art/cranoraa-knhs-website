from rest_framework import serializers

from ..models import CurriculumStandard, LessonPlan, WeeklyPlan
from ._base import full_name


class CurriculumStandardSerializer(serializers.ModelSerializer):
    class Meta:
        model = CurriculumStandard
        fields = '__all__'


class LessonPlanSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    submitted_to_name = serializers.SerializerMethodField()
    curriculum_standard_codes = serializers.SerializerMethodField()

    class Meta:
        model = LessonPlan
        fields = ['id', 'title', 'plan_type', 'classroom', 'classroom_name',
                  'subject', 'subject_name', 'teacher', 'teacher_name', 'date',
                  'quarter', 'week', 'objectives', 'content', 'materials_needed',
                  'procedure', 'values_integration', 'remarks', 'submitted_to',
                  'submitted_to_name', 'status', 'feedback', 'curriculum_standards',
                  'curriculum_standard_codes', 'created_at', 'updated_at']

    def get_teacher_name(self, obj):
        return full_name(obj.teacher) if obj.teacher else ''

    def get_submitted_to_name(self, obj):
        return full_name(obj.submitted_to) if obj.submitted_to else ''

    def get_curriculum_standard_codes(self, obj):
        return list(obj.curriculum_standards.values_list('code', flat=True))


class LessonPlanListSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    class Meta:
        model = LessonPlan
        fields = ['id', 'title', 'plan_type', 'classroom_name', 'subject_name',
                  'teacher_name', 'date', 'quarter', 'week', 'status', 'created_at']

    def get_teacher_name(self, obj):
        return full_name(obj.teacher) if obj.teacher else ''


class WeeklyPlanSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    lesson_plan_count = serializers.SerializerMethodField()

    class Meta:
        model = WeeklyPlan
        fields = ['id', 'title', 'classroom', 'classroom_name', 'subject',
                  'subject_name', 'teacher', 'teacher_name', 'week_start',
                  'week_end', 'quarter', 'goals', 'lesson_plans',
                  'lesson_plan_count', 'status', 'notes', 'created_at', 'updated_at']

    def get_teacher_name(self, obj):
        return full_name(obj.teacher) if obj.teacher else ''

    def get_lesson_plan_count(self, obj):
        return obj.lesson_plans.count()


class WeeklyPlanListSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    lesson_plan_count = serializers.SerializerMethodField()

    class Meta:
        model = WeeklyPlan
        fields = ['id', 'title', 'classroom_name', 'subject_name', 'teacher_name',
                  'week_start', 'week_end', 'quarter', 'status',
                  'lesson_plan_count', 'created_at']

    def get_teacher_name(self, obj):
        return full_name(obj.teacher) if obj.teacher else ''

    def get_lesson_plan_count(self, obj):
        return obj.lesson_plans.count()
