from rest_framework import serializers
from django.db import transaction

from ..models import Attendance, AbsenceExcuse, Subject, TimeSlot, Schedule
from ._base import full_name


class TimeSlotSerializer(serializers.ModelSerializer):
    day_display = serializers.CharField(source='get_day_display', read_only=True)
    start_time_display = serializers.SerializerMethodField()
    end_time_display = serializers.SerializerMethodField()
    classroom_name = serializers.SerializerMethodField()

    class Meta:
        model = TimeSlot
        fields = ['id', 'classroom', 'classroom_name', 'day', 'day_display', 'start_time', 'end_time',
                  'start_time_display', 'end_time_display', 'label']
        extra_kwargs = {
            'classroom': {'required': False, 'allow_null': True},
        }

    def get_classroom_name(self, obj):
        return obj.classroom.name if obj.classroom else None

    def get_start_time_display(self, obj):
        return obj.start_time.strftime('%I:%M %p')

    def get_end_time_display(self, obj):
        return obj.end_time.strftime('%I:%M %p')


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_email = serializers.CharField(source='student.email', read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    marked_by_name = serializers.SerializerMethodField()
    schedule_id = serializers.PrimaryKeyRelatedField(queryset=Schedule.objects.all(), source='schedule', required=False, allow_null=True)
    subject_id = serializers.PrimaryKeyRelatedField(queryset=Subject.objects.all(), source='subject', required=False, allow_null=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    time_slot_id = serializers.PrimaryKeyRelatedField(queryset=TimeSlot.objects.all(), source='time_slot', required=False, allow_null=True)
    time_slot_detail = TimeSlotSerializer(source='time_slot', read_only=True)

    class Meta:
        model = Attendance
        fields = ['id', 'student', 'student_name', 'student_email', 'classroom',
                  'classroom_name', 'date', 'status', 'remarks', 'marked_by',
                  'marked_by_name', 'schedule_id', 'subject_id',
                  'subject_name', 'subject_code', 'time_slot_id',
                  'time_slot_detail',
                  'arrival_time', 'departure_time', 'minutes_late',
                  'has_excuse', 'excuse_verified',
                  'created_at', 'updated_at']
        read_only_fields = ['marked_by', 'subject', 'time_slot', 'minutes_late']

    def get_student_name(self, obj): return full_name(obj.student)
    def get_marked_by_name(self, obj): return full_name(obj.marked_by) if obj.marked_by else ''

    def create(self, validated_data):
        """Handle unique constraint by updating existing record if one exists."""
        student = validated_data['student']
        classroom = validated_data['classroom']
        date = validated_data['date']
        schedule = validated_data.get('schedule')

        with transaction.atomic():
            if schedule:
                attendance, created = Attendance.objects.update_or_create(
                    student=student,
                    schedule=schedule,
                    date=date,
                    defaults={
                        'classroom': classroom,
                        'subject': schedule.subject,
                        'time_slot': schedule.time_slot,
                        'status': validated_data.get('status', 'present'),
                        'remarks': validated_data.get('remarks', ''),
                        'marked_by': validated_data.get('marked_by'),
                    }
                )
            else:
                attendance, created = Attendance.objects.update_or_create(
                    student=student,
                    classroom=classroom,
                    date=date,
                    schedule__isnull=True,
                    defaults={
                        'schedule': None,
                        'status': validated_data.get('status', 'present'),
                        'remarks': validated_data.get('remarks', ''),
                        'marked_by': validated_data.get('marked_by'),
                    }
                )
        return attendance

    def update(self, instance, validated_data):
        """Handle unique constraint by updating the existing record."""
        student = validated_data.get('student', instance.student)
        classroom = validated_data.get('classroom', instance.classroom)
        date = validated_data.get('date', instance.date)
        schedule = validated_data.get('schedule', instance.schedule)

        with transaction.atomic():
            if schedule:
                attendance, created = Attendance.objects.update_or_create(
                    student=student,
                    schedule=schedule,
                    date=date,
                    defaults={
                        'classroom': classroom,
                        'subject': schedule.subject if schedule else None,
                        'time_slot': schedule.time_slot if schedule else None,
                        'status': validated_data.get('status', instance.status),
                        'remarks': validated_data.get('remarks', instance.remarks),
                        'marked_by': validated_data.get('marked_by', instance.marked_by),
                    }
                )
            else:
                attendance, created = Attendance.objects.update_or_create(
                    student=student,
                    classroom=classroom,
                    date=date,
                    schedule__isnull=True,
                    defaults={
                        'schedule': None,
                        'status': validated_data.get('status', instance.status),
                        'remarks': validated_data.get('remarks', instance.remarks),
                        'marked_by': validated_data.get('marked_by', instance.marked_by),
                    }
                )
        return attendance


class AbsenceExcuseSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    attendance_date = serializers.DateField(source='attendance.date', read_only=True)
    attendance_status = serializers.CharField(source='attendance.status', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AbsenceExcuse
        fields = ['id', 'student', 'student_name', 'attendance', 'attendance_date',
                  'attendance_status', 'reason', 'document_url', 'status',
                  'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'reviewer_notes',
                  'created_at', 'updated_at']
        read_only_fields = ['student', 'status', 'reviewed_by', 'reviewed_at']

    def get_student_name(self, obj): return full_name(obj.student)
    def get_reviewed_by_name(self, obj): return full_name(obj.reviewed_by) if obj.reviewed_by else None
