/**
 * Breadcrumb Generation Utility
 * 
 * Generates breadcrumb navigation trails from URL pathnames.
 * Maps path segments to human-readable labels and handles dynamic segments.
 * 
 * @module utils/breadcrumbs
 */

/**
 * Map of URL path segments to human-readable labels.
 * This includes both base paths and sub-paths that might appear in URLs.
 */
const PATH_LABEL_MAP = {
  // Dashboard
  'dashboard': 'Dashboard',
  'parent-dashboard': 'Dashboard',
  
  // Hub Routes
  'academics-hub': 'Academics Hub',
  'enrollment': 'Enrollment',
  'classes': 'Classes',
  'people': 'People',
  'departments': 'Departments',
  'system-admin': 'System Admin',
  'communication-center': 'Communication Center',
  'academic-setup': 'Academic Setup',
  
  // Standalone Routes
  'announcements': 'Announcements',
  'notifications': 'Notifications',
  'profile': 'My Profile',
  'settings': 'Settings',
  'attendance': 'Attendance',
  // Legacy redirects — kept for reference only
  'portal-calendar': 'Calendar',
  'password-reset': 'Password Reset',
  
  // Academic Features
  'grades': 'Grades',
  'grade-input': 'Grade Input',
  'grade-management': 'Grade Management',
  'student-grades': 'My Grades',
  'materials': 'Learning Materials',
  'subjects': 'Subjects',

  'schedule': 'My Schedule',
  'schedule-management': 'Schedule Management',
  
  // People Features
  'teachers': 'Teachers',
  'students': 'Students',
  'parents': 'Parents',
  'student-management': 'Student Management',
  'parent-management': 'Parent Management',
  
  // Enrollment Features
  'enrollment-management': 'Enrollment Management',
  'student-enrollment': 'Student Enrollment',

  'enroll': 'Enroll',
  'track-enrollment': 'Track Enrollment',
  
  // System Admin Features
  'audit-logs': 'Audit Logs',
  'backups': 'Backups',
  'website-content': 'Website Content',
  'moderation': 'Moderation',
  'analytics': 'Analytics',
  'system-health': 'System Health',
  
  // Public Website Routes
  'about': 'About',
  'mission': 'Mission',
  'vision': 'Vision',
  'faculty': 'Faculty',
  'programs': 'Programs',
  'k12-programs': 'K-12 Programs',
  'senior-high': 'Senior High',
  'news-events': 'News & Events',
  'learning-materials': 'Learning Materials',
  'portals': 'Portals',
  'contact': 'Contact',
  'announcement': 'Announcement',
  'calendar': 'Calendar',
  'privacy': 'Privacy Policy',
  'terms': 'Terms of Service',
  
  // Common Sub-paths
  'edit': 'Edit',
  'view': 'View',
  'new': 'New',
  'create': 'Create',
  'details': 'Details',
  'list': 'List',
};

/**
 * Checks if a segment is a dynamic ID or slug.
 * Dynamic segments are typically numeric IDs or UUID-like strings.
 * 
 * @param {string} segment - The URL segment to check
 * @returns {boolean} True if segment appears to be a dynamic identifier
 */
function isDynamicSegment(segment) {
  // Check if segment is purely numeric (ID)
  if (/^\d+$/.test(segment)) {
    return true;
  }
  
  // Check if segment looks like a UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return true;
  }
  
  // Check if segment is a very long alphanumeric string (likely a slug or ID)
  if (segment.length > 20 && /^[a-z0-9-_]+$/i.test(segment)) {
    return true;
  }
  
  return false;
}

/**
 * Converts a path segment to a human-readable label.
 * Handles known paths, dynamic segments, and fallback formatting.
 * 
 * @param {string} segment - The URL segment to convert
 * @param {number} index - Position in the path (for context)
 * @param {string[]} allSegments - All path segments (for context)
 * @returns {string} Human-readable label
 */
function segmentToLabel(segment, index, allSegments) {
  // Return known label if exists
  if (PATH_LABEL_MAP[segment]) {
    return PATH_LABEL_MAP[segment];
  }
  
  // Handle dynamic segments
  if (isDynamicSegment(segment)) {
    // Try to infer the type from previous segment
    const prevSegment = allSegments[index - 1];
    
    if (prevSegment === 'student' || prevSegment === 'students') {
      return `Student #${segment}`;
    }
    if (prevSegment === 'teacher' || prevSegment === 'teachers') {
      return `Teacher #${segment}`;
    }
    if (prevSegment === 'class' || prevSegment === 'classes') {
      return `Class #${segment}`;
    }
    if (prevSegment === 'announcement' || prevSegment === 'announcements') {
      return `Announcement #${segment}`;
    }
    if (prevSegment === 'grade' || prevSegment === 'grades') {
      return `Grade #${segment}`;
    }
    if (prevSegment === 'subject' || prevSegment === 'subjects') {
      return `Subject #${segment}`;
    }
    
    // Generic dynamic segment
    return `#${segment}`;
  }
  
  // Fallback: convert kebab-case or snake_case to Title Case
  return segment
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generates breadcrumb items from a URL pathname.
 * 
 * @param {string} pathname - The URL pathname (e.g., '/academics-hub/grades/123')
 * @param {string} role - The user's role (admin, staff, student, parent)
 * @returns {Array<{label: string, path: string, current?: boolean}>} Array of breadcrumb items
 * 
 * @example
 * generateBreadcrumbs('/academics-hub/grades/123', 'student')
 * // Returns:
 * // [
 * //   { label: 'Home', path: '/dashboard' },
 * //   { label: 'Academics Hub', path: '/academics-hub' },
 * //   { label: 'Grades', path: '/academics-hub/grades' },
 * //   { label: 'Grade #123', path: '/academics-hub/grades/123', current: true }
 * // ]
 */
export function generateBreadcrumbs(pathname, role = 'student') {
  // Handle root path
  if (!pathname || pathname === '/') {
    return [{ label: 'Home', path: '/', current: true }];
  }
  
  // Remove leading/trailing slashes and split into segments
  const pathSegments = pathname
    .replace(/^\/|\/$/g, '')
    .split('/')
    .filter(Boolean);
  
  // Handle empty segments (shouldn't happen, but be defensive)
  if (pathSegments.length === 0) {
    return [{ label: 'Home', path: '/', current: true }];
  }
  
  // Determine home path based on role
  const homePath = role === 'parent' ? '/parent-dashboard' : '/dashboard';
  const homeLabel = 'Home';
  
  // Start with home breadcrumb
  const breadcrumbs = [{ label: homeLabel, path: homePath }];
  
  // Build breadcrumbs from path segments
  pathSegments.forEach((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = segmentToLabel(segment, index, pathSegments);
    const isLast = index === pathSegments.length - 1;
    
    breadcrumbs.push({
      label,
      path,
      current: isLast
    });
  });
  
  return breadcrumbs;
}

/**
 * Generates breadcrumbs with query parameters preserved in URLs.
 * Useful for breadcrumbs on hub pages with tab navigation.
 * 
 * @param {string} pathname - The URL pathname
 * @param {string} search - The URL search/query string (including '?')
 * @param {string} role - The user's role
 * @returns {Array<{label: string, path: string, current?: boolean}>} Array of breadcrumb items
 * 
 * @example
 * generateBreadcrumbsWithQuery('/grading-suite', '?tab=grade-input', 'staff')
 * // Returns breadcrumbs with the last item having path '/grading-suite?tab=grade-input'
 */
export function generateBreadcrumbsWithQuery(pathname, search = '', role = 'student') {
  const breadcrumbs = generateBreadcrumbs(pathname, role);
  
  // Add query string to the last breadcrumb (current page)
  if (search && breadcrumbs.length > 0) {
    const lastIndex = breadcrumbs.length - 1;
    breadcrumbs[lastIndex] = {
      ...breadcrumbs[lastIndex],
      path: breadcrumbs[lastIndex].path + search
    };
  }
  
  return breadcrumbs;
}

/**
 * Collapses breadcrumbs when they exceed a maximum count.
 * Keeps the first item (home), last item (current), and uses ellipsis for middle items.
 * 
 * @param {Array<{label: string, path: string, current?: boolean}>} breadcrumbs - Breadcrumb items
 * @param {number} maxItems - Maximum number of breadcrumb items to display (default: 4)
 * @returns {Array<{label: string, path: string, current?: boolean, collapsed?: boolean}>} Collapsed breadcrumbs
 * 
 * @example
 * collapseBreadcrumbs([home, hub, section, subsection, page], 3)
 * // Returns: [home, { label: '...', collapsed: true }, page]
 */
export function collapseBreadcrumbs(breadcrumbs, maxItems = 4) {
  // If within limit, return as-is
  if (breadcrumbs.length <= maxItems) {
    return breadcrumbs;
  }
  
  // Need to collapse
  const result = [];
  
  // Always keep first item (home)
  result.push(breadcrumbs[0]);
  
  // Add ellipsis for collapsed middle items
  result.push({
    label: '...',
    path: '#',
    collapsed: true
  });
  
  // Keep last (maxItems - 2) items, ensuring we include current page
  const keepFromEnd = maxItems - 2; // Subtract 2 for home and ellipsis
  const startIndex = breadcrumbs.length - keepFromEnd;
  
  for (let i = startIndex; i < breadcrumbs.length; i++) {
    result.push(breadcrumbs[i]);
  }
  
  return result;
}

/**
 * Adds a custom label mapping for dynamic segments.
 * Useful for adding context-specific labels at runtime.
 * 
 * @param {string} segment - The path segment
 * @param {string} label - The human-readable label
 * 
 * @example
 * addCustomLabel('subject-123', 'Mathematics')
 */
export function addCustomLabel(segment, label) {
  PATH_LABEL_MAP[segment] = label;
}

export default generateBreadcrumbs;
