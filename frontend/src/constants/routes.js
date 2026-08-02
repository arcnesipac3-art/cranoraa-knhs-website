/**
 * Centralized route configuration for the KNHS School Portal.
 *
 * Import from here instead of hardcoding routes in App.jsx.
 * Provides a single source of truth for all routes, their components,
 * and access control rules.
 */
import { lazy } from 'react';
import { Role } from './roles';
import { retryImport } from '../utils/lazyImport';

// ── Lazy-loaded page components with retry logic ─────────────────────────────
// All route imports are wrapped with retryImport to handle network failures
// Requirements: 1.2 (route lazy loading), 1.6 (retry on failure)

const Home = lazy(() => retryImport(() => import('../pages/HomeDepEd')));
const About = lazy(() => retryImport(() => import('../pages/About')));
const Mission = lazy(() => retryImport(() => import('../pages/Mission')));
const Vision = lazy(() => retryImport(() => import('../pages/Vision')));
const Faculty = lazy(() => retryImport(() => import('../pages/Faculty')));
const Programs = lazy(() => retryImport(() => import('../pages/Programs')));
const K12Programs = lazy(() => retryImport(() => import('../pages/K12Programs')));
const SeniorHigh = lazy(() => retryImport(() => import('../pages/SeniorHigh')));
const Contact = lazy(() => retryImport(() => import('../pages/Contact')));
const Enrollment = lazy(() => retryImport(() => import('../pages/Enrollment')));
const AnnouncementDetails = lazy(() => retryImport(() => import('../pages/AnnouncementDetails')));
const NewsEvents = lazy(() => retryImport(() => import('../pages/NewsEvents')));
const Calendar = lazy(() => retryImport(() => import('../pages/Calendar')));
const LearningMaterials = lazy(() => retryImport(() => import('../pages/LearningMaterials')));
const Portals = lazy(() => retryImport(() => import('../pages/Portals')));
const PrivacyPolicy = lazy(() => retryImport(() => import('../pages/PrivacyPolicy')));
const TermsOfService = lazy(() => retryImport(() => import('../pages/TermsOfService')));
const EnrollmentTracking = lazy(() => retryImport(() => import('../pages/EnrollmentTracking')));
const Profile = lazy(() => retryImport(() => import('../pages/Profile')));

const PasswordReset = lazy(() => retryImport(() => import('../pages/PasswordReset')));
const Settings = lazy(() => retryImport(() => import('../pages/Settings')));
const Notifications = lazy(() => retryImport(() => import('../pages/Notifications')));
const SystemAdminHub = lazy(() => retryImport(() => import('../pages/SystemAdminHub')));
const CommunicationCenter = lazy(() => retryImport(() => import('../pages/CommunicationCenter')));
const Announcements = lazy(() => retryImport(() => import('../pages/Announcements')));
const ParentDashboard = lazy(() => retryImport(() => import('../pages/ParentDashboard')));
const Dashboard = lazy(() => retryImport(() => import('../pages/Dashboard')));
const AcademicSetup = lazy(() => retryImport(() => import('../pages/AcademicSetup')));

// New Hub Pages
const PeopleHub = lazy(() => retryImport(() => import('../pages/PeopleHub')));
const ClassesHub = lazy(() => retryImport(() => import('../pages/ClassesHub')));
const EnrollmentHub = lazy(() => retryImport(() => import('../pages/EnrollmentHub')));
const SubjectsHub = lazy(() => retryImport(() => import('../pages/SubjectsHub')));
const MySchedule = lazy(() => retryImport(() => import('../pages/MySchedule')));
const ClassroomHub = lazy(() => retryImport(() => import('../pages/ClassroomHub')));
const ScheduleManagement = lazy(() => retryImport(() => import('../pages/ScheduleManagement')));
const Analytics = lazy(() => retryImport(() => import('../pages/Analytics')));

// School Forms
const SchoolFormsDashboard = lazy(() => retryImport(() => import('../pages/SchoolFormsDashboard')));
const SF1Page = lazy(() => retryImport(() => import('../pages/SF1SchoolRegister')));
const SF2Page = lazy(() => retryImport(() => import('../pages/SF2AttendanceReport')));
const SF5Page = lazy(() => retryImport(() => import('../pages/SF5PromotionReport')));
const SF9Page = lazy(() => retryImport(() => import('../pages/SF9ReportCard')));
const SF10Page = lazy(() => retryImport(() => import('../pages/SF10PermanentRecord')));

// Grade Management
const GradingPeriodManagement = lazy(() => retryImport(() => import('../pages/GradingPeriodManagement')));
const TeacherGradeDashboard = lazy(() => retryImport(() => import('../pages/TeacherGradeDashboard')));
const AdminGradeMonitoring = lazy(() => retryImport(() => import('../pages/AdminGradeMonitoring')));
const GradeReopeningManagement = lazy(() => retryImport(() => import('../pages/GradeReopeningManagement')));
const GradeReportsPage = lazy(() => retryImport(() => import('../pages/GradeReportsPage')));

// ── Route definitions ────────────────────────────────────────────────────────

/**
 * Public website routes (no auth required).
 */
export const publicRoutes = [
  { path: '/', element: Home },
  { path: 'about', element: About },
  { path: 'mission', element: Mission },
  { path: 'vision', element: Vision },
  { path: 'faculty', element: Faculty },
  { path: 'programs', element: Programs },
  { path: 'k12-programs', element: K12Programs },
  { path: 'senior-high', element: SeniorHigh },
  { path: 'news-events', element: NewsEvents },
  { path: 'learning-materials', element: LearningMaterials },
  { path: 'portals', element: Portals },
  { path: 'contact', element: Contact },
  { path: 'enroll', element: Enrollment },
  { path: 'announcement', element: AnnouncementDetails },
  { path: 'calendar', element: Calendar },
  { path: 'privacy', element: PrivacyPolicy },
  { path: 'terms', element: TermsOfService },
  { path: 'track-enrollment', element: EnrollmentTracking },
];

/**
 * Protected portal routes (auth required).
 * `roles` defaults to Role.ALL if not specified.
 */
export const protectedRoutes = [
  // Hub routes (primary navigation)
  { path: 'dashboard', element: Dashboard, roles: Role.ALL },
  { path: 'system-admin', element: SystemAdminHub, roles: [Role.ADMIN] },
  { path: 'communication-center', element: CommunicationCenter, roles: Role.ALL },
  { path: 'announcements', element: Announcements, roles: Role.ALL },
  { path: 'notifications', element: Notifications, roles: Role.ALL },
  { path: 'profile', element: Profile, roles: Role.ALL },
  { path: 'settings', element: Settings, roles: [Role.ADMIN, Role.STAFF, Role.STUDENT] },
  { path: 'parent-dashboard', element: ParentDashboard, roles: [Role.PARENT] },

  // New Hub routes
  { path: 'people', element: PeopleHub, roles: [Role.ADMIN, Role.STAFF] },
  { path: 'classes', element: ClassesHub, roles: [Role.ADMIN] },
  { path: 'enrollment', element: EnrollmentHub, roles: [Role.ADMIN, Role.STAFF] },
  { path: 'subjects', element: SubjectsHub, roles: [Role.ADMIN] },
  { path: 'schedules', element: ScheduleManagement, roles: [Role.ADMIN, Role.STAFF] },
  { path: 'academic-setup', element: AcademicSetup, roles: [Role.ADMIN] },
  { path: 'analytics',      element: Analytics,     roles: [Role.ADMIN] },
  { path: 'my-classes', element: ClassroomHub, roles: [Role.STAFF, Role.STUDENT] },
  { path: 'my-schedule', element: MySchedule, roles: [Role.STAFF, Role.STUDENT] },

  // School Forms Module
  { path: 'school-forms', element: SchoolFormsDashboard, roles: [Role.ADMIN, Role.STAFF] },
  { path: 'school-forms/sf1', element: SF1Page, roles: [Role.ADMIN, Role.STAFF] },
  { path: 'school-forms/sf2', element: SF2Page, roles: [Role.ADMIN, Role.STAFF] },
  { path: 'school-forms/sf5', element: SF5Page, roles: [Role.ADMIN, Role.STAFF] },
  { path: 'school-forms/sf9', element: SF9Page, roles: Role.ALL },
  { path: 'school-forms/sf10', element: SF10Page, roles: [Role.ADMIN, Role.STAFF] },

  // Grade Management Module
  { path: 'grading-periods', element: GradingPeriodManagement, roles: [Role.ADMIN] },
  { path: 'teacher-grade-dashboard', element: TeacherGradeDashboard, roles: [Role.STAFF] },
  { path: 'admin-grade-monitoring', element: AdminGradeMonitoring, roles: [Role.ADMIN] },
  { path: 'grade-reopening', element: GradeReopeningManagement, roles: [Role.ADMIN] },
  { path: 'grade-reports', element: GradeReportsPage, roles: [Role.ADMIN] },

  // Standalone routes
  { path: 'portal-calendar', element: Calendar, props: { mode: 'portal' }, roles: Role.ALL },
  { path: 'password-reset', element: PasswordReset, roles: [Role.PARENT] },
];