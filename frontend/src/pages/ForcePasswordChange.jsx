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

const ForcePasswordChange = () => {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
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
  const canSubmit = allReqsMet && passwordsMatch && !loading;

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
      const response = await api.post('/force-password-change/', { password });

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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-violet-50 via-white to-slate-50">
      <div className="w-full max-w-md">

        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-200 mb-4">
            <img src="/icons/school-logo-source.png" alt="KNHS" className="w-10 h-10 object-contain" loading="lazy" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Set New Password</h1>
          <p className="text-sm text-slate-500 mt-1.5">Your temporary password has expired. Create a new one.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-6 sm:p-8">

          {/* Strength meter */}
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

            {/* New password */}
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

            {/* Requirements */}
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

            {/* Confirm password */}
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

            {/* Submit */}
            <button type="submit" disabled={!canSubmit}
              className={`w-full py-3 rounded-lg text-sm font-black uppercase tracking-widest transition-all ${
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
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">Kiwalan National High School</p>
      </div>
    </div>
  );
};

export default ForcePasswordChange;
