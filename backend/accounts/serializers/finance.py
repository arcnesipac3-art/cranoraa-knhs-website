from rest_framework import serializers

from ..models import ScratchCard, Fee, FeeType, Payment
from ._base import full_name


class ScratchCardSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_email = serializers.CharField(source='student.email', read_only=True)

    class Meta:
        model = ScratchCard
        fields = ['id', 'serial_number', 'student', 'student_name',
                  'student_email', 'is_used', 'used_at', 'created_at']

    def get_student_name(self, obj): return full_name(obj.student)


class FeeTypeSerializer(serializers.ModelSerializer):
    """Catalog entry for what the school charges for (Tuition, Lab, ...)."""

    charges_count = serializers.SerializerMethodField()

    class Meta:
        model = FeeType
        fields = ['id', 'name', 'code', 'is_active', 'charges_count',
                  'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def get_charges_count(self, obj):
        if hasattr(obj, 'charges_count'):
            return obj.charges_count
        return obj.fees.count()

    def validate_name(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError('Name is required.')
        return value

    def validate_code(self, value):
        value = (value or '').strip().upper()
        if not value:
            raise serializers.ValidationError('Code is required.')
        if not value.replace('-', '').isalnum():
            raise serializers.ValidationError(
                'Code may contain only letters, numbers, and hyphens.'
            )
        return value


class PaymentSerializer(serializers.ModelSerializer):
    """A single recorded payment — create/read only, never edited.

    On create, ``context['charge']`` (set by the record-payment action)
    enforces that the amount never exceeds the charge's remaining balance.
    """

    student_name = serializers.SerializerMethodField()
    charge_summary = serializers.SerializerMethodField()
    fee_type_name = serializers.SerializerMethodField()
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = ['id', 'charge', 'student_name', 'charge_summary', 'fee_type_name',
                  'amount', 'payment_date', 'method', 'reference_number', 'notes',
                  'recorded_by', 'recorded_by_name', 'created_at']
        read_only_fields = ['recorded_by', 'created_at']

    def get_student_name(self, obj):
        return full_name(obj.charge.student) if obj.charge and obj.charge.student else ''

    def get_charge_summary(self, obj):
        return str(obj.charge) if obj.charge_id else ''

    def get_fee_type_name(self, obj):
        if obj.charge_id and obj.charge.fee_type_id:
            return obj.charge.fee_type.name
        return None

    def get_recorded_by_name(self, obj):
        return full_name(obj.recorded_by) if obj.recorded_by else ''

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Payment amount must be greater than zero.')
        return value

    def validate(self, attrs):
        if self.instance is None:
            charge = self.context.get('charge') or attrs.get('charge')
            if charge is not None and attrs['amount'] > charge.balance():
                raise serializers.ValidationError(
                    {'amount': f'Payment exceeds the remaining balance of {charge.balance()}.'}
                )
        return attrs


class FeeSerializer(serializers.ModelSerializer):
    """A student charge.

    ``amount_paid``/``status``/``paid_date`` are read-only caches derived
    from recorded ``payments`` — money is only ever added via the
    record-payment action, so a hand-typed "paid" value can't fake history.
    """

    student_name = serializers.SerializerMethodField()
    student_email = serializers.CharField(source='student.email', read_only=True)
    balance = serializers.ReadOnlyField()
    fee_type_name = serializers.SerializerMethodField()
    academic_year_name = serializers.SerializerMethodField()
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Fee
        fields = ['id', 'student', 'student_name', 'student_email', 'fee_type',
                  'fee_type_name', 'academic_year', 'academic_year_name', 'term',
                  'amount', 'amount_paid', 'status', 'balance', 'due_date',
                  'paid_date', 'description', 'payments', 'created_at', 'updated_at']
        read_only_fields = ['amount_paid', 'status', 'paid_date',
                            'created_at', 'updated_at']

    def get_student_name(self, obj): return full_name(obj.student)

    def get_fee_type_name(self, obj):
        return obj.fee_type.name if obj.fee_type_id else None

    def get_academic_year_name(self, obj):
        return obj.academic_year.name if obj.academic_year_id else None

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Charge amount must be greater than zero.')
        return value
