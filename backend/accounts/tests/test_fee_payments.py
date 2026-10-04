"""
Fee Management module: FeeType catalog, school-year scoping, Payment history.

Covers the fee-management improvements:
- /api/v1/fee-types/ CRUD + write gate + delete guard (types with charges
  cannot be deleted, only deactivated),
- charges tied to an academic year (auto-defaulted to the active SY) and
  term, with read-only amount_paid/status (derived from payments),
- POST /api/v1/fees/{id}/payments/ recording payments that can never exceed
  the remaining balance, refreshing the charge's cached totals/status and
  writing an audit entry,
- GET /api/v1/fees/payments/ (school-wide history, role-scoped, filtered),
- the delete guard: charges with recorded payments cannot be deleted.
"""
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import (
    AcademicYear, AuditLog, Classroom, Fee, FeeType, Payment,
    StudentClassEnrollment,
)
from accounts.serializers._base import full_name

User = get_user_model()


def results_of(res):
    """Paginated responses are {'results': [...]} — accept both shapes."""
    data = res.data
    return data['results'] if isinstance(data, dict) else data


class FeePaymentTestBase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin_feepay', password='pass', role='admin', is_staff=True, is_approved=True
        )
        self.staff = User.objects.create_user(
            username='staff_feepay', password='pass', role='staff', staff_title='teacher', is_approved=True
        )
        self.student = User.objects.create_user(
            username='juana', password='pass', role='student',
            first_name='Juana', last_name='Cruz', is_approved=True,
        )
        self.other_student = User.objects.create_user(
            username='pedro', password='pass', role='student', is_approved=True
        )
        self.parent = User.objects.create_user(
            username='parent_feepay', password='pass', role='parent', is_approved=True
        )
        # Seeded by migration 0161 (legacy fee types).
        self.tuition = FeeType.objects.get(code='TUITION')
        self.misc = FeeType.objects.get(code='MISC')
        self.active_year = AcademicYear.objects.create(
            name='2025-2026', start_date=date(2025, 8, 1), end_date=date(2026, 5, 31),
            is_active=True,
        )
        self.prior_year = AcademicYear.objects.create(
            name='2024-2025', start_date=date(2024, 8, 1), end_date=date(2025, 5, 31),
            is_active=False,
        )
        self.due = date(2026, 6, 30)

    def make_charge(self, student=None, amount='500.00', fee_type=None, **overrides):
        return Fee.objects.create(
            student=student or self.student,
            fee_type=fee_type or self.tuition,
            amount=Decimal(amount),
            due_date=self.due,
            **overrides,
        )


class FeeTypeCatalogTests(FeePaymentTestBase):
    def test_admin_creates_type_with_normalized_code(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/fee-types/', {
            'name': 'Laboratory Fee', 'code': ' lab ',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['code'], 'LAB')  # trimmed + uppercased
        self.assertTrue(res.data['is_active'])
        self.assertEqual(res.data['charges_count'], 0)

    def test_duplicate_code_is_rejected(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/fee-types/', {
            'name': 'Tuition Again', 'code': 'TUITION',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(FeeType.objects.count(), 5)  # seeded rows only

    def test_students_and_parents_are_read_only(self):
        for account in (self.student, self.parent):
            self.client.force_authenticate(user=account)
            self.assertEqual(
                self.client.get('/api/v1/fee-types/').status_code,
                status.HTTP_200_OK,
            )  # reads stay open for labeling
            res = self.client.post('/api/v1/fee-types/', {'name': 'Hack', 'code': 'HACK'}, format='json')
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(FeeType.objects.count(), 5)

    def test_staff_can_create_and_update(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post('/api/v1/fee-types/', {'name': 'ID Card', 'code': 'IDCARD'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        res = self.client.patch(f'/api/v1/fee-types/{res.data["id"]}/', {'is_active': False}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(FeeType.objects.get(code='IDCARD').is_active)

    def test_type_with_charges_cannot_be_deleted(self):
        self.make_charge()
        self.client.force_authenticate(user=self.admin)
        res = self.client.delete(f'/api/v1/fee-types/{self.tuition.id}/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('reference', res.data['error'])
        self.assertTrue(FeeType.objects.filter(id=self.tuition.id).exists())

    def test_unused_type_can_be_deleted(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.delete(f'/api/v1/fee-types/{self.misc.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(FeeType.objects.filter(id=self.misc.id).exists())

    def test_active_filter_hides_inactive_types(self):
        FeeType.objects.create(name='Retired Fee', code='RETIRED', is_active=False)
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/fee-types/?active=true')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        codes = {row['code'] for row in results_of(res)}
        self.assertNotIn('RETIRED', codes)
        self.assertIn('TUITION', codes)


class ChargeSchoolYearTests(FeePaymentTestBase):
    def test_charge_defaults_to_active_school_year_and_keeps_term(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/fees/', {
            'student': self.student.id,
            'fee_type': self.tuition.id,
            'amount': '1500.00',
            'due_date': self.due.isoformat(),
            'term': 2,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['academic_year'], self.active_year.id)
        self.assertEqual(res.data['academic_year_name'], '2025-2026')
        self.assertEqual(res.data['term'], 2)
        self.assertEqual(res.data['fee_type_name'], 'Tuition Fee')
        # amount_paid/status are derived — not writable input.
        self.assertEqual(res.data['amount_paid'], '0.00')
        self.assertEqual(res.data['status'], 'unpaid')

    def test_explicit_school_year_is_honored(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/fees/', {
            'student': self.student.id,
            'fee_type': self.tuition.id,
            'amount': '1500.00',
            'due_date': self.due.isoformat(),
            'academic_year': self.prior_year.id,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['academic_year'], self.prior_year.id)

    def test_amount_paid_and_status_are_read_only_for_admins(self):
        fee = self.make_charge(amount='500.00')
        self.client.force_authenticate(user=self.admin)
        res = self.client.patch(f'/api/v1/fees/{fee.id}/', {
            'amount_paid': '999.00', 'status': 'paid',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        fee.refresh_from_db()
        self.assertEqual(fee.amount_paid, Decimal('0'))  # ignored, not applied
        self.assertEqual(fee.status, 'unpaid')

    def test_zero_or_negative_amount_is_rejected(self):
        self.client.force_authenticate(user=self.admin)
        for bad in ('0', '-50.00'):
            res = self.client.post('/api/v1/fees/', {
                'student': self.student.id,
                'fee_type': self.tuition.id,
                'amount': bad,
                'due_date': self.due.isoformat(),
            }, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, res.data)

    def test_list_filters_by_school_year_name_type_and_search(self):
        old_charge = self.make_charge(
            student=self.other_student, fee_type=self.misc,
            amount='100.00', academic_year=self.prior_year,
        )
        new_charge = self.make_charge(academic_year=self.active_year)
        self.client.force_authenticate(user=self.admin)

        res = self.client.get('/api/v1/fees/?academic_year=2025-2026')
        self.assertEqual([row['id'] for row in results_of(res)], [new_charge.id])

        res = self.client.get('/api/v1/fees/?academic_year=2024-2025')
        self.assertEqual([row['id'] for row in results_of(res)], [old_charge.id])

        res = self.client.get(f'/api/v1/fees/?fee_type={self.misc.id}')
        self.assertEqual([row['id'] for row in results_of(res)], [old_charge.id])

        # Legacy name-based filter still works.
        res = self.client.get('/api/v1/fees/?fee_type=Miscellaneous Fee')
        self.assertEqual([row['id'] for row in results_of(res)], [old_charge.id])

        # Search now matches first name / last name, not only username.
        res = self.client.get('/api/v1/fees/?search=Juana')
        self.assertEqual(len(results_of(res)), 1)
        self.assertEqual(results_of(res)[0]['student_name'], 'Juana Cruz')

    def test_bulk_create_defaults_to_active_school_year(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/fees/bulk-create/', {
            'student_ids': [self.student.id, self.other_student.id],
            'fee_type': self.tuition.id,
            'amount': '750.00',
            'due_date': self.due.isoformat(),
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(
            set(Fee.objects.values_list('academic_year_id', flat=True)),
            {self.active_year.id},
        )


class PaymentRecordingTests(FeePaymentTestBase):
    def test_partial_then_final_payment_updates_charge(self):
        fee = self.make_charge(amount='500.00')
        self.client.force_authenticate(user=self.admin)

        res = self.client.post(f'/api/v1/fees/{fee.id}/payments/', {
            'amount': '300.00', 'payment_date': '2026-03-01', 'method': 'cash',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['charge']['amount_paid'], '300.00')
        self.assertEqual(res.data['charge']['status'], 'partial')
        self.assertEqual(res.data['charge']['balance'], Decimal('200.00'))  # ReadOnlyField -> Decimal
        self.assertEqual(res.data['payment']['recorded_by'], self.admin.id)

        res = self.client.post(f'/api/v1/fees/{fee.id}/payments/', {
            'amount': '200.00', 'payment_date': '2026-03-15', 'method': 'gcash',
            'reference_number': 'GC-001',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['charge']['status'], 'paid')
        self.assertEqual(res.data['charge']['amount_paid'], '500.00')
        self.assertEqual(res.data['charge']['paid_date'], '2026-03-15')
        self.assertEqual(res.data['charge']['balance'], Decimal('0.00'))

        fee.refresh_from_db()
        self.assertEqual(fee.amount_paid, Decimal('500.00'))
        self.assertEqual(Payment.objects.filter(charge=fee).count(), 2)

    def test_overpayment_is_rejected(self):
        fee = self.make_charge(amount='500.00')
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f'/api/v1/fees/{fee.id}/payments/', {
            'amount': '500.01', 'payment_date': '2026-03-01',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('amount', res.data)
        self.assertEqual(Payment.objects.count(), 0)
        fee.refresh_from_db()
        self.assertEqual(fee.amount_paid, Decimal('0'))

    def test_zero_negative_and_missing_date_are_rejected(self):
        fee = self.make_charge(amount='500.00')
        self.client.force_authenticate(user=self.admin)
        for payload in (
            {'amount': '0', 'payment_date': '2026-03-01'},
            {'amount': '-10.00', 'payment_date': '2026-03-01'},
            {'amount': '10.00'},
        ):
            res = self.client.post(f'/api/v1/fees/{fee.id}/payments/', payload, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST, payload)
        self.assertEqual(Payment.objects.count(), 0)

    def test_payment_creates_an_audit_entry(self):
        fee = self.make_charge(amount='500.00')
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(f'/api/v1/fees/{fee.id}/payments/', {
            'amount': '500.00', 'payment_date': '2026-03-01', 'method': 'cash',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertTrue(
            AuditLog.objects.filter(
                model_name='Payment', user=self.admin, action='create',
            ).exists()
        )

    def test_students_and_parents_cannot_record_payments(self):
        fee = self.make_charge(amount='500.00')
        for account in (self.student, self.parent):
            self.client.force_authenticate(user=account)
            res = self.client.post(f'/api/v1/fees/{fee.id}/payments/', {
                'amount': '100.00', 'payment_date': '2026-03-01',
            }, format='json')
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Payment.objects.count(), 0)

    def test_staff_can_record_payments(self):
        # Staff only see advisory students' charges (pre-existing scoping),
        # so the student must be enrolled in the staff member's classroom.
        # No academic_year on the classroom: accounts_classroom's physical FK
        # still targets portal_academicyear (pre-existing state-only alter in
        # 0114), which is irrelevant to advisory scoping.
        classroom = Classroom.objects.create(name='7-A', teacher=self.staff)
        StudentClassEnrollment.objects.create(classroom=classroom, student=self.student)
        fee = self.make_charge(amount='500.00')
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(f'/api/v1/fees/{fee.id}/payments/', {
            'amount': '100.00', 'payment_date': '2026-03-01',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['payment']['recorded_by'], self.staff.id)

    def test_staff_cannot_touch_charges_outside_their_advisory_students(self):
        # Same staff user, student NOT enrolled -> scoped read answers 404
        # (permission passes, queryset scoping denies).
        fee = self.make_charge(amount='500.00')
        self.client.force_authenticate(user=self.staff)
        res = self.client.post(f'/api/v1/fees/{fee.id}/payments/', {
            'amount': '100.00', 'payment_date': '2026-03-01',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(Payment.objects.count(), 0)

    def test_owner_reads_history_but_other_students_404(self):
        fee = self.make_charge(amount='500.00')
        other_fee = self.make_charge(student=self.other_student, amount='200.00')
        admin = APIClient()
        admin.force_authenticate(user=self.admin)
        admin.post(f'/api/v1/fees/{fee.id}/payments/', {
            'amount': '500.00', 'payment_date': '2026-03-01',
        }, format='json')

        self.client.force_authenticate(user=self.student)
        res = self.client.get(f'/api/v1/fees/{fee.id}/payments/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['amount'], '500.00')
        self.assertEqual(res.data[0]['recorded_by_name'], full_name(self.admin))

        res = self.client.get(f'/api/v1/fees/{other_fee.id}/payments/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_nested_payments_appear_in_charge_list(self):
        fee = self.make_charge(amount='500.00')
        self.client.force_authenticate(user=self.admin)
        self.client.post(f'/api/v1/fees/{fee.id}/payments/', {
            'amount': '200.00', 'payment_date': '2026-03-01',
        }, format='json')
        res = self.client.get(f'/api/v1/fees/?student={self.student.id}')
        rows = results_of(res)
        self.assertEqual(len(rows), 1)
        self.assertEqual(len(rows[0]['payments']), 1)
        self.assertEqual(rows[0]['amount_paid'], '200.00')
        self.assertEqual(rows[0]['status'], 'partial')


class PaymentHistoryListTests(FeePaymentTestBase):
    def setUp(self):
        super().setUp()
        self.fee_a = self.make_charge(student=self.student, amount='500.00')
        self.fee_b = self.make_charge(student=self.other_student, amount='300.00')
        admin = APIClient()
        admin.force_authenticate(user=self.admin)
        admin.post(f'/api/v1/fees/{self.fee_a.id}/payments/', {
            'amount': '100.00', 'payment_date': '2026-03-01', 'method': 'cash',
        }, format='json')
        admin.post(f'/api/v1/fees/{self.fee_b.id}/payments/', {
            'amount': '50.00', 'payment_date': '2026-04-01', 'method': 'gcash',
            'reference_number': 'GC-77',
        }, format='json')

    def test_global_payments_endpoint_is_reachable(self):
        # Guards the router: /fees/payments/ must hit the list action, not
        # retrieve(pk='payments').
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/fees/payments/')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(len(results_of(res)), 2)

    def test_student_sees_only_their_own_payments(self):
        self.client.force_authenticate(user=self.student)
        res = self.client.get('/api/v1/fees/payments/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        rows = results_of(res)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['charge'], self.fee_a.id)

    def test_parent_without_links_sees_nothing(self):
        self.client.force_authenticate(user=self.parent)
        res = self.client.get('/api/v1/fees/payments/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(results_of(res), [])

    def test_method_and_date_filters(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/fees/payments/?method=gcash')
        self.assertEqual(len(results_of(res)), 1)
        self.assertEqual(results_of(res)[0]['reference_number'], 'GC-77')

        res = self.client.get('/api/v1/fees/payments/?date_from=2026-03-15&date_to=2026-04-30')
        rows = results_of(res)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['charge'], self.fee_b.id)

        res = self.client.get('/api/v1/fees/payments/?date_from=not-a-date')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_search_matches_student_name_and_reference(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/v1/fees/payments/?search=Juana')
        self.assertEqual(len(results_of(res)), 1)
        res = self.client.get('/api/v1/fees/payments/?search=GC-77')
        self.assertEqual(len(results_of(res)), 1)


class ChargeDeleteGuardTests(FeePaymentTestBase):
    def test_charge_with_payments_cannot_be_deleted(self):
        fee = self.make_charge(amount='500.00')
        self.client.force_authenticate(user=self.admin)
        self.client.post(f'/api/v1/fees/{fee.id}/payments/', {
            'amount': '100.00', 'payment_date': '2026-03-01',
        }, format='json')

        res = self.client.delete(f'/api/v1/fees/{fee.id}/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('payment', res.data['error'])
        self.assertTrue(Fee.objects.filter(id=fee.id).exists())
        self.assertEqual(Payment.objects.filter(charge=fee).count(), 1)

    def test_unpaid_charge_deletes_normally(self):
        fee = self.make_charge(amount='500.00')
        self.client.force_authenticate(user=self.admin)
        res = self.client.delete(f'/api/v1/fees/{fee.id}/')
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Fee.objects.filter(id=fee.id).exists())
