import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, Users, Calendar, FileText, MessageSquare, 
  BarChart2, Settings, UserCheck, GraduationCap, ClipboardList,
  Award, TrendingUp, Mail, Bell, Clock, Grid, Clipboard, Download
} from 'lucide-react';

// Icon mapping
const iconMap = {
  BookOpen, Users, Calendar, FileText, MessageSquare,
  BarChart2, Settings, UserCheck, GraduationCap, ClipboardList,
  Award, TrendingUp, Mail, Bell, Clock, Grid, Clipboard, Download
};

// Role-based quick access link configurations
export const QUICK_ACCESS_CONFIGS = {
  student: [
    { label: 'My Classes', path: '/my-classes', icon: 'BookOpen', color: 'blue' },
    { label: 'Announcements', path: '/announcements', icon: 'Bell', color: 'amber' },
    { label: 'Schedule', path: '/my-schedule', icon: 'Calendar', color: 'green' },
    { label: 'Communication', path: '/communication-center', icon: 'MessageSquare', color: 'rose' },
    { label: 'Grades', path: '/my-classes?view=grades', icon: 'Award', color: 'violet' },
    { label: 'Download App', href: 'https://expo.dev/artifacts/eas/jzXDfGsYZ0jiW1FC0omG1leer4JL6rpa4hDqflIuGx4.apk', icon: 'Download', color: 'indigo', external: true }
  ],
  teacher: [
    { label: 'My Classes',    path: '/my-classes',          icon: 'BookOpen',      color: 'violet' },
    { label: 'Schedule',      path: '/my-schedule',          icon: 'Clock',         color: 'green' },
    { label: 'Announcements', path: '/announcements',        icon: 'Bell',          color: 'amber' },
    { label: 'People',        path: '/people',               icon: 'Users',         color: 'indigo' },
    { label: 'Communication', path: '/communication-center', icon: 'MessageSquare', color: 'rose' },
    { label: 'Download App',  href: 'https://expo.dev/artifacts/eas/jzXDfGsYZ0jiW1FC0omG1leer4JL6rpa4hDqflIuGx4.apk', icon: 'Download', color: 'blue', external: true }
  ],
  parent: [
    { label: 'Dashboard',     path: '/parent-dashboard',     icon: 'Award',         color: 'violet' },
    { label: 'Announcements', path: '/announcements',        icon: 'Bell',          color: 'amber' },
    { label: 'Messages',      path: '/communication-center', icon: 'MessageSquare', color: 'blue' },
    { label: 'Calendar',      path: '/portal-calendar',      icon: 'Calendar',      color: 'rose' },
    { label: 'Download App',  href: 'https://expo.dev/artifacts/eas/jzXDfGsYZ0jiW1FC0omG1leer4JL6rpa4hDqflIuGx4.apk', icon: 'Download', color: 'green', external: true }
  ],
  admin: [
    { label: 'Analytics',        path: '/analytics',                    icon: 'TrendingUp',   color: 'violet' },
    { label: 'People',           path: '/people',                       icon: 'Users',        color: 'blue' },
    { label: 'Enrollment',       path: '/enrollment?tab=applications',  icon: 'GraduationCap',color: 'green' },
    { label: 'Classes',          path: '/classes',                      icon: 'Grid',         color: 'amber' },
    { label: 'System Settings',  path: '/settings',                     icon: 'Settings',     color: 'indigo' },
    { label: 'Download App',     href: 'https://expo.dev/artifacts/eas/jzXDfGsYZ0jiW1FC0omG1leer4JL6rpa4hDqflIuGx4.apk', icon: 'Download', color: 'rose', external: true }
  ]
};

/**
 * QuickAccessLinks Component
 * 
 * Displays role-based quick access links on dashboards.
 * Requirement 1.4: Dashboard quick-access to 6 most frequently used features
 * 
 * @param {Object} props
 * @param {string} props.role - User role (student, teacher, parent, admin)
 * @param {string} props.variant - Display variant ('grid' or 'compact')
 * @param {string} props.className - Additional CSS classes
 */
const QuickAccessLinks = ({ role, variant = 'grid', className = '' }) => {
  const links = QUICK_ACCESS_CONFIGS[role] || [];

  if (links.length === 0) {
    return null;
  }

  const gridClass = variant === 'compact' 
    ? 'grid grid-cols-3 sm:grid-cols-3 gap-2'
    : 'grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2';

  return (
    <div className={`quick-access-links ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
          Quick Access
        </h2>
      </div>

      <div className={gridClass}>
        {links.map((link, index) => {
          const Icon = iconMap[link.icon];
          const colorClasses = {
            violet: {
              card: 'bg-gradient-to-br from-violet-500 to-violet-700 text-white hover:from-violet-600 hover:to-violet-800 shadow-violet-200',
              icon: 'text-white/90',
              label: 'text-white font-semibold',
            },
            blue: {
              card: 'bg-gradient-to-br from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 shadow-blue-200',
              icon: 'text-white/90',
              label: 'text-white font-semibold',
            },
            green: {
              card: 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white hover:from-emerald-600 hover:to-emerald-800 shadow-emerald-200',
              icon: 'text-white/90',
              label: 'text-white font-semibold',
            },
            amber: {
              card: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-amber-200',
              icon: 'text-white/90',
              label: 'text-white font-semibold',
            },
            indigo: {
              card: 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white hover:from-indigo-600 hover:to-indigo-800 shadow-indigo-200',
              icon: 'text-white/90',
              label: 'text-white font-semibold',
            },
            rose: {
              card: 'bg-gradient-to-br from-rose-500 to-rose-700 text-white hover:from-rose-600 hover:to-rose-800 shadow-rose-200',
              icon: 'text-white/90',
              label: 'text-white font-semibold',
            },
          };
          const theme = colorClasses[link.color] || colorClasses.violet;

          const linkProps = link.external
            ? { href: link.href, target: '_blank', rel: 'noopener noreferrer' }
            : { to: link.path };
          const Component = link.external ? 'a' : Link;

          return (
            <Component
              key={index}
              {...linkProps}
              className={`
                flex items-center gap-1.5 p-2 rounded-lg transition-all duration-200 shadow-sm
                ${theme.card}
                focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1
                hover:shadow-md hover:-translate-y-0.5
              `}
              aria-label={`Navigate to ${link.label}`}
            >
              {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${theme.icon}`} aria-hidden="true" />}
              <span className={`text-[11px] leading-tight ${theme.label} truncate`}>
                {link.label}
              </span>
            </Component>
          );
        })}
      </div>
    </div>
  );
};

export default QuickAccessLinks;
