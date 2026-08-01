import React from 'react';
import { cn } from '../../styles/designSystem';

/**
 * Professional Badge/Pill Component
 * For status indicators, categories, labels
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
  
  const variants = {
    purple:  'bg-violet-100 text-violet-700 border-violet-200',
    blue:    'bg-violet-100 text-violet-700 border-violet-200',
    green:   'bg-emerald-100 text-emerald-700 border-emerald-200',
    yellow:  'bg-amber-100 text-amber-700 border-amber-200',
    red:     'bg-red-100 text-red-700 border-red-200',
    slate:   'bg-slate-100 text-slate-700 border-slate-200',
    indigo:  'bg-indigo-100 text-indigo-700 border-indigo-200',
    rose:    'bg-rose-100 text-rose-700 border-rose-200',
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-100 text-amber-700 border-amber-200',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const dotColors = {
    purple:  'bg-violet-600',
    blue:    'bg-violet-600',
    green:   'bg-emerald-600',
    yellow:  'bg-amber-500',
    red:     'bg-red-600',
    slate:   'bg-slate-600',
    indigo:  'bg-indigo-600',
    rose:    'bg-rose-600',
    emerald: 'bg-emerald-600',
    amber:   'bg-amber-600',
  };

  return (
    <span
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
      )}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export { Badge };
export default Badge;
