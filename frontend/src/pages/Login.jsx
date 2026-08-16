import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginRequest } from '../utils/auth';
import { clearSession } from '../utils/session';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const ROLES = {
  student: {
    label: 'Student',
    subtitle: 'Learner Portal',
    identifierLabel: 'Student ID or Email',
    identifierPlaceholder: 'Enter your Student ID or email',
    identifierType: 'text',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5zm0 7l-9-5 9-5 9 5-9 5z" />
      </svg>
    ),
    panelTitle: 'Student Portal',
    panelDesc: 'Access your academic records, track your attendance, download learning materials, and stay updated with school announcements.',
    panelFeatures: [
      { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Grade Tracking' },
      { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', label: 'Attendance' },
      { icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', label: 'Learning Materials' },
      { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', label: 'Messaging' },
    ],
  },
  staff: {
    label: 'Faculty',
    subtitle: 'Faculty Portal',
    identifierLabel: 'Teacher Email',
    identifierPlaceholder: 'teacher@knhs.edu.ph',
    identifierType: 'email',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    panelTitle: 'Faculty Portal',
    panelDesc: 'Manage your classes, input grades, take attendance, upload learning materials, and communicate with students and parents.',
    panelFeatures: [
      { icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', label: 'Grade Management' },
      { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', label: 'Attendance' },
      { icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12', label: 'Upload Materials' },
      { icon: 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z', label: 'Communication' },
    ],
  },
  parent: {
    label: 'Parent',
    subtitle: 'Parent Portal',
    identifierLabel: 'Parent Email or ID',
    identifierPlaceholder: 'Enter your email or ID',
    identifierType: 'text',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    panelTitle: 'Parent Portal',
    panelDesc: "Stay connected with your child's academic journey. Monitor grades, track attendance, and communicate with teachers.",
    panelFeatures: [
      { icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z', label: 'Monitor Progress' },
      { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'View Grades' },
      { icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', label: 'Announcements' },
      { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', label: 'Message Teachers' },
    ],
  },
  admin: {
    label: 'Admin',
    subtitle: 'System Administration',
    identifierLabel: 'Admin Email or ID',
    identifierPlaceholder: 'admin@knhs.edu.ph',
    identifierType: 'text',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    panelTitle: 'Administration',
    panelDesc: 'Full system oversight. Manage users, control enrollment, view analytics, and maintain system security.',
    panelFeatures: [
      { icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', label: 'System Settings' },
      { icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', label: 'User Management' },
      { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Enrollment Control' },
      { icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Analytics & Reports' },
    ],
  },
};

const LAST_ROLE_KEY = 'knhs_last_role';

const Login = () => {
  const { user, signIn, refreshUser } = useAuth();
  const navigate = useNavigate();
  const identifierRef = useRef(null);

  const [loginType, setLoginType] = useState(() => {
    try {
      const saved = localStorage.getItem(LAST_ROLE_KEY);
      return saved && ROLES[saved] ? saved : 'student';
    }
    catch { return 'student'; }
  });
  const [step, setStep] = useState('role');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(null);

  const role = ROLES[loginType];

  useEffect(() => {
    if (user) {
      if (user.must_change_password) navigate('/force-password-change', { replace: true });
      else if (user.role === 'parent') navigate('/parent-dashboard', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (step === 'credentials') {
      identifierRef.current?.focus();
    }
  }, [step]);

  useEffect(() => {
    try { localStorage.setItem(LAST_ROLE_KEY, loginType); } catch {}
  }, [loginType]);

  useEffect(() => {
    if (!lockoutUntil) return;
    const remaining = lockoutUntil - Date.now();
    if (remaining <= 0) { setLockoutUntil(null); setFailedAttempts(0); return; }
    const timer = setTimeout(() => { setLockoutUntil(null); setFailedAttempts(0); }, remaining);
    return () => clearTimeout(timer);
  }, [lockoutUntil]);

  const handleForgotClick = useCallback(() => {
    Swal.fire({
      icon: 'info',
      title: 'Password Reset',
      text: 'Please contact the ICT coordinator for password reset.',
      confirmButtonColor: '#581c87',
      customClass: { popup: 'rounded-lg', confirmButton: 'rounded-lg uppercase text-xs font-bold tracking-widest px-6 py-3' }
    });
  }, []);

  const validate = useCallback(() => {
    const errors = {};
    if (!identifier.trim()) errors.identifier = `${role.identifierLabel} is required`;
    if (!password) errors.password = 'Password is required';
    return errors;
  }, [identifier, password, role.identifierLabel]);

  const lockoutRemaining = lockoutUntil ? Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000)) : 0;

  const handleRoleSelect = useCallback((key) => {
    setLoginType(key);
    setStep('credentials');
    setIdentifier('');
    setPassword('');
    setFieldErrors({});
  }, []);

  const handleBackToRoles = useCallback(() => {
    setStep('role');
    setIdentifier('');
    setPassword('');
    setFieldErrors({});
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (lockoutUntil && Date.now() < lockoutUntil) {
      toast.error(`Too many attempts. Wait ${lockoutRemaining}s.`);
      return;
    }
    setFieldErrors({});
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setLoading(true);
    try {
      const userData = await loginRequest(identifier, password, loginType);
      if (userData.role && userData.role !== loginType) {
        const isDualRole = userData.role === 'staff' && userData.is_admin && loginType === 'admin';
        if (!isDualRole) {
          setLoading(false);
          clearSession();
          Swal.fire({ icon: 'error', title: 'Wrong Portal', text: `This account is registered as a ${userData.role}. Please use the correct portal.`, confirmButtonColor: '#581c87' });
          return;
        }
      }
      if (userData?.must_change_password) {
        signIn(userData); setLoading(false);
        toast.success('Please update your password to continue.');
        navigate('/force-password-change', { replace: true });
        return;
      }
      setFailedAttempts(0);
      signIn(userData);
      await refreshUser();
      setLoading(false);
      const isDualRole = userData.role === 'staff' && userData.is_admin;
      const portalMode = (() => {
        try { return localStorage.getItem('portal_mode') || 'admin'; } catch { return 'admin'; }
      })();
      let dest;
      if (userData.role === 'admin' || (isDualRole && portalMode === 'admin')) {
        dest = '/system-admin';
      } else if (userData.role === 'parent') {
        dest = '/parent-dashboard';
      } else {
        dest = '/dashboard';
      }
      navigate(dest, { replace: true });
    } catch (err) {
      setLoading(false);
      const status = err.response?.status;
      const code = err.response?.data?.code;
      const message = err.response?.data?.error;
      if (status === 403) {
        if (code === 'not_approved') {
          Swal.fire({ icon: 'info', title: 'Pending Approval', text: message || 'Your account is pending admin approval.', confirmButtonColor: '#581c87' });
        } else if (code === 'wrong_portal') {
          Swal.fire({ icon: 'warning', title: 'Wrong Portal', text: message || 'Please use the correct login portal for your account.', confirmButtonColor: '#581c87' });
        } else if (code === 'suspended' || code === 'inactive') {
          Swal.fire({ icon: 'error', title: 'Account Unavailable', text: message || 'Your account has been deactivated or suspended.', confirmButtonColor: '#dc2626' });
        } else if (code === 'locked_out') {
          setFailedAttempts(0);
          Swal.fire({ icon: 'warning', title: 'Account Temporarily Locked', text: message || 'Too many failed attempts. Please wait 15 minutes and try again.', confirmButtonColor: '#581c87' });
        } else {
          Swal.fire({ icon: 'error', title: 'Account Issue', text: message || 'Contact the administrator.', confirmButtonColor: '#dc2626' });
        }
      } else if (status === 401) {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        if (newAttempts >= 5) {
          setLockoutUntil(Date.now() + 30000);
          toast.error('Account locked for 30 seconds due to too many failed attempts.');
        }
        Swal.fire({ icon: 'error', title: 'Invalid Credentials', text: 'The ID or password you entered is incorrect.', confirmButtonText: 'Try Again', confirmButtonColor: '#581c87' });
      } else if (status === 429) {
        Swal.fire({ icon: 'warning', title: 'Too Many Attempts', text: err.response?.data?.detail || 'Please wait before trying again.', confirmButtonColor: '#581c87' });
      } else if (!err.response) {
        Swal.fire({ icon: 'error', title: 'Cannot Reach Server', text: 'Make sure the backend is running and try again.', confirmButtonColor: '#581c87' });
      } else {
        Swal.fire({ icon: 'error', title: 'Login Failed', text: message || 'An unexpected error occurred.', confirmButtonColor: '#581c87' });
      }
    }
  }, [identifier, password, loginType, validate, signIn, refreshUser, navigate, failedAttempts, lockoutUntil, lockoutRemaining]);

  return (
    <div className="min-h-screen flex font-sans bg-gray-50">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-[48%] bg-slate-900 relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-between w-full p-12">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
               <img src="/icons/school-logo-source.png" alt="KNHS" className="w-10 h-10 object-contain" loading="lazy" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Kiwalan National</h1>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">High School</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <div className="mb-4">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-widest">{role.panelTitle}</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              {loginType === 'student' && 'Your Academic Journey Starts Here'}
              {loginType === 'staff' && 'Empowering Educators'}
              {loginType === 'parent' && 'Stay Connected With Your Child'}
              {loginType === 'admin' && 'Complete System Control'}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-10">
              {role.panelDesc}
            </p>
            <div className="space-y-3">
              {role.panelFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-white/5 border border-white/5">
                  <div className="w-10 h-10 bg-white/5 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={f.icon} />
                    </svg>
                  </div>
                  <span className="text-white text-sm font-medium">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-8 border-t border-white/10">
            <div className="flex items-center gap-3">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Seal_of_the_Department_of_Education_of_the_Philippines.png/960px-Seal_of_the_Department_of_Education_of_the_Philippines.png"
                alt="DepEd"
                className="w-7 h-7 object-contain opacity-50"
              />
              <div>
                <p className="text-slate-400 text-xs font-medium">Department of Education</p>
                <p className="text-slate-500 text-[10px]">Republic of the Philippines</p>
              </div>
            </div>
            <p className="text-slate-500 text-xs">&copy; 2026 KNHS Portal</p>
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Mobile Header */}
        <div className="lg:hidden px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
               <img src="/icons/school-logo-source.png" alt="KNHS" className="w-7 h-7 object-contain" loading="lazy" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">KNHS Portal</h1>
              <p className="text-gray-500 text-xs">Digital Campus</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            aria-label="Close login"
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-6 py-10 lg:px-12">
          {/* Back Link — Desktop */}
          <button
            onClick={() => navigate('/')}
            className="hidden lg:inline-flex items-center gap-2 text-gray-400 hover:text-slate-900 text-xs font-medium mb-6 transition-colors group"
            aria-label="Go back to home page"
          >
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              step === 'role' ? 'bg-slate-900 text-white' : 'bg-green-500 text-white'
            }`}>
              {step === 'role' ? '1' : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              )}
            </div>
            <div className={`h-0.5 flex-1 rounded-full transition-all duration-300 ${step === 'credentials' ? 'bg-slate-900' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              step === 'credentials' ? 'bg-slate-900 text-white' : 'bg-gray-200 text-gray-400'
            }`}>2</div>
          </div>

          {/* ═══════ STEP 1: Role Selection ═══════ */}
          {step === 'role' && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome</h2>
                <p className="text-gray-500 text-sm">Select your role to continue</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {Object.entries(ROLES).map(([key, r]) => (
                  <button
                    key={key}
                    onClick={() => handleRoleSelect(key)}
                    className="group flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-gray-100 hover:border-slate-900 hover:bg-slate-50 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                  >
                    <div className="w-12 h-12 bg-gray-100 group-hover:bg-slate-900 rounded-xl flex items-center justify-center transition-colors duration-200">
                      <span className="text-gray-500 group-hover:text-white transition-colors duration-200">{r.icon}</span>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-900">{r.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{r.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ═══════ STEP 2: Credentials ═══════ */}
          {step === 'credentials' && (
            <>
              {/* Back to role selection */}
              <button
                onClick={handleBackToRoles}
                className="inline-flex items-center gap-1.5 text-gray-400 hover:text-slate-900 text-xs font-medium mb-4 transition-colors group"
              >
                <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Change role
              </button>

              {/* Selected role badge */}
              <div className="flex items-center gap-2.5 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white">{role.icon}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{role.label}</p>
                  <p className="text-[11px] text-gray-400">{role.subtitle}</p>
                </div>
              </div>

              <div className="mb-5">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign In</h2>
                <p className="text-gray-500 text-sm">Enter your {role.identifierLabel.toLowerCase()} and password</p>
              </div>

              {/* Form */}
              <form
                id={`login-form-${loginType}`}
                onSubmit={handleSubmit}
                className="space-y-4"
                noValidate
              >
                {/* Identifier */}
                <div>
                  <label
                    htmlFor={`identifier-${loginType}`}
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    {role.identifierLabel}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <input
                      ref={identifierRef}
                      id={`identifier-${loginType}`}
                      type={role.identifierType}
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      placeholder={role.identifierPlaceholder}
                      autoComplete="username"
                      aria-invalid={!!fieldErrors.identifier}
                      aria-describedby={fieldErrors.identifier ? `identifier-error-${loginType}` : undefined}
                      className={`w-full bg-gray-50 border rounded-lg py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.identifier
                          ? 'border-red-300 bg-red-50 focus:ring-red-500/20 focus:border-red-400'
                          : 'border-gray-200 focus:ring-slate-900/20 focus:border-slate-900'
                      }`}
                    />
                  </div>
                  {fieldErrors.identifier && (
                    <p id={`identifier-error-${loginType}`} className="mt-2 text-sm text-red-600" role="alert">
                      {fieldErrors.identifier}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor={`password-${loginType}`}
                      className="text-sm font-semibold text-gray-700"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotClick}
                      className="text-sm text-purple-700 hover:text-purple-900 font-medium transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <input
                      id={`password-${loginType}`}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={fieldErrors.password ? `password-error-${loginType}` : undefined}
                      className={`w-full bg-gray-50 border rounded-lg py-3 pl-10 pr-11 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.password
                          ? 'border-red-300 bg-red-50 focus:ring-red-500/20 focus:border-red-400'
                          : 'border-gray-200 focus:ring-slate-900/20 focus:border-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 014.13-4.13m4.13-4.13A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.127 2.127m-4.13-4.13A3 3 0 1112 12c.164 0 .324-.013.48-.039" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p id={`password-error-${loginType}`} className="mt-2 text-sm text-red-600" role="alert">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Lockout Warning */}
                {lockoutUntil && Date.now() < lockoutUntil && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3" role="alert">
                    <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-sm text-amber-700">
                      Account temporarily locked. Try again in {lockoutRemaining}s.
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || (lockoutUntil && Date.now() < lockoutUntil)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Portal Features — Mobile */}
              <div className="mt-8 pt-6 border-t border-gray-100 lg:hidden">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Portal Features</p>
                <div className="grid grid-cols-2 gap-2">
                  {role.panelFeatures.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full flex-shrink-0" aria-hidden="true" />
                      <span className="text-xs text-gray-600">{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
