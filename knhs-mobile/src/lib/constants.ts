export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.knhs.edu.ph/api/v1';
export const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_BASE_URL || 'wss://api.knhs.edu.ph/ws';
export const MEDIA_ROOT = process.env.EXPO_PUBLIC_MEDIA_ROOT || 'https://api.knhs.edu.ph';

export const APP_NAME = 'KNHS School Portal';
export const APP_VERSION = '1.0.0';

export const COLORS = {
  primary: '#1E3A5F',
  secondary: '#2E86AB',
  accent: '#A23B72',
  success: '#22C55E',
  warning: '#EAB308',
  error: '#EF4444',
  info: '#3B82F6',
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
};

export const ENROLLMENT_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ENROLLED: 'enrolled',
} as const;

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
} as const;

export const TICKET_STATUS = {
  OPEN: 'open',
  PENDING: 'pending',
  REPLIED: 'replied',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;

export const ANNOUNCEMENT_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'system_update', label: 'System Update' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'academic', label: 'Academic' },
  { value: 'events', label: 'Events' },
  { value: 'holiday', label: 'Holiday' },
] as const;

export const TICKET_CATEGORIES = [
  { value: 'enrollment', label: 'Enrollment' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'academic', label: 'Academic' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'facilities', label: 'Facilities' },
  { value: 'it_support', label: 'IT Support' },
  { value: 'finance', label: 'Finance' },
  { value: 'guidance', label: 'Guidance' },
] as const;

export const GRADE_LEVELS = [
  { value: 1, label: 'Grade 1' },
  { value: 2, label: 'Grade 2' },
  { value: 3, label: 'Grade 3' },
  { value: 4, label: 'Grade 4' },
  { value: 5, label: 'Grade 5' },
  { value: 6, label: 'Grade 6' },
  { value: 7, label: 'Grade 7' },
  { value: 8, label: 'Grade 8' },
  { value: 9, label: 'Grade 9' },
  { value: 10, label: 'Grade 10' },
  { value: 11, label: 'Grade 11' },
  { value: 12, label: 'Grade 12' },
] as const;

export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export const TIME_SLOTS = [
  '07:00',
  '07:30',
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
] as const;