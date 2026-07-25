from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0112_add_sf5_sf9_sf10_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='subject',
            name='component',
            field=models.CharField(
                blank=True,
                choices=[('', 'None'), ('music_arts', 'Music and Arts'), ('pe_health', 'Physical Education and Health')],
                default='',
                help_text="For composite subjects like MAPEH. Set to 'music_arts' or 'pe_health' for sub-components.",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='grade',
            name='component',
            field=models.CharField(
                blank=True,
                choices=[('', 'None'), ('music_arts', 'Music and Arts'), ('pe_health', 'Physical Education and Health')],
                default='',
                help_text='Sub-component for composite subjects like MAPEH (music_arts or pe_health)',
                max_length=20,
            ),
        ),
        migrations.AlterUniqueTogether(
            name='grade',
            unique_together={('student', 'subject', 'component', 'grade_type', 'quarter', 'academic_year')},
        ),
    ]
