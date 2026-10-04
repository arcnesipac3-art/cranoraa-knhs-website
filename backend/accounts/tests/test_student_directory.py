"""
Student directory (People -> Students) backend support.

Covers the additive directory API:
- /api/v1/users/ role fix (?role=student returns only students for admins),
  server-side directory filters (grade, section, student status, sex, account
  status, academic year, adviser, created-date range), LRN search, ordering
  and bounded page_size,
- serialized directory fields (lrn, enrollment_status, is_active,
  date_joined),
- /api/v1/users/student_stats/ real counts (disjoint active/pending/inactive
  buckets plus new-this-year),
- student status changes with a required reason (single and bulk), kept
  separate from account status, with audit entries,
- bulk section assignment with capacity and grade checks,
- CSV import dry-run validation (no writes, row-indexed errors) and the dry
  run's exemption from the 5/hour import throttle,
- /api/v1/enrollments/?student= for the student profile, including the
  registrar/guidance read scope.

Academic year quirk: accounts_classroom's physical FK targets
portal_academicyear, so fixtures link classrooms with academic_year_id of a
portal year (mirroring what the live AcademicYearContext does), while an
accounts year row with the same pk keeps ORM joins resolvable.
"""
from datetime import date

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from portal.models import AcademicYear as PortalAcademicYear
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import (
    AcademicYear as AccountsAcademicYear,
    AuditLog, Classroom, Profile, StudentClassEnrollment,
)

User = get_user_model()


def results_of(res):
    """Paginated responses are {'results': [...]} — accept both shapes."""
    data = res.data
    return data['results'] if isinstance(data, dict) else data


class DirectoryTestBase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.admin = User.objects.create_user(
            username='admin_dir', password='pass', role='admin',
            is_staff=True, is_approved=True,
        )
        self.teacher = User.objects.create_user(
            username='teach_dir', password='pass', role='staff',
            staff_title='teacher', is_approved=True,
        )
        self.registrar = User.objects.create_user(
            username='reg_dir', password='pass', role='staff',
            staff_title='registrar', is_approved=True,
        )
        self.guide = User.objects.create_user(
            username='guid_dir', password='pass', role='staff',
            staff_title='guidance_counselor', is_approved=True,
        )

        # Current school year: portal row is what classroom FKs physically
        # reference; the accounts row shares its pk so ORM joins resolve.
        self.portal_year = PortalAcademicYear.objects.create(
            name='2026-2027', start_date=date(2026, 6, 1), end_date=date(2027, 4, 15),
        )
        self.accounts_year = AccountsAcademicYear.objects.create(
            id=self.portal_year.id,
            name='2026-2027', start_date=date(2026, 6, 1), end_date=date(2027, 4, 15),
        )
        # A year students from last year belong to (they must NOT show up in
        # the current-year directory view).
        self.old_portal_year = PortalAcademicYear.objects.create(
            name='2025-2026', start_date=date(2025, 6, 1), end_date=date(2026, 4, 15),
        )

        # Advisory classroom for self.teacher (Classroom.teacher is OneToOne).
        self.advisory_room = Classroom.objects.create(
            name='7-A', grade_level='7', teacher=self.teacher, capacity=40,
        )
        # Sectioned in the current year.
        self.room_12a = Classroom.objects.create(
            name='12-STEM A', grade_level='12', capacity=40,
            academic_year_id=self.portal_year.id,
        )
        # Sectioned only in last year.
        self.room_old = Classroom.objects.create(
            name='7-A-old', grade_level='7', capacity=40,
            academic_year_id=self.old_portal_year.id,
        )

    def make_student(self, username, *, first='Juan', last='Dela Cruz', grade='12',
                     sex='male', status='active', account_status='active',
                     approved=True, joined=None):
        user = User.objects.create_user(
            username=username, password='pass', role='student',
            first_name=first, last_name=last, is_approved=approved,
        )
        if account_status != 'active':
            user.account_status = account_status
            if account_status in ('inactive', 'suspended'):
                user.is_active = False
            user.save()
        Profile.objects.create(
            user=user,
            lrn=username if username.isdigit() else None,
            grade_level=grade,
            sex=sex,
            enrollment_status=status,
        )
        if joined is not None:
            User.objects.filter(pk=user.pk).update(date_joined=joined)
        return user

    def enroll(self, student, classroom):
        return StudentClassEnrollment.objects.create(student=student, classroom=classroom)


class DirectoryListFilterTest(DirectoryTestBase):
    def test_admin_role_student_returns_only_students(self):
        """Regression: the admin path used to return every approved user."""
        teacher_user = User.objects.create_user(
            username='other_staff', password='pass', role='staff',
            staff_title='teacher', is_approved=True,
        )
        parent = User.objects.create_user(
            username='other_parent', password='pass', role='parent', is_approved=True,
        )
        self.make_student('123456789001')

        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/users/', {'role': 'student'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        roles = {u['role'] for u in results_of(res)}
        self.assertEqual(roles, {'student'})
        ids = {u['id'] for u in results_of(res)}
        self.assertNotIn(teacher_user.id, ids)
        self.assertNotIn(parent.id, ids)

    def test_grade_section_status_sex_account_filters(self):
        placed = self.make_student('123456789002', first='Ana', grade='12', sex='female')
        self.enroll(placed, self.room_12a)
        self.make_student('123456789003', first='Ben', grade='7', sex='male')
        inactive = self.make_student(
            '123456789004', first='Cara', grade='12',
            status='inactive', account_status='inactive',
        )

        self.client.force_authenticate(user=self.admin)

        res = self.client.get('/api/v1/users/', {'role': 'student', 'grade': '12'})
        names = {u['first_name'] for u in results_of(res)}
        self.assertEqual(names, {'Ana', 'Cara'})

        # Profiles written as "Grade 12" (other flows) match the digit filter.
        wordy = self.make_student('123456789018', first='Dee', grade='Grade 12')
        res = self.client.get('/api/v1/users/', {'role': 'student', 'grade': '12'})
        names = {u['first_name'] for u in results_of(res)}
        self.assertEqual(names, {'Ana', 'Cara', 'Dee'})
        self.assertEqual(
            Profile.objects.get(user=wordy).enrollment_status, 'active',
        )

        res = self.client.get('/api/v1/users/', {'role': 'student', 'section': str(self.room_12a.id)})
        self.assertEqual([u['id'] for u in results_of(res)], [placed.id])

        res = self.client.get('/api/v1/users/', {'role': 'student', 'status': 'inactive'})
        self.assertEqual([u['id'] for u in results_of(res)], [inactive.id])

        res = self.client.get('/api/v1/users/', {'role': 'student', 'sex': 'female'})
        self.assertEqual([u['id'] for u in results_of(res)], [placed.id])

        res = self.client.get('/api/v1/users/', {'role': 'student', 'account_status': 'inactive'})
        self.assertEqual([u['id'] for u in results_of(res)], [inactive.id])

    def test_academic_year_scope_keeps_pending_and_drops_history(self):
        in_year = self.make_student('123456789005', first='In')
        self.enroll(in_year, self.room_12a)
        last_year = self.make_student('123456789006', first='Old')
        self.enroll(last_year, self.room_old)
        never = self.make_student('123456789007', first='New')

        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/users/', {
            'role': 'student', 'academic_year': str(self.portal_year.id),
        })
        names = {u['first_name'] for u in results_of(res)}
        self.assertEqual(names, {'In', 'New'})  # pending intake stays visible
        self.assertNotIn('Old', names)

        res = self.client.get('/api/v1/users/', {
            'role': 'student', 'academic_year': str(self.old_portal_year.id),
        })
        names = {u['first_name'] for u in results_of(res)}
        self.assertEqual(names, {'Old', 'New'})

    def test_search_matches_lrn_and_registration_number(self):
        # LRN lives on the profile and (usually) equals the username, so use a
        # username that differs to prove the new profile__lrn search field.
        kid = self.make_student('kid_lrn', first='LRNkid')
        Profile.objects.filter(user=kid).update(
            lrn='128094140993', registration_number='128094140993',
        )
        self.make_student('123456789009', first='Other')
        self.client.force_authenticate(user=self.admin)

        res = self.client.get('/api/v1/users/', {'role': 'student', 'search': '128094140993'})
        names = {u['first_name'] for u in results_of(res)}
        self.assertEqual(names, {'LRNkid'})

    def test_ordering_and_page_size(self):
        self.make_student('123456789010', first='Zoe')
        self.make_student('123456789011', first='Amy')
        self.make_student('123456789012', first='Mia')
        self.client.force_authenticate(user=self.admin)

        res = self.client.get('/api/v1/users/', {'role': 'student', 'ordering': 'first_name'})
        self.assertEqual(
            [u['first_name'] for u in results_of(res)],
            ['Amy', 'Mia', 'Zoe'],
        )

        res = self.client.get('/api/v1/users/', {'role': 'student', 'page_size': '2'})
        self.assertEqual(res.data['count'], 3)
        self.assertEqual(len(res.data['results']), 2)

        res = self.client.get('/api/v1/users/', {'role': 'student', 'page_size': '9999'})
        self.assertEqual(res.data['count'], 3)
        # max_page_size caps runaway requests.
        self.assertLessEqual(len(res.data['results']), 500)

    def test_bad_date_filter_returns_400(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/users/', {'role': 'student', 'date_from': 'nope'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_directory_fields_are_serialized(self):
        self.make_student('123456789013')
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/users/', {'role': 'student'})
        row = results_of(res)[0]
        self.assertEqual(row['profile']['lrn'], '123456789013')
        self.assertEqual(row['profile']['enrollment_status'], 'active')
        self.assertIn('is_active', row)
        self.assertIn('date_joined', row)

    def test_new_fields_are_read_only(self):
        """Status/lrn/created date must not be writable through plain PATCH."""
        student = self.make_student('123456789014')
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(f'/api/v1/users/{student.id}/', {
            'profile': {'enrollment_status': 'graduated', 'lrn': '999999999999'},
            'is_active': False,
            'date_joined': '2000-01-01T00:00:00Z',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        student.refresh_from_db()
        profile = Profile.objects.get(user=student)
        self.assertEqual(profile.enrollment_status, 'active')
        self.assertEqual(profile.lrn, '123456789014')
        self.assertTrue(student.is_active)

    def test_registrar_and_guidance_see_all_students_but_teacher_is_scoped(self):
        placed = self.make_student('123456789015')
        self.enroll(placed, self.advisory_room)
        self.make_student('123456789016')

        for account in (self.registrar, self.guide):
            self.client.force_authenticate(user=account)
            res = self.client.get('/api/v1/users/', {'role': 'student'})
            self.assertEqual(
                {u['username'] for u in results_of(res)},
                {'123456789015', '123456789016'},
                f'{account.staff_title} should see every student',
            )

        self.client.force_authenticate(user=self.teacher)
        res = self.client.get('/api/v1/users/', {'role': 'student'})
        self.assertEqual([u['username'] for u in results_of(res)], ['123456789015'])


class StudentStatsTest(DirectoryTestBase):
    def setUp(self):
        super().setUp()
        # Placed + live status, joined during the current school year.
        self.new_active = self.make_student(
            '123456789020', first='New', joined=date(2026, 6, 15),
        )
        self.enroll(self.new_active, self.room_12a)
        # Placed + live status, joined last year.
        self.old_active = self.make_student(
            '123456789021', first='Old', joined=date(2025, 7, 1),
        )
        self.enroll(self.old_active, self.room_12a)
        # Live status but no section -> pending.
        self.make_student('123456789022', first='Pending', joined=date(2025, 7, 1))
        # Retired status, still has a section row.
        retired = self.make_student(
            '123456789023', first='Grad', status='graduated', joined=date(2025, 7, 1),
        )
        self.enroll(retired, self.room_12a)
        # Not a student / unapproved: must never be counted.
        User.objects.create_user(
            username='123456789024', password='pass', role='student', is_approved=False,
        )
        User.objects.create_user(
            username='staff_x', password='pass', role='staff',
            staff_title='teacher', is_approved=True,
        )

    def test_counts_are_real_and_disjoint(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/users/student_stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['total'], 4)
        self.assertEqual(res.data['active'], 2)
        self.assertEqual(res.data['pending'], 1)
        self.assertEqual(res.data['inactive'], 1)  # the graduated student
        self.assertEqual(
            res.data['active'] + res.data['pending'] + res.data['inactive'],
            res.data['total'],
        )
        # No active school year is configured and no academic_year param was
        # sent -> calendar-year fallback (2026): only the June-2026 join counts.
        self.assertEqual(res.data['new_this_year'], 1)

    def test_academic_year_param_scopes_and_supplies_year_start(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/users/student_stats/', {
            'academic_year': str(self.portal_year.id),
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # All four students are either sectioned this year or never sectioned;
        # the pending student stays visible.
        self.assertEqual(res.data['total'], 4)
        self.assertEqual(res.data['pending'], 1)
        # SY start 2026-06-01 -> the June 2026 join is "new this year".
        self.assertEqual(res.data['new_this_year'], 1)

    def test_teacher_stats_are_advisory_scoped(self):
        placed = self.make_student('123456789025')
        self.enroll(placed, self.advisory_room)
        self.client.force_authenticate(user=self.teacher)
        res = self.client.get('/api/v1/users/student_stats/')
        self.assertEqual(res.data['total'], 1)

    def test_registrar_sees_everyone(self):
        self.client.force_authenticate(user=self.registrar)
        res = self.client.get('/api/v1/users/student_stats/')
        self.assertEqual(res.data['total'], 4)


class StudentStatusChangeTest(DirectoryTestBase):
    def setUp(self):
        super().setUp()
        self.student = self.make_student('123456789030', status='active')
        self.enroll(self.student, self.advisory_room)
        self.other = self.make_student('123456789031')

    def test_change_requires_reason_and_audits(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            f'/api/v1/users/{self.student.id}/update-enrollment-status/',
            {'status': 'transferred', 'reason': 'Moved to Quezon City'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        profile = Profile.objects.get(user=self.student)
        self.assertEqual(profile.enrollment_status, 'transferred')
        self.assertEqual(profile.enrollment_status_reason, 'Moved to Quezon City')
        self.assertEqual(res.data['previous_status'], 'active')

        # Account status is a different fact and must stay untouched (§12).
        self.student.refresh_from_db()
        self.assertEqual(self.student.account_status, 'active')
        self.assertTrue(self.student.is_active)

        audit = AuditLog.objects.filter(model_name='Profile').order_by('-id').first()
        self.assertIsNotNone(audit)
        self.assertIn('transferred', audit.description)
        self.assertIn('Moved to Quezon City', audit.description)

    def test_missing_reason_rejected(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            f'/api/v1/users/{self.student.id}/update-enrollment-status/',
            {'status': 'inactive'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            Profile.objects.get(user=self.student).enrollment_status, 'active',
        )

    def test_invalid_status_rejected(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            f'/api/v1/users/{self.student.id}/update-enrollment-status/',
            {'status': 'nonsense', 'reason': 'x'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_students_cannot_change_status(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.post(
            f'/api/v1/users/{self.student.id}/update-enrollment-status/',
            {'status': 'graduated', 'reason': 'self-serve'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            Profile.objects.get(user=self.student).enrollment_status, 'active',
        )

    def test_advisory_teacher_changes_own_student_only(self):
        self.client.force_authenticate(user=self.teacher)
        res = self.client.post(
            f'/api/v1/users/{self.student.id}/update-enrollment-status/',
            {'status': 'dropped', 'reason': 'No longer attending'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        # A student outside the advisory classroom is not reachable (scoped
        # queryset answers 404 before any write can happen).
        res = self.client.post(
            f'/api/v1/users/{self.other.id}/update-enrollment-status/',
            {'status': 'dropped', 'reason': 'should not apply'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            Profile.objects.get(user=self.other).enrollment_status, 'active',
        )

    def test_registrar_and_guidance_can_change_any_student(self):
        for account in (self.registrar, self.guide):
            self.client.force_authenticate(user=account)
            res = self.client.post(
                f'/api/v1/users/{self.other.id}/update-enrollment-status/',
                {'status': 'inactive', 'reason': 'Leave of absence'},
                format='json',
            )
            self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
            Profile.objects.filter(user=self.other).update(
                enrollment_status='active', enrollment_status_reason='',
            )

    def test_account_status_reason_is_audited(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            f'/api/v1/users/{self.student.id}/update_status/',
            {'status': 'inactive', 'reason': 'Disciplinary review'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['reason'], 'Disciplinary review')
        audit = AuditLog.objects.order_by('-id').first()
        self.assertIn('Disciplinary review', audit.description)


class BulkStudentActionsTest(DirectoryTestBase):
    def setUp(self):
        super().setUp()
        self.s1 = self.make_student('123456789040', grade='12')
        self.s2 = self.make_student('123456789041', grade='12')
        self.mismatch = self.make_student('123456789042', grade='7')

    def test_bulk_status_change_updates_all_and_audits_once(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/users/bulk-update-enrollment-status/', {
            'user_ids': [self.s1.id, self.s2.id],
            'status': 'inactive',
            'reason': 'Mass leave of absence',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['updated_count'], 2)
        for student in (self.s1, self.s2):
            self.assertEqual(
                Profile.objects.get(user=student).enrollment_status, 'inactive',
            )
        self.assertEqual(
            Profile.objects.get(user=self.mismatch).enrollment_status, 'active',
        )
        self.assertTrue(
            AuditLog.objects.filter(
                model_name='Profile', description__contains='Mass leave of absence',
            ).exists(),
        )

    def test_bulk_status_requires_reason_and_students(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/users/bulk-update-enrollment-status/', {
            'user_ids': [self.s1.id], 'status': 'inactive',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        res = self.client.post('/api/v1/users/bulk-update-enrollment-status/', {
            'user_ids': [], 'status': 'inactive', 'reason': 'x',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_plain_teacher_cannot_bulk_change_status(self):
        self.client.force_authenticate(user=self.teacher)
        res = self.client.post('/api/v1/users/bulk-update-enrollment-status/', {
            'user_ids': [self.s1.id], 'status': 'inactive', 'reason': 'x',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_registrar_can_bulk_change_status(self):
        self.client.force_authenticate(user=self.registrar)
        res = self.client.post('/api/v1/users/bulk-update-enrollment-status/', {
            'user_ids': [self.s1.id], 'status': 'graduated', 'reason': 'SY complete',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)

    def test_bulk_assign_section_success_and_grade_mismatch(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/users/bulk-assign-section/', {
            'user_ids': [self.s1.id, self.s2.id, self.mismatch.id],
            'classroom_id': self.room_12a.id,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['assigned_count'], 2)
        self.assertEqual(len(res.data['skipped']), 1)
        self.assertEqual(res.data['skipped'][0]['id'], self.mismatch.id)
        self.assertIn('Grade level mismatch', res.data['skipped'][0]['error'])

        self.assertEqual(
            StudentClassEnrollment.objects.filter(
                student__in=[self.s1, self.s2], classroom=self.room_12a,
            ).count(),
            2,
        )
        self.assertFalse(
            StudentClassEnrollment.objects.filter(
                student=self.mismatch, classroom=self.room_12a,
            ).exists(),
        )
        # Profile grade follows the section, mirroring single assign_section.
        self.assertEqual(Profile.objects.get(user=self.s1).grade_level, '12')
        self.assertTrue(
            AuditLog.objects.filter(
                model_name='StudentClassEnrollment',
                description__contains='bulk assigned 2 students',
            ).exists(),
        )

    def test_bulk_assign_respects_capacity(self):
        small = Classroom.objects.create(
            name='9-Small', grade_level='9', capacity=1,
            academic_year_id=self.portal_year.id,
        )
        g1 = self.make_student('123456789043', grade='9')
        g2 = self.make_student('123456789044', grade='9')
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/users/bulk-assign-section/', {
            'user_ids': [g1.id, g2.id], 'classroom_id': small.id,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('enough seats', res.data['error'])
        self.assertEqual(
            StudentClassEnrollment.objects.filter(classroom=small).count(), 0,
        )

    def test_bulk_assign_idempotent_and_roles(self):
        self.enroll(self.s1, self.room_12a)
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/users/bulk-assign-section/', {
            'user_ids': [self.s1.id, self.s2.id], 'classroom_id': self.room_12a.id,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['assigned_count'], 1)
        self.assertEqual(len(res.data['already_enrolled']), 1)
        self.assertEqual(
            StudentClassEnrollment.objects.filter(
                student=self.s1, classroom=self.room_12a,
            ).count(),
            1,
        )

        self.client.force_authenticate(user=self.teacher)
        res = self.client.post('/api/v1/users/bulk-assign-section/', {
            'user_ids': [self.s2.id], 'classroom_id': self.room_12a.id,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class ImportDryRunTest(DirectoryTestBase):
    VALID_A = '123456789100'
    VALID_B = '123456789101'
    EXISTING = '123456789102'

    def csv_file(self, content):
        return SimpleUploadedFile('students.csv', content.encode('utf-8'), content_type='text/csv')

    def sample_csv(self):
        rows = [
            'Student ID,Email,First Name,Last Name,Grade Level,Sex',
            f'{self.VALID_A},ana@mail.com,Ana,Santos,12,Female',
            f'{self.VALID_B},,Ben,Reyes,12,Male',
            '12345678910,Cara,Lee,,12,Female',            # bad LRN length
            f'{self.VALID_A},,,Dup,Dup,12,Male',           # duplicate LRN in file
            f'{self.EXISTING},,Eve,Existing,12,Female',    # already in system
            '123456789103,,,,,Male',                      # missing both names
            f'123456789104,fay@mail.com,Fay,Garcia,,Female',  # warning: no grade
        ]
        return '\n'.join(rows)

    def setUp(self):
        super().setUp()
        # The 5/hour import quota lives in the process-wide cache; isolate it
        # from other tests so real-import assertions are deterministic (and
        # don't leak into later test modules that share user ids).
        from django.core.cache import cache
        cache.clear()
        self.make_student(self.EXISTING, first='Eve')

    def tearDown(self):
        from django.core.cache import cache
        cache.clear()
        super().tearDown()

    def test_dry_run_validates_without_writing(self):
        self.client.force_authenticate(user=self.admin)
        before = User.objects.count()
        res = self.client.post('/api/v1/users/import_csv/', {
            'file': self.csv_file(self.sample_csv()),
            'dry_run': '1',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertTrue(res.data['dry_run'])
        self.assertEqual(User.objects.count(), before, 'dry run must not write')

        # valid: VALID_A, VALID_B, 123456789104 (grade warning) = 3
        self.assertEqual(res.data['valid_count'], 3)
        rows_with_errors = {e['row'] for e in res.data['row_errors']}
        self.assertEqual(rows_with_errors, {3, 4, 5, 6})
        messages = ' | '.join(e['message'] for e in res.data['row_errors'])
        self.assertIn('Duplicate LRN', messages)
        self.assertIn('already exists', messages)
        self.assertIn('12 digits', messages)
        self.assertIn('First Name or Last Name', messages)

        warning_rows = {w['row'] for w in res.data['row_warnings']}
        self.assertIn(7, warning_rows)  # missing grade level

        preview_ids = [p['student_id'] for p in res.data['preview']]
        self.assertEqual(preview_ids, [self.VALID_A, self.VALID_B, '123456789104'])

        self.assertFalse(
            AuditLog.objects.filter(description__contains='CSV import').exists(),
            'a dry run writes no audit entry',
        )

    def test_real_import_creates_only_valid_rows(self):
        self.client.force_authenticate(user=self.admin)
        before = User.objects.count()
        res = self.client.post('/api/v1/users/import_csv/', {
            'file': self.csv_file(self.sample_csv()),
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertFalse(res.data['dry_run'])
        self.assertEqual(res.data['created_count'], 3)
        self.assertEqual(User.objects.count(), before + 3)
        self.assertEqual(len(res.data['row_errors']), 4)
        # Flat legacy error list still populated for the current UI.
        self.assertEqual(len(res.data['errors']), 4)
        self.assertTrue(
            AuditLog.objects.filter(description__contains='imported 3 students').exists(),
        )

    def test_dry_runs_are_not_throttled_and_quota_still_applies(self):
        """Preview cycles must not consume the 5/hour import quota."""
        self.client.force_authenticate(user=self.admin)

        # Six dry runs in a row: all succeed, none hit 429.
        for i in range(6):
            res = self.client.post('/api/v1/users/import_csv/', {
                'file': self.csv_file(
                    'Student ID,Email,First Name,Last Name,Grade Level,Sex\n'
                    f'1234567892{i:02d},,Dry,Run{i},12,Male'
                ),
                'dry_run': '1',
            })
            self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)

        # Real imports still consume the quota: 5 allowed, 6th rejected.
        codes = []
        for i in range(6):
            res = self.client.post('/api/v1/users/import_csv/', {
                'file': self.csv_file(
                    'Student ID,Email,First Name,Last Name,Grade Level,Sex\n'
                    f'1234567893{i:02d},,Real,Import{i},12,Male'
                ),
            })
            codes.append(res.status_code)
        self.assertEqual(codes[:5], [status.HTTP_200_OK] * 5)
        self.assertEqual(codes[5], status.HTTP_429_TOO_MANY_REQUESTS)

    def test_registrar_can_import_but_guidance_cannot(self):
        self.client.force_authenticate(user=self.registrar)
        res = self.client.post('/api/v1/users/import_csv/', {
            'file': self.csv_file('Student ID,Email,First Name,Last Name,Grade Level,Sex\n123456789105,,Reg,Case,7,Male'),
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['created_count'], 1)

        self.client.force_authenticate(user=self.guide)
        res = self.client.post('/api/v1/users/import_csv/', {
            'file': self.csv_file('Student ID,Email,First Name,Last Name,Grade Level,Sex\n123456789106,,No,Case,7,Male'),
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class EnrollmentStudentFilterTest(DirectoryTestBase):
    def setUp(self):
        super().setUp()
        self.mine = self.make_student('123456789050')
        self.enroll(self.mine, self.advisory_room)
        self.theirs = self.make_student('123456789051')
        self.enroll(self.theirs, self.room_12a)

    def test_student_param_returns_one_students_history(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/enrollments/', {'student': str(self.mine.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [r['student'] for r in results_of(res)],
            [self.mine.id],
        )

    def test_registrar_reads_any_student_but_teacher_stays_scoped(self):
        self.client.force_authenticate(user=self.registrar)
        res = self.client.get('/api/v1/enrollments/', {'student': str(self.theirs.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(results_of(res)), 1)

        self.client.force_authenticate(user=self.teacher)
        res = self.client.get('/api/v1/enrollments/', {'student': str(self.theirs.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(results_of(res), [])  # not their classroom

        res = self.client.get('/api/v1/enrollments/', {'student': str(self.mine.id)})
        self.assertEqual(len(results_of(res)), 1)

    def test_student_cannot_read_another_students_history(self):
        self.client.force_authenticate(user=self.mine)
        res = self.client.get('/api/v1/enrollments/', {'student': str(self.theirs.id)})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(results_of(res), [])
