"""
Tests for API endpoints added in Phases 1-8.
Tests RBAC, custom actions, and data flow.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, time, timedelta
from decimal import Decimal

from accounts.models import (
    Classroom, Subject, Grade, Notification, NotificationPreference,
    Transcript, TransferCertificate, CharacterCertificate,
    AchievementRecord, RecordRequest, AbsenceExcuse, EnrollmentWaitlist,
    ParentTeacherMeeting, BehavioralRecord, SchoolEvent,
    UserBlock, EmergencyMessage, Department, StaffPerformance,
    Attendance, GradeReport, StudentClassEnrollment, ClassroomSubject,
    Schedule, TimeSlot, AcademicYear, Semester,
)
from portal.models import AcademicYear as PortalAcademicYear, Semester as PortalSemester

User = get_user_model()


class AttendanceAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_att', password='pass', role='admin', is_staff=True, is_approved=True
        )
        self.teacher = User.objects.create_user(
            username='teacher_att', password='pass', role='staff', staff_title='teacher', is_approved=True
        )
        self.student = User.objects.create_user(
            username='student_att', password='pass', role='student', is_approved=True
        )
        self.parent = User.objects.create_user(
            username='parent_att', password='pass', role='parent', is_approved=True
        )
        self.classroom = Classroom.objects.create(name='7-A', school_year='2025-2026')

    def test_admin_can_list_attendance(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/attendance/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_student_cannot_create_attendance(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/v1/attendance/', {
            'student': self.student.id,
            'classroom': self.classroom.id,
            'date': date.today().isoformat(),
            'status': 'present',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_export_csv(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/attendance/export/', {
            'classroom': self.classroom.id,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/csv')


class AbsenceExcuseAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_exc', password='pass', role='admin', is_staff=True, is_approved=True
        )
        self.student = User.objects.create_user(
            username='student_exc', password='pass', role='student', is_approved=True
        )
        self.teacher = User.objects.create_user(
            username='teacher_exc', password='pass', role='staff', staff_title='teacher', is_approved=True
        )
        self.classroom = Classroom.objects.create(name='8-A', school_year='2025-2026')
        self.attendance = Attendance.objects.create(
            student=self.student, classroom=self.classroom,
            date=date.today(), status='absent', marked_by=self.teacher,
        )

    def test_student_can_create_excuse(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/v1/absence-excuses/', {
            'attendance': self.attendance.id,
            'reason': 'Sick with fever',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_student_cannot_review_excuse(self):
        exc = AbsenceExcuse.objects.create(
            student=self.student, attendance=self.attendance, reason='Test',
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(f'/api/v1/absence-excuses/{exc.id}/review/', {
            'action': 'approve',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_can_review_excuse(self):
        exc = AbsenceExcuse.objects.create(
            student=self.student, attendance=self.attendance, reason='Test',
        )
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post(f'/api/v1/absence-excuses/{exc.id}/review/', {
            'action': 'approve',
            'notes': 'Valid excuse',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class GradeReportAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_gr', password='pass', role='admin', is_staff=True, is_approved=True
        )
        self.teacher = User.objects.create_user(
            username='teacher_gr', password='pass', role='staff', staff_title='teacher', is_approved=True
        )
        self.student = User.objects.create_user(
            username='student_gr', password='pass', role='student', is_approved=True
        )
        self.classroom = Classroom.objects.create(name='9-A', school_year='2025-2026')
        self.subject = Subject.objects.create(name='Science', code='SCI9', grade_level='9')

    def test_generate_for_classroom(self):
        StudentClassEnrollment.objects.create(student=self.student, classroom=self.classroom)
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/grade-reports/generate_for_classroom/', {
            'classroom_id': self.classroom.id,
            'quarter': 1,
            'school_year': '2025-2026',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('report_ids', response.data)

    def test_submit_for_review(self):
        report = GradeReport.objects.create(
            student=self.student, classroom=self.classroom,
            quarter=1, school_year='2025-2026',
            general_average=Decimal('88.00'),
        )
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post(f'/api/v1/grade-reports/{report.id}/submit_for_review/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_approve_requires_admin(self):
        report = GradeReport.objects.create(
            student=self.student, classroom=self.classroom,
            quarter=1, school_year='2025-2026',
            general_average=Decimal('88.00'), status='submitted',
        )
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post(f'/api/v1/grade-reports/{report.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_approve(self):
        report = GradeReport.objects.create(
            student=self.student, classroom=self.classroom,
            quarter=1, school_year='2025-2026',
            general_average=Decimal('88.00'), status='submitted',
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/grade-reports/{report.id}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_final'])


class PTMAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher = User.objects.create_user(
            username='teacher_ptm', password='pass', role='staff', staff_title='teacher', is_approved=True
        )
        self.parent = User.objects.create_user(
            username='parent_ptm', password='pass', role='parent', is_approved=True
        )
        self.student = User.objects.create_user(
            username='student_ptm', password='pass', role='student', is_approved=True
        )
        self.classroom = Classroom.objects.create(name='7-A', school_year='2025-2026')

    def test_teacher_can_schedule(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post('/api/v1/ptm-meetings/', {
            'parent': self.parent.id,
            'student': self.student.id,
            'classroom': self.classroom.id,
            'scheduled_date': (date.today() + timedelta(days=7)).isoformat(),
            'scheduled_time': '14:00:00',
            'purpose': 'academic',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_student_cannot_schedule(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post('/api/v1/ptm-meetings/', {
            'parent': self.parent.id,
            'student': self.student.id,
            'scheduled_date': (date.today() + timedelta(days=7)).isoformat(),
            'scheduled_time': '14:00:00',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ScheduleCompatibilityAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_sched', password='pass', role='admin', is_staff=True, is_approved=True
        )
        self.teacher = User.objects.create_user(
            username='teacher_sched', password='pass', role='staff', staff_title='teacher', is_approved=True
        )
        self.classroom = Classroom.objects.create(name='7-Sampaguita', grade_level='Grade 7')
        self.subject = Subject.objects.create(name='Mathematics', code='MATH7', grade_level='Grade 7')
        self.time_slot = TimeSlot.objects.create(
            classroom=self.classroom,
            day='monday',
            start_time='07:30:00',
            end_time='08:30:00',
            label='Period 1',
        )
        self.accounts_year = AcademicYear.objects.create(
            name='2026-2027',
            start_date=date(2026, 6, 1),
            end_date=date(2027, 3, 31),
            is_active=True,
        )
        self.accounts_semester = Semester.objects.create(
            academic_year=self.accounts_year,
            name='1st Term',
            semester_type='1st Term',
            start_date=date(2026, 6, 1),
            end_date=date(2026, 10, 31),
            is_active=True,
        )

    def test_schedule_create_accepts_accounts_academic_year_ids(self):
        self.assertFalse(PortalAcademicYear.objects.filter(name=self.accounts_year.name).exists())
        self.assertFalse(PortalSemester.objects.filter(name=self.accounts_semester.name).exists())

        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/schedules/', {
            'classroom': self.classroom.id,
            'subject': self.subject.id,
            'teacher': self.teacher.id,
            'time_slot': self.time_slot.id,
            'academic_year': self.accounts_year.id,
            'semester': self.accounts_semester.id,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        schedule = Schedule.objects.get(pk=response.data['id'])
        self.assertEqual(schedule.academic_year.name, self.accounts_year.name)
        self.assertEqual(schedule.semester.semester_type, self.accounts_semester.semester_type)
        self.assertTrue(PortalAcademicYear.objects.filter(name=self.accounts_year.name).exists())
        self.assertTrue(
            PortalSemester.objects.filter(
                academic_year__name=self.accounts_year.name,
                semester_type=self.accounts_semester.semester_type,
            ).exists()
        )


class BehavioralRecordAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher = User.objects.create_user(
            username='teacher_br', password='pass', role='staff', staff_title='teacher', is_approved=True
        )
        self.student = User.objects.create_user(
            username='student_br', password='pass', role='student', is_approved=True
        )
        self.classroom = Classroom.objects.create(name='8-A', school_year='2025-2026')

    def test_teacher_can_create_record(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post('/api/v1/behavioral-records/', {
            'student': self.student.id,
            'classroom': self.classroom.id,
            'incident_type': 'tardiness',
            'severity': 'minor',
            'action_taken': 'verbal_warning',
            'description': 'Late to class',
            'incident_date': date.today().isoformat(),
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_student_can_view_own_records(self):
        BehavioralRecord.objects.create(
            student=self.student, classroom=self.classroom,
            recorded_by=self.teacher, incident_type='tardiness',
            severity='minor', description='Test',
            incident_date=date.today(),
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/v1/behavioral-records/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class SchoolEventAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_se', password='pass', role='admin', is_staff=True, is_approved=True
        )
        self.student = User.objects.create_user(
            username='student_se', password='pass', role='student', is_approved=True
        )

    def test_admin_can_create_event(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/school-events/', {
            'title': 'Science Fair',
            'start_date': (date.today() + timedelta(days=14)).isoformat(),
            'category': 'academic',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_student_sees_student_events(self):
        SchoolEvent.objects.create(
            title='All Event', start_date=date.today(), target_audience='all'
        )
        SchoolEvent.objects.create(
            title='Staff Only', start_date=date.today(), target_audience='teachers'
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/v1/school-events/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)  # Only 'all' event


class UserBlockAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(username='ub1', password='pass', role='student', is_approved=True)
        self.user2 = User.objects.create_user(username='ub2', password='pass', role='student', is_approved=True)

    def test_block_user(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post('/api/v1/user-blocks/', {'blocked': self.user2.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_cannot_block_self(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.post('/api/v1/user-blocks/', {'blocked': self.user1.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_check_blocked(self):
        UserBlock.objects.create(blocker=self.user1, blocked=self.user2)
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(f'/api/v1/user-blocks/check_blocked/?user_id={self.user2.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['blocked_by_me'])
        self.assertFalse(response.data['blocked_by_them'])

    def test_unblock(self):
        block = UserBlock.objects.create(blocker=self.user1, blocked=self.user2)
        self.client.force_authenticate(user=self.user1)
        response = self.client.delete(f'/api/v1/user-blocks/{block.id}/unblock/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class DepartmentAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_dept', password='pass', role='admin', is_staff=True, is_approved=True
        )
        self.teacher = User.objects.create_user(
            username='teacher_dept', password='pass', role='staff', staff_title='teacher', is_approved=True
        )
        self.student = User.objects.create_user(
            username='student_dept', password='pass', role='student', is_approved=True
        )

    def test_admin_can_create_department(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/departments/', {
            'name': 'Mathematics', 'code': 'MATH',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_teacher_cannot_create_department(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post('/api/v1/departments/', {
            'name': 'Science', 'code': 'SCI',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_can_list_active(self):
        Department.objects.create(name='Math', code='MATH', is_active=True)
        Department.objects.create(name='Hidden', code='HID', is_active=False)
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/v1/departments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class StaffPerformanceAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_sp', password='pass', role='admin', is_staff=True, is_approved=True
        )
        self.teacher = User.objects.create_user(
            username='teacher_sp', password='pass', role='staff', staff_title='teacher', is_approved=True
        )

    def test_admin_can_create_performance(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/staff-performance/', {
            'staff': self.teacher.id,
            'academic_year': '2025-2026',
            'teaching_quality': 5,
            'student_engagement': 4,
            'classroom_management': 4,
            'lesson_planning': 5,
            'professional_development': 3,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_teacher_cannot_create_performance(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.post('/api/v1/staff-performance/', {
            'staff': self.teacher.id,
            'academic_year': '2025-2026',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_can_view_own(self):
        self.client.force_authenticate(user=self.teacher)
        response = self.client.get('/api/v1/staff-performance/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AdminEndpointsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_ae', password='pass', role='admin', is_staff=True, is_approved=True
        )
        self.student = User.objects.create_user(
            username='student_ae', password='pass', role='student', is_approved=True
        )

    def test_admin_stats_handles_empty_academic_year(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/admin/stats/', {'academic_year': '2026-2027'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['today_rate'], 0)
        self.assertEqual(response.data['attendance']['today_rate'], 0)
        self.assertIn('all_subjects', response.data)
        self.assertIn('general_average', response.data)
        self.assertNotIn('detail', response.data)

    def test_admin_stats_handles_academic_year_with_data(self):
        academic_year = AcademicYear.objects.create(
            name='2026-2027',
            start_date=date(2026, 6, 1),
            end_date=date(2027, 3, 31),
        )
        teacher = User.objects.create_user(
            username='teacher_stats', password='pass', role='staff',
            staff_title='teacher', is_approved=True
        )
        student = User.objects.create_user(
            username='student_stats', password='pass', role='student', is_approved=True
        )
        classroom = Classroom.objects.create(name='10-A', academic_year=academic_year)
        subject = Subject.objects.create(name='Mathematics', code='MATH10-STATS', grade_level='10')
        Grade.objects.create(
            student=student,
            subject=subject,
            classroom=classroom,
            teacher=teacher,
            grade_type='final_grade',
            quarter=1,
            academic_year='2026-2027',
            raw_score=88,
            total_score=100,
        )
        Attendance.objects.create(
            student=student,
            classroom=classroom,
            date=date.today(),
            status='present',
            marked_by=teacher,
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/admin/stats/', {'academic_year': '2026-2027'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['today_rate'], 100)
        self.assertEqual(response.data['today_attendance_rate'], 100)
        self.assertEqual(response.data['average_grade'], 88.0)
        self.assertEqual(response.data['all_subjects']['total_count'], 1)

    def test_student_cannot_access_admin_stats(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/v1/admin/stats/', {'academic_year': '2026-2027'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_attendance_analytics(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/admin/attendance-analytics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('today_rate', response.data)

    def test_grade_analytics(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/admin/grade-analytics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('average', response.data)

    def test_student_cannot_access_admin_endpoints(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.get('/api/v1/admin/attendance-analytics/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ChatEnhancementsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(username='chat1', password='pass', role='student', is_approved=True)
        self.user2 = User.objects.create_user(username='chat2', password='pass', role='student', is_approved=True)
        self.admin = User.objects.create_user(
            username='admin_chat', password='pass', role='admin', is_staff=True, is_approved=True
        )
        from accounts.models import ChatRoom, ChatMessage
        self.room = ChatRoom.objects.create(is_group=False)
        self.room.participants.add(self.user1, self.user2)
        ChatMessage.objects.create(room=self.room, sender=self.user1, content='Hello world')
        ChatMessage.objects.create(room=self.room, sender=self.user2, content='Hi there')

    def test_search_messages(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/v1/chat/messages/search/?q=Hello')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_pinned_messages(self):
        from accounts.models import ChatMessage
        msg = ChatMessage.objects.first()
        msg.is_pinned = True
        msg.save()
        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/v1/chat/messages/pinned/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
