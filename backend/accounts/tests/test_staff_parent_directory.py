"""
Staff + parent directory (People -> Staff / Parents) backend support.

Covers the Phase-5 additions that mirror the student directory:

- /api/v1/users/staff_stats/ and /api/v1/users/parent_stats/ real counts,
  computed over the *same* scope the directory list uses so the summary cards
  always agree with the table,
- staff directory filters (department, staff title, additional role) and the
  parent linkage filter (has_children),
- `include_inactive=1`: admins can still see, filter and un-suspend
  deactivated accounts, while the faculty / parent pickers that share
  `?role=staff` and `?role=parent` keep their old active-only behaviour, and
  non-admin callers cannot opt in,
- CSV import dry-run validation for staff and parents (single validation pass,
  no writes, row-indexed errors and warnings, dry runs exempt from the 5/hour
  import throttle) plus the real import writing only valid rows,
- bulk account status changes recording their reason in the audit trail.
"""
from datetime import date

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import AuditLog, Department, Profile

User = get_user_model()


class StaffParentDirectoryTestBase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # `is_admin=True` keeps this account out of the "demote stale admins"
        # side effect that runs inside get_queryset for non-admin callers, so
        # staff counts stay stable no matter which role makes the request.
        self.admin = User.objects.create_user(
            username='admin_sp', password='pass', role='admin',
            is_staff=True, is_approved=True, is_admin=True,
        )
        self.teacher = User.objects.create_user(
            username='teach_sp', password='pass', role='staff',
            staff_title='teacher_i', is_approved=True,
        )
        self.registrar = User.objects.create_user(
            username='reg_sp', password='pass', role='staff',
            staff_title='registrar', is_approved=True,
        )
        self.guide = User.objects.create_user(
            username='guid_sp', password='pass', role='staff',
            staff_title='guidance_counselor', is_approved=True,
        )
        # Deactivated accounts: the directory must still be able to show them.
        self.suspended_staff = User.objects.create_user(
            username='sus_sp', password='pass', role='staff',
            staff_title='teacher_ii', is_approved=True,
        )
        self.suspended_staff.account_status = 'suspended'
        self.suspended_staff.is_active = False
        self.suspended_staff.save(update_fields=['account_status', 'is_active'])

        self.disabled_staff = User.objects.create_user(
            username='dis_sp', password='pass', role='staff',
            staff_title='librarian', is_approved=True,
        )
        self.disabled_staff.account_status = 'inactive'
        self.disabled_staff.is_active = False
        self.disabled_staff.save(update_fields=['account_status', 'is_active'])

        self.pending_staff = User.objects.create_user(
            username='pend_sp', password='pass', role='staff',
            staff_title='it_staff', is_approved=True,
            account_status='pending_reset',
        )

        # Never a member of the staff directory.
        self.student = User.objects.create_user(
            username='123456789010', password='pass', role='student',
            first_name='Juan', last_name='Dela Cruz', is_approved=True,
        )
        Profile.objects.create(user=self.student, lrn='123456789010', grade_level='12')
        self.parent = User.objects.create_user(
            username='parent_sp', email='parent.sp@mail.com', password='pass',
            role='parent', first_name='Maria', last_name='Dela Cruz',
            is_approved=True,
        )

    # ── helpers ──────────────────────────────────────────────────────────────
    def link(self, parent, *students):
        profile, _ = Profile.objects.get_or_create(user=parent)
        profile.linked_students.add(*students)
        return profile

    def set_joined(self, user, when):
        User.objects.filter(pk=user.pk).update(date_joined=when)

    def staff_ids(self, params):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/users/', params)
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        data = res.data
        rows = data['results'] if isinstance(data, dict) else data
        return {u['id'] for u in rows}


class StaffStatsTest(StaffParentDirectoryTestBase):
    def setUp(self):
        super().setUp()
        # Two of the seven in-scope staff predate the current calendar year.
        self.set_joined(self.teacher, date(2019, 1, 1))
        self.set_joined(self.registrar, date(2019, 1, 1))

    def test_counts_match_the_directory_scope(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/users/staff_stats/', {
            'role': 'staff', 'include_inactive': '1',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)

        # 3 plain staff + 3 deactivated staff + the admin account (the
        # `?role=staff` scope is staff OR admin, exactly like the list).
        self.assertEqual(res.data['total'], 7)
        self.assertEqual(res.data['active'], 4)
        self.assertEqual(res.data['suspended'], 1)
        self.assertEqual(res.data['inactive'], 1)
        self.assertEqual(res.data['pending_reset'], 1)
        self.assertEqual(
            res.data['active'] + res.data['suspended']
            + res.data['inactive'] + res.data['pending_reset'],
            res.data['total'],
        )
        # No active school year and no academic_year param -> calendar-year
        # fallback: only the accounts created in 2026 count.
        self.assertEqual(res.data['new_this_year'], 5)

        self.assertEqual(res.data['by_title']['teacher_i'], 1)
        self.assertEqual(res.data['by_title']['registrar'], 1)
        self.assertEqual(res.data['by_title']['teacher_ii'], 1)
        self.assertEqual(res.data['by_title']['librarian'], 1)

    def test_stats_follow_the_requested_role_scope(self):
        # The active-only scope (no include_inactive) drops both deactivated
        # accounts, so the cards track whatever the list is showing.
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/users/staff_stats/', {'role': 'staff'})
        self.assertEqual(res.data['total'], 5)
        self.assertEqual(res.data['suspended'], 0)

        # Omitting the role param falls back to the equivalent staff scope.
        res = self.client.get('/api/v1/users/staff_stats/')
        self.assertEqual(res.data['total'], 5)

    def test_students_and_parents_are_never_counted(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/users/staff_stats/', {
            'role': 'staff', 'include_inactive': '1',
        })
        titles = res.data['by_title']
        self.assertEqual(sum(titles.values()), 6)  # the admin has no staff title
        self.assertFalse(res.data['total'] > 7)

    def test_registrar_sees_the_staff_directory(self):
        self.client.force_authenticate(user=self.registrar)
        res = self.client.get('/api/v1/users/staff_stats/', {'role': 'staff'})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['total'], 5)


class StaffDirectoryFilterTest(StaffParentDirectoryTestBase):
    def setUp(self):
        super().setUp()
        self.math = Department.objects.create(name='Mathematics', code='MATH')
        self.science = Department.objects.create(name='Science', code='SCI')
        self.math.members.add(self.teacher)
        self.science.members.add(self.registrar, self.guide)
        self.teacher.additional_roles = 'registrar'
        self.teacher.save(update_fields=['additional_roles'])

    def test_department_filter(self):
        ids = self.staff_ids({'role': 'staff', 'department': str(self.math.id)})
        self.assertIn(self.teacher.id, ids)
        self.assertNotIn(self.registrar.id, ids)
        self.assertNotIn(self.guide.id, ids)

    def test_staff_title_filter(self):
        ids = self.staff_ids({'role': 'staff', 'staff_title': 'registrar'})
        self.assertEqual(ids, {self.registrar.id})

    def test_additional_role_filter_is_substring_based(self):
        ids = self.staff_ids({'role': 'staff', 'additional_role': 'registrar'})
        self.assertIn(self.teacher.id, ids)
        self.assertNotIn(self.registrar.id, ids)

    def test_account_status_filter_needs_include_inactive(self):
        visible = self.staff_ids({'role': 'staff', 'account_status': 'suspended'})
        self.assertNotIn(self.suspended_staff.id, visible)

        visible = self.staff_ids({
            'role': 'staff', 'include_inactive': '1', 'account_status': 'suspended',
        })
        self.assertEqual(visible, {self.suspended_staff.id})

    def test_include_inactive_shows_deactivated_accounts_to_admins(self):
        ids = self.staff_ids({'role': 'staff'})
        self.assertNotIn(self.suspended_staff.id, ids)
        self.assertNotIn(self.disabled_staff.id, ids)

        ids = self.staff_ids({'role': 'staff', 'include_inactive': '1'})
        self.assertIn(self.suspended_staff.id, ids)
        self.assertIn(self.disabled_staff.id, ids)

    def test_non_admin_cannot_opt_in_to_inactive_accounts(self):
        # The faculty pickers share `?role=staff`; a teacher asking for
        # deactivated accounts must still get the active-only list.
        for caller in (self.teacher, self.registrar, self.guide):
            self.client.force_authenticate(user=caller)
            res = self.client.get('/api/v1/users/', {
                'role': 'staff', 'include_inactive': '1',
            })
            self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
            data = res.data
            rows = data['results'] if isinstance(data, dict) else data
            ids = {u['id'] for u in rows}
            self.assertNotIn(self.suspended_staff.id, ids, caller.username)
            self.assertNotIn(self.disabled_staff.id, ids, caller.username)
            self.assertIn(self.teacher.id, ids, caller.username)

    def test_pickers_without_the_flag_are_unchanged(self):
        """`?role=staff` alone still means *active* staff only."""
        ids = self.staff_ids({'role': 'staff'})
        self.assertEqual(ids, {
            self.admin.id, self.teacher.id, self.registrar.id,
            self.guide.id, self.pending_staff.id,
        })
        # Students and parents are never in the faculty picker.
        self.assertNotIn(self.student.id, ids)
        self.assertNotIn(self.parent.id, ids)

    def test_staff_cannot_see_inactive_staff_even_when_admin_asks_last(self):
        # The flag is evaluated per request from the caller's own privileges,
        # so it can never be "sticky" across requests.
        self.staff_ids({'role': 'staff', 'include_inactive': '1'})
        self.client.force_authenticate(user=self.teacher)
        res = self.client.get('/api/v1/users/', {
            'role': 'staff', 'include_inactive': '1',
        })
        rows = res.data['results'] if isinstance(res.data, dict) else res.data
        self.assertNotIn(self.suspended_staff.id, {u['id'] for u in rows})


class ParentDirectoryFilterTest(StaffParentDirectoryTestBase):
    def setUp(self):
        super().setUp()
        self.parent_two = User.objects.create_user(
            username='parent_two', email='parent.two@mail.com', password='pass',
            role='parent', first_name='Jose', last_name='Santos', is_approved=True,
        )
        self.link(self.parent, self.student)

        self.suspended_parent = User.objects.create_user(
            username='parent_sus', email='parent.sus@mail.com', password='pass',
            role='parent', first_name='Ana', last_name='Reyes', is_approved=True,
        )
        self.suspended_parent.account_status = 'suspended'
        self.suspended_parent.is_active = False
        self.suspended_parent.save(update_fields=['account_status', 'is_active'])

    def test_has_children_filter(self):
        linked = self.staff_ids({'role': 'parent', 'has_children': 'true'})
        self.assertEqual(linked, {self.parent.id})

        unlinked = self.staff_ids({'role': 'parent', 'has_children': 'false'})
        self.assertEqual(unlinked, {self.parent_two.id})

    def test_parent_stats_count_linkage(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/users/parent_stats/', {
            'role': 'parent', 'include_inactive': '1',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['total'], 3)
        self.assertEqual(res.data['with_children'], 1)
        self.assertEqual(res.data['active'], 2)
        self.assertEqual(res.data['suspended'], 1)
        self.assertEqual(
            res.data['active'] + res.data['suspended']
            + res.data['inactive'] + res.data['pending_reset'],
            res.data['total'],
        )

    def test_parent_stats_default_scope_matches_the_default_list(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/users/parent_stats/')
        self.assertEqual(res.data['total'], 2)  # the suspended parent is out
        res = self.client.get('/api/v1/users/parent_stats/', {'role': 'parent'})
        self.assertEqual(res.data['total'], 2)

    def test_suspended_parent_is_visible_only_with_the_flag(self):
        ids = self.staff_ids({'role': 'parent'})
        self.assertNotIn(self.suspended_parent.id, ids)

        ids = self.staff_ids({'role': 'parent', 'include_inactive': '1'})
        self.assertIn(self.suspended_parent.id, ids)

        # `?role=parent` alone is what the parent pickers send: unchanged.
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/users/', {'role': 'parent'})
        rows = res.data['results'] if isinstance(res.data, dict) else res.data
        self.assertNotIn(self.suspended_parent.id, {u['id'] for u in rows})


class StaffImportTest(StaffParentDirectoryTestBase):
    def csv_file(self, content, name='staff.csv'):
        return SimpleUploadedFile(name, content.encode('utf-8'), content_type='text/csv')

    def sample_csv(self):
        rows = [
            'Email,Title,First Name,Last Name,Staff Title,Sex',
            'ana.santos@knhs.edu.ph,Ms.,Ana,Santos,teacher_i,Female',   # valid
            ',Mr.,No,Email,teacher_ii,Male',                            # no email
            'ben.reyes@knhs.edu.ph,,Ben,Reyes,not_a_real_title,Male',   # title warning
            'ana.santos@knhs.edu.ph,Mr.,Ana,Again,teacher_i,Female',    # dup in file
            'taken@knhs.edu.ph,Ms.,Tak,En,librarian,Female',            # exists already
            'cara.lee@knhs.edu.ph,Mrs.,Cara,Lee,registrar,X',           # sex warning
            'noname@knhs.edu.ph,,,,,',                                  # no names
        ]
        return '\n'.join(rows)

    def setUp(self):
        super().setUp()
        from django.core.cache import cache
        cache.clear()
        # An account that already occupies an email address.
        User.objects.create_user(
            username='taken@knhs.edu.ph', email='taken@knhs.edu.ph',
            password='pass', role='staff', staff_title='librarian',
            first_name='Tak', last_name='En', is_approved=True,
        )

    def tearDown(self):
        from django.core.cache import cache
        cache.clear()
        super().tearDown()

    def test_dry_run_validates_without_writing(self):
        self.client.force_authenticate(user=self.admin)
        before = User.objects.count()
        res = self.client.post('/api/v1/users/import_teachers_csv/', {
            'file': self.csv_file(self.sample_csv()),
            'dry_run': '1',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertTrue(res.data['dry_run'])
        self.assertEqual(User.objects.count(), before, 'a dry run must not write')
        self.assertEqual(res.data['created_count'], 0)

        # Rows 1, 3 and 6 are importable; rows 3 and 6 only carry warnings.
        self.assertEqual(res.data['valid_count'], 3)
        rows_with_errors = {e['row'] for e in res.data['row_errors']}
        self.assertEqual(rows_with_errors, {2, 4, 5, 7})
        messages = ' | '.join(e['message'] for e in res.data['row_errors'])
        self.assertIn('Missing Email', messages)
        self.assertIn('Duplicate Email', messages)
        self.assertIn('already exists', messages)
        self.assertIn('First Name or Last Name', messages)

        warning_rows = {w['row'] for w in res.data['row_warnings']}
        self.assertEqual(warning_rows, {3, 6})  # unknown title, unrecognised sex
        warning_text = ' | '.join(w['message'] for w in res.data['row_warnings'])
        self.assertIn('defaulting to teacher', warning_text)
        self.assertIn('left blank', warning_text)

        preview = res.data['preview']
        self.assertEqual([p['row'] for p in preview], [1, 3, 6])
        self.assertEqual(preview[0]['staff_title'], 'teacher_i')
        self.assertEqual(preview[1]['staff_title'], 'teacher')  # fell back
        self.assertEqual(preview[2]['staff_title'], 'registrar')
        self.assertEqual(preview[0]['name'], 'Ms. Ana Santos')
        self.assertEqual(preview[2]['name'], 'Mrs. Cara Lee')
        self.assertFalse(preview[0]['has_warnings'])
        self.assertTrue(preview[1]['has_warnings'])
        self.assertTrue(preview[2]['has_warnings'])

        self.assertFalse(
            AuditLog.objects.filter(description__contains='CSV import').exists(),
            'a dry run writes no audit entry',
        )

    def test_real_import_creates_only_valid_rows(self):
        self.client.force_authenticate(user=self.admin)
        before = User.objects.count()
        res = self.client.post('/api/v1/users/import_teachers_csv/', {
            'file': self.csv_file(self.sample_csv()),
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertFalse(res.data['dry_run'])
        self.assertEqual(res.data['created_count'], 3)
        self.assertEqual(User.objects.count(), before + 3)

        # The unrecognised title fell back and the unrecognised sex stayed blank.
        ben = User.objects.get(email='ben.reyes@knhs.edu.ph')
        self.assertEqual(ben.role, 'staff')
        self.assertEqual(ben.staff_title, 'teacher')
        self.assertTrue(ben.must_change_password)
        cara = User.objects.get(email='cara.lee@knhs.edu.ph')
        self.assertEqual(cara.staff_title, 'registrar')
        self.assertIsNone(Profile.objects.get(user=cara).sex)

        self.assertTrue(
            AuditLog.objects.filter(description__contains='imported 3 staff').exists(),
        )

    def test_dry_runs_are_not_throttled(self):
        self.client.force_authenticate(user=self.admin)
        for i in range(6):
            res = self.client.post('/api/v1/users/import_teachers_csv/', {
                'file': self.csv_file(
                    'Email,Title,First Name,Last Name,Staff Title,Sex\n'
                    f'dry{i}@knhs.edu.ph,Mr.,Dry,Run{i},teacher_ii,Male'
                ),
                'dry_run': '1',
            })
            self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
            self.assertEqual(res.data['valid_count'], 1)

        # The real import still has its quota left: the dry runs used none.
        res = self.client.post('/api/v1/users/import_teachers_csv/', {
            'file': self.csv_file(
                'Email,Title,First Name,Last Name,Staff Title,Sex\n'
                'real1@knhs.edu.ph,Mr.,Real,One,teacher_ii,Male'
            ),
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)

    def test_only_admins_can_import_staff(self):
        for caller in (self.teacher, self.registrar, self.guide):
            self.client.force_authenticate(user=caller)
            res = self.client.post('/api/v1/users/import_teachers_csv/', {
                'file': self.csv_file(
                    'Email,Title,First Name,Last Name,Staff Title,Sex\n'
                    'nope@knhs.edu.ph,Mr.,No,Pe,teacher,Male'
                ),
                'dry_run': '1',
            })
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN, caller.username)


class ParentImportTest(StaffParentDirectoryTestBase):
    def csv_file(self, content):
        return SimpleUploadedFile('parents.csv', content.encode('utf-8'), content_type='text/csv')

    def sample_csv(self):
        rows = [
            'Email,First Name,Last Name,Password',
            'maria.delacruz@mail.com,Maria,Dela Cruz,',
            'jose.santos@mail.com,Jose,Santos,Sup3rSecret!',
            ',Missing,Name,',                       # no email
            'maria.delacruz@mail.com,Dup,Lica,',    # duplicate in file
            'taken@mail.com,Tak,En,',               # exists already
            'noname@mail.com,,,',                   # no names
        ]
        return '\n'.join(rows)

    def setUp(self):
        super().setUp()
        from django.core.cache import cache
        cache.clear()
        User.objects.create_user(
            username='taken@mail.com', email='taken@mail.com',
            password='pass', role='parent', first_name='Tak', last_name='En',
            is_approved=True,
        )

    def tearDown(self):
        from django.core.cache import cache
        cache.clear()
        super().tearDown()

    def test_dry_run_validates_without_writing(self):
        self.client.force_authenticate(user=self.admin)
        before = User.objects.count()
        res = self.client.post('/api/v1/users/import_parents_csv/', {
            'file': self.csv_file(self.sample_csv()),
            'dry_run': '1',
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertTrue(res.data['dry_run'])
        self.assertEqual(User.objects.count(), before, 'a dry run must not write')

        self.assertEqual(res.data['valid_count'], 2)
        self.assertEqual(
            {e['row'] for e in res.data['row_errors']}, {3, 4, 5, 6},
        )
        messages = ' | '.join(e['message'] for e in res.data['row_errors'])
        self.assertIn('Missing Email', messages)
        self.assertIn('Duplicate Email', messages)
        self.assertIn('already exists', messages)
        self.assertIn('First Name or Last Name', messages)

        preview = res.data['preview']
        self.assertEqual([p['email'] for p in preview],
                         ['maria.delacruz@mail.com', 'jose.santos@mail.com'])
        self.assertEqual(preview[0]['name'], 'Maria Dela Cruz')
        self.assertFalse(
            AuditLog.objects.filter(description__contains='CSV import').exists(),
        )

    def test_real_import_creates_only_valid_rows(self):
        self.client.force_authenticate(user=self.admin)
        before = User.objects.count()
        res = self.client.post('/api/v1/users/import_parents_csv/', {
            'file': self.csv_file(self.sample_csv()),
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['created_count'], 2)
        self.assertEqual(User.objects.count(), before + 2)

        maria = User.objects.get(email='maria.delacruz@mail.com')
        self.assertEqual(maria.role, 'parent')
        self.assertTrue(maria.must_change_password)
        # Blank password column -> a temporary one was generated for her.
        self.assertTrue(maria.has_usable_password())

        jose = User.objects.get(email='jose.santos@mail.com')
        self.assertTrue(jose.check_password('Sup3rSecret!'))

        self.assertTrue(
            AuditLog.objects.filter(description__contains='imported 2 parents').exists(),
        )

    def test_only_admins_can_import_parents(self):
        self.client.force_authenticate(user=self.registrar)
        res = self.client.post('/api/v1/users/import_parents_csv/', {
            'file': self.csv_file('Email,First Name,Last Name,Password\nx@mail.com,X,Y,'),
            'dry_run': '1',
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class BulkStatusReasonTest(StaffParentDirectoryTestBase):
    def test_bulk_status_records_the_reason_in_the_audit_trail(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/users/bulk-update-status/', {
            'user_ids': [self.teacher.id, self.guide.id],
            'status': 'suspended',
            'reason': 'School-wide security audit',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['reason'], 'School-wide security audit')

        self.teacher.refresh_from_db()
        self.guide.refresh_from_db()
        self.assertEqual(self.teacher.account_status, 'suspended')
        self.assertFalse(self.teacher.is_active)
        self.assertEqual(self.guide.account_status, 'suspended')

        audit = AuditLog.objects.filter(
            description__contains='changed status to suspended',
        ).order_by('-id').first()
        self.assertIsNotNone(audit)
        self.assertIn('School-wide security audit', audit.description)

    def test_bulk_status_requires_a_reason_from_the_client(self):
        """No reason -> the reason field is empty but the update still works.

        Reason is enforced per-record by update_status; the bulk endpoint
        records whatever it is given so the audit line stays truthful.
        """
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/users/bulk-update-status/', {
            'user_ids': [self.teacher.id], 'status': 'inactive',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['reason'], '')

    def test_non_admins_cannot_bulk_change_status(self):
        for caller in (self.teacher, self.registrar, self.guide, self.student):
            self.client.force_authenticate(user=caller)
            res = self.client.post('/api/v1/users/bulk-update-status/', {
                'user_ids': [self.guide.id], 'status': 'suspended',
                'reason': 'nope',
            }, format='json')
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN, caller.username)

    def test_single_status_change_for_staff_carries_the_reason(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            f'/api/v1/users/{self.teacher.id}/update_status/',
            {'status': 'suspended', 'reason': 'On extended leave'},
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data['reason'], 'On extended leave')
        self.teacher.refresh_from_db()
        self.assertEqual(self.teacher.account_status, 'suspended')
        self.assertFalse(self.teacher.is_active)

        audit = AuditLog.objects.filter(model_name='User').order_by('-id').first()
        self.assertIn('On extended leave', audit.description)
