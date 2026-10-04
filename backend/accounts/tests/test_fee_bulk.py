"""
Fee Management: bulk assignment endpoint + fee write-gate regression tests.

Covers POST /api/v1/fees/bulk-create/ (one fee definition applied to many
students, duplicate skipping, validation) and the admin/staff gate that now
protects every fee write (students/parents are read-only, as scoped by
FeeViewSet.get_queryset).
"""
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Fee, FeeType

User = get_user_model()


class FeeBulkCreateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Migration 0161 seeds the five legacy fee types.
        self.tuition = FeeType.objects.get(code='TUITION')
        self.admin = User.objects.create_user(
            username='admin_feebulk', password='pass', role='admin', is_staff=True, is_approved=True
        )
        self.staff = User.objects.create_user(
            username='staff_feebulk', password='pass', role='staff', staff_title='teacher', is_approved=True
        )
        self.student1 = User.objects.create_user(
            username='stu_feebulk1', password='pass', role='student', is_approved=True
        )
        self.student2 = User.objects.create_user(
            username='stu_feebulk2', password='pass', role='student', is_approved=True
        )
        self.student3 = User.objects.create_user(
            username='stu_feebulk3', password='pass', role='student', is_approved=True
        )
        self.parent = User.objects.create_user(
            username='parent_feebulk', password='pass', role='parent', is_approved=True
        )
        self.due = date(2026, 6, 30)

    def payload(self, **overrides):
        data = {
            'student_ids': [self.student1.id, self.student2.id, self.student3.id],
            'fee_type': self.tuition.id,
            'amount': '1500.00',
            'amount_paid': 0,  # read-only now: must be ignored, not rejected
            'due_date': self.due.isoformat(),
            'description': 'Final tuition',
        }
        data.update(overrides)
        return data

    def test_admin_bulk_creates_one_fee_per_student(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/fees/bulk-create/', self.payload(), format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['created'], 3)
        self.assertEqual(res.data['skipped'], 0)
        self.assertEqual(Fee.objects.count(), 3)

        fee = Fee.objects.get(student=self.student1)
        self.assertEqual(fee.fee_type_id, self.tuition.id)
        self.assertEqual(fee.amount, Decimal('1500.00'))
        self.assertEqual(fee.amount_paid, Decimal('0'))
        self.assertEqual(fee.status, 'unpaid')  # derived by Fee.save()
        self.assertEqual(fee.due_date, self.due)

    def test_re_run_skips_students_already_billed(self):
        Fee.objects.create(
            student=self.student1, fee_type=self.tuition,
            amount=Decimal('1500.00'), due_date=self.due,
        )
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/fees/bulk-create/', self.payload(), format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['created'], 2)
        self.assertEqual(res.data['skipped'], 1)
        self.assertEqual(Fee.objects.count(), 3)  # never double-billed

    def test_student_and_parent_cannot_bulk_create(self):
        for account in (self.student1, self.parent):
            self.client.force_authenticate(user=account)
            res = self.client.post('/api/v1/fees/bulk-create/', self.payload(), format='json')
            self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Fee.objects.count(), 0)

    def test_staff_can_bulk_create(self):
        self.client.force_authenticate(user=self.staff)
        res = self.client.post('/api/v1/fees/bulk-create/', self.payload(), format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['created'], 3)

    def test_missing_due_date_is_rejected(self):
        data = self.payload()
        data.pop('due_date')
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/fees/bulk-create/', data, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Fee.objects.count(), 0)

    def test_empty_student_list_is_rejected(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post('/api/v1/fees/bulk-create/', self.payload(student_ids=[]), format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Fee.objects.count(), 0)

    def test_non_student_targets_are_reported_not_billed(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            '/api/v1/fees/bulk-create/',
            self.payload(student_ids=[self.student1.id, self.staff.id]),
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertEqual(res.data['created'], 1)
        self.assertIn(self.staff.id, res.data['invalid_student_ids'])
        self.assertFalse(Fee.objects.filter(student=self.staff).exists())

    def test_only_non_student_targets_is_rejected(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            '/api/v1/fees/bulk-create/',
            self.payload(student_ids=[self.staff.id, self.parent.id]),
            format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Fee.objects.count(), 0)

    # ── Write gate regression (single-create path) ───────────────────────────
    def test_student_cannot_create_a_fee(self):
        self.client.force_authenticate(user=self.student1)
        res = self.client.post('/api/v1/fees/', {
            'student': self.student1.id,
            'fee_type': self.tuition.id,
            'amount': '100.00',
            'due_date': self.due.isoformat(),
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Fee.objects.count(), 0)

    def test_student_cannot_edit_own_fee_but_can_read_it(self):
        fee = Fee.objects.create(
            student=self.student1, fee_type=self.tuition,
            amount=Decimal('500.00'), due_date=self.due,
        )
        Fee.objects.create(
            student=self.student2, fee_type=self.tuition,
            amount=Decimal('500.00'), due_date=self.due,
        )

        self.client.force_authenticate(user=self.student1)

        # Read stays open and role-scoped: only their own fee comes back.
        res = self.client.get('/api/v1/fees/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data['results'] if isinstance(res.data, dict) else res.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], fee.id)

        # Write is now forbidden: a student cannot mark its own fee as paid.
        res = self.client.patch(f'/api/v1/fees/{fee.id}/', {'amount_paid': '500.00'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        fee.refresh_from_db()
        self.assertEqual(fee.amount_paid, Decimal('0'))
