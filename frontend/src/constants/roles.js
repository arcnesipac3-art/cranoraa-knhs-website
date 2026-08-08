/**
 * Centralized RBAC constants for the KNHS School Portal frontend.
 *
 * Import from here instead of hardcoding role strings:
 *   import { Role, RoleLabel, ROLE_HOME, hasRole } from '@/constants/roles';
 */

export const Role = Object.freeze({
  ADMIN: 'admin',
  STAFF: 'staff',
  STUDENT: 'student',
  PARENT: 'parent',
  ALL: ['admin', 'staff', 'student', 'parent'],
});

export const RoleLabel = Object.freeze({
  [Role.ADMIN]: 'Admin',
  [Role.STAFF]: 'Faculty',
  [Role.STUDENT]: 'Student',
  [Role.PARENT]: 'Parent',
});

export const ROLE_HOME = Object.freeze({
  [Role.ADMIN]: '/system-admin',
  [Role.STAFF]: '/dashboard',
  [Role.STUDENT]: '/dashboard',
  [Role.PARENT]: '/parent-dashboard',
});

/**
 * Check if a user has one of the specified roles.
 * @param {Object} user - The user object (must have a `role` property)
 * @param {...string} roles - Allowed roles
 * @returns {boolean}
 */
export function hasRole(user, ...roles) {
  return user && roles.includes(user.role);
}

/**
 * Check if user is admin (role=admin OR is_admin flag on staff).
 */
export function isAdmin(user) {
  return user?.role === Role.ADMIN || user?.is_admin === true;
}

/**
 * Check if user is staff/teacher.
 */
export function isStaff(user) {
  return user?.role === Role.STAFF;
}

/**
 * Check if user is a student.
 */
export function isStudent(user) {
  return user?.role === Role.STUDENT;
}

/**
 * Check if user is a parent.
 */
export function isParent(user) {
  return user?.role === Role.PARENT;
}

/**
 * Check if user is admin or staff.
 */
export function isAdminOrStaff(user) {
  return user?.role === Role.ADMIN || user?.role === Role.STAFF || user?.is_admin === true;
}

/**
 * Get the display label for a role.
 */
export function roleLabel(role) {
  return RoleLabel[role] || role;
}