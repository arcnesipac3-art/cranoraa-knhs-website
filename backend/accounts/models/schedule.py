from django.db import models

from .user import User
from .academic import Classroom, Subject


class Room(models.Model):
    name = models.CharField(max_length=100, help_text="e.g. Room 204, Science Lab, Gym")
    building = models.CharField(max_length=100, blank=True, null=True)
    capacity = models.IntegerField(default=40)
    room_type = models.CharField(
        max_length=30,
        choices=[
            ('classroom', 'Classroom'),
            ('laboratory', 'Laboratory'),
            ('gym', 'Gymnasium'),
            ('library', 'Library'),
            ('other', 'Other'),
        ],
        default='classroom'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class TimeSlot(models.Model):
    DAY_CHOICES = [
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
    ]

    classroom = models.ForeignKey(
        Classroom, on_delete=models.CASCADE, related_name='time_slots',
        null=True, blank=True,
        help_text="Scope this time slot to a specific section. Null = universal."
    )
    day = models.CharField(max_length=10, choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    label = models.CharField(max_length=50, blank=True, null=True, help_text="Optional label, e.g. '1st Period'")
    slot_type = models.CharField(
        max_length=20,
        choices=[
            ('class',    'Class Period'),
            ('recess',   'Recess'),
            ('lunch',    'Lunch Break'),
            ('vacant',   'Vacant'),
            ('assembly', 'Assembly'),
            ('pe',       'PE / Sports'),
        ],
        default='class',
        help_text="Type of this time slot."
    )

    class Meta:
        ordering = ['day', 'start_time']
        unique_together = ['classroom', 'day', 'start_time', 'end_time']

    def __str__(self):
        scope = f" [{self.classroom.name}]" if self.classroom else ""
        return f"{self.get_day_display()} {self.start_time.strftime('%I:%M %p')} – {self.end_time.strftime('%I:%M %p')}{scope}"


class Schedule(models.Model):
    classroom = models.ForeignKey(
        Classroom, on_delete=models.CASCADE, related_name='schedules'
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='schedules'
    )
    teacher = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='teaching_schedules',
        limit_choices_to={'role': 'staff'}
    )
    room = models.ForeignKey(
        Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='schedules'
    )
    time_slot = models.ForeignKey(
        TimeSlot, on_delete=models.CASCADE, related_name='schedules'
    )
    academic_year = models.ForeignKey(
        'accounts.AcademicYear', on_delete=models.CASCADE, related_name='schedules'
    )
    semester = models.ForeignKey(
        'accounts.Semester', on_delete=models.SET_NULL, null=True, blank=True, related_name='schedules'
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['time_slot__day', 'time_slot__start_time']
        constraints = [
            models.UniqueConstraint(
                fields=['teacher', 'time_slot', 'academic_year'],
                name='unique_teacher_timeslot_year'
            ),
            models.UniqueConstraint(
                fields=['room', 'time_slot', 'academic_year'],
                condition=models.Q(room__isnull=False),
                name='unique_room_timeslot_year'
            ),
            models.UniqueConstraint(
                fields=['classroom', 'time_slot', 'academic_year'],
                name='unique_classroom_timeslot_year'
            ),
        ]

    def __str__(self):
        subject_label = self.subject.code if self.subject else 'Vacant'
        teacher_label = (self.teacher.get_full_name() or self.teacher.username) if self.teacher else '—'
        return (
            f"{self.classroom.name} | {subject_label} | "
            f"{self.time_slot} | {teacher_label}"
        )
