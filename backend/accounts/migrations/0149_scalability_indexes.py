from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0148_user_is_admin'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='gradereport',
            index=models.Index(
                fields=['student', 'classroom', 'quarter', 'school_year'],
                name='gr_student_cls_qt_sy_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='announcement',
            index=models.Index(
                fields=['-is_pinned', '-created_at'],
                name='ann_pinned_created_idx',
            ),
        ),
    ]
