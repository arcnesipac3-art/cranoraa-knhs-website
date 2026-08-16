"""
Service layer for dashboard statistics.
Centralizes attendance trends, grade distribution, and analytics computations.
"""
import datetime
import logging

from django.db.models import Q, Avg, Count
from django.db.models.functions import TruncDate
from django.utils import timezone

logger = logging.getLogger(__name__)


def compute_attendance_trends(att_qs, today, days=30):
    """
    Compute daily attendance trends for the last N days.
    Returns list of {date, present, late, rate} dicts.
    """
    last_n_days = today - datetime.timedelta(days=days)

    daily_trends = (
        att_qs
        .filter(date__gte=last_n_days, date__lte=today)
        .exclude(date__week_day__in=[1, 7])
        .annotate(day=TruncDate('date'))
        .values('day')
        .annotate(
            total=Count('id'),
            present=Count('id', filter=Q(status='present')),
            late=Count('id', filter=Q(status='late')),
        )
        .order_by('day')
    )

    trend_map = {}
    for row in daily_trends:
        total = row['total']
        present_late = row['present'] + row['late']
        trend_map[row['day'].strftime('%Y-%m-%d')] = {
            'present': row['present'],
            'late': row['late'],
            'rate': round((present_late / total * 100), 1) if total > 0 else 0
        }

    attendance_trends = []
    for i in range(days, -1, -1):
        day = today - datetime.timedelta(days=i)
        if day.weekday() in [5, 6]:
            continue
        day_str = day.strftime('%Y-%m-%d')
        if day_str in trend_map:
            trend_map[day_str]['date'] = day_str
            attendance_trends.append(trend_map[day_str])
        else:
            attendance_trends.append({'date': day_str, 'present': 0, 'late': 0, 'rate': 0})

    return attendance_trends


def compute_grade_distribution(grades):
    """
    Compute grade distribution from a queryset of Grade objects.
    Returns dict with counts per grade band.
    """
    return {
        'outstanding': grades.filter(raw_score__gte=90).count(),
        'very_satisfactory': grades.filter(raw_score__gte=85, raw_score__lt=90).count(),
        'satisfactory': grades.filter(raw_score__gte=80, raw_score__lt=85).count(),
        'fairly_satisfactory': grades.filter(raw_score__gte=75, raw_score__lt=80).count(),
        'below_75': grades.filter(raw_score__lt=75).count(),
    }


def compute_general_average_buckets(grades):
    """
    Compute general average distribution from a grades queryset.
    Returns dict with per-student average buckets.
    """
    student_averages = list(grades.values('student').annotate(avg=Avg('raw_score')))
    total_students_graded = len(student_averages)
    buckets = {
        'outstanding': 0,
        'very_satisfactory': 0,
        'satisfactory': 0,
        'fairly_satisfactory': 0,
        'below_75': 0,
    }

    for row in student_averages:
        avg = row.get('avg')
        if avg is None:
            continue
        avg = float(avg)
        if avg >= 90:
            buckets['outstanding'] += 1
        elif avg >= 85:
            buckets['very_satisfactory'] += 1
        elif avg >= 80:
            buckets['satisfactory'] += 1
        elif avg >= 75:
            buckets['fairly_satisfactory'] += 1
        else:
            buckets['below_75'] += 1

    return {
        'buckets': buckets,
        'total_students_graded': total_students_graded,
    }


def compute_active_users_trends(AuditLog, now, hours=24):
    """
    Compute active user trends from audit log login events.
    Returns list of {time, users} dicts.
    """
    active_users_trends = []
    try:
        last_start = now - datetime.timedelta(hours=hours)
        recent_login_logs = list(AuditLog.objects.filter(
            action='login',
            timestamp__gte=last_start
        ).values('user', 'timestamp'))

        for i in range(hours - 1, -1, -1):
            hour_start = now - datetime.timedelta(hours=i + 1)
            hour_end = now - datetime.timedelta(hours=i)
            users_in_hour = {
                log['user'] for log in recent_login_logs
                if log['timestamp'] and hour_start <= log['timestamp'] <= hour_end
            }
            active_users_trends.append({
                'time': hour_end.strftime('%H:00'),
                'users': len(users_in_hour)
            })
    except Exception as e:
        logger.error(f"Error calculating active users trends: {str(e)}")

    return active_users_trends


def compute_subject_performance(grades, limit=10):
    """
    Compute top subject performance from a grades queryset.
    Returns list of {name, avg_grade} dicts.
    """
    subject_perf = []
    try:
        subject_stats = grades.values('subject__name').annotate(
            avg_grade=Avg('raw_score')
        ).order_by('-avg_grade')[:limit]

        for s in subject_stats:
            subject_perf.append({
                'name': s['subject__name'],
                'avg_grade': round(float(s['avg_grade']), 1) if s['avg_grade'] else 0
            })
    except Exception as e:
        logger.error(f"Error fetching subject stats: {str(e)}")

    return subject_perf


def build_grade_distribution_response(distribution, total_grades):
    """
    Build the all_subjects response dict from a grade distribution.
    """
    labels = [
        ('outstanding', 'Outstanding'),
        ('very_satisfactory', 'Very Satisfactory'),
        ('satisfactory', 'Satisfactory'),
        ('fairly_satisfactory', 'Fairly Satisfactory'),
        ('below_75', 'Did Not Meet'),
    ]
    return {
        'counts': [{'name': label, 'value': distribution[key]} for key, label in labels],
        **{f'{key}_pct': round(distribution[key] / total_grades * 100) if total_grades else 0 for key, _ in labels},
        'total_count': total_grades,
    }


def build_general_average_response(buckets, total_students_graded):
    """
    Build the general_average response dict from GA buckets.
    """
    labels = [
        ('outstanding', 'Outstanding'),
        ('very_satisfactory', 'Very Satisfactory'),
        ('satisfactory', 'Satisfactory'),
        ('fairly_satisfactory', 'Fairly Satisfactory'),
        ('below_75', 'Did Not Meet'),
    ]
    return {
        'counts': [{'name': label, 'value': buckets[key]} for key, label in labels],
        **{f'{key}_pct': round(buckets[key] / total_students_graded * 100) if total_students_graded else 0 for key, _ in labels},
        'total_count': total_students_graded,
    }


def _empty_distribution():
    return {
        'outstanding': 0,
        'very_satisfactory': 0,
        'satisfactory': 0,
        'fairly_satisfactory': 0,
        'below_75': 0,
    }


def _safe_value(label, fallback, callback):
    try:
        return callback()
    except Exception as exc:
        logger.error("%s error: %s", label, exc, exc_info=True)
        return fallback


def build_admin_dashboard_stats(user, academic_year_name=None):
    """
    Build the admin dashboard payload.

    Dashboard widgets should degrade independently. A bad analytics query,
    missing optional relation, or stale settings table must not take down the
    entire admin landing page.
    """
    from ..models import (
        Announcement, Attendance, Classroom, EnrollmentApplication, Grade,
        Subject, SystemSetting, User,
    )
    from ..serializers import SystemSettingSerializer
    from ..views._helpers import get_latest_messages

    try:
        from ..models import AuditLog
    except ImportError:
        AuditLog = None

    now = timezone.localtime(timezone.now())
    today = now.date()
    five_mins_ago = now - datetime.timedelta(minutes=5)
    this_week_start = today - datetime.timedelta(days=today.weekday())

    att_qs = Attendance.objects.all()
    if academic_year_name:
        att_qs = _safe_value(
            'attendance academic year filter',
            Attendance.objects.none(),
            lambda: att_qs.filter(classroom__academic_year__name=academic_year_name),
        )

    today_attendance = att_qs.filter(date=today)
    today_present = _safe_value(
        'today attendance present count',
        0,
        lambda: today_attendance.filter(status__in=['present', 'late']).count(),
    )
    today_total = _safe_value('today attendance total count', 0, today_attendance.count)
    today_rate = round((today_present / today_total * 100), 1) if today_total > 0 else 0

    classes_qs = Classroom.objects.all()
    if academic_year_name:
        classes_qs = _safe_value(
            'classrooms academic year filter',
            Classroom.objects.none(),
            lambda: classes_qs.filter(
                Q(academic_year__name=academic_year_name) |
                Q(academic_year__isnull=True)
            ),
        )

    grades = Grade.objects.filter(raw_score__isnull=False, grade_type='final_grade')
    if academic_year_name:
        grades = _safe_value(
            'grades academic year filter',
            Grade.objects.none(),
            lambda: grades.filter(
                Q(academic_year=academic_year_name) |
                Q(classroom__academic_year__name=academic_year_name)
            ),
        )

    total_grades = _safe_value('grade count', 0, grades.count)
    avg_grade = _safe_value('average grade', None, lambda: grades.aggregate(avg=Avg('raw_score'))['avg'])
    average_grade = round(float(avg_grade), 2) if avg_grade is not None else None

    distribution = _safe_value('grade distribution', _empty_distribution(), lambda: compute_grade_distribution(grades))
    ga_result = _safe_value(
        'general average buckets',
        {'buckets': _empty_distribution(), 'total_students_graded': 0},
        lambda: compute_general_average_buckets(grades),
    )
    ga_buckets = ga_result['buckets']
    total_students_graded = ga_result['total_students_graded']

    attendance_trends = _safe_value('attendance trends', [], lambda: compute_attendance_trends(att_qs, today, days=30))
    active_users_trends = _safe_value(
        'active users trends',
        [],
        lambda: compute_active_users_trends(AuditLog, now, hours=24) if AuditLog else [],
    )
    subject_perf = _safe_value('subject performance', [], lambda: compute_subject_performance(grades, limit=10))
    latest_messages = _safe_value('latest messages', [], lambda: get_latest_messages(user))

    recent_activity = []
    if AuditLog:
        recent_activity = _safe_value(
            'recent activity',
            [],
            lambda: list(AuditLog.objects.select_related('user').order_by('-timestamp')[:5]),
        )

    def build_recent_announcements():
        rows = Announcement.objects.filter(status='live').select_related('author').order_by('-created_at')[:5]
        return [
            {
                'id': row.id,
                'title': row.title,
                'content': row.content,
                'priority': row.priority,
                'is_pinned': row.is_pinned,
                'created_at': row.created_at,
                'author_name': row.author.get_full_name() or row.author.username,
            }
            for row in rows
        ]

    announcements_data = _safe_value('recent announcements', [], build_recent_announcements)
    system_settings = _safe_value(
        'system settings',
        None,
        lambda: SystemSettingSerializer(SystemSetting.get_settings()).data,
    )

    total_students = _safe_value(
        'student count',
        0,
        lambda: User.objects.filter(role='student', is_approved=True).count(),
    )
    total_teachers = _safe_value(
        'teacher count',
        0,
        lambda: User.objects.filter(role='staff', is_approved=True).count(),
    )
    total_classes = _safe_value('classroom count', 0, classes_qs.count)
    total_subjects = _safe_value('subject count', 0, Subject.objects.count)
    pending_approvals = _safe_value(
        'pending approvals count',
        0,
        lambda: User.objects.filter(is_approved=False).exclude(role='admin').count(),
    )
    pending_enrollments = _safe_value(
        'pending enrollments count',
        0,
        lambda: EnrollmentApplication.objects.filter(status='pending').count(),
    )
    active_users = _safe_value(
        'active user count',
        0,
        lambda: User.objects.filter(last_activity__gte=five_mins_ago).count(),
    )
    recent_grades_count = _safe_value(
        'recent grades count',
        0,
        lambda: Grade.objects.filter(submitted_at__date__gte=this_week_start).count(),
    )
    total_announcements = _safe_value(
        'live announcements count',
        0,
        lambda: Announcement.objects.filter(status='live').count(),
    )

    grade_distribution_chart = [
        {'name': 'Outstanding', 'value': distribution['outstanding']},
        {'name': 'Very Satisfactory', 'value': distribution['very_satisfactory']},
        {'name': 'Satisfactory', 'value': distribution['satisfactory']},
        {'name': 'Fairly Satisfactory', 'value': distribution['fairly_satisfactory']},
        {'name': 'Did Not Meet', 'value': distribution['below_75']},
    ]

    return {
        'total_students': total_students,
        'total_teachers': total_teachers,
        'total_classes': total_classes,
        'total_subjects': total_subjects,
        'pending_approvals': pending_approvals,
        'pending_enrollments': pending_enrollments,
        'active_users': active_users,
        'today_rate': today_rate,
        'today_attendance_rate': today_rate,
        'average_grade': average_grade,
        'attendance': {
            'today_rate': today_rate,
            'daily_trends': attendance_trends,
        },
        'grades': {
            'average': average_grade,
            'total': total_grades,
            'subject_stats': subject_perf,
        },
        'dashboard': {
            'active_users': active_users,
            'total_students': total_students,
            'total_teachers': total_teachers,
            'total_classes': total_classes,
            'pending_approvals': pending_approvals,
            'today_rate': today_rate,
            'average_grade': average_grade,
            'charts': {
                'active_users_trends': active_users_trends,
                'attendance_trends': attendance_trends,
                'grade_distribution': grade_distribution_chart,
            },
        },
        'cards': {
            'total_students': total_students,
            'total_teachers': total_teachers,
            'total_classes': total_classes,
            'total_subjects': total_subjects,
            'active_users': active_users,
            'attendance_rate': today_rate,
        },
        'widgets': {
            'recent_announcements': announcements_data,
            'recent_activity': [
                {
                    'id': log.id,
                    'user': (log.user.get_full_name() or log.user.username) if log.user else 'System',
                    'timestamp': log.timestamp,
                    'description': log.description,
                    'action': log.action,
                }
                for log in recent_activity
            ],
            'latest_messages': latest_messages,
            'active_users_trends': active_users_trends,
            'subject_performance': subject_perf,
        },
        'all_subjects': build_grade_distribution_response(distribution, total_grades),
        'general_average': build_general_average_response(ga_buckets, total_students_graded),
        'system_settings': system_settings,
        'recent_grades_count': recent_grades_count,
        'total_announcements': total_announcements,
    }
