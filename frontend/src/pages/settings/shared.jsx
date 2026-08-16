import { LoadingSpinner as Spinner } from '../../components/ui';

// Simple SVG icon map
export const ICONS = {
  building: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  clipboard: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  user: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  users: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  lock: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  globe: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  message: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  cog: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  wrench: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    </svg>
  ),
  palette: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  school: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 7l-9-5 9-5 9 5-9 5z" />
    </svg>
  ),
  shield: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  chart: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  database: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  mail: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export const Icon = ({ name, className = '' }) => (
  <span className={className} aria-hidden="true">{ICONS[name] || null}</span>
);

export const Toggle = ({ checked, onChange, disabled, color = 'blue' }) => {
  const colors = {
    blue:    'peer-checked:bg-violet-600',
    emerald: 'peer-checked:bg-emerald-600',
    amber:   'peer-checked:bg-amber-500',
    rose:    'peer-checked:bg-rose-600',
  };
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="sr-only peer" />
      <div className={`w-11 h-6 bg-slate-200 rounded-full peer transition-all
        after:content-[''] after:absolute after:top-[2px] after:left-[2px]
        after:bg-white after:border after:border-slate-200 after:rounded-full
        after:h-5 after:w-5 after:transition-all
        peer-checked:after:translate-x-full peer-checked:after:border-white
        peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
        ${colors[color]}`} />
    </label>
  );
};

export const Field = ({ label, hint, children }) => (
  <div className="space-y-1 sm:space-y-1.5">
    <label className="block text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
    {children}
    {hint && <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium">{hint}</p>}
  </div>
);

export const Input = ({ className = '', ...props }) => (
  <input
    className={`w-full px-3 py-2 sm:px-4 sm:py-2.5 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-900
      focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500
      disabled:opacity-50 disabled:cursor-not-allowed transition-all ${className}`}
    {...props}
  />
);

export const SectionCard = ({ title, subtitle, icon, children, danger, className = '' }) => (
  <div className={`bg-white border rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow ${danger ? 'border-rose-200' : 'border-slate-200'} ${className}`}>
    <div className={`px-3 py-3 sm:px-5 sm:py-4 border-b flex items-center gap-2 sm:gap-3 ${danger ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
      <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${danger ? 'bg-rose-100 text-rose-600' : 'bg-violet-100 text-violet-600'}`}>
        <Icon name={icon} />
      </div>
      <div>
        <h3 className={`text-xs sm:text-sm font-extrabold tracking-tight ${danger ? 'text-rose-900' : 'text-slate-900'}`}>{title}</h3>
        {subtitle && <p className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mt-0.5 ${danger ? 'text-rose-600' : 'text-slate-500'}`}>{subtitle}</p>}
      </div>
    </div>
    <div className="p-3 sm:p-5">{children}</div>
  </div>
);

export { Spinner };

export const Skeleton = ({ className = '' }) => (
  <div className={`skeleton-shimmer bg-slate-200 rounded ${className}`} />
);

export const EmailServiceNotice = ({ health }) => {
  if (!health) return null;
  const healthy = health.status === 'ok';
  return (
    <div className={`rounded-lg border px-3 py-3 sm:px-5 sm:py-4 shadow-sm ${
      healthy ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
    }`} role="alert" aria-label={`Email service is ${healthy ? 'healthy' : 'degraded'}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg ${
          healthy ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        }`} aria-hidden="true">
          {healthy ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className={`text-xs font-extrabold uppercase tracking-wider ${healthy ? 'text-emerald-700' : 'text-amber-700'}`}>
              Email Service Health
            </p>
            <p className={`mt-1 text-sm font-bold ${healthy ? 'text-emerald-900' : 'text-amber-900'}`}>
              {health.summary}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <span className={`rounded-md px-2.5 py-1 ${health.checks?.api_credentials ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {health.checks?.api_credentials ? 'API keys present' : 'API keys missing'}
            </span>
            <span className={`rounded-md px-2.5 py-1 ${health.checks?.sender_email ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {health.checks?.sender_email ? 'Sender email set' : 'Sender email missing'}
            </span>
          </div>
          <p className={`text-xs font-medium ${healthy ? 'text-emerald-800' : 'text-amber-800'}`}>
            Sender: <span className="font-bold">{health.sender_email || 'Not configured'}</span>
          </p>
          {health.issues?.length > 0 && (
            <div className="space-y-1">
              {health.issues.map((issue, i) => (
                <p key={i} className="text-xs font-medium text-amber-900">{issue}</p>
              ))}
            </div>
          )}
          <p className={`text-[11px] font-medium ${healthy ? 'text-emerald-700' : 'text-amber-700'}`}>
            Mailjet can still reject delivery if the sender address or domain has not been verified in the Mailjet dashboard.
          </p>
        </div>
      </div>
    </div>
  );
};
