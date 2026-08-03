import React from 'react';
import { cn } from '../../styles/designSystem';

/**
 * Professional Loading Spinner
 * For loading states
 * 
 * Supports: sm, md, lg, xl sizes
 * Variants: inline, message, fullScreen, page (content area)
 */

const LoadingSpinner = ({
  size = 'md',
  className = '',
  fullScreen = false,
  message = null,
  ...props
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const spinner = (
    <div className={cn('relative', sizes[size])}>
      <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
      <div
        className="absolute inset-0 rounded-full border-2 border-violet-600 border-t-transparent animate-spin"
        {...props}
      />
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center" role="status" aria-label="Loading">
        <div className={cn('relative', sizes.xl)}>
          <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
          <div className="absolute inset-0 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
        </div>
        {message && (
          <p className="mt-4 text-sm font-medium text-slate-600">{message}</p>
        )}
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  if (message) {
    return (
      <div className={cn('flex flex-col items-center gap-3', className)} role="status" aria-label="Loading">
        {spinner}
        <p className="text-sm font-medium text-slate-600">{message}</p>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div className={className} role="status" aria-label="Loading">
      {spinner}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export { LoadingSpinner };
export default LoadingSpinner;
