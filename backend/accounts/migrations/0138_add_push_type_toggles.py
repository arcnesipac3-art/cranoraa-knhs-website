from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0137_grading_management'),
    ]

    operations = [
        migrations.AddField(
            model_name='notificationpreference',
            name='push_announcement',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='notificationpreference',
            name='push_grade',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='notificationpreference',
            name='push_attendance',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='notificationpreference',
            name='push_fee',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='notificationpreference',
            name='push_message',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='notificationpreference',
            name='push_friend_request',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='notificationpreference',
            name='push_system',
            field=models.BooleanField(default=True),
        ),
    ]
