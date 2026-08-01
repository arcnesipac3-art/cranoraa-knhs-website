import React from 'react';
import { cn } from '../../styles/designSystem';

/**
 * Professional Badge/Pill Component
 * For status indicators, categories, labels
 * 
 * Variants: purple, blue, green, yellow/amber, red, slate, indigo, rose, emerald
 * Semantic aliases: success, warning, danger, info, muted
 */

const Badge = ({
  children,
  variant = 'slate',
  size = 'md',
  className = '',
  dot = false,
  icon = null,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center gap-1 rounded-full font-medium border';
  
  const variantMap = {
    purple:  'bg-violet-100 text-violet-700 border-violet-200',
    violet:  'bg-violet-100 text-violet-700 border-violet-200',
    blue:    'bg-blue-100 text-blue-700 border-blue-200',
    green:   'bg-emerald-100 text-emerald-700 border-emerald-200',
    yellow:  'bg-amber-100 text-amber-700 border-amber-200',
    amber:   'bg-amber-100 text-amber-700 border-amber-200',
    red:     'bg-red-100 text-red-700 border-red-200',
    slate:   'bg-slate-100 text-slate-600 border-slate-200',
    indigo:  'bg-indigo-100 text-indigo-700 border-indigo-200',
    rose:    'bg-rose-100 text-rose-700 border-rose-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    // Semantic aliases
    success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    danger:  'bg-red-100 text-red-700 border-red-200',
    info:    'bg-blue-100 text-blue-700 border-blue-200',
    muted:   'bg-slate-100 text-slate-500 border-slate-200',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const dotColors = {
    purple:  'bg-violet-600',
    violet:  'bg-violet-600',
    blue:    'bg-blue-600',
    green:   'bg-emerald-600',
    yellow:  'bg-amber-500',
    amber:   'bg-amber-600',
    red:     'bg-red-600',
    slate:   'bg-slate-500',
    indigo:  'bg-indigo-600',
    rose:    'bg-rose-600',
    emerald: 'bg-emerald-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-500',
    danger:  'bg-red-600',
    info:    'bg-blue-600',
    muted:   'bg-slate-400',
  };

  return (
    <span
      className={cn(
        baseStyles,
        variantMap[variant] || variantMap.slate,
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant] || dotColors.slate)} aria-hidden="true" />
      )}
      {icon && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export { Badge };
export default Badge;
