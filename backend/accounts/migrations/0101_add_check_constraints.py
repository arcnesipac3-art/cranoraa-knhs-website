from django.db import migrations

# Postgres-only CHECK constraints. SQLite (used whenever DATABASE_URL is unset
# — local dev and the GitHub Actions runner) does not support
# ``ALTER TABLE ... ADD CONSTRAINT``, so these run only on PostgreSQL.
# On already-deployed databases this migration is recorded as applied and is
# never replayed; fresh PostgreSQL databases get the exact same SQL as before.
CHECK_CONSTRAINTS = [
    (
        'accounts_classroomsubject',
        'chk_weight_sum',
        'CHECK (ww_weight + pt_weight + qa_weight = 100.00)',
    ),
    (
        'accounts_fee',
        'chk_amount_paid',
        'CHECK (amount_paid >= 0 AND amount_paid <= amount)',
    ),
    (
        'accounts_timeslot',
        'chk_time_order',
        'CHECK (end_time > start_time)',
    ),
    (
        'accounts_grade',
        'chk_score_range',
        'CHECK (raw_score IS NULL OR (raw_score >= 0 AND raw_score <= total_score))',
    ),
]


def add_check_constraints(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    for table, name, clause in CHECK_CONSTRAINTS:
        schema_editor.execute(f'ALTER TABLE {table} ADD CONSTRAINT {name} {clause}')


def drop_check_constraints(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    for table, name, _ in reversed(CHECK_CONSTRAINTS):
        schema_editor.execute(f'ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {name}')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0100_add_critical_indexes'),
    ]

    operations = [
        migrations.RunPython(add_check_constraints, drop_check_constraints),
    ]
