import { useState, useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Card, Input as UIInput, Select, Textarea, Button, Skeleton, Badge } from '../components/ui';
import { cn } from '../styles/designSystem';

const Field = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">{label}</p>
    <p className="text-[13px] font-bold text-slate-800 truncate">{value || <span className="text-slate-300 font-normal italic">Not set</span>}</p>
  </div>
);

const Profile = () => {
  const { user } = useCurrentUser();
  const { refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('student_id');

  // Redirect to settings if not viewing another student
  if (!studentId) return <Navigate to="/settings" replace />;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '', first_name: '', middle_name: '', last_name: '', email: '',
    sex: '', date_of_birth: '', nationality: '', state: '',
    father_name: '', mother_name: '', contact_information: '',
    phone_number: '', address: '', registration_number: '', grade_level: '',
  });

  useEffect(() => {
    fetchProfile();
  }, [studentId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const url = studentId ? `/student/profile/?student_id=${studentId}` : '/student/profile/';
      const r = await api.get(url);
      setProfile(r.data);
      setProfilePic(r.data.profile?.profile_picture);
      setForm({
        title:               r.data.profile?.title || '',
        first_name:          r.data.first_name || '',
        middle_name:         r.data.profile?.middle_name || '',
        last_name:           r.data.last_name || '',
        email:               r.data.email || '',
        sex:                 r.data.profile?.sex || '',
        date_of_birth:       r.data.profile?.date_of_birth || '',
        nationality:         r.data.profile?.nationality || '',
        state:               r.data.profile?.state || '',
        father_name:         r.data.profile?.father_name || '',
        mother_name:         r.data.profile?.mother_name || '',
        contact_information: r.data.profile?.contact_information || '',
        phone_number:        r.data.profile?.phone_number || '',
        address:             r.data.profile?.address || '',
        registration_number: r.data.profile?.registration_number || '',
        grade_level:         r.data.profile?.grade_level || '',
      });
    } catch { toast.error('Failed to load profile'); }
    finally { setLoading(false); }
  };

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type (only images)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, GIF, and WebP images are allowed');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Image must be less than 5MB');
      return;
    }
    
    const formData = new FormData();
    formData.append('profile_picture', file);
    setUploading(true);
    try {
      const url = studentId ? `/student/profile/?student_id=${studentId}` : '/student/profile/';
      const response = await api.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProfilePic(response.data.profile_picture);
      toast.success('Profile picture updated');
      if (!studentId) refreshUser();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to upload picture';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (studentId) return;
    if (!form.first_name.trim() || !form.last_name.trim())
      return toast.error('First name and last name are required');
    setSaving(true);
    try {
      await api.put('/student/profile/', form);
      toast.success('Profile updated');
      setEditing(false);
      refreshUser();
      fetchProfile();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.details || 'Failed to update profile';
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }));

  if (loading) return (
    <div className="space-y-5 px-4 md:px-6 py-6 max-w-3xl">
      <Skeleton className="h-7 w-40 rounded" />
      <Skeleton.Form fields={6} cols={2} />
    </div>
  );

  const fullName = [profile?.first_name, profile?.profile?.middle_name, profile?.last_name]
    .filter(Boolean).join(' ') || 'No name set';

  const initials = [profile?.first_name, profile?.last_name]
    .filter(Boolean).map(n => n[0].toUpperCase()).join('') || '?';

  const age = profile?.profile?.date_of_birth
    ? Math.floor((Date.now() - new Date(profile.profile.date_of_birth)) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <div className="space-y-6 animate-fade-in p-1 sm:p-0 page-bottom-safe">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight truncate">
            {studentId ? 'Student Profile' : 'My Profile'}
          </h1>
          <p className="text-[13px] font-medium text-slate-500 mt-1 line-clamp-1">
            {studentId ? 'Viewing student information' : 'View and update your personal information'}
          </p>
        </div>
        {!editing && !studentId && (
          <Button
            variant="primary"
            onClick={() => setEditing(true)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Profile
          </Button>
        )}
      </div>

      {/* ── Profile card ── */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">

        {/* Banner + avatar */}
        <div className="h-32 bg-[#1A0B2E] px-6 sm:px-8 flex items-end pb-4 relative">
          <div className="absolute inset-0 overflow-hidden rounded-t-[2rem]">
            <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          </div>

          <div className="relative flex items-end gap-5 w-full">
            <div className="relative group/avatar flex-shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-black border-4 border-white/20 shadow-2xl mb-[-3.5rem] overflow-hidden">
                {profilePic ? (
                   <img src={profilePic} alt="Profile" className="w-full h-full object-cover" loading="lazy" />
                ) : initials}
                {!studentId && (
                  <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer z-10">
                    <input type="file" className="hidden" accept="image/*" onChange={handleProfilePicUpload} />
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </label>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-[2rem] mb-[-3.5rem]">
                  <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="pb-2 min-w-0">
              <h2 className="text-xl sm:text-2xl font-black text-white truncate leading-tight">{fullName}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <Badge variant="purple" size="sm">{user?.role}</Badge>
                <span className="text-[11px] font-bold text-violet-300/80 truncate">{profile?.email}</span>
                {profile?.profile?.registration_number && (
                  <span className="text-[11px] font-black uppercase tracking-widest text-violet-300/60 hidden xs:inline">LRN: {profile.profile.registration_number}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8 pb-8 pt-20 sm:pt-24">

          {editing ? (
            /* ── Edit form ── */
            <div className="space-y-10">
              {/* Name */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Name Details</h3>
                  <div className="h-px w-full bg-slate-100" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                  {user?.role === 'staff' && (
                    <div className="sm:col-span-1">
                      <Select
                        label="Title"
                        value={form.title}
                        onChange={e => set('title')(e.target.value)}
                        options={[
                          { value: '', label: 'Select' },
                          { value: 'Mr.', label: 'Mr.' },
                          { value: 'Ms.', label: 'Ms.' },
                          { value: 'Mrs.', label: 'Mrs.' },
                          { value: 'Dr.', label: 'Dr.' },
                          { value: 'Prof.', label: 'Prof.' },
                        ]}
                      />
                    </div>
                  )}
                  <div className="sm:col-span-1">
                    <UIInput label="First Name" value={form.first_name} onChange={e => set('first_name')(e.target.value)} required />
                  </div>
                  <UIInput label="Middle Name" value={form.middle_name} onChange={e => set('middle_name')(e.target.value)} />
                  <UIInput label="Last Name" value={form.last_name} onChange={e => set('last_name')(e.target.value)} required />
                </div>
              </div>

              {/* Personal */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Personal Information</h3>
                  <div className="h-px w-full bg-slate-100" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Select
                    label="Sex"
                    value={form.sex}
                    onChange={e => set('sex')(e.target.value)}
                    options={[
                      { value: '', label: 'Select' },
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' },
                    ]}
                  />
                  <UIInput label="Date of Birth" value={form.date_of_birth} onChange={e => set('date_of_birth')(e.target.value)} type="date" />
                  <UIInput label="Nationality" value={form.nationality} onChange={e => set('nationality')(e.target.value)} />
                  <UIInput label="Province / State" value={form.state} onChange={e => set('state')(e.target.value)} />
                </div>
              </div>

              {/* Family */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Family Details</h3>
                  <div className="h-px w-full bg-slate-100" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <UIInput label="Father's Name" value={form.father_name} onChange={e => set('father_name')(e.target.value)} />
                  <UIInput label="Mother's Name" value={form.mother_name} onChange={e => set('mother_name')(e.target.value)} />
                </div>
              </div>

              {/* School */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Academic Record</h3>
                  <div className="h-px w-full bg-slate-100" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <UIInput label="LRN (Learner Reference Number)" value={form.registration_number} onChange={e => set('registration_number')(e.target.value)} />
                  <UIInput label="Grade Level" value={form.grade_level} onChange={e => set('grade_level')(e.target.value)} />
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Contact Information</h3>
                  <div className="h-px w-full bg-slate-100" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <UIInput label="Email Address (Optional)" value={form.email} onChange={e => set('email')(e.target.value)} type="email" />
                  <UIInput label="Phone Number" value={form.phone_number} onChange={e => set('phone_number')(e.target.value)} />
                  <div className="sm:col-span-2">
                    <Textarea
                      label="Address"
                      value={form.address}
                      onChange={e => set('address')(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Textarea
                      label="Emergency Contact"
                      value={form.contact_information}
                      onChange={e => set('contact_information')(e.target.value)}
                      rows={2}
                      placeholder="Name, relationship, phone number…"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col xs:flex-row gap-3 pt-4">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                  loading={saving}
                  className="flex-1"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setEditing(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* ── View mode ── */
            <div className="space-y-12">
              {/* Personal */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Personal Information</h3>
                  <div className="h-px w-full bg-slate-100" />
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-6">
                  {user?.role === 'staff' && <Field label="Title" value={profile?.profile?.title} />}
                  <Field label="First Name"   value={profile?.first_name} />
                  <Field label="Middle Name"  value={profile?.profile?.middle_name} />
                  <Field label="Last Name"    value={profile?.last_name} />
                  <Field label="Sex"          value={profile?.profile?.sex ? profile.profile.sex.charAt(0).toUpperCase() + profile.profile.sex.slice(1) : null} />
                  <Field label="Date of Birth" value={profile?.profile?.date_of_birth
                    ? new Date(profile.profile.date_of_birth + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    : null} />
                  <Field label="Age"          value={age !== null ? `${age} years old` : null} />
                  <Field label="Nationality"  value={profile?.profile?.nationality} />
                  <Field label="Province / State" value={profile?.profile?.state} />
                </div>
              </div>

              {/* Family */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Family Details</h3>
                  <div className="h-px w-full bg-slate-100" />
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-x-8 gap-y-6">
                  <Field label="Father's Name" value={profile?.profile?.father_name} />
                  <Field label="Mother's Name" value={profile?.profile?.mother_name} />
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Contact Information</h3>
                  <div className="h-px w-full bg-slate-100" />
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-x-8 gap-y-6">
                  <Field label="Email Address" value={profile?.email} />
                  <Field label="Phone Number"  value={profile?.profile?.phone_number} />
                  <div className="xs:col-span-2">
                    <Field label="Address" value={profile?.profile?.address} />
                  </div>
                  <div className="xs:col-span-2">
                    <Field label="Emergency Contact" value={profile?.profile?.contact_information} />
                  </div>
                </div>
              </div>

              {(profile?.profile?.registration_number || profile?.profile?.grade_level) && (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Academic Record</h3>
                    <div className="h-px w-full bg-slate-100" />
                  </div>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-x-8 gap-y-6">
                    <Field label="LRN" value={profile?.profile?.registration_number} />
                    <Field label="Grade Level" value={profile?.profile?.grade_level} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
