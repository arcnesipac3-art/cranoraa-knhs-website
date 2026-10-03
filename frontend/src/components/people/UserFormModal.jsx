import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Button from '../ui/Button';

const STAFF_TITLES = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'registrar', label: 'Registrar' },
  { value: 'advisory', label: 'Advisory' },
  { value: 'principal', label: 'Principal' },
  { value: 'guidance_counselor', label: 'Guidance Counselor' },
  { value: 'it_staff', label: 'IT Staff' },
  { value: 'librarian', label: 'Librarian' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'other', label: 'Other' },
];

const TITLES = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.'];

export default function UserFormModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  mode, // 'add' | 'edit'
  userType, // 'teacher' | 'student' | 'parent'
  initialData = {},
  classrooms = [],
  teachers = [],
  title = '',
  subtitle = '',
}) {
  const [formData, setFormData] = useState({});
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData({
          title: initialData.profile?.title || '',
          first_name: initialData.first_name || '',
          last_name: initialData.last_name || '',
          email: initialData.email || '',
          sex: initialData.profile?.sex || '',
          staff_title: initialData.staff_title || 'teacher',
          additional_roles: (initialData.additional_roles || '').split(',').filter(Boolean),
          grade_level: initialData.profile?.grade_level || '',
          lrn: initialData.profile?.lrn || '',
          username: initialData.username || '',
          password: '',
          ...initialData,
        });
      } else {
        setFormData({
          title: '',
          first_name: '',
          last_name: '',
          email: '',
          sex: '',
          staff_title: 'teacher',
          additional_roles: [],
          grade_level: '',
          lrn: '',
          username: '',
          password: '',
        });
      }
      setShowTempPassword(false);
      setTempPassword('');
    }
  }, [isOpen, mode, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleTempPasswordClick = () => {
    setShowTempPassword(!showTempPassword);
  };

  if (!isOpen) return null;

  const isTeacher = userType === 'teacher';
  const isStudent = userType === 'student';
  const isParent = userType === 'parent';

  const commonFields = (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 tracking-wider mb-1.5">
            {isTeacher ? 'Title *' : 'Title'}
          </label>
          <select required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500">
            {TITLES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 tracking-wider mb-1.5">
            First Name *
          </label>
          <input type="text" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder:text-slate-400" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 tracking-wider mb-1.5">
            Last Name *
          </label>
          <input type="text" required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder:text-slate-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 tracking-wider mb-1.5">
            Email Address *
          </label>
          <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder:text-slate-400" />
          <p className="text-[10px] text-slate-400 mt-1">{isParent ? 'This will also be their username for login.' : ''}</p>
        </div>

        {isTeacher && (
          <div>
            <label className="block text-xs font-bold text-slate-700 tracking-wider mb-1.5">
              Sex *
            </label>
            <select required value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500">
              <option value="">Select Sex</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        )}

        {isStudent && (
          <div>
            <label className="block text-xs font-bold text-slate-700 tracking-wider mb-1.5">
              LRN / Student ID *
            </label>
            <input type="text" required value={formData.lrn || formData.username} onChange={e => setFormData({ ...formData, lrn: e.target.value, username: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder:text-slate-400" 
              placeholder="12-digit LRN" />
          </div>
        )}

        {isParent && (
          <div>
            <label className="block text-xs font-bold text-slate-700 tracking-wider mb-1.5">
              Password (optional)
            </label>
            <input type="text" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder:text-slate-400" 
              placeholder="Leave blank to auto-generate" />
            <p className="text-[10px] text-slate-400 mt-1">This will also be their username for login.</p>
          </div>
        )}

        {!isParent && !isStudent && (
          <div>
            <label className="block text-xs font-bold text-slate-700 tracking-wider mb-1.5">
              Sex *
            </label>
            <select required value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500">
              <option value="">Select Sex</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        )}

        {isStudent && (
          <div>
            <label className="block text-xs font-bold text-slate-700 tracking-wider mb-1.5">
              Grade Level *
            </label>
            <select required value={formData.grade_level} onChange={e => setFormData({ ...formData, grade_level: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500">
              <option value="">Select Grade Level</option>
              {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        )}

        {isTeacher && (
          <div>
            <label className="block text-xs font-bold text-slate-700 tracking-wider mb-1.5">
              Primary Role *
            </label>
            <select required value={formData.staff_title} onChange={e => setFormData({ ...formData, staff_title: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500">
              {STAFF_TITLES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        )}

        {isTeacher && (
          <div>
            <label className="block text-xs font-bold text-slate-700 tracking-wider mb-1.5">
              Advisory Class
            </label>
            <select value={formData.advisory_class_id || ''} onChange={e => setFormData({ ...formData, advisory_class_id: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-sm bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500">
              <option value="">No advisory class</option>
              {classrooms.map(c => <option key={c.id} value={c.id}>{c.name} ({c.grade_level || 'No grade'})</option>)}
            </select>
          </div>
        )}

        {isTeacher && (
          <div>
            <label className="block text-xs font-bold text-slate-700 tracking-wider mb-2">Additional Roles</label>
            <p className="text-[10px] text-slate-400 mb-2">Click to toggle. Staff with multiple roles appear in multiple departments.</p>
            <div className="flex flex-wrap gap-2">
              {STAFF_TITLES.filter(t => t.value !== formData.staff_title).map(t => {
                const isActive = (formData.additional_roles || []).includes(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setFormData(prev => {
                      const roles = prev.additional_roles || [];
                      return {
                        ...prev,
                        additional_roles: isActive
                          ? roles.filter(r => r !== t.value)
                          : [...roles, t.value],
                      };
                    })}
                    className={`text-xs font-bold px-3 py-1.5 rounded border transition-colors ${
                      isActive
                        ? 'bg-violet-100 text-violet-700 border-violet-300'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-2 sm:p-3 md:p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg border border-gray-300 shadow-2xl rounded-sm flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
        <div className="bg-[#5e2a84] flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-violet-900">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isTeacher ? "M12 4v16m8-8H4" : isStudent ? "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" : "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"} />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-[0.1em] leading-none">{mode === 'add' ? 'Add' : 'Edit'} {title}</h2>
              <p className="text-violet-200 text-[10px] mt-0.5 font-medium tracking-wide">{subtitle}</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="ml-4 w-7 h-7 flex items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 md:py-5 overflow-y-auto flex-1 space-y-4">
            {commonFields}
          </div>
          <div className="px-4 sm:px-6 py-3 md:py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="px-4 sm:px-6 py-2.5 bg-white text-slate-700 text-xs font-bold tracking-[0.1em] border border-gray-300 hover:bg-gray-100 rounded-sm">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-4 sm:px-6 py-2.5 bg-[#5e2a84] text-white text-xs font-bold tracking-[0.1em] hover:bg-violet-700 rounded-sm disabled:opacity-50">
              {submitting ? (mode === 'add' ? 'Creating...' : 'Saving...') : (mode === 'add' ? 'Create Account' : 'Save Changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
