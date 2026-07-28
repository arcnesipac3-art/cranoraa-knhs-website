export const Role = {
  ADMIN: 'admin',
  STAFF: 'staff',
  STUDENT: 'student',
  PARENT: 'parent',
} as const;

export type UserRole = typeof Role[keyof typeof Role];

export const ADMIN_ROLES = ['principal', 'vice_principal', 'registrar', 'admin'];

export const STAFF_ROLES = ['teacher', 'staff', 'guidance_counselor', 'librarian', 'accountant'];

export const STUDENT_ROLES = ['student'];

export const PARENT_ROLES = ['parent', 'guardian'];

export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

export function isAdmin(role: UserRole): boolean {
  return role === Role.ADMIN;
}

export function isStaff(role: UserRole): boolean {
  return role === Role.STAFF;
}

export function isStudent(role: UserRole): boolean {
  return role === Role.STUDENT;
}

export function isParent(role: UserRole): boolean {
  return role === Role.PARENT;
}

export function isAdminOrStaff(role: UserRole): boolean {
  return role === Role.ADMIN || role === Role.STAFF;
}

export function roleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    admin: 'Administrator',
    staff: 'Staff',
    student: 'Student',
    parent: 'Parent',
  };
  return labels[role] || 'Unknown';
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    admin: '#EF4444',
    staff: '#3B82F6',
    student: '#22C55E',
    parent: '#A855F7',
  };
  return colors[role] || '#6B7280';
}

export function getRoleHomeRoute(role: UserRole): string {
  const routes: Record<UserRole, string> = {
    admin: '/(main)/dashboard',
    staff: '/(main)/dashboard',
    student: '/(main)/dashboard',
    parent: '/(main)/dashboard',
  };
  return routes[role] || '/(main)/dashboard';
}

export function canAccessFeature(role: UserRole, feature: string): boolean {
  const featureAccess: Record<string, UserRole[]> = {
    dashboard: [Role.ADMIN, Role.STAFF, Role.STUDENT, Role.PARENT],
    grades: [Role.ADMIN, Role.STAFF, Role.STUDENT, Role.PARENT],
    attendance: [Role.ADMIN, Role.STAFF, Role.STUDENT, Role.PARENT],
    enrollment: [Role.ADMIN, Role.STAFF],
    users: [Role.ADMIN],
    settings: [Role.ADMIN, Role.STAFF, Role.STUDENT],
    chat: [Role.ADMIN, Role.STAFF, Role.STUDENT, Role.PARENT],
    tickets: [Role.ADMIN, Role.STAFF, Role.STUDENT, Role.PARENT],
    announcements: [Role.ADMIN, Role.STAFF, Role.STUDENT, Role.PARENT],
    records: [Role.ADMIN, Role.STAFF, Role.STUDENT, Role.PARENT],
    finance: [Role.ADMIN, Role.STAFF],
    analytics: [Role.ADMIN],
    system: [Role.ADMIN],
  };

  const allowedRoles = featureAccess[feature];
  return allowedRoles ? allowedRoles.includes(role) : false;
}