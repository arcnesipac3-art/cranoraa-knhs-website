"""
Service layer for attendance-related business logic.
Centralizes attendance aggregation, chart data, and rate calculations.
"""
import datetime
from django.db.models import Count, Case, When, IntegerField


def get_attendance_chart_data(timeframe='all', classroom_id=None, academic_year_name=None):
    """
    Compute daily attendance chart data and pie chart breakdown.
    
    Returns dict with:
        - daily_data: list of {date, present, late, excused, rate, total}
        - pie_data: list of {name, value}
    """
    from ..models import Attendance

    today = datetime.date.today()
    base_att = Attendance.objects.all()

    if academic_year_name:
        base_att = base_att.filter(classroom__academic_year__name=academic_year_name)

    if timeframe == 'today':
        base_att = base_att.filter(date=today)
    elif timeframe == 'weekly':
        week_ago = today - datetime.timedelta(days=7)
        base_att = base_att.filter(date__gte=week_ago).exclude(date__week_day__in=[1, 7])
    else:
        base_att = base_att.exclude(date__week_day__in=[1, 7])

    chart_att = base_att
    if timeframe == 'all':
        last_30_days = today - datetime.timedelta(days=30)
        chart_att = chart_att.filter(date__gte=last_30_days)
    if classroom_id:
        chart_att = chart_att.filter(classroom_id=classroom_id)

    daily_data = []
    for day_dict in chart_att.values('date').annotate(
        present=Count(Case(When(status='present', then=1), output_field=IntegerField())),
        late=Count(Case(When(status='late', then=1), output_field=IntegerField())),
        excused=Count(Case(When(status='excused', then=1), output_field=IntegerField())),
        total_count=Count('id')
    ).order_by('date'):
        day_total = day_dict['total_count']
        daily_data.append({
            'date': day_dict['date'].strftime('%Y-%m-%d'),
            'present': day_dict['present'],
            'late': day_dict['late'],
            'excused': day_dict['excused'],
            'rate': round(
                ((day_dict['present'] + day_dict['late'] + day_dict['excused']) / day_total * 100), 1
            ) if day_total > 0 else 0,
            'total': day_total
        })

    overall_status = chart_att.aggregate(
        present=Count(Case(When(status='present', then=1), output_field=IntegerField())),
        absent=Count(Case(When(status='absent', then=1), output_field=IntegerField())),
        late=Count(Case(When(status='late', then=1), output_field=IntegerField())),
        excused=Count(Case(When(status='excused', then=1), output_field=IntegerField())),
    )

    pie_data = [
        {'name': 'Present', 'value': overall_status['present'] or 0},
        {'name': 'Late', 'value': overall_status['late'] or 0},
        {'name': 'Absent', 'value': overall_status['absent'] or 0},
        {'name': 'Excused', 'value': overall_status['excused'] or 0},
    ]

    return {'daily_data': daily_data, 'pie_data': pie_data}


def get_attendance_rate(queryset):
    """
    Calculate attendance rate from a queryset of Attendance objects.
    Returns percentage (0-100) or 0 if no records.
    """
    total = queryset.count()
    if total == 0:
        return 0
    present = queryset.filter(status__in=['present', 'late']).count()
    return round((present / total) * 100, 1)


def get_today_attendance_rate(classrooms):
    """
    Calculate today's attendance rate for given classrooms.
    Returns percentage (0-100).
    """
    from ..models import Attendance

    today = datetime.date.today()
    today_att = Attendance.objects.filter(classroom__in=classrooms, date=today)
    return get_attendance_rate(today_att)


def get_monthly_attendance_rate(student):
    """
    Calculate monthly attendance rate for a student.
    Returns percentage (0-100) or None if no records.
    """
    from ..models import Attendance

    today = datetime.date.today()
    month_start = today.replace(day=1)
    records = Attendance.objects.filter(student=student, date__gte=month_start, date__lte=today)
    weekday_records = [r for r in records if r.date.weekday() < 5]
    if not weekday_records:
        return None
    present = sum(1 for r in weekday_records if r.status in ['present', 'late'])
    return round(present / len(weekday_records) * 100, 1)
