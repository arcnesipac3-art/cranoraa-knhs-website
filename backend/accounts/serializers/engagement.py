from rest_framework import serializers
from django.contrib.auth import get_user_model

from .events import SchoolEvent, EventRSVP
from .badges import Badge, StudentBadge, StudentLeaderboard
from ._base import full_name

User = get_user_model()


class EventRSVPSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = EventRSVP
        fields = ['id', 'event', 'user', 'user_name', 'status', 'created_at', 'updated_at']
        read_only_fields = ['user']

    def get_user_name(self, obj):
        return full_name(obj.user)


class SchoolEventSerializer(serializers.ModelSerializer):
    rsvp_going_count = serializers.IntegerField(read_only=True, default=0)
    rsvp_maybe_count = serializers.IntegerField(read_only=True, default=0)
    rsvp_not_going_count = serializers.IntegerField(read_only=True, default=0)
    my_rsvp = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SchoolEvent
        fields = [
            'id', 'title', 'description', 'category', 'target_audience',
            'start_date', 'start_time', 'end_date', 'end_time', 'is_all_day',
            'location', 'created_by', 'created_by_name',
            'rsvp_going_count', 'rsvp_maybe_count', 'rsvp_not_going_count', 'my_rsvp',
            'created_at', 'updated_at',
        ]

    def get_my_rsvp(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            rsvp = obj.rsvps.filter(user=request.user).first()
            return rsvp.status if rsvp else None
        return None

    def get_created_by_name(self, obj):
        if obj.created_by:
            return full_name(obj.created_by)
        return ''


class BadgeSerializer(serializers.ModelSerializer):
    awarded_count = serializers.SerializerMethodField()

    class Meta:
        model = Badge
        fields = ['id', 'name', 'description', 'icon', 'category', 'color', 'points', 'is_active', 'awarded_count', 'created_at']

    def get_awarded_count(self, obj):
        return obj.awarded_to.count()


class StudentBadgeSerializer(serializers.ModelSerializer):
    badge_name = serializers.CharField(source='badge.name', read_only=True)
    badge_icon = serializers.CharField(source='badge.icon', read_only=True)
    badge_category = serializers.CharField(source='badge.category', read_only=True)
    badge_color = serializers.CharField(source='badge.color', read_only=True)
    awarded_by_name = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = StudentBadge
        fields = ['id', 'student', 'student_name', 'badge', 'badge_name', 'badge_icon', 'badge_category', 'badge_color', 'awarded_by', 'awarded_by_name', 'reason', 'awarded_at']

    def get_awarded_by_name(self, obj):
        if obj.awarded_by:
            return full_name(obj.awarded_by)
        return ''

    def get_student_name(self, obj):
        return full_name(obj.student)


class StudentLeaderboardSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_profile_picture = serializers.SerializerMethodField()
    badge_count = serializers.SerializerMethodField()

    class Meta:
        model = StudentLeaderboard
        fields = ['id', 'student', 'student_name', 'student_profile_picture', 'total_points', 'academic_rank', 'attendance_streak', 'longest_attendance_streak', 'badge_count', 'last_active_date']

    def get_student_name(self, obj):
        return full_name(obj.student)

    def get_student_profile_picture(self, obj):
        try:
            return obj.student.profile.profile_picture or None
        except Exception:
            return None

    def get_badge_count(self, obj):
        return obj.student.student_badges.count()
