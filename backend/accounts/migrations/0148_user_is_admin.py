from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0147_chat_performance_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_admin',
            field=models.BooleanField(
                default=False,
                help_text='Grants admin privileges regardless of role. Allows staff to access admin panel while keeping their teaching role.',
            ),
        ),
    ]
