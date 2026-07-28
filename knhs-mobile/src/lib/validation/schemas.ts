import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email or Student ID is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const otpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export type OTPFormData = z.infer<typeof otpSchema>;

export const changePasswordSchema = z.object({
  old_password: z.string().min(6, 'Current password is required'),
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export const forcePasswordChangeSchema = z.object({
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

export type ForcePasswordChangeFormData = z.infer<typeof forcePasswordChangeSchema>;

export const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export const enrollmentSchema = z.object({
  student_name: z.string().min(1, 'Student name is required'),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().min(10, 'Phone number must be at least 10 digits'),
  grade_level: z.number().min(1).max(12),
  enrollment_type: z.enum(['new', 'returning', 'transferee', 'shs_applicant', 'parent_assisted']),
});

export type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

export const gradeInputSchema = z.object({
  written_work_score: z.number().min(0).max(100).optional().nullable(),
  performance_task_score: z.number().min(0).max(100).optional().nullable(),
  quarterly_assessment_score: z.number().min(0).max(100).optional().nullable(),
});

export type GradeInputFormData = z.infer<typeof gradeInputSchema>;

export const attendanceSchema = z.object({
  student_id: z.number(),
  date: z.string(),
  status: z.enum(['present', 'absent', 'late', 'excused']),
  time_in: z.string().optional().nullable(),
  time_out: z.string().optional().nullable(),
  minutes_late: z.number().min(0).optional(),
  remarks: z.string().optional(),
});

export type AttendanceFormData = z.infer<typeof attendanceSchema>;

export const ticketSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum([
    'enrollment',
    'attendance',
    'academic',
    'collaboration',
    'facilities',
    'it_support',
    'finance',
    'guidance',
  ]),
  priority: z.enum(['normal', 'high', 'urgent']),
});

export type TicketFormData = z.infer<typeof ticketSchema>;

export const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  category: z.enum([
    'general',
    'system_update',
    'emergency',
    'academic',
    'events',
    'holiday',
  ]),
  priority: z.enum(['info', 'critical']),
  target_audience: z.array(z.enum(['admin', 'staff', 'student', 'parent'])),
  expires_at: z.string().optional().nullable(),
});

export type AnnouncementFormData = z.infer<typeof announcementSchema>;

export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
});

export type SearchFormData = z.infer<typeof searchSchema>;