# Generated manually
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0153_seed_faculty_data'),
    ]

    operations = [
        migrations.AddField(
            model_name='facultymember',
            name='user',
            field=models.OneToOneField(
                blank=True,
                help_text='Link to User account',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='faculty_member',
                to=settings.AUTH_USER_MODEL
            ),
        ),
    ]
