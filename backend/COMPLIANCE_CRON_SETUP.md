# Compliance Reminder Cron Setup

## Option 1: Server Cron (simplest)

```bash
# Edit crontab
crontab -e

# Send reminders every weekday at 7:00 AM
0 7 * * 1-5 cd /path/to/backend && python manage.py send_compliance_reminders >> /var/log/compliance.log 2>&1

# Mark overdue at 8:00 AM (after teachers have had a chance to submit)
0 8 * * 1-5 curl -s -X POST https://yoursite.com/api/v1/compliance/check-overdue/ \
  -H "Authorization: Bearer ADMIN_TOKEN" >> /var/log/compliance_overdue.log 2>&1
```

## Option 2: Render.com Cron Jobs

In `render.yaml`:
```yaml
services:
  - type: cron
    name: compliance-reminders
    env: python
    schedule: "0 7 * * 1-5"
    startCommand: "cd backend && python manage.py send_compliance_reminders"
```

## Option 3: Celery Beat

In `celery.py`:
```python
from celery.schedules import crontab
app.conf.beat_schedule = {
    'compliance-reminders': {
        'task': 'accounts.tasks.send_compliance_reminders_task',
        'schedule': crontab(hour=7, minute=0, day_of_week='mon-fri'),
    },
}
```

In `accounts/tasks.py`:
```python
from celery import shared_task
from django.core.management import call_command

@shared_task
def send_compliance_reminders_task():
    call_command('send_compliance_reminders')
```

## Manual Admin Trigger (API)

```bash
# Dry run - preview without sending
POST /api/v1/compliance/trigger-reminders/
{ "dry_run": true }

# Live run - send notifications now
POST /api/v1/compliance/trigger-reminders/
{ "dry_run": false }
```

## CLI Testing

```bash
# Preview what would be sent
python manage.py send_compliance_reminders --dry-run

# Run for one teacher only
python manage.py send_compliance_reminders --teacher-id 42

# Full production run
python manage.py send_compliance_reminders
```
