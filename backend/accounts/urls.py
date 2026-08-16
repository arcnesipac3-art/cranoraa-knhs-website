from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView
from .views import (
    login_view, logout_view, cookie_token_refresh_view,
    admin_create_user_view, force_password_change_view, change_password_view, user_profile, student_profile,
    teacher_dashboard_stats, student_dashboard_stats, ClassroomViewSet, StudentClassEnrollmentViewSet, UserViewSet,
    AnnouncementViewSet, AttendanceViewSet, LearningMaterialViewSet, SubjectViewSet,
    ClassroomSubjectViewSet, ScratchCardViewSet, FeeViewSet, NotificationViewSet,
    EnrollmentApplicationViewSet, AssignmentViewSet, SubmissionViewSet, WebsiteContentViewSet, GradeViewSet, GradeReportViewSet,
    ChatRoomViewSet, ChatMessageViewSet, ReportedMessageViewSet, admin_dashboard_stats, grade_distribution_stats, check_result, public_announcements_view,
    student_calendar_view, notifications_polling_view, system_metrics_view,
    maintenance_feed_view, maintenance_mode_view, force_sync_view, run_backup_view, clear_cache_view,
    system_settings_view, maintenance_status_view,
    RoomViewSet, TimeSlotViewSet, ScheduleViewSet,
    parent_dashboard_view, parent_child_detail_view,
    fcm_token_register, fcm_token_delete, fcm_deactivate_all, test_push_notification,
    storage_analytics_view,
    notification_preferences_view,
    TicketViewSet, DepartmentContactViewSet,
    TranscriptViewSet, TransferCertificateViewSet, CharacterCertificateViewSet,
    AchievementRecordViewSet, RecordRequestViewSet,
    AbsenceExcuseViewSet, SchoolCalendarViewSet, EnrollmentWaitlistViewSet, AttendanceDeadlineViewSet,
    ParentTeacherMeetingViewSet, BehavioralRecordViewSet, SchoolEventViewSet,
    parent_report_card_pdf, parent_year_over_year,
    UserBlockViewSet, EmergencyMessageViewSet,
    DepartmentViewSet, StaffPerformanceViewSet,
    admin_attendance_analytics, admin_grade_analytics,
    data_retention_view, run_backup_view_enhanced,
    GradingPeriodViewSet, GradeSubmissionViewSet, GradeReopeningRequestViewSet,
    ComplianceTypeViewSet, ComplianceSubmissionViewSet,
    compliance_dashboard, my_compliance_status,
    check_overdue_submissions, sync_teacher_submissions,
    trigger_compliance_reminders,
    bulk_assign_classroom_subject, legacy_submissions, compliance_audit_trail,
    FacultyMemberViewSet,
)
app_name = 'accounts'

router = DefaultRouter()
router.register(r'v1/classrooms', ClassroomViewSet, basename='classroom')
router.register(r'v1/enrollments', StudentClassEnrollmentViewSet, basename='enrollment')
router.register(r'v1/users', UserViewSet, basename='user')
router.register(r'v1/announcements', AnnouncementViewSet, basename='announcement')
router.register(r'v1/attendance', AttendanceViewSet, basename='attendance')
router.register(r'v1/materials', LearningMaterialViewSet, basename='material')
router.register(r'v1/subjects', SubjectViewSet, basename='subject')
router.register(r'v1/classroom-subjects', ClassroomSubjectViewSet, basename='classroom-subject')
router.register(r'v1/scratch-cards', ScratchCardViewSet, basename='scratch-card')
router.register(r'v1/fees', FeeViewSet, basename='fee')
router.register(r'v1/notifications', NotificationViewSet, basename='notification')
router.register(r'v1/enrollment-applications', EnrollmentApplicationViewSet, basename='enrollment-application')
router.register(r'v1/assignments', AssignmentViewSet, basename='assignment')
router.register(r'v1/submissions', SubmissionViewSet, basename='submission')
router.register(r'v1/website-content', WebsiteContentViewSet, basename='website-content')
router.register(r'v1/grades', GradeViewSet, basename='grade')
router.register(r'v1/grade-reports', GradeReportViewSet, basename='grade-report')
router.register(r'v1/chat/rooms', ChatRoomViewSet, basename='chat-room')
router.register(r'v1/chat/messages', ChatMessageViewSet, basename='chat-message')
router.register(r'v1/chat/reports', ReportedMessageViewSet, basename='chat-report')
router.register(r'v1/rooms', RoomViewSet, basename='room')
router.register(r'v1/time-slots', TimeSlotViewSet, basename='time-slot')
router.register(r'v1/schedules', ScheduleViewSet, basename='schedule')
router.register(r'v1/tickets', TicketViewSet, basename='ticket')
router.register(r'v1/department-contacts', DepartmentContactViewSet, basename='department-contact')
router.register(r'v1/transcripts', TranscriptViewSet, basename='transcript')
router.register(r'v1/transfer-certificates', TransferCertificateViewSet, basename='transfer-certificate')
router.register(r'v1/character-certificates', CharacterCertificateViewSet, basename='character-certificate')
router.register(r'v1/achievement-records', AchievementRecordViewSet, basename='achievement-record')
router.register(r'v1/record-requests', RecordRequestViewSet, basename='record-request')
router.register(r'v1/absence-excuses', AbsenceExcuseViewSet, basename='absence-excuse')
router.register(r'v1/school-calendar', SchoolCalendarViewSet, basename='school-calendar')
router.register(r'v1/attendance-deadlines', AttendanceDeadlineViewSet, basename='attendance-deadline')
router.register(r'v1/enrollment-waitlist', EnrollmentWaitlistViewSet, basename='enrollment-waitlist')
router.register(r'v1/ptm-meetings', ParentTeacherMeetingViewSet, basename='ptm-meeting')
router.register(r'v1/behavioral-records', BehavioralRecordViewSet, basename='behavioral-record')
router.register(r'v1/school-events', SchoolEventViewSet, basename='school-event')
router.register(r'v1/user-blocks', UserBlockViewSet, basename='user-block')
router.register(r'v1/emergency-messages', EmergencyMessageViewSet, basename='emergency-message')
router.register(r'v1/departments', DepartmentViewSet, basename='department')
router.register(r'v1/staff-performance', StaffPerformanceViewSet, basename='staff-performance')
router.register(r'v1/grading-periods', GradingPeriodViewSet, basename='grading-period')
router.register(r'v1/grade-submissions', GradeSubmissionViewSet, basename='grade-submission')
router.register(r'v1/grade-reopening-requests', GradeReopeningRequestViewSet, basename='grade-reopening-request')
router.register(r'v1/compliance/types', ComplianceTypeViewSet, basename='compliance-type')
router.register(r'v1/compliance/submissions', ComplianceSubmissionViewSet, basename='compliance-submission')
router.register(r'v1/faculty-members', FacultyMemberViewSet, basename='faculty-member')

# NOTE: school_portal/urls.py mounts these under 'api/', so paths here should NOT include 'api/'.
# Final URL = api/ + path below  e.g. api/v1/login/
urlpatterns = [
    path('v1/login/', login_view, name='login'),
    path('v1/logout/', logout_view, name='logout'),
    path('v1/admin/create-user/', admin_create_user_view, name='admin_create_user'),
    path('v1/force-password-change/', force_password_change_view, name='force_password_change'),
    path('v1/auth/change-password/', change_password_view, name='change_password'),
    path('v1/profile/', user_profile, name='profile'),
    path('v1/student/profile/', student_profile, name='student_profile'),
    path('v1/student/calendar/', student_calendar_view, name='student_calendar'),
    path('v1/notifications/polling/', notifications_polling_view, name='notifications_polling'),
    path('v1/teacher/stats/', teacher_dashboard_stats, name='teacher_stats'),
    path('v1/student/dashboard/stats/', student_dashboard_stats, name='student_dashboard_stats'),
    path('v1/admin/stats/', admin_dashboard_stats, name='admin_stats'),
    path('v1/attendance/summary/', AttendanceViewSet.as_view({'get': 'summary'}), name='attendance_summary'),
    path('v1/grades/summary/', GradeViewSet.as_view({'get': 'summary'}), name='grade_summary'),
    path('v1/admin/grade-distribution/', grade_distribution_stats, name='grade_distribution_stats'),
    path('v1/admin/storage-analytics/', storage_analytics_view, name='storage_analytics'),
    path('v1/check-result/', check_result, name='check_result'),
    path('v1/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('v1/token/refresh/', cookie_token_refresh_view, name='token_refresh'),
    path('v1/announcements/public/', public_announcements_view, name='public_announcements'),
    path('v1/admin/system-metrics/', system_metrics_view, name='system_metrics'),
    path('v1/admin/maintenance-feed/', maintenance_feed_view, name='maintenance_feed'),
    path('v1/admin/maintenance-mode/', maintenance_mode_view, name='maintenance_mode'),
    path('v1/admin/force-sync/', force_sync_view, name='force_sync'),
    path('v1/admin/run-backup/', run_backup_view, name='run_backup'),
    path('v1/admin/clear-cache/', clear_cache_view, name='clear_cache'),
    path('v1/system/settings/', system_settings_view, name='system_settings'),
    path('v1/system/maintenance-status/', maintenance_status_view, name='maintenance_status'),
    path('v1/parent/dashboard/', parent_dashboard_view, name='parent_dashboard'),
    path('v1/parent/child/<int:student_id>/', parent_child_detail_view, name='parent_child_detail'),
    path('v1/parent/child/<int:student_id>/report-card-pdf/', parent_report_card_pdf, name='parent_report_card_pdf'),
    path('v1/parent/child/<int:student_id>/year-over-year/', parent_year_over_year, name='parent_year_over_year'),
    path('v1/admin/attendance-analytics/', admin_attendance_analytics, name='admin_attendance_analytics'),
    path('v1/admin/grade-analytics/', admin_grade_analytics, name='admin_grade_analytics'),
    path('v1/admin/data-retention/', data_retention_view, name='data_retention'),
    path('v1/admin/run-backup-enhanced/', run_backup_view_enhanced, name='run_backup_enhanced'),
    path('v1/fcm-tokens/', fcm_token_register, name='fcm_token_register'),
    path('v1/fcm-tokens/delete/', fcm_token_delete, name='fcm_token_delete'),
    path('v1/fcm-tokens/deactivate-all/', fcm_deactivate_all, name='fcm_deactivate_all'),
    path('v1/test-push/', test_push_notification, name='test_push_notification'),
    path('v1/notification-preferences/', notification_preferences_view, name='notification_preferences'),
    path('v1/compliance/dashboard/', compliance_dashboard, name='compliance_dashboard'),
    path('v1/compliance/my-status/', my_compliance_status, name='my_compliance_status'),
    path('v1/compliance/check-overdue/', check_overdue_submissions, name='check_overdue_submissions'),
    path('v1/compliance/trigger-reminders/', trigger_compliance_reminders, name='trigger_compliance_reminders'),
    path('v1/compliance/sync/', sync_teacher_submissions, name='sync_teacher_submissions'),
    path('v1/compliance/legacy/', legacy_submissions, name='legacy_submissions'),
    path('v1/compliance/bulk-assign/', bulk_assign_classroom_subject, name='bulk_assign_classroom_subject'),
    path('v1/compliance/audit-trail/', compliance_audit_trail, name='compliance_audit_trail'),
    path('', include(router.urls)),
]
