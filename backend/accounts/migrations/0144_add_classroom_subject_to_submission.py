# Migration to add classroom_subject field to ComplianceSubmission

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0143_add_compliance_subject_assignment'),
    ]

    operations = [
        # Add classroom_subject field
        migrations.AddField(
            model_name='compliancesubmission',
            name='classroom_subject',
            field=models.ForeignKey(
                blank=True,
                help_text='Specific teaching assignment for this submission. Null = legacy global submission.',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='compliance_submissions',
                to='accounts.classroomsubject'
            ),
        ),
        
        # Remove old unique_together constraint
        migrations.AlterUniqueTogether(
            name='compliancesubmission',
            unique_together=set(),
        ),
        
        # Add new constraint for subject-specific uniqueness
        migrations.AddConstraint(
            model_name='compliancesubmission',
            constraint=models.UniqueConstraint(
                fields=['teacher', 'compliance_type', 'academic_year', 'semester', 'period_number', 'classroom_subject'],
                name='unique_submission_per_assignment'
            ),
        ),
        
        # Add index for classroom_subject lookups
        migrations.AddIndex(
            model_name='compliancesubmission',
            index=models.Index(fields=['classroom_subject'], name='idx_compliance_classroom_subject'),
        ),
    ]
