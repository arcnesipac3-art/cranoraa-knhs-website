from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0049_delete_emailverificationtoken'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='consent_accepted',
            field=models.BooleanField(default=False, help_text='User accepted privacy policy and terms of conditions'),
        ),
        migrations.AddField(
            model_name='user',
            name='consent_accepted_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
