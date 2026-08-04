from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0141_compliance'),
    ]

    operations = [
        migrations.AddField(
            model_name='systemsetting',
            name='school_id',
            field=models.CharField(blank=True, default='', help_text='DepEd School ID (e.g. 304147)', max_length=20),
        ),
        migrations.AddField(
            model_name='systemsetting',
            name='region',
            field=models.CharField(blank=True, default='', help_text='DepEd Region (e.g. Region X)', max_length=100),
        ),
        migrations.AddField(
            model_name='systemsetting',
            name='division',
            field=models.CharField(blank=True, default='', help_text='DepEd Division (e.g. Iligan City)', max_length=100),
        ),
    ]
