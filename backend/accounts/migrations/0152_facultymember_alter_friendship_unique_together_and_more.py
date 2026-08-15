from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0151_merge_consent_and_schedule'),
    ]

    operations = [
        migrations.CreateModel(
            name='FacultyMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('position', models.CharField(max_length=200)),
                ('photo', models.URLField(blank=True, help_text='Supabase Storage URL for photo', max_length=500, null=True)),
                ('category', models.CharField(choices=[('administration', 'Administration'), ('faculty', 'Faculty')], default='faculty', max_length=20)),
                ('display_order', models.PositiveIntegerField(default=0, help_text='Lower numbers appear first')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['category', 'display_order', 'name'],
            },
        ),
    ]
