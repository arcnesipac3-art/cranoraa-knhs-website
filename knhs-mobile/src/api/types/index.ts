export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

export interface ErrorResponse {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

export type UserRole = 'admin' | 'staff' | 'student' | 'parent';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
  must_change_password?: boolean;
  profile?: UserProfile;
}

export interface UserProfile {
  id: number;
  user: number;
  lrn: string | null;
  grade_level: number | null;
  employee_id: string | null;
  staff_title: string | null;
  additional_roles: string | null;
  profile_picture: string | null;
  phone_number: string | null;
  address: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface TokenRefreshRequest {
  refresh: string;
}

export interface TokenRefreshResponse {
  access: string;
  refresh: string;
}

export interface OTPRequest {
  email: string;
  otp: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface ForcePasswordChangeRequest {
  new_password: string;
}

export interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface Semester {
  id: number;
  academic_year: number;
  name: string;
  number: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export interface Classroom {
  id: number;
  name: string;
  grade_level: number;
  section: string;
  capacity: number;
  advisory_teacher: User | null;
  academic_year: AcademicYear;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  grade_level: number;
  description: string;
}

export interface ClassroomSubject {
  id: number;
  classroom: Classroom;
  subject: Subject;
  teacher: User;
  written_work_weight: number;
  performance_task_weight: number;
  quarterly_assessment_weight: number;
}

export interface StudentClassEnrollment {
  id: number;
  student: User;
  classroom: Classroom;
  academic_year: AcademicYear;
  enrollment_date: string;
  status: 'active' | 'inactive' | 'transferred';
}

export interface Grade {
  id: number;
  student: User;
  classroom_subject: ClassroomSubject;
  term: 1 | 2 | 3;
  written_work_score: number | null;
  performance_task_score: number | null;
  quarterly_assessment_score: number | null;
  final_grade: number | null;
  remarks: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface GradeReport {
  id: number;
  student: User;
  academic_year: AcademicYear;
  general_average: number;
  remarks: string;
  rank: number | null;
  term: 1 | 2 | 3;
}

export interface Attendance {
  id: number;
  student: User;
  classroom: Classroom;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  time_in: string | null;
  time_out: string | null;
  minutes_late: number;
  remarks: string;
  marked_by: User;
}

export interface AbsenceExcuse {
  id: number;
  student: User;
  attendance: Attendance;
  reason: string;
  document: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: User | null;
  reviewed_at: string | null;
}

export interface Schedule {
  id: number;
  classroom: Classroom;
  subject: Subject;
  teacher: User;
  room: Room;
  time_slot: TimeSlot;
  academic_year: AcademicYear;
}

export interface Room {
  id: number;
  name: string;
  type: 'classroom' | 'laboratory' | 'gymnasium' | 'library' | 'other';
  capacity: number;
}

export interface TimeSlot {
  id: number;
  classroom: Classroom;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  start_time: string;
  end_time: string;
}

export interface ChatRoom {
  id: number;
  name: string;
  type: 'direct' | 'group';
  participants: User[];
  created_by: User;
  created_at: string;
  last_message: ChatMessage | null;
  unread_count: number;
}

export interface ChatMessage {
  id: number;
  room: ChatRoom;
  sender: User;
  content: string;
  message_type: 'text' | 'image' | 'file';
  file_url: string | null;
  parent_message: number | null;
  is_edited: boolean;
  is_pinned: boolean;
  read_by: number[];
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  user: User;
  title: string;
  message: string;
  type: 'grade' | 'attendance' | 'announcement' | 'message' | 'fee' | 'system';
  is_read: boolean;
  data: Record<string, unknown>;
  created_at: string;
}

export interface NotificationPreference {
  id: number;
  user: User;
  grade_notifications: boolean;
  attendance_notifications: boolean;
  announcement_notifications: boolean;
  message_notifications: boolean;
  fee_notifications: boolean;
  system_notifications: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  category: 'general' | 'system_update' | 'emergency' | 'academic' | 'events' | 'holiday';
  priority: 'info' | 'critical';
  status: 'draft' | 'live' | 'expired';
  target_audience: UserRole[];
  classroom: Classroom | null;
  created_by: User;
  is_pinned: boolean;
  expires_at: string | null;
  attachments: string[];
  read_by: number[];
  comments: AnnouncementComment[];
  created_at: string;
  updated_at: string;
}

export interface AnnouncementComment {
  id: number;
  user: User;
  content: string;
  created_at: string;
}

export interface EnrollmentApplication {
  id: number;
  enrollment_number: string;
  student_name: string;
  email: string;
  phone_number: string;
  grade_level: number;
  enrollment_type: 'new' | 'returning' | 'transferee' | 'shs_applicant' | 'parent_assisted';
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'enrolled';
  documents: EnrollmentDocument[];
  status_history: EnrollmentStatusHistory[];
  created_at: string;
  updated_at: string;
}

export interface EnrollmentDocument {
  id: number;
  document_type: string;
  file_url: string;
  is_verified: boolean;
}

export interface EnrollmentStatusHistory {
  id: number;
  status: string;
  notes: string;
  changed_by: User;
  created_at: string;
}

export interface Assignment {
  id: number;
  title: string;
  description: string;
  type: 'homework' | 'quiz' | 'exam' | 'project' | 'performance_task' | 'laboratory' | 'activity';
  classroom_subject: ClassroomSubject;
  due_date: string;
  is_template: boolean;
  attachments: string[];
  created_by: User;
  created_at: string;
}

export interface Submission {
  id: number;
  assignment: Assignment;
  student: User;
  content: string;
  attachments: string[];
  is_late: boolean;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
  graded_by: User | null;
}

export interface Ticket {
  id: number;
  ticket_id: string;
  subject: string;
  description: string;
  category: 'enrollment' | 'attendance' | 'academic' | 'collaboration' | 'facilities' | 'it_support' | 'finance' | 'guidance';
  priority: 'normal' | 'high' | 'urgent';
  status: 'open' | 'pending' | 'replied' | 'resolved' | 'closed';
  created_by: User;
  assigned_to: User | null;
  participants: TicketParticipant[];
  messages: TicketMessage[];
  attachments: TicketAttachment[];
  created_at: string;
  updated_at: string;
}

export interface TicketParticipant {
  id: number;
  user: User;
  role: 'viewer' | 'collaborator';
}

export interface TicketMessage {
  id: number;
  sender: User;
  content: string;
  attachments: TicketAttachment[];
  created_at: string;
}

export interface TicketAttachment {
  id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_by: User;
  created_at: string;
}

export interface Transcript {
  id: number;
  student: User;
  academic_year: AcademicYear;
  general_average: number;
  remarks: string;
  rank: number | null;
  generated_at: string;
  generated_by: User;
}

export interface TransferCertificate {
  id: number;
  reference_number: string;
  student: User;
  school_name: string;
  school_address: string;
  date_of_birth: string;
  date_graduated: string;
  general_average: number;
  remarks: string;
  generated_at: string;
  generated_by: User;
}

export interface CharacterCertificate {
  id: number;
  reference_number: string;
  student: User;
  school_name: string;
  date_issued: string;
  remarks: string;
  generated_at: string;
  generated_by: User;
}

export interface AchievementRecord {
  id: number;
  student: User;
  category: 'academic' | 'sports' | 'arts' | 'leadership' | 'community' | 'competition';
  title: string;
  description: string;
  date_achieved: string;
  created_at: string;
}

export interface RecordRequest {
  id: number;
  request_number: string;
  student: User;
  record_type: 'transcript' | 'transfer_certificate' | 'character_certificate' | 'achievement_record';
  status: 'pending' | 'processing' | 'ready' | 'released';
  notes: string;
  requested_by: User;
  processed_by: User | null;
  created_at: string;
  updated_at: string;
}

export interface SchoolEvent {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  is_all_day: boolean;
  created_by: User;
  created_at: string;
}

export interface Fee {
  id: number;
  name: string;
  description: string;
  amount: number;
  fee_type: 'tuition' | 'miscellaneous' | 'books' | 'uniform' | 'other';
  academic_year: AcademicYear;
  is_active: boolean;
  created_at: string;
}

export interface ScratchCard {
  id: number;
  serial_number: string;
  amount: number;
  is_used: boolean;
  used_by: User | null;
  used_at: string | null;
  created_at: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  head: User | null;
  description: string;
  created_at: string;
}

export interface StaffPerformance {
  id: number;
  staff: User;
  academic_year: AcademicYear;
  rating: number;
  comments: string;
  evaluated_by: User;
  created_at: string;
}

export interface ParentTeacherMeeting {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  classroom: Classroom;
  teacher: User;
  parent: User;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
  created_at: string;
}

export interface BehavioralRecord {
  id: number;
  student: User;
  classroom: Classroom;
  date: string;
  behavior_type: 'positive' | 'negative' | 'neutral';
  description: string;
  action_taken: string;
  recorded_by: User;
  created_at: string;
}

export interface DashboardStats {
  total_students: number;
  total_teachers: number;
  total_staff: number;
  total_parents: number;
  active_enrollments: number;
  pending_enrollments: number;
  attendance_rate: number;
  average_grade: number;
  recent_announcements: Announcement[];
  upcoming_events: SchoolEvent[];
}

export interface TeacherDashboardStats {
  my_classes: Classroom[];
  total_students: number;
  pending_grades: number;
  pending_attendance: number;
  recent_submissions: Submission[];
  upcoming_assignments: Assignment[];
}

export interface StudentDashboardStats {
  my_grades: Grade[];
  my_attendance: Attendance[];
  my_schedule: Schedule[];
  upcoming_assignments: Assignment[];
  recent_announcements: Announcement[];
  unread_notifications: number;
}

export interface ParentDashboardStats {
  children: User[];
  child_grades: Grade[];
  child_attendance: Attendance[];
  upcoming_events: SchoolEvent[];
  recent_announcements: Announcement[];
}

export interface SystemSettings {
  id: number;
  site_name: string;
  school_name: string;
  school_address: string;
  school_phone: string;
  school_email: string;
  logo: string;
  primary_color: string;
  secondary_color: string;
  academic_level: 'jhs' | 'shs' | 'both';
  grading_system: 'deped' | 'custom';
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  user: User;
  action: string;
  model: string;
  object_id: string;
  changes: Record<string, unknown>;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface DatabaseBackup {
  id: number;
  filename: string;
  file_size: number;
  status: 'pending' | 'completed' | 'failed';
  created_by: User;
  created_at: string;
}

export interface WebsiteContent {
  id: number;
  section: string;
  title: string;
  content: string;
  image: string | null;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}