import { cn } from '../../styles/designSystem';

/**
 * Inline field error message with icon.
 * Animates in with a slide-down effect.
 *
 * Props:
 *   error   - error message string (empty = hidden)
 *   className
 */
const FieldError = ({ error, className }) => {
  if (!error) return null;
  return (
    <p className={cn(
      'flex items-start gap-1 mt-1 text-[10px] font-semibold text-red-600 animate-in',
      className
    )}>
      <svg className="w-3 h-3 flex-shrink-0 mt-px" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span>{error}</span>
    </p>
  );
};

export { FieldError };
export default FieldError;
