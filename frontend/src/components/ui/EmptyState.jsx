import React from 'react';
import { cn } from '../../styles/designSystem';
import Button from './Button';

/**
 * Professional Empty State Component
 * For when there's no data to display
 */

const EmptyState = ({
  icon,
  title,
  description = null,
  action = null,
  actionLabel = null,
  onAction = null,
  className = '',
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-6 text-center',
        className
      )}
      {...props}
    >
      {icon && (
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
          {icon}
        </div>
      )}
      
      <h3 className="text-sm font-semibold text-slate-900 mb-1">
        {title}
      </h3>
      
      {description && (
        <p className="text-xs text-slate-500 max-w-sm">
          {description}
        </p>
      )}
      
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
      
      {!action && actionLabel && onAction && (
        <Button
          variant="primary"
          size="sm"
          onClick={onAction}
          className="mt-4"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export { EmptyState };
export default EmptyState;
