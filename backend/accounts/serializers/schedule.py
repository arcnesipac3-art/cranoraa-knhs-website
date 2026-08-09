from rest_framework import serializers

from ..models import (
    User,
    Room,
    Subject,
    TimeSlot,
    Schedule,
    AcademicYear as AccountsAcademicYear,
    Semester as AccountsSemester,
)
from portal.models import AcademicYear as PortalAcademicYear, Semester as PortalSemester
from ._base import full_name


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'name', 'building', 'capacity', 'room_type', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class ScheduleSerializer(serializers.ModelSerializer):
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    subject_name = serializers.SerializerMethodField()
    subject_code = serializers.SerializerMethodField()
    teacher_name = serializers.SerializerMethodField()
    teacher_email = serializers.SerializerMethodField()
    room_name = serializers.SerializerMethodField()
    room_building = serializers.SerializerMethodField()
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    semester_display = serializers.SerializerMethodField()
    from .attendance import TimeSlotSerializer
    time_slot_detail = TimeSlotSerializer(source='time_slot', read_only=True)

    teacher = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), allow_null=True, required=False
    )
    subject = serializers.PrimaryKeyRelatedField(
        queryset=Subject.objects.all(), allow_null=True, required=False
    )
    room = serializers.PrimaryKeyRelatedField(
        queryset=Room.objects.all(), allow_null=True, required=False
    )
    academic_year = serializers.PrimaryKeyRelatedField(
        queryset=PortalAcademicYear.objects.all(),
        required=False, allow_null=True
    )
    semester = serializers.PrimaryKeyRelatedField(
        queryset=PortalSemester.objects.all(),
        required=False, allow_null=True
    )

    class Meta:
        model = Schedule
        fields = [
            'id', 'classroom', 'classroom_name', 'subject', 'subject_name', 'subject_code',
            'teacher', 'teacher_name', 'teacher_email', 'room', 'room_name', 'room_building',
            'time_slot', 'time_slot_detail', 'academic_year', 'academic_year_name',
            'semester', 'semester_display', 'is_active', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_subject_name(self, obj):
        return obj.subject.name if obj.subject else None

    def get_subject_code(self, obj):
        return obj.subject.code if obj.subject else None

    def get_teacher_name(self, obj):
        return full_name(obj.teacher)

    def get_teacher_email(self, obj):
        return obj.teacher.email if obj.teacher else None

    def get_room_name(self, obj):
        return obj.room.name if obj.room else None

    def get_room_building(self, obj):
        return obj.room.building if obj.room else None

    def get_semester_display(self, obj):
        return obj.semester.get_semester_type_display() if obj.semester else None

    def _resolve_portal_academic_year(self, raw_value):
        if raw_value in (None, ''):
            return None

        value = str(raw_value).strip()
        if not value:
            return None

        portal_year = PortalAcademicYear.objects.filter(pk=value).first()
        if portal_year:
            return str(portal_year.pk)

        accounts_year = AccountsAcademicYear.objects.filter(pk=value).first()
        if not accounts_year:
            accounts_year = AccountsAcademicYear.objects.filter(name=value).first()

        if accounts_year:
            portal_year, _ = PortalAcademicYear.objects.get_or_create(
                name=accounts_year.name,
                defaults={
                    'start_date': accounts_year.start_date,
                    'end_date': accounts_year.end_date,
                    'is_active': accounts_year.is_active,
                },
            )
            return str(portal_year.pk)

        portal_year = PortalAcademicYear.objects.filter(name=value).first()
        return str(portal_year.pk) if portal_year else None

    def _resolve_portal_semester(self, raw_value, resolved_academic_year):
        if raw_value in (None, ''):
            return None

        value = str(raw_value).strip()
        if not value:
            return None

        portal_semester = PortalSemester.objects.filter(pk=value).first()
        if portal_semester:
            return str(portal_semester.pk)

        accounts_semester = AccountsSemester.objects.select_related('academic_year').filter(pk=value).first()
        if not accounts_semester:
            return raw_value

        portal_year_pk = self._resolve_portal_academic_year(
            resolved_academic_year or accounts_semester.academic_year_id
        )
        portal_year = PortalAcademicYear.objects.filter(pk=portal_year_pk).first()
        if not portal_year:
            return raw_value

        portal_semester, _ = PortalSemester.objects.get_or_create(
            academic_year=portal_year,
            semester_type=accounts_semester.semester_type,
            defaults={
                'name': accounts_semester.name,
                'start_date': accounts_semester.start_date,
                'end_date': accounts_semester.end_date,
                'is_active': accounts_semester.is_active,
            },
        )
        return str(portal_semester.pk)

    def to_internal_value(self, data):
        # Strip empty/invalid academic_year so perform_create can auto-fill it
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        for field in ('teacher', 'subject', 'room', 'semester', 'classroom', 'time_slot'):
            if data.get(field) in ('', None, 'null', 'undefined'):
                data[field] = None
        resolved_academic_year = self._resolve_portal_academic_year(data.get('academic_year'))
        if not resolved_academic_year:
            data.pop('academic_year', None)
        else:
            data['academic_year'] = resolved_academic_year

        resolved_semester = self._resolve_portal_semester(data.get('semester'), resolved_academic_year)
        if not resolved_semester:
            data.pop('semester', None)
        else:
            data['semester'] = resolved_semester

        result = super().to_internal_value(data)
        # Convert empty strings to null for nullable FK fields
        for field in ('teacher', 'subject', 'room', 'semester'):
            if result.get(field) == '':
                result[field] = None
        return result

    def validate(self, data):
        time_slot = data.get('time_slot', getattr(self.instance, 'time_slot', None))
        academic_year = data.get('academic_year', getattr(self.instance, 'academic_year', None))
        teacher = data.get('teacher', getattr(self.instance, 'teacher', None))
        classroom = data.get('classroom', getattr(self.instance, 'classroom', None))
        room = data.get('room', getattr(self.instance, 'room', None))

        if not academic_year:
            raise serializers.ValidationError(
                {"academic_year": "Academic year not found. Please select a valid academic year."}
            )

        if not all([time_slot, academic_year, teacher, classroom]):
            return data

        exclude_id = self.instance.id if self.instance else None
        qs = Schedule.objects.filter(time_slot=time_slot, academic_year=academic_year)
        if exclude_id:
            qs = qs.exclude(id=exclude_id)

        if qs.filter(teacher=teacher).exists():
            raise serializers.ValidationError(
                f"Teacher already has a class scheduled at this time slot."
            )
        if qs.filter(classroom=classroom).exists():
            raise serializers.ValidationError(
                f"This classroom section already has a subject scheduled at this time slot."
            )
        if room and qs.filter(room=room).exists():
            raise serializers.ValidationError(
                f"Room '{room.name}' is already booked at this time slot."
            )
        return data
