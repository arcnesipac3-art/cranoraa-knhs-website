from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0150_schedule_fk_to_accounts'),
        ('accounts', '0050_add_user_consent_fields'),
    ]

    operations = []
