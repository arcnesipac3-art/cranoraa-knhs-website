"""
Integration tests for Attendance CRUD, bulk_save, patch, delete, and IntegrityError handling.
"""
from datetime import date, time
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

from accounts.models import (
    Attendance, Classroom, Subject, ClassroomSubject,
    StudentClassEnrollment, Schedule, TimeSlot,
)
from portal.models import AcademicYear

User = get_user_model()


class AttendanceCRUDTest(TestCase):
    """Tests for single-record create, patch, delete."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_att_crud', password='pass', role='admin',
            is_staff=True, is_approved=True,
        )
        self.teacher = User.objects.create_user(
            username='teacher_att_crud', password='pass', role='staff',
            staff_title='teacher', is_approved=True,
        )
        self.student = User.objects.create_user(
            username='student_att_crud', password='pass', role='student',
            is_approved=True,
        )
        self.classroom = Classroom.objects.create(name='7-A', school_year='2025-2026')

    def test_admin_can_create_attendance(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/attendance/', {
            'student': self.student.id,
            'classroom': self.classroom.id,
            'date': date.today().isoformat(),
            'status': 'present',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'present')

    def test_teacher_can_create_attendance(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post('/api/v1/attendance/', {
            'student': self.student.id,
            'classroom': self.classroom.id,
            'date': date.today().isoformat(),
            'status': 'absent',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_student_cannot_create_attendance(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/v1/attendance/', {
            'student': self.student.id,
            'classroom': self.classroom.id,
            'date': date.today().isoformat(),
            'status': 'present',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_attendance_returns_409(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            'student': self.student.id,
            'classroom': self.classroom.id,
            'date': date.today().isoformat(),
            'status': 'present',
        }
        response1 = self.client.post('/api/v1/attendance/', payload)
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        response2 = self.client.post('/api/v1/attendance/', payload)
        self.assertEqual(response2.status_code, status.HTTP_409_CONFLICT)

    def test_patch_attendance(self):
        self.client.force_authenticate(user=self.admin)
        att = Attendance.objects.create(
            student=self.student, classroom=self.classroom,
            date=date.today(), status='present', marked_by=self.admin,
        )
        response = self.client.patch(f'/api/v1/attendance/{att.id}/', {
            'status': 'late',
            'remarks': 'Arrived 10 minutes late',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'late')

    def test_delete_attendance(self):
        self.client.force_authenticate(user=self.admin)
        att = Attendance.objects.create(
            student=self.student, classroom=self.classroom,
            date=date.today(), status='present', marked_by=self.admin,
        )
        response = self.client.delete(f'/api/v1/attendance/{att.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Attendance.objects.filter(id=att.id).exists())

    def test_student_can_read_own_attendance(self):
        Attendance.objects.create(
            student=self.student, classroom=self.classroom,
            date=date.today(), status='present', marked_by=self.admin,
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/v1/attendance/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_admin_can_list_all_attendance(self):
        Attendance.objects.create(
            student=self.student, classroom=self.classroom,
            date=date.today(), status='present', marked_by=self.admin,
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/attendance/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AttendanceBulkSaveTest(TestCase):
    """Tests for POST /api/v1/attendance/bulk_save/"""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_bulk', password='pass', role='admin',
            is_staff=True, is_approved=True,
        )
        self.teacher = User.objects.create_user(
            username='teacher_bulk', password='pass', role='staff',
            staff_title='teacher', is_approved=True,
        )
        self.student1 = User.objects.create_user(
            username='student_bulk1', password='pass', role='student', is_approved=True,
        )
        self.student2 = User.objects.create_user(
            username='student_bulk2', password='pass', role='student', is_approved=True,
        )
        self.classroom = Classroom.objects.create(name='8-A', school_year='2025-2026')
        self.subject = Subject.objects.create(name='Math', code='MATH8', grade_level='8')
        self.time_slot = TimeSlot.objects.create(
            day='monday', start_time=time(8, 0), end_time=time(9, 0),
        )
        self.academic_year = AcademicYear.objects.create(
            name='2025-2026', start_date=date(2025, 6, 1), end_date=date(2026, 3, 31),
            is_active=True,
        )
        self.schedule = Schedule.objects.create(
            classroom=self.classroom, subject=self.subject,
            teacher=self.teacher, time_slot=self.time_slot,
            academic_year=self.academic_year,
        )

    def test_bulk_save_creates_records(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post('/api/v1/attendance/bulk_save/', {
            'schedule': self.schedule.id,
            'date': date.today().isoformat(),
            'records': [
                {'student_id': self.student1.id, 'status': 'present'},
                {'student_id': self.student2.id, 'status': 'absent', 'remarks': 'No show'},
            ],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 2)
        self.assertEqual(response.data['updated'], 0)
        self.assertEqual(Attendance.objects.count(), 2)

    def test_bulk_save_updates_existing(self):
        self.client.force_authenticate(user=self.teacher)
        Attendance.objects.create(
            student=self.student1, classroom=self.classroom,
            date=date.today(), status='present', marked_by=self.teacher,
            schedule=self.schedule, subject=self.subject, time_slot=self.time_slot,
        )
        response = self.client.post('/api/v1/attendance/bulk_save/', {
            'schedule': self.schedule.id,
            'date': date.today().isoformat(),
            'records': [
                {'student_id': self.student1.id, 'status': 'late'},
                {'student_id': self.student2.id, 'status': 'present'},
            ],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 1)
        self.assertEqual(response.data['updated'], 1)

    def test_bulk_save_rejects_unauthorized(self):
        self.client.force_authenticate(user=self.student1)
        response = self.client.post('/api/v1/attendance/bulk_save/', {
            'schedule': self.schedule.id,
            'date': date.today().isoformat(),
            'records': [{'student_id': self.student1.id, 'status': 'present'}],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_bulk_save_missing_schedule_returns_400(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post('/api/v1/attendance/bulk_save/', {
            'date': date.today().isoformat(),
            'records': [{'student_id': self.student1.id, 'status': 'present'}],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_save_empty_records_returns_400(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post('/api/v1/attendance/bulk_save/', {
            'schedule': self.schedule.id,
            'date': date.today().isoformat(),
            'records': [],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_save_invalid_status_collected_as_error(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post('/api/v1/attendance/bulk_save/', {
            'schedule': self.schedule.id,
            'date': date.today().isoformat(),
            'records': [
                {'student_id': self.student1.id, 'status': 'invalid_status'},
            ],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['created'], 0)
        self.assertTrue(len(response.data['errors']) > 0)


class AttendanceScheduleTabTest(TestCase):
    """Tests for schedule-based attendance loading (today_schedules endpoint)."""

    def setUp(self):
        self.client = APIClient()
        self.teacher = User.objects.create_user(
            username='teacher_sched', password='pass', role='staff',
            staff_title='teacher', is_approved=True,
        )
        self.student = User.objects.create_user(
            username='student_sched', password='pass', role='student', is_approved=True,
        )
        self.classroom = Classroom.objects.create(name='9-A', school_year='2025-2026')
        self.subject = Subject.objects.create(name='Science', code='SCI9', grade_level='9')
        self.time_slot = TimeSlot.objects.create(
            day='monday', start_time=time(9, 0), end_time=time(10, 0),
        )
        self.academic_year = AcademicYear.objects.create(
            name='2025-2026', start_date=date(2025, 6, 1), end_date=date(2026, 3, 31),
            is_active=True,
        )
        self.schedule = Schedule.objects.create(
            classroom=self.classroom, subject=self.subject,
            teacher=self.teacher, time_slot=self.time_slot,
            academic_year=self.academic_year,
        )
        StudentClassEnrollment.objects.create(
            student=self.student, classroom=self.classroom,
        )
        ClassroomSubject.objects.create(
            classroom=self.classroom, subject=self.subject, teacher=self.teacher,
        )

    def test_today_schedules_returns_teacher_schedules(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.get('/api/v1/attendance/today_schedules/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_filter_by_classroom(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.get(f'/api/v1/attendance/?classroom={self.classroom.id}&date={date.today().isoformat()}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AttendanceSubmitScheduleTest(TestCase):
    """Tests for schedule-based submit and reopen endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_submit_sched', password='pass', role='admin',
            is_staff=True, is_approved=True,
        )
        self.teacher = User.objects.create_user(
            username='teacher_submit_sched', password='pass', role='staff',
            staff_title='teacher', is_approved=True,
        )
        self.student = User.objects.create_user(
            username='student_submit_sched', password='pass', role='student', is_approved=True,
        )
        self.classroom = Classroom.objects.create(name='10-A', school_year='2025-2026')
        self.subject = Subject.objects.create(name='English', code='ENG10', grade_level='10')
        self.time_slot = TimeSlot.objects.create(
            day='monday', start_time=time(10, 0), end_time=time(11, 0),
        )
        self.academic_year = AcademicYear.objects.create(
            name='2025-2026', start_date=date(2025, 6, 1), end_date=date(2026, 3, 31),
            is_active=True,
        )
        self.schedule = Schedule.objects.create(
            classroom=self.classroom, subject=self.subject,
            teacher=self.teacher, time_slot=self.time_slot,
            academic_year=self.academic_year,
        )

    def test_submit_with_schedule_id(self):
        """Submit attendance records for a specific schedule."""
        self.client.force_authenticate(user=self.teacher)
        Attendance.objects.create(
            student=self.student, classroom=self.classroom,
            date=date.today(), status='present', marked_by=self.teacher,
            schedule=self.schedule, subject=self.subject, time_slot=self.time_slot,
            workflow_status='draft',
        )
        response = self.client.post('/api/v1/attendance/submit/', {
            'schedule_id': self.schedule.id,
            'date': date.today().isoformat(),
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['submitted'], 1)
        att = Attendance.objects.get(student=self.student, schedule=self.schedule, date=date.today())
        self.assertEqual(att.workflow_status, 'submitted')

    def test_reopen_with_schedule_id(self):
        """Reopen submitted attendance for a specific schedule."""
        self.client.force_authenticate(user=self.teacher)
        Attendance.objects.create(
            student=self.student, classroom=self.classroom,
            date=date.today(), status='present', marked_by=self.teacher,
            schedule=self.schedule, subject=self.subject, time_slot=self.time_slot,
            workflow_status='submitted',
        )
        response = self.client.post('/api/v1/attendance/reopen/', {
            'schedule_id': self.schedule.id,
            'date': date.today().isoformat(),
            'reason': 'Need to fix a mistake',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['reopened'], 1)
        att = Attendance.objects.get(student=self.student, schedule=self.schedule, date=date.today())
        self.assertEqual(att.workflow_status, 'draft')

    def test_submit_class_level_without_schedule(self):
        """Submit class-level (homeroom) attendance with schedule__isnull."""
        self.client.force_authenticate(user=self.teacher)
        Attendance.objects.create(
            student=self.student, classroom=self.classroom,
            date=date.today(), status='present', marked_by=self.teacher,
            workflow_status='draft',
        )
        response = self.client.post('/api/v1/attendance/submit/', {
            'classroom_id': self.classroom.id,
            'date': date.today().isoformat(),
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['submitted'], 1)

    def test_submit_requires_schedule_or_classroom(self):
        """Submit without schedule_id or classroom_id returns 400."""
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post('/api/v1/attendance/submit/', {
            'date': date.today().isoformat(),
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AttendanceStudentHistoryTest(TestCase):
    """Tests for enhanced student-history endpoint with group_by_date."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_history', password='pass', role='admin',
            is_staff=True, is_approved=True,
        )
        self.student = User.objects.create_user(
            username='student_history', password='pass', role='student', is_approved=True,
        )
        self.classroom = Classroom.objects.create(name='7-B', school_year='2025-2026')
        self.subject = Subject.objects.create(name='Math', code='MATH7', grade_level='7')
        self.time_slot = TimeSlot.objects.create(
            day='monday', start_time=time(8, 0), end_time=time(9, 0),
        )
        self.academic_year = AcademicYear.objects.create(
            name='2025-2026', start_date=date(2025, 6, 1), end_date=date(2026, 3, 31),
            is_active=True,
        )
        self.schedule = Schedule.objects.create(
            classroom=self.classroom, subject=self.subject,
            teacher=self.admin, time_slot=self.time_slot,
            academic_year=self.academic_year,
        )

    def test_student_history_returns_records(self):
        """Basic student history returns records."""
        self.client.force_authenticate(user=self.student)
        Attendance.objects.create(
            student=self.student, classroom=self.classroom,
            date=date.today(), status='present', marked_by=self.admin,
            schedule=self.schedule, subject=self.subject,
        )
        response = self.client.get('/api/v1/attendance/student-history/', {
            'month': date.today().strftime('%Y-%m'),
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('records', response.data)
        self.assertIn('stats', response.data)
        self.assertEqual(len(response.data['records']), 1)

    def test_student_history_group_by_date(self):
        """group_by_date returns grouped_by_date field."""
        self.client.force_authenticate(user=self.student)
        Attendance.objects.create(
            student=self.student, classroom=self.classroom,
            date=date.today(), status='present', marked_by=self.admin,
            schedule=self.schedule, subject=self.subject,
        )
        response = self.client.get('/api/v1/attendance/student-history/', {
            'month': date.today().strftime('%Y-%m'),
            'group_by_date': 'true',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('grouped_by_date', response.data)
        grouped = response.data['grouped_by_date']
        self.assertTrue(len(grouped) > 0)
        today_str = date.today().isoformat()
        today_group = next((g for g in grouped if g['date'] == today_str), None)
        self.assertIsNotNone(today_group)
        self.assertTrue(len(today_group['periods']) > 0)
        self.assertEqual(today_group['periods'][0]['status'], 'present')

    def test_student_history_includes_schedule_info(self):
        """Records include schedule_id and time_slot info."""
        self.client.force_authenticate(user=self.student)
        Attendance.objects.create(
            student=self.student, classroom=self.classroom,
            date=date.today(), status='late', marked_by=self.admin,
            schedule=self.schedule, subject=self.subject, time_slot=self.time_slot,
        )
        response = self.client.get('/api/v1/attendance/student-history/', {
            'month': date.today().strftime('%Y-%m'),
        })
        rec = response.data['records'][0]
        self.assertIsNotNone(rec['schedule_id'])
        self.assertIsNotNone(rec['time_slot'])
        self.assertEqual(rec['time_slot']['start_time'], '08:00 AM')

    def test_parent_can_view_child_history(self):
        """Parent can view linked student's history."""
        from portal.models import Profile
        parent = User.objects.create_user(
            username='parent_history', password='pass', role='parent', is_approved=True,
        )
        profile, _ = Profile.objects.get_or_create(user=parent)
        profile.linked_students.add(self.student)
        self.client.force_authenticate(user=parent)
        response = self.client.get('/api/v1/attendance/student-history/', {
            'student': self.student.id,
            'month': date.today().strftime('%Y-%m'),
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
