/**
 * Form field components — consistent label + input + error pattern.
 *
 * FormField   — wrapper with label and error
 * FormInput   — text/email/password/number input
 * FormSelect  — select dropdown
 * FormTextarea — textarea
 *
 * Styled to match Input.jsx: rounded-lg, border-slate-300, consistent focus rings
 */

export const FormField = ({ label, required, error, hint, children, className = '' }) => (
  <div className={`space-y-1.5 ${className}`}>
    {label && (
      <label className="block text-xs font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    )}
    {children}
    {hint && !error && <p className="text-[11px] text-slate-500">{hint}</p>}
    {error && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
  </div>
);

const baseInputClass = `
  w-full px-4 py-2.5 rounded-lg bg-white text-sm text-slate-900
  border border-slate-300 placeholder:text-slate-400
  focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500
  disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
  transition-all duration-150
  text-base md:text-sm
`.trim();

export const FormInput = ({ error, className = '', ...props }) => (
  <input
    {...props}
    className={`${baseInputClass} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''} ${className}`}
  />
);

export const FormSelect = ({ error, children, className = '', ...props }) => (
  <select
    {...props}
    className={`${baseInputClass} cursor-pointer font-medium ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''} ${className}`}
  >
    {children}
  </select>
);

export const FormTextarea = ({ error, rows = 4, className = '', ...props }) => (
  <textarea
    {...props}
    rows={rows}
    className={`${baseInputClass} resize-none ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''} ${className}`}
  />
);
