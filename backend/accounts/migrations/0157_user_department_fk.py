from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        # 0156_reseed_faculty_from_yearbook was removed in 8d1d4bc along with
        # migrations 0151-0156 and the FacultyMember model. Retarget to the
        # real ancestor of that branch so the graph resolves again.
        ('accounts', '0150_schedule_fk_to_accounts'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='department',
            field=models.ForeignKey(
                blank=True,
                help_text='Organizational department for admin/staff accounts',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='members',
                to='accounts.department',
            ),
        ),
    ]
