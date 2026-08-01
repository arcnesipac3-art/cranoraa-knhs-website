from django.db import migrations, models


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
                migrations.RunSQL(
                    sql="ALTER TABLE accounts_subject ALTER COLUMN component DROP NOT NULL;",
                    reverse_sql="ALTER TABLE accounts_subject ALTER COLUMN component SET NOT NULL;",
                ),
            ],
        ),
    ]
