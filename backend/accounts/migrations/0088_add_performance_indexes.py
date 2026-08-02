# Generated manually — performance indexes for hot-query models

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0087_ticket_soft_delete_sla_and_indexes'),
    ]

    operations = [
        # ChatMessage: room message history + timestamp ordering
        migrations.AddIndex(
            model_name='chatmessage',
            index=models.Index(
                fields=['room', 'timestamp'],
                name='idx_chatmsg_room_time',
            ),
        ),
        # ChatMessage: unread count per user
        migrations.AddIndex(
            model_name='chatmessage',
            index=models.Index(
                fields=['room', 'is_read', 'timestamp'],
                name='idx_chatmsg_room_read_time',
            ),
        ),
        # Announcement: status + category + created_at (main list query)
        migrations.AddIndex(
            model_name='announcement',
            index=models.Index(
                fields=['status', 'category', '-created_at'],
                name='idx_announce_status_cat_time',
            ),
        ),
        # Announcement: target_audience filtering
        migrations.AddIndex(
            model_name='announcement',
            index=models.Index(
                fields=['status', 'target_audience', '-created_at'],
                name='idx_announce_status_audience',
            ),
        ),
        # Announcement: event_date for calendar queries
        migrations.AddIndex(
            model_name='announcement',
            index=models.Index(
                fields=['event_date'],
                name='idx_announce_event_date',
                condition=models.Q(event_date__isnull=False),
            ),
        ),
        # Grade: academic_year + student (grade report lookup)
        migrations.AddIndex(
            model_name='grade',
            index=models.Index(
                fields=['academic_year', 'student'],
                name='idx_grade_year_student',
            ),
        ),
        # Grade: student + subject (transmuted grade lookup)
        migrations.AddIndex(
            model_name='grade',
            index=models.Index(
                fields=['student', 'subject', 'academic_year'],
                name='idx_grade_student_subject_year',
            ),
        ),
        # TicketParticipant: user participation lookup
        migrations.AddIndex(
            model_name='ticketparticipant',
            index=models.Index(
                fields=['user'],
                name='idx_ticketpart_user',
            ),
        ),
        # TicketMessage: ticket + created_at (message history)
        migrations.AddIndex(
            model_name='ticketmessage',
            index=models.Index(
                fields=['ticket', 'created_at'],
                name='idx_ticketmsg_ticket_time',
            ),
        ),
        # TicketMessage: sender lookup
        migrations.AddIndex(
            model_name='ticketmessage',
            index=models.Index(
                fields=['sender', '-created_at'],
                name='idx_ticketmsg_sender_time',
            ),
        ),
        # Fee: student + status (fee status lookup)
        migrations.AddIndex(
            model_name='fee',
            index=models.Index(
                fields=['student', 'status'],
                name='idx_fee_student_status',
            ),
        ),
        # Fee: due_date for overdue queries
        migrations.AddIndex(
            model_name='fee',
            index=models.Index(
                fields=['due_date', 'status'],
                name='idx_fee_due_status',
            ),
        ),
        # ReportedMessage: status filtering
        migrations.AddIndex(
            model_name='reportedmessage',
            index=models.Index(
                fields=['status', '-created_at'],
                name='idx_report_status_time',
            ),
        ),
        # Schedule: teacher + is_active
        migrations.AddIndex(
            model_name='schedule',
            index=models.Index(
                fields=['teacher', 'is_active'],
                name='idx_schedule_teacher_active',
            ),
        ),
        # Schedule: classroom + is_active
        migrations.AddIndex(
            model_name='schedule',
            index=models.Index(
                fields=['classroom', 'is_active'],
                name='idx_schedule_class_active',
            ),
        ),
    ]
