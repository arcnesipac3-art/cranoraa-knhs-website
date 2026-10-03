import { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Button } from '../components/ui';

const PasswordReset = () => {
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (formData.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password/', formData);
      toast.success('Password changed successfully');
      setFormData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const PasswordInput = ({ label, field, show, onToggle }) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-600 tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={formData[field]}
          onChange={e => setFormData({ ...formData, [field]: e.target.value })}
          className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xl bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
          placeholder="••••••••"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors no-min"
          tabIndex={-1}
        >
          {show ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-4 sm:space-y-5 animate-fade-in page-bottom-safe px-0.5 sm:px-0">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Change Password</h1>
        <p className="text-sm text-slate-500 mt-0.5">Update your account password to keep it secure.</p>
      </div>

      {/* Form card */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <PasswordInput
            label="Current Password"
            field="current_password"
            show={showCurrent}
            onToggle={() => setShowCurrent(v => !v)}
          />
          <PasswordInput
            label="New Password"
            field="new_password"
            show={showNew}
            onToggle={() => setShowNew(v => !v)}
          />
          <PasswordInput
            label="Confirm New Password"
            field="confirm_password"
            show={showConfirm}
            onToggle={() => setShowConfirm(v => !v)}
          />

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full mt-2"
          >
            Update Password
          </Button>
        </form>

        {/* Requirements */}
        <div className="px-6 pb-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-xs font-bold text-amber-800 tracking-wider">Password Requirements</h3>
            </div>
            <ul className="text-xs text-amber-700 space-y-1 ml-6">
              <li>At least 8 characters long</li>
              <li>Mix of and lowercase letters</li>
              <li>At least one number</li>
              <li>At least one special character</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;
