from .auth import (
    login_view,
    logout_view,
    cookie_token_refresh_view,
    force_password_change_view,
    change_password_view,
    notification_preferences_view,
)

from .users import (
    admin_create_user_view,
    user_profile,
    student_profile,
    UserViewSet,
)

from .dashboard import (
    teacher_dashboard_stats,
    student_dashboard_stats,
    admin_dashboard_stats,
    storage_analytics_view,
    admin_attendance_analytics,
    admin_grade_analytics,
)

from .academic import (
    ClassroomViewSet,
    StudentClassEnrollmentViewSet,
    SubjectViewSet,
    ClassroomSubjectViewSet,
    ScratchCardViewSet,
    FeeViewSet,
)

from .grades import (
    GradeViewSet,
    GradeReportViewSet,
    grade_distribution_stats,
    check_result,
    at_risk_students,
    teacher_class_analytics,
)

from .attendance import (
    AttendanceViewSet,
    AbsenceExcuseViewSet,
)

from .enrollment import (
    EnrollmentApplicationViewSet,
    EnrollmentWaitlistViewSet,
)

from .announcements import (
    AnnouncementViewSet,
    public_announcements_view,
)

from .assignments import (
    AssignmentViewSet,
    SubmissionViewSet,
    LearningMaterialViewSet,
)

from .chat import (
    ChatRoomViewSet,
    ChatMessageViewSet,
    ReportedMessageViewSet,
    UserBlockViewSet,
)

from .notifications import (
    NotificationViewSet,
    notifications_polling_view,
)

from .schedule import (
    RoomViewSet,
    TimeSlotViewSet,
    ScheduleViewSet,
)

from .records import (
    TranscriptViewSet,
    TransferCertificateViewSet,
    CharacterCertificateViewSet,
    AchievementRecordViewSet,
    RecordRequestViewSet,
    StudentPromotionRecordViewSet,
)

from .tickets import (
    TicketViewSet,
    DepartmentContactViewSet,
)

from .system import (
    system_settings_view,
    maintenance_status_view,
    system_metrics_view,
    maintenance_feed_view,
    maintenance_mode_view,
    force_sync_view,
    run_backup_view,
    clear_cache_view,
    data_retention_view,
    run_backup_view_enhanced,
)

from .parents import (
    parent_dashboard_view,
    parent_child_detail_view,
    parent_report_card_pdf,
    parent_year_over_year,
)

from .content import (
    WebsiteContentViewSet,
)

from .misc import (
    student_calendar_view,
    ParentTeacherMeetingViewSet,
    BehavioralRecordViewSet,
    SchoolEventViewSet,
    EmergencyMessageViewSet,
    DepartmentViewSet,
    StaffPerformanceViewSet,
)

from .fcm import (
    fcm_token_register,
    fcm_token_delete,
    test_push_notification,
)

from .quiz import (
    QuestionBankViewSet,
    QuestionViewSet,
    QuizViewSet,
    QuizAttemptViewSet,
)

from .school_forms import (
    SchoolForm1ViewSet,
    SF2ViewSet,
    SchoolForm5ViewSet,
    SchoolForm9ViewSet,
    SchoolForm10ViewSet,
)

from .quiz import (
    QuestionBankViewSet,
    QuestionViewSet,
    QuizViewSet,
    QuizAttemptViewSet,
)

from .lesson_plan import (
    CurriculumStandardViewSet,
    LessonPlanViewSet,
    WeeklyPlanViewSet,
)
