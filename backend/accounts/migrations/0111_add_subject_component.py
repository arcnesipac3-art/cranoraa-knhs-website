from django.db import migrations, models


def apply_component_db_ops(apps, schema_editor):
    # Postgres-only: relax NOT NULL on the pre-existing component column.
    # SQLite (no DATABASE_URL: local dev, CI) cannot ALTER COLUMN — and the
    # column is physically created there by 0113's AddField anyway — so this
    # is a no-op on other backends. Fresh PostgreSQL databases run the exact
    # same SQL as before this guard was added.
    if schema_editor.connection.vendor != 'postgresql':
        return
    schema_editor.execute(
        'ALTER TABLE accounts_subject ALTER COLUMN component DROP NOT NULL;'
    )


def reverse_component_db_ops(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    schema_editor.execute(
        'ALTER TABLE accounts_subject ALTER COLUMN component SET NOT NULL;'
    )


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0110_switch_cascade_to_set_null_for_data_preservation'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='subject',
                    name='component',
                    field=models.CharField(
                        blank=True,
                        choices=[
                            ('core', 'Core Subject'),
                            ('mapeh', 'MAPEH Component'),
                            ('guidance', 'Homeroom Guidance'),
                        ],
                        help_text='Subject component category (core, mapeh, guidance)',
                        max_length=20,
                        null=True,
                    ),
                ),
            ],
            database_operations=[
                migrations.RunPython(apply_component_db_ops, reverse_component_db_ops),
            ],
        ),
    ]
