"""Add Department.module_keys — the portal modules a department may access.

Hand-written alongside 0159 for the same reason: `makemigrations` would bundle
unrelated pre-existing model/migration drift into this file.

Purely additive. `NULL` (the default) means "not yet configured" and grants all
modules, so departments that already exist keep working unchanged after the
upgrade — no administrator can be locked out by deploying this.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0159_user_departments_m2m'),
    ]

    operations = [
        migrations.AddField(
            model_name='department',
            name='module_keys',
            field=models.JSONField(
                blank=True,
                default=None,
                help_text='Portal module keys this department may access. '
                          'null means not yet configured (all modules); [] means none.',
                null=True,
            ),
        ),
    ]
