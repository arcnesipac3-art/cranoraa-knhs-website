import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateStoredUser, updateTokens } from '../utils/auth';
import api from '../utils/api';
import toast from 'react-hot-toast';

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '', bars: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/\d/.test(pw)) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'rose', bars: 1, tip: 'Try adding numbers or mixing uppercase and lowercase' };
  if (score <= 2) return { score, label: 'Fair', color: 'amber', bars: 2, tip: 'Add uppercase, lowercase, or special characters' };
  if (score <= 3) return { score, label: 'Good', color: 'blue', bars: 3, tip: 'Almost there — mix in special characters for extra security' };
  return { score, label: 'Strong', color: 'emerald', bars: 4, tip: 'Excellent password strength' };
}

const STRENGTH_STYLES = {
  rose: { bg: 'bg-rose-500', track: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200' },
  amber: { bg: 'bg-amber-500', track: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
  blue: { bg: 'bg-blue-500', track: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
  emerald: { bg: 'bg-emerald-500', track: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
};

function EyeIcon({ show }) {
  return show ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

const PRIVACY_POLICY = `PRIVACY POLICY
KNHS PRISM Portal — Kiwalan National High School

Last Updated: August 2026

1. INFORMATION WE COLLECT
We collect personal information necessary to operate the KNHS PRISM Portal, including:
- Full name, student/staff ID, and contact information
- Academic records, grades, attendance, and enrollment data
- User-generated content such as messages and assignments

2. HOW WE USE YOUR INFORMATION
Your information is used solely for:
- Managing academic records and school operations
- Communicating important school-related information
- Generating reports for administrative and educational purposes
- Ensuring system security and preventing unauthorized access

3. DATA SHARING
We do not sell or share your personal information with third parties except:
- As required by DepEd regulations and Philippine law
- With authorized school personnel who need access for their duties
- When you explicitly consent to sharing

4. DATA SECURITY
We implement industry-standard security measures to protect your data, including encrypted storage, secure authentication, and regular security audits.

5. YOUR RIGHTS
You have the right to:
- Access your personal data stored in the system
- Request correction of inaccurate information
- Request deletion of your account and associated data
- Withdraw consent for data processing where applicable

6. DATA RETENTION
Your data is retained for the duration required by DepEd regulations. Account data may be archived after graduation or separation from the institution.

7. CONTACT
For privacy-related concerns, contact the school administration at the Kiwalan National High School.`;

const TERMS_CONDITIONS = `TERMS AND CONDITIONS
KNHS PRISM Portal — Kiwalan National High School

Last Updated: August 2026

1. ACCEPTANCE OF TERMS
By accessing and using the KNHS PRISM Portal, you agree to be bound by these Terms and Conditions. If you do not agree, you may not use the system.

2. USER ACCOUNTS
- Each user is assigned a single account. Sharing accounts is strictly prohibited.
- You are responsible for maintaining the confidentiality of your password.
- You must report any unauthorized use of your account immediately.

3. ACCEPTABLE USE
You agree to:
- Use the portal only for its intended educational and administrative purposes
- Respect the privacy and rights of other users
- Not upload malicious content or attempt to compromise system security
- Not use the system for any illegal activity

4. ACADEMIC INTEGRITY
- Grades and records entered into the system are official and subject to verification
- Unauthorized modification of academic data is strictly prohibited and may result in disciplinary action

5. INTELLECTUAL PROPERTY
All content, software, and designs within the KNHS PRISM Portal are the property of Kiwalan National High School. Unauthorized reproduction or distribution is prohibited.

6. LIMITATION OF LIABILITY
The school is not liable for:
- System downtime or technical issues beyond reasonable control
- Data loss resulting from user negligence
- Actions taken based on information displayed in the portal

7. MODIFICATIONS
The school reserves the right to modify these terms at any time. Users will be notified of significant changes through the portal.

8. GOVERNING LAW
These terms are governed by the laws of the Republic of the Philippines.`;

const ForcePasswordChange = () => {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('consent');
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [privacyScrolled, setPrivacyScrolled] = useState(false);
  const [termsScrolled, setTermsScrolled] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ password: false, confirm: false });

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const requirements = useMemo(() => [
    { met: password.length >= 8, label: 'At least 8 characters', hint: `${Math.max(0, 8 - password.length)} more needed` },
    { met: /\d/.test(password), label: 'At least 1 number' },
  ], [password]);

  const allReqsMet = requirements.every(r => r.met);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const hasError = touched.confirm && confirmPassword && !passwordsMatch;
  const canSubmit = allReqsMet && passwordsMatch && privacyAgreed && termsAgreed && !loading;

  const handleScroll = (e, type) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop - clientHeight < 30) {
      if (type === 'privacy') setPrivacyScrolled(true);
      else setTermsScrolled(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ password: true, confirm: true });

    if (!allReqsMet) {
      toast.error('Please meet all password requirements');
      return;
    }
    if (!passwordsMatch) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/force-password-change/', { password, consent: true });

      if (response.data.access) {
        updateTokens(response.data.access);
      }

      const updatedUser = updateStoredUser({ ...user, must_change_password: false });
      signIn(updatedUser);

      toast.success('Password updated successfully!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'consent') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-violet-50 via-white to-slate-50">
        <div className="w-full max-w-lg">

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 mb-4">
              <img src="/icons/school-logo-source.png" alt="KNHS" className="w-10 h-10 object-contain" loading="lazy" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome to KNHS PRISM Portal</h1>
            <p className="text-sm text-slate-500 mt-1.5">Before you continue, please review and accept our policies.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-6 sm:p-8 space-y-5">

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowPrivacy(!showPrivacy)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-200 transition-colors">
                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">Privacy Policy</p>
                  <p className="text-xs text-slate-500 truncate">How we collect, use, and protect your data</p>
                </div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${showPrivacy ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPrivacy && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div
                    onScroll={(e) => handleScroll(e, 'privacy')}
                    className="h-48 overflow-y-auto p-4 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap"
                  >
                    {PRIVACY_POLICY}
                  </div>
                  {!privacyScrolled && (
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-400 text-center">
                      Scroll down to read the full policy
                    </div>
                  )}
                </div>
              )}

              <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${privacyAgreed ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50'}`}>
                <div className="relative flex items-center mt-0.5">
                  <input
                    type="checkbox"
                    checked={privacyAgreed}
                    onChange={(e) => setPrivacyAgreed(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-slate-300 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-colors flex items-center justify-center">
                    {privacyAgreed && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-slate-700">
                  I have read and agree to the <span className="font-bold text-violet-700">Privacy Policy</span>
                </span>
              </label>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowTerms(!showTerms)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">Terms and Conditions</p>
                  <p className="text-xs text-slate-500 truncate">Rules and guidelines for using the portal</p>
                </div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${showTerms ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showTerms && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div
                    onScroll={(e) => handleScroll(e, 'terms')}
                    className="h-48 overflow-y-auto p-4 text-xs text-slate-600 leading-relaxed whitespace-pre-wrap"
                  >
                    {TERMS_CONDITIONS}
                  </div>
                  {!termsScrolled && (
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-400 text-center">
                      Scroll down to read the full terms
                    </div>
                  )}
                </div>
              )}

              <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${termsAgreed ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50'}`}>
                <div className="relative flex items-center mt-0.5">
                  <input
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-5 h-5 rounded-md border-2 border-slate-300 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-colors flex items-center justify-center">
                    {termsAgreed && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-slate-700">
                  I have read and agree to the <span className="font-bold text-amber-700">Terms and Conditions</span>
                </span>
              </label>
            </div>

            <button
              type="button"
              disabled={!privacyAgreed || !termsAgreed}
              onClick={() => setStep('password')}
              className={`w-full py-3 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${
                privacyAgreed && termsAgreed
                  ? 'bg-[#5e2a84] text-white hover:bg-violet-700 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-6">Kiwalan National High School</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-violet-50 via-white to-slate-50">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 mb-4">
            <img src="/icons/school-logo-source.png" alt="KNHS" className="w-10 h-10 object-contain" loading="lazy" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Set New Password</h1>
          <p className="text-sm text-slate-500 mt-1.5">Your temporary password has expired. Create a new one.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-6 sm:p-8">

          {password && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password Strength</span>
                <span className={`text-xs font-black ${STRENGTH_STYLES[strength.color].text}`}>{strength.label}</span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-100">
                    <div className={`h-full rounded-full transition-all duration-300 ${
                      i <= strength.bars ? STRENGTH_STYLES[strength.color].bg : 'bg-transparent'
                    }`} />
                  </div>
                ))}
              </div>
              <p className={`text-[11px] mt-1.5 ${STRENGTH_STYLES[strength.color].text} font-medium`}>{strength.tip}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setTouched(t => ({ ...t, password: true }))}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  className="w-full pl-4 pr-10 py-2.5 rounded-lg bg-white text-sm text-slate-900 border border-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-all text-base md:text-sm"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5">
                  <EyeIcon show={showPassword} />
                </button>
              </div>
            </div>

            <div className={`rounded-lg border p-3 transition-colors ${
              allReqsMet ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Requirements</p>
              <div className="space-y-1.5">
                {requirements.map((req, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      req.met
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white border-2 border-slate-300'
                    }`}>
                      {req.met && (
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-xs font-semibold transition-colors ${req.met ? 'text-emerald-700' : 'text-slate-600'}`}>
                      {req.label}
                    </span>
                    {!req.met && req.hint && (
                      <span className="text-[10px] text-slate-400 ml-auto">({req.hint})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onFocus={() => setTouched(t => ({ ...t, confirm: true }))}
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  className={`w-full pl-4 pr-10 py-2.5 rounded-lg bg-white text-sm text-slate-900 border placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all text-base md:text-sm ${
                    hasError
                      ? 'border-red-300 focus:ring-red-100 focus:border-red-500'
                      : passwordsMatch
                      ? 'border-emerald-300 focus:ring-emerald-100 focus:border-emerald-500'
                      : 'border-slate-300 focus:ring-violet-100 focus:border-violet-500'
                  }`}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5">
                  <EyeIcon show={showConfirm} />
                </button>
              </div>
              {hasError && (
                <p className="text-[11px] text-red-600 font-semibold mt-1">Passwords do not match</p>
              )}
              {passwordsMatch && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-[11px] text-emerald-600 font-semibold">Passwords match</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('consent')}
                className="px-4 py-3 rounded-lg text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                Back
              </button>
              <button type="submit" disabled={!canSubmit}
                className={`flex-1 py-3 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${
                  canSubmit
                    ? 'bg-[#5e2a84] text-white hover:bg-violet-700 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating...
                  </span>
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">Kiwalan National High School</p>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
