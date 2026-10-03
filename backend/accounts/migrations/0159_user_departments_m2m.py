"""Migrate single-department FK membership to a many-to-many relationship.

Hand-written (rather than `makemigrations`) so that only this change lands:
the app currently carries unrelated pre-existing model/migration drift
(Friendship, badge/announcement/grading-period fields, compliance indexes)
that the autodetector would otherwise bundle into the same migration file.

Phase 1 of the Department & Module Access work:
  1. Add `User.departments` (M2M)             — additive, no data touched
  2. Backfill it from the legacy `department` FK — copies, never deletes
  3. Re-label the legacy FK's reverse accessor   — `members` is handed over to
     the M2M so `Department.members` reflects real multi-department membership

The legacy `User.department` column is intentionally KEPT (decision: defer the
drop) so it remains a rollback path for one release. It is kept in sync with
the first entry of `departments` by the serializer layer.
"""
from django.db import migrations, models
import django.db.models.deletion


def copy_single_department_to_m2m(apps, schema_editor):
    """Backfill: one legacy FK value -> one M2M membership row.

    Purely additive. Users with no department are skipped; no rows are
    deleted, so this is safe to run repeatedly.
    """
    User = apps.get_model('accounts', 'User')
    qs = User.objects.exclude(department_id=None).only('id', 'department_id')
    for user in qs.iterator():
        user.departments.add(user.department_id)


def restore_single_department_from_m2m(apps, schema_editor):
    """Reverse: collapse M2M membership back into the legacy single FK.

    Keeps the alphabetically-first department so the result is deterministic.
    """
    User = apps.get_model('accounts', 'User')
    qs = User.objects.filter(departments__isnull=False).distinct().only('id', 'department_id')
    for user in qs.iterator():
        if user.department_id is None:
            first = user.departments.order_by('name').first()
            if first is not None:
                user.department_id = first.pk
                user.save(update_fields=['department_id'])
        user.departments.clear()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0158_merge_department_engagement_consent'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='departments',
            field=models.ManyToManyField(
                blank=True,
                help_text='Departments this account belongs to. Purely organisational '
                          'membership — it never alters role, account type or base permissions.',
                related_name='members',
                to='accounts.department',
            ),
        ),
        migrations.RunPython(
            copy_single_department_to_m2m,
            restore_single_department_from_m2m,
            elidable=False,
        ),
        migrations.AlterField(
            model_name='user',
            name='department',
            field=models.ForeignKey(
                blank=True,
                help_text='Deprecated. Tracks the first of `departments` for legacy readers.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='legacy_members',
                to='accounts.department',
            ),
        ),
    ]
