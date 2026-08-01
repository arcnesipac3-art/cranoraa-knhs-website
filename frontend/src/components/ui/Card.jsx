import React from 'react';
import { cn } from '../../styles/designSystem';

/**
 * Professional Card Component
 * For consistent container styling across the portal
 * 
 * Standardized: rounded-xl for cards, border-slate-200, shadow-sm
 */

export const Card = ({ children, className = '', interactive = false, highlighted = false, ...props }) => {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden',
        interactive && 'hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer',
        highlighted && 'bg-violet-50 border-violet-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', divider = true, ...props }) => {
  return (
    <div
      className={cn(
        'px-4 md:px-6 py-4',
        divider && 'border-b border-slate-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardBody = ({ children, className = '', ...props }) => {
  return (
    <div
      className={cn('px-4 md:px-6 py-4', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardFooter = ({ children, className = '', divider = true, ...props }) => {
  return (
    <div
      className={cn(
        'px-4 md:px-6 py-4',
        divider && 'border-t border-slate-200 bg-slate-50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className = '', subtitle = null, ...props }) => {
  return (
    <div className={cn('', className)} {...props}>
      <h3 className="text-lg font-bold text-slate-900">{children}</h3>
      {subtitle && (
        <p className="text-xs text-slate-500 mt-0.5 font-medium">{subtitle}</p>
      )}
    </div>
  );
};

// Export as default for convenience
export default Card;
