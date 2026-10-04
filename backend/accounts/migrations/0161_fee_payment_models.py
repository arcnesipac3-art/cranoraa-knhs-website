"""Fee/payment model overhaul: FeeType catalog, SY/term on charges, Payment history.

Hand-written (like 0159/0160) because `makemigrations` would bundle unrelated
pre-existing drift. All operations are reversible:

1. ``FeeType`` catalog replaces the hardcoded ``Fee.FEE_TYPE_CHOICES`` tuple;
   the five legacy choices are seeded so every existing charge keeps its label.
2. ``Fee.fee_type`` migrates char -> FK via a temporary ``fee_type_fk`` column
   (add -> backfill -> drop char -> rename -> NOT NULL), so no data is lost.
3. ``Fee.academic_year`` + ``Fee.term`` link charges to the existing
   academic-year system; backfilled from the active SY (or the
   ``SystemSetting.academic_year`` fallback).
4. ``Payment`` table + one honest backfill row per legacy
   ``amount_paid > 0`` charge, marked with MIGRATION_PAYMENT_NOTE so reverse
   can identify and remove exactly those rows.
"""
from django.db import migrations, models
import django.db.models.deletion

# Legacy Fee.fee_type char values -> (display name, unique code).
LEGACY_TYPES = [
    ('tuition', 'Tuition Fee', 'TUITION'),
    ('miscellaneous', 'Miscellaneous Fee', 'MISC'),
    ('books', 'Books/Materials', 'BOOKS'),
    ('uniform', 'Uniform', 'UNIFORM'),
    ('other', 'Other', 'OTHER'),
]
LEGACY_CODE_BY_KEY = {key: code for key, _, code in LEGACY_TYPES}

MIGRATION_PAYMENT_NOTE = 'Migrated from legacy amount_paid (pre-payment-history data).'


def seed_fee_types(apps, schema_editor):
    FeeType = apps.get_model('accounts', 'FeeType')
    for _key, name, code in LEGACY_TYPES:
        FeeType.objects.get_or_create(code=code, defaults={'name': name})


def unseed_fee_types(apps, schema_editor):
    # Runs after the FK column is dropped (reverse order), so nothing references
    # these rows. Custom types staff created later are left alone.
    FeeType = apps.get_model('accounts', 'FeeType')
    FeeType.objects.filter(code__in=[code for _, _, code in LEGACY_TYPES]).delete()


def backfill_fee_type(apps, schema_editor):
    Fee = apps.get_model('accounts', 'Fee')
    FeeType = apps.get_model('accounts', 'FeeType')
    by_code = {ft.code: ft.id for ft in FeeType.objects.all()}

    for key, _name, code in LEGACY_TYPES:
        Fee.objects.filter(fee_type=key).update(fee_type_fk_id=by_code[code])
    # Any nonstandard legacy value collapses into "Other" — its display name
    # survives through the charge's own history/audit entries.
    Fee.objects.filter(fee_type_fk_id__isnull=True).update(fee_type_fk_id=by_code['OTHER'])


def restore_fee_type_char(apps, schema_editor):
    """Reverse of backfill_fee_type: FK code -> legacy char value.

    Runs while both columns exist (after rename-back to ``fee_type_fk`` and
    after the char ``fee_type`` column is re-added). Codes that have no legacy
    equivalent map to 'other' — the char schema simply cannot represent them.
    """
    Fee = apps.get_model('accounts', 'Fee')
    FeeType = apps.get_model('accounts', 'FeeType')
    code_to_key = {code: key for key, _name, code in LEGACY_TYPES}
    type_codes = dict(FeeType.objects.values_list('id', 'code'))

    ids_by_key = {}
    for fee_id, type_id in Fee.objects.values_list('id', 'fee_type_fk_id').iterator():
        code = type_codes.get(type_id, 'OTHER')
        ids_by_key.setdefault(code_to_key.get(code, 'other'), []).append(fee_id)
    for key, fee_ids in ids_by_key.items():
        Fee.objects.filter(id__in=fee_ids).update(fee_type=key)


def backfill_academic_year(apps, schema_editor):
    AcademicYear = apps.get_model('accounts', 'AcademicYear')
    SystemSetting = apps.get_model('accounts', 'SystemSetting')
    Fee = apps.get_model('accounts', 'Fee')

    year = AcademicYear.objects.filter(is_active=True).first()
    if year is None:
        setting = SystemSetting.objects.order_by('id').first()
        stored_name = (getattr(setting, 'academic_year', '') or '').strip()
        if stored_name:
            year = (
                AcademicYear.objects.filter(name__iexact=stored_name).first()
                or AcademicYear.objects.filter(name__icontains=stored_name[:4]).first()
            )
    if year is not None:
        Fee.objects.filter(academic_year__isnull=True).update(academic_year_id=year.id)


def clear_academic_year(apps, schema_editor):
    # Reverse loses only the SY *mapping* (rows themselves are dropped by the
    # AddField reverse); documented trade-off for reversibility.
    Fee = apps.get_model('accounts', 'Fee')
    Fee.objects.all().update(academic_year_id=None)


def backfill_payments(apps, schema_editor):
    Fee = apps.get_model('accounts', 'Fee')
    Payment = apps.get_model('accounts', 'Payment')

    for fee in Fee.objects.filter(amount_paid__gt=0).iterator():
        Payment.objects.create(
            charge=fee,
            amount=fee.amount_paid,
            payment_date=fee.paid_date or fee.due_date or fee.created_at.date(),
            method='cash',
            notes=MIGRATION_PAYMENT_NOTE,
            recorded_by=None,
        )


def remove_migrated_payments(apps, schema_editor):
    Payment = apps.get_model('accounts', 'Payment')
    Payment.objects.filter(notes=MIGRATION_PAYMENT_NOTE, recorded_by__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0160_department_module_keys'),
    ]

    operations = [
        # ---- 1. FeeType catalog + seed of the five legacy choices ----------
        migrations.CreateModel(
            name='FeeType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
                ('code', models.CharField(max_length=20, unique=True)),
                ('is_active', models.BooleanField(default=True, help_text='Inactive types stay visible on historical charges but are hidden from new-charge forms.')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['name']},
        ),
        migrations.RunPython(seed_fee_types, unseed_fee_types),

        # ---- 2. Fee.fee_type: char -> FK ---------------------------------
        # Temporary nullable FK, backfill, drop the char column, rename, then
        # enforce NOT NULL (safe now that every row has a value).
        migrations.AddField(
            model_name='fee',
            name='fee_type_fk',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='fees',
                to='accounts.feetype',
            ),
        ),
        migrations.RunPython(backfill_fee_type, restore_fee_type_char),
        migrations.RemoveField(model_name='fee', name='fee_type'),
        migrations.RenameField(model_name='fee', old_name='fee_type_fk', new_name='fee_type'),
        migrations.AlterField(
            model_name='fee',
            name='fee_type',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='fees',
                to='accounts.feetype',
            ),
        ),

        # ---- 3. School year + term on charges ----------------------------
        migrations.AddField(
            model_name='fee',
            name='academic_year',
            field=models.ForeignKey(
                blank=True,
                help_text='School year the charge belongs to; null only for legacy rows that predate SY tracking.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='fees',
                to='accounts.academicyear',
            ),
        ),
        migrations.RunPython(backfill_academic_year, clear_academic_year),
        migrations.AddField(
            model_name='fee',
            name='term',
            field=models.PositiveSmallIntegerField(
                blank=True,
                choices=[(1, 'Term 1'), (2, 'Term 2'), (3, 'Term 3')],
                null=True,
            ),
        ),

        # ---- 4. Payment history + legacy amount_paid backfill ------------
        migrations.CreateModel(
            name='Payment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('payment_date', models.DateField()),
                ('method', models.CharField(choices=[('cash', 'Cash'), ('gcash', 'GCash'), ('maya', 'Maya'), ('bank', 'Bank Transfer'), ('other', 'Other')], default='cash', max_length=20)),
                ('reference_number', models.CharField(blank=True, default='', max_length=50)),
                ('notes', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('charge', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='accounts.fee')),
                ('recorded_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='recorded_fee_payments', to='accounts.user')),
            ],
            options={'ordering': ['-payment_date', '-created_at']},
        ),
        migrations.RunPython(backfill_payments, remove_migrated_payments),
    ]
