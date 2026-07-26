# Quiz system enhancements - indexes, IntegrityLog, passing_score, tags
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0117_add_additional_performance_indexes'),
    ]

    operations = [
        # Add new fields to Question
        migrations.AddField(
            model_name='question',
            name='tags',
            field=models.JSONField(blank=True, default=list, help_text='Tags for categorization'),
        ),
        migrations.AddField(
            model_name='question',
            name='learning_competency',
            field=models.CharField(blank=True, max_length=300, help_text='Learning competency reference'),
        ),
        # Add passing_score to Quiz
        migrations.AddField(
            model_name='quiz',
            name='passing_score',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True, help_text='Minimum percentage to pass'),
        ),
        # Add indexes to QuestionBank
        migrations.AddIndex(
            model_name='questionbank',
            index=models.Index(fields=['subject', 'created_at'], name='accounts_qu_subject_idx'),
        ),
        migrations.AddIndex(
            model_name='questionbank',
            index=models.Index(fields=['created_by', 'created_at'], name='accounts_qu_created_idx'),
        ),
        migrations.AddIndex(
            model_name='questionbank',
            index=models.Index(fields=['is_shared'], name='accounts_qu_is_shared_idx'),
        ),
        # Add indexes to Question
        migrations.AddIndex(
            model_name='question',
            index=models.Index(fields=['bank', 'question_type'], name='accounts_qu_bank_type_idx'),
        ),
        migrations.AddIndex(
            model_name='question',
            index=models.Index(fields=['created_by', 'is_active'], name='accounts_qu_created_active_idx'),
        ),
        migrations.AddIndex(
            model_name='question',
            index=models.Index(fields=['question_type', 'difficulty'], name='accounts_qu_type_diff_idx'),
        ),
        # Add indexes to Quiz
        migrations.AddIndex(
            model_name='quiz',
            index=models.Index(fields=['classroom', 'status'], name='accounts_qu_class_status_idx'),
        ),
        migrations.AddIndex(
            model_name='quiz',
            index=models.Index(fields=['subject', 'status'], name='accounts_qu_subj_status_idx'),
        ),
        migrations.AddIndex(
            model_name='quiz',
            index=models.Index(fields=['created_by', 'status'], name='accounts_qu_created_status_idx'),
        ),
        migrations.AddIndex(
            model_name='quiz',
            index=models.Index(fields=['status', 'start_at', 'end_at'], name='accounts_qu_status_dates_idx'),
        ),
        # Add indexes to QuizAttempt
        migrations.AddIndex(
            model_name='quizattempt',
            index=models.Index(fields=['quiz', 'student', 'is_submitted'], name='accounts_qu_quiz_student_sub_idx'),
        ),
        migrations.AddIndex(
            model_name='quizattempt',
            index=models.Index(fields=['student', 'is_submitted'], name='accounts_qu_student_sub_idx'),
        ),
        migrations.AddIndex(
            model_name='quizattempt',
            index=models.Index(fields=['quiz', 'is_submitted'], name='accounts_qu_quiz_sub_idx'),
        ),
        # Add indexes to QuizAnswer
        migrations.AddIndex(
            model_name='quizanswer',
            index=models.Index(fields=['attempt', 'question'], name='accounts_qu_attempt_question_idx'),
        ),
        # Add indexes to QuizQuestion
        migrations.AddIndex(
            model_name='quizquestion',
            index=models.Index(fields=['quiz', 'order'], name='accounts_qu_quiz_order_idx'),
        ),
        # Create IntegrityLog model
        migrations.CreateModel(
            name='IntegrityLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(choices=[
                    ('tab_switch', 'Tab Switch'),
                    ('tab_blur', 'Tab Blur'),
                    ('window_blur', 'Window Blur'),
                    ('fullscreen_exit', 'Fullscreen Exit'),
                    ('browser_refresh', 'Browser Refresh'),
                    ('multiple_logins', 'Multiple Logins'),
                    ('device_change', 'Device Change'),
                    ('suspicious_time', 'Suspicious Completion Time'),
                    ('copy_attempt', 'Copy Attempt'),
                    ('paste_attempt', 'Paste Attempt'),
                    ('right_click', 'Right Click'),
                    ('devtools_open', 'DevTools Open'),
                ], db_index=True, max_length=30)),
                ('details', models.JSONField(blank=True, default=dict, help_text='Additional event metadata')),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('attempt', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='integrity_logs', to='accounts.quizattempt')),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
        migrations.AddIndex(
            model_name='integritylog',
            index=models.Index(fields=['attempt', 'event_type'], name='accounts_in_attempt_type_idx'),
        ),
        migrations.AddIndex(
            model_name='integritylog',
            index=models.Index(fields=['attempt', 'timestamp'], name='accounts_in_attempt_time_idx'),
        ),
    ]
