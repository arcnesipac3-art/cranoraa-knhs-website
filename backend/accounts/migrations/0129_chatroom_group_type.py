from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0128_chat_member_and_group_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='chatroom',
            name='group_type',
            field=models.CharField(
                choices=[('manual', 'Manual'), ('system', 'System')],
                default='manual',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='chatroom',
            name='source_type',
            field=models.CharField(
                blank=True,
                choices=[
                    ('classroom', 'Classroom'),
                    ('subject', 'Subject'),
                    ('department', 'Department'),
                    ('faculty', 'Faculty'),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='chatroom',
            name='source_id',
            field=models.PositiveIntegerField(
                blank=True,
                help_text='ID of the source object (Classroom, Subject, Department)',
                null=True,
            ),
        ),
        migrations.AddConstraint(
            model_name='chatroom',
            constraint=models.UniqueConstraint(
                condition=models.Q(source_type__isnull=False, source_id__isnull=False),
                fields=('source_type', 'source_id'),
                name='unique_source_room',
            ),
        ),
    ]
