from django.db import models

from .user import User


class ScratchCard(models.Model):
    serial_number = models.CharField(max_length=12, unique=True)
    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='scratch_cards')
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.serial_number} - {self.student.username}"

    def save(self, *args, **kwargs):
        if not self.serial_number:
            self.serial_number = self.generate_serial()
        super().save(*args, **kwargs)

    def generate_serial(self):
        import secrets
        return f"{secrets.randbelow(10**12):012d}"


class FeeType(models.Model):
    """What the school charges for — a maintainable catalog.

    Replaces the old hardcoded ``Fee.FEE_TYPE_CHOICES`` tuple so authorized
    staff can add/rename/deactivate fee types (Electronics Lab, School ID,
    ...) without a code change. A charge references exactly one type; types
    with charges attached are protected from deletion (API returns 400, and
    PROTECT is the DB-level backstop).
    """
    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=20, unique=True)
    is_active = models.BooleanField(
        default=True,
        help_text="Inactive types stay visible on historical charges but are hidden from new-charge forms.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Fee(models.Model):
    """A student charge (what the school owes), not a payment.

    ``amount_paid`` is a cache of the sum of this charge's ``payments``;
    it is maintained by ``refresh_payment_totals()`` and is read-only at
    the API layer. Payment history lives in ``Payment`` rows so it stays
    traceable.
    """

    STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('partial', 'Partially Paid'),
        ('paid', 'Paid'),
    ]

    student = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='fees')
    fee_type = models.ForeignKey(FeeType, on_delete=models.PROTECT, related_name='fees')
    academic_year = models.ForeignKey(
        'AcademicYear', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='fees',
        help_text="School year the charge belongs to; null only for legacy rows that predate SY tracking.",
    )
    term = models.PositiveSmallIntegerField(
        null=True, blank=True,
        choices=[(1, 'Term 1'), (2, 'Term 2'), (3, 'Term 3')],
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unpaid')
    due_date = models.DateField()
    paid_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-due_date', '-created_at']

    def __str__(self):
        student_name = self.student.username if self.student_id else 'unknown'
        fee_type_name = self.fee_type.name if self.fee_type_id else 'Fee'
        return f"{student_name} - {fee_type_name} - {self.amount}"

    def balance(self):
        return self.amount - self.amount_paid

    def refresh_payment_totals(self):
        """Recompute the cached ``amount_paid``/``paid_date`` from payments.

        Called after every payment write so the charge status stays derived
        from real payment rows instead of a hand-typed number.
        """
        from decimal import Decimal
        from django.db.models import Sum

        total = self.payments.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        self.amount_paid = total
        last = self.payments.order_by('-payment_date', '-id').first()
        self.paid_date = last.payment_date if (last and total > 0) else None

    def save(self, *args, **kwargs):
        if self.amount_paid >= self.amount:
            self.status = 'paid'
        elif self.amount_paid > 0:
            self.status = 'partial'
        else:
            self.status = 'unpaid'
        super().save(*args, **kwargs)


class Payment(models.Model):
    """One recorded payment against a charge — append-only history.

    Rows are created through ``POST /fees/{id}/payments/`` and never
    edited or deleted, so the payment history remains auditable. The
    recorded_by FK points at the staff/admin account that took the
    payment (null only for migrations of legacy data).
    """

    METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('gcash', 'GCash'),
        ('maya', 'Maya'),
        ('bank', 'Bank Transfer'),
        ('other', 'Other'),
    ]

    charge = models.ForeignKey(Fee, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField()
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='cash')
    reference_number = models.CharField(max_length=50, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    recorded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='recorded_fee_payments',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date', '-created_at']

    def __str__(self):
        return f"Payment {self.amount} on charge #{self.charge_id}"
