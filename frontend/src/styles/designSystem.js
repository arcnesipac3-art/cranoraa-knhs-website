/**
 * KNHS School Portal Design System
 * Official Digital Campus - DepEd Government Education Style
 * 
 * This design system reflects the professional academic identity of
 * Kiwalan National High School, inspired by DepEd and Philippine
 * public school systems.
 */

// ═══════════════════════════════════════════════════════════════════════════
// COLOR SYSTEM — Government Education Palette
// ═══════════════════════════════════════════════════════════════════════════

export const COLORS = {
  // School Purple (accent only, not large surfaces)
  purple: {
    50:  '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',   // School color - use sparingly
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },

  // Academic Blue (primary for education/trust)
  blue: {
    50:  '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',   // Academic primary
    700: '#1d4ed8',
    800: '#1e40af',   // Deep academic
    900: '#1e3a8a',
  },

  // DepEd Blue (government education)
  deped: {
    50:  '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',   // DepEd official
    800: '#075985',
    900: '#0c4a6e',
  },

  // School Gold (achievements, highlights)
  gold: {
    50:  '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',   // School gold
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  // Neutral — Clean white-focused surfaces
  neutral: {
    0:   '#ffffff',   // Pure white (primary surface)
    50:  '#f8fafc',   // Light gray (subtle backgrounds)
    100: '#f1f5f9',
    200: '#e2e8f0',   // Borders, dividers
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',   // Dark text
    800: '#1e293b',
    900: '#0f172a',
  },

  // Semantic colors (academic context)
  success:  '#059669',  // Attendance, completion
  warning:  '#d97706',  // Alerts, pending
  error:    '#dc2626',  // Urgent, required
  info:     '#0369a1',  // DepEd blue for info
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPOGRAPHY — Official Academic Hierarchy
// ═══════════════════════════════════════════════════════════════════════════

export const TYPOGRAPHY = {
  // Headings (formal, official documentation style)
  h1: 'text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight',
  h2: 'text-xl md:text-2xl font-bold text-slate-900 tracking-tight',
  h3: 'text-lg md:text-xl font-bold text-slate-900',
  h4: 'text-base md:text-lg font-bold text-slate-900',
  h5: 'text-sm md:text-base font-bold text-slate-900',
  h6: 'text-xs md:text-sm font-bold text-slate-900',

  // Body text (clear, accessible)
  body: {
    lg: 'text-base font-normal text-slate-700 leading-relaxed',
    md: 'text-sm font-normal text-slate-700 leading-relaxed',
    sm: 'text-xs font-normal text-slate-600 leading-relaxed',
    xs: 'text-[11px] font-normal text-slate-600',
  },

  // Labels (official form style)
  label: {
    lg: 'text-sm font-semibold text-slate-700 uppercase tracking-wide',
    md: 'text-xs font-semibold text-slate-700 uppercase tracking-wide',
    sm: 'text-[11px] font-semibold text-slate-600 uppercase tracking-wide',
  },

  // Section headers (government document style)
  section: 'text-xs font-extrabold text-slate-700 uppercase tracking-wider',

  // Official badges
  badge: 'text-[10px] font-bold uppercase tracking-wider',
};

// ═══════════════════════════════════════════════════════════════════════════
// SPACING — Consistent rhythm
// ═══════════════════════════════════════════════════════════════════════════

export const SPACING = {
  page: 'p-4 md:p-6 lg:p-8',
  section: 'space-y-6 md:space-y-8',
  card: 'p-4 md:p-6',
  stack: {
    xs: 'space-y-2',
    sm: 'space-y-3',
    md: 'space-y-4',
    lg: 'space-y-6',
    xl: 'space-y-8',
  },
  inline: {
    xs: 'space-x-1',
    sm: 'space-x-2',
    md: 'space-x-3',
    lg: 'space-x-4',
    xl: 'space-x-6',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SHADOWS — Subtle depth
// ═══════════════════════════════════════════════════════════════════════════

export const SHADOWS = {
  sm:  'shadow-sm',
  md:  'shadow-md shadow-slate-100',
  lg:  'shadow-lg shadow-slate-200',
  xl:  'shadow-xl shadow-slate-200',
  card: 'shadow-sm hover:shadow-md transition-shadow',
  violet: 'shadow-lg shadow-violet-100',
};

// ═══════════════════════════════════════════════════════════════════════════
// BORDERS — Clean lines
// ═══════════════════════════════════════════════════════════════════════════

export const BORDERS = {
  default: 'border border-slate-200',
  hover:   'border border-slate-200 hover:border-violet-300',
  focus:   'border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-100',
  error:   'border border-red-300',
  success: 'border border-emerald-300',
};

// ═══════════════════════════════════════════════════════════════════════════
// BUTTONS — Official Form Button Style
// ═══════════════════════════════════════════════════════════════════════════

export const BUTTONS = {
  // Primary — School color accent (used sparingly)
  primary: `
    inline-flex items-center justify-center gap-2
    px-4 py-2.5 md:px-5 md:py-3
    rounded-lg
    bg-violet-600 text-white
    text-sm font-bold
    border border-violet-700
    hover:bg-violet-700
    active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-150
    shadow-sm
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2
  `,

  // Secondary — White professional
  secondary: `
    inline-flex items-center justify-center gap-2
    px-4 py-2.5 md:px-5 md:py-3
    rounded-lg
    bg-white text-slate-700
    text-sm font-bold
    border border-slate-300
    hover:bg-slate-50 hover:border-slate-400
    active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-150
    shadow-sm
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2
  `,

  // Ghost — Subtle interaction
  ghost: `
    inline-flex items-center justify-center gap-2
    px-4 py-2.5
    rounded-lg
    text-slate-600
    text-sm font-semibold
    hover:bg-slate-100 hover:text-slate-800
    active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-150
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2
  `,

  // Danger — Destructive actions
  danger: `
    inline-flex items-center justify-center gap-2
    px-4 py-2.5 md:px-5 md:py-3
    rounded-lg
    bg-red-600 text-white
    text-sm font-bold
    border border-red-700
    hover:bg-red-700
    active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-150
    shadow-sm
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2
  `,

  // Icon button
  icon: `
    inline-flex items-center justify-center
    w-9 h-9
    rounded-lg
    text-slate-600
    hover:bg-slate-100 hover:text-slate-800
    active:scale-95
    transition-all duration-150
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2
  `,

  // Small variants
  small: {
    primary: `
      inline-flex items-center justify-center gap-1.5
      px-3 py-1.5
      rounded-lg
      bg-violet-600 text-white
      text-xs font-bold
      hover:bg-violet-700
      active:scale-[0.98]
      transition-all duration-150
    `,
    secondary: `
      inline-flex items-center justify-center gap-1.5
      px-3 py-1.5
      rounded-lg
      bg-white text-slate-700
      text-xs font-bold
      border border-slate-300
      hover:bg-slate-50
      active:scale-[0.98]
      transition-all duration-150
    `,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// CARDS — Academic Information Panels
// ═══════════════════════════════════════════════════════════════════════════

export const CARDS = {
  // Standard academic panel (white, subtle border)
  default: `
    bg-white
    rounded-xl
    border border-slate-200
    shadow-sm
    overflow-hidden
  `,

  // Interactive panel
  interactive: `
    bg-white
    rounded-xl
    border border-slate-200
    shadow-sm
    hover:shadow-md hover:border-slate-300
    transition-all duration-200
    cursor-pointer
    overflow-hidden
  `,

  // Highlighted (for official notices, announcements)
  highlighted: `
    bg-violet-50
    rounded-xl
    border border-violet-200
    shadow-sm
    overflow-hidden
  `,

  // Stat panel (academic metrics)
  stat: `
    bg-white
    rounded-xl
    border border-slate-200
    shadow-sm
    p-4 md:p-5
    hover:shadow-md
    transition-all duration-200
  `,
};

// ═══════════════════════════════════════════════════════════════════════════
// INPUTS — Form controls
// ═══════════════════════════════════════════════════════════════════════════

export const INPUTS = {
  // Text input
  text: `
    w-full
    px-4 py-2.5
    rounded-lg
    bg-white
    text-sm text-slate-900
    border border-slate-300
    placeholder:text-slate-400
    focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500
    disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
    transition-all duration-150
  `,

  // Textarea
  textarea: `
    w-full
    px-4 py-2.5
    rounded-lg
    bg-white
    text-sm text-slate-900
    border border-slate-300
    placeholder:text-slate-400
    focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500
    disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
    resize-none
    transition-all duration-150
  `,

  // Select
  select: `
    w-full
    px-4 py-2.5
    rounded-lg
    bg-white
    text-sm text-slate-900 font-medium
    border border-slate-300
    focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500
    disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
    cursor-pointer
    transition-all duration-150
  `,

  // Checkbox
  checkbox: `
    w-4 h-4
    rounded
    border-slate-300
    text-violet-600
    focus:ring-2 focus:ring-violet-100 focus:ring-offset-0
    cursor-pointer
    transition-all duration-150
  `,

  // Search input
  search: `
    w-full
    pl-10 pr-4 py-2.5
    rounded-lg
    bg-slate-50
    text-sm text-slate-900
    border border-slate-200
    placeholder:text-slate-400
    focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 focus:bg-white
    transition-all duration-150
  `,

  // Label
  label: `
    block
    text-xs font-medium text-slate-700
    mb-1.5
  `,
};

// ═══════════════════════════════════════════════════════════════════════════
// BADGES & PILLS — Academic Indicators
// ═══════════════════════════════════════════════════════════════════════════

export const BADGES = {
  default: 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border',
  
  variants: {
    violet:  'bg-violet-50 text-violet-700 border-violet-200',      // School color
    blue:    'bg-blue-50 text-blue-700 border-blue-200',            // Academic
    deped:   'bg-sky-50 text-sky-700 border-sky-200',               // DepEd
    green:   'bg-emerald-50 text-emerald-700 border-emerald-200',  // Success
    gold:    'bg-amber-50 text-amber-700 border-amber-200',         // Achievement
    red:     'bg-red-50 text-red-700 border-red-200',               // Urgent
    slate:   'bg-slate-50 text-slate-700 border-slate-200',         // Neutral
  },

  sizes: {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SCHOOL IDENTITY — KNHS Branding Elements
// ═══════════════════════════════════════════════════════════════════════════

export const SCHOOL = {
  name: 'Kiwalan National High School',
  nameShort: 'KNHS',
  motto: 'Excellence in Education, Service to Community',
  
  // Current academic period
  academicYear: '2025-2026',
  semester: 'Second Semester',
  quarter: 'Fourth Quarter',
  
  // School colors
  colors: {
    primary: '#7c3aed',    // Purple
    secondary: '#7c3aed',  // Purple (unified)
    accent: '#d97706',     // Gold
  },
  
  // Official header component classes
  header: {
    container: 'bg-white border-b-4 border-violet-600 shadow-sm',
    seal: 'w-12 h-12 md:w-14 md:h-14',
    title: 'text-base md:text-lg font-extrabold text-slate-900 uppercase tracking-tight',
    subtitle: 'text-xs md:text-sm font-bold text-violet-700 uppercase tracking-wide',
    period: 'text-[10px] md:text-xs font-semibold text-slate-600 uppercase tracking-wide',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// TABLES
// ═══════════════════════════════════════════════════════════════════════════

export const TABLES = {
  container: 'overflow-x-auto rounded-lg border border-slate-200',
  table: 'min-w-full divide-y divide-slate-200',
  thead: 'bg-slate-50',
  th: 'px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider',
  tbody: 'bg-white divide-y divide-slate-100',
  td: 'px-4 py-3 text-sm text-slate-900',
  tr: 'hover:bg-slate-50 transition-colors',
};

// ═══════════════════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════════════════

export const MODALS = {
  overlay: `
    fixed inset-0 z-50
    bg-slate-900/60 backdrop-blur-sm
    flex items-center justify-center
    p-4
    animate-fade-in
  `,

  container: `
    bg-white
    rounded-xl
    shadow-2xl
    max-w-md w-full
    max-h-[90vh]
    overflow-hidden
    animate-slide-up
  `,

  header: `
    px-6 py-4
    border-b border-slate-200
    flex items-center justify-between
  `,

  body: `
    px-6 py-4
    overflow-y-auto
    max-h-[60vh]
  `,

  footer: `
    px-6 py-4
    border-t border-slate-200
    bg-slate-50
    flex items-center justify-end gap-3
  `,
};

// ═══════════════════════════════════════════════════════════════════════════
// EMPTY STATES
// ═══════════════════════════════════════════════════════════════════════════

export const EMPTY_STATE = {
  container: `
    flex flex-col items-center justify-center
    py-12 px-6
    text-center
  `,

  icon: `
    w-12 h-12
    rounded-full
    bg-slate-100
    flex items-center justify-center
    text-slate-400
    mb-4
  `,

  title: 'text-sm font-semibold text-slate-900 mb-1',
  description: 'text-xs text-slate-500',
};

// ═══════════════════════════════════════════════════════════════════════════
// LOADING STATES
// ═══════════════════════════════════════════════════════════════════════════

export const LOADING = {
  spinner: `
    w-5 h-5
    border-2 border-slate-200 border-t-violet-600
    rounded-full
    animate-spin
  `,

  skeleton: {
    line: 'h-4 bg-slate-100 rounded animate-pulse',
    card: 'h-32 bg-slate-100 rounded-lg animate-pulse',
    circle: 'w-10 h-10 bg-slate-100 rounded-full animate-pulse',
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const ANIMATIONS = {
  fadeIn: 'animate-fadeIn',
  slideUp: 'animate-slideUp',
  slideDown: 'animate-slideDown',
  scaleIn: 'animate-scaleIn',
  
  // Custom animation classes (add to tailwind.config.js)
  keyframes: {
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    slideUp: {
      '0%': { transform: 'translateY(20px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    slideDown: {
      '0%': { transform: 'translateY(-20px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    scaleIn: {
      '0%': { transform: 'scale(0.95)', opacity: '0' },
      '100%': { transform: 'scale(1)', opacity: '1' },
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Combines multiple class names, filtering out falsy values
 */
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Returns the appropriate badge variant based on status
 */
export const getStatusBadge = (status) => {
  const statusMap = {
    active: 'green',
    pending: 'yellow',
    inactive: 'slate',
    rejected: 'red',
    approved: 'green',
    draft: 'slate',
    published: 'green',
    archived: 'slate',
  };

  return BADGES.variants[statusMap[status?.toLowerCase()] || 'slate'];
};

/**
 * Returns the appropriate priority color
 */
export const getPriorityColor = (priority) => {
  const priorityMap = {
    critical: 'red',
    high: 'yellow',
    medium: 'blue',
    low: 'slate',
    info: 'purple',
  };

  return priorityMap[priority?.toLowerCase()] || 'slate';
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT ALL
// ═══════════════════════════════════════════════════════════════════════════

export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  SHADOWS,
  BORDERS,
  BUTTONS,
  CARDS,
  INPUTS,
  BADGES,
  SCHOOL,
  TABLES,
  MODALS,
  EMPTY_STATE,
  LOADING,
  ANIMATIONS,
  cn,
  getStatusBadge,
  getPriorityColor,
};
