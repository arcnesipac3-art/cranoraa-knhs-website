from .user import User, OTP, Profile, OnboardingStatus, DashboardPreferences
from .academic import (
    Classroom, Subject, ClassroomSubject, SystemSetting, StudentClassEnrollment,
)
from .chat import (
    ChatRoom, ChatMessage, MessageReaction, ChatMember, Mention,
    ReportedMessage, UserBlock, EmergencyMessage,
)
from .announcements import Announcement, AnnouncementAttachment, AnnouncementComment
from .attendance import Attendance, AbsenceExcuse, AttendanceDeadline, AttendanceAuditLog, SchoolCalendar
from .learning import LearningMaterial
from .finance import ScratchCard, Fee
from .notifications import Notification, NotificationPreference, FCMToken
from .enrollment import (
    EnrollmentApplication, EnrollmentDocument, EnrollmentStatusHistory,
    EnrollmentWaitlist, ParentLink, EnrollmentChecklist, EnrollmentDocumentVersion,
)
from .communication import ParentTeacherMeeting, BehavioralRecord
from .events import SchoolEvent, WebsiteContent
from .assignments import Assignment, Submission, Grade
from .schedule import Room, TimeSlot, Schedule
from .grades import GradeReport, CoreValuesGrade
from .tickets import (
    Ticket, TicketParticipant, TicketMessage, TicketAttachment, DepartmentContact,
)
from .departments import Department, StaffPerformance
from .records import (
    Transcript, TranscriptLineItem, TransferCertificate,
    CharacterCertificate, AchievementRecord, RecordRequest,
    StudentPromotionRecord,
)
from .quiz import (
    Question, QuestionBank, Quiz, QuizQuestion, QuizAttempt, QuizAnswer, IntegrityLog,
)
from .lesson_plan import CurriculumStandard, LessonPlan, WeeklyPlan
from .school_forms import (
    SchoolForm1, SchoolForm1Student,
    SchoolForm5, SchoolForm5Student,
    SchoolForm9, SchoolForm9Subject,
    SchoolForm10, SchoolForm10Record, SchoolForm10Subject,
)
from .infrastructure import (
    AcademicYear, Semester, AuditLog, APIRequestLog, DatabaseBackup,
)
from .grading_management import GradingPeriod, GradeSubmission, GradeReopeningRequest

__all__ = [
    'User', 'OTP', 'Profile', 'OnboardingStatus', 'DashboardPreferences',
    'Classroom', 'Subject', 'ClassroomSubject', 'SystemSetting', 'StudentClassEnrollment',
    'ChatRoom', 'ChatMessage', 'MessageReaction', 'ChatMember', 'Mention',
    'ReportedMessage', 'UserBlock', 'EmergencyMessage',
    'Announcement', 'AnnouncementAttachment', 'AnnouncementComment',
    'Attendance', 'AbsenceExcuse', 'AttendanceDeadline', 'AttendanceAuditLog', 'SchoolCalendar',
    'LearningMaterial',
    'ScratchCard', 'Fee',
    'Notification', 'NotificationPreference', 'FCMToken',
    'EnrollmentApplication', 'EnrollmentDocument', 'EnrollmentStatusHistory',
    'EnrollmentWaitlist', 'ParentLink', 'EnrollmentChecklist', 'EnrollmentDocumentVersion',
    'ParentTeacherMeeting', 'BehavioralRecord',
    'SchoolEvent', 'WebsiteContent',
    'Assignment', 'Submission', 'Grade',
    'Room', 'TimeSlot', 'Schedule',
    'GradeReport', 'CoreValuesGrade',
    'GradingPeriod', 'GradeSubmission', 'GradeReopeningRequest',
    'Ticket', 'TicketParticipant', 'TicketMessage', 'TicketAttachment', 'DepartmentContact',
    'Department', 'StaffPerformance',
    'Transcript', 'TranscriptLineItem', 'TransferCertificate',
    'CharacterCertificate', 'AchievementRecord', 'RecordRequest',
    'StudentPromotionRecord',
    'Question', 'QuestionBank', 'Quiz', 'QuizQuestion', 'QuizAttempt', 'QuizAnswer', 'IntegrityLog',
    'CurriculumStandard', 'LessonPlan', 'WeeklyPlan',
    'SchoolForm1', 'SchoolForm1Student',
    'SchoolForm5', 'SchoolForm5Student',
    'SchoolForm9', 'SchoolForm9Subject',
    'SchoolForm10', 'SchoolForm10Record', 'SchoolForm10Subject',
    'AcademicYear', 'Semester', 'AuditLog', 'APIRequestLog', 'DatabaseBackup',
]
