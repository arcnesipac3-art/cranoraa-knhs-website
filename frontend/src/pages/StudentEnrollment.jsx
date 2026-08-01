import { useState, useEffect } from 'react';
import api from '../utils/api';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

const REASON_TYPES = [
  { value: 'withdrawn', label: 'Withdrawn', description: 'Student voluntarily left the school' },
  { value: 'transferred', label: 'Transferred Out', description: 'Student moved to another school' },
  { value: 'dropped', label: 'Dropped', description: 'Student stopped attending without notice' },
  { value: 'other', label: 'Other', description: 'Other reason for removal' },
];

const StudentEnrollment = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [formData, setFormData] = useState({ classroom: '' });

  // Withdrawal modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawStudent, setWithdrawStudent] = useState(null);
  const [withdrawReasonType, setWithdrawReasonType] = useState('withdrawn');
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    if (selectedClassroom) fetchEnrollments(selectedClassroom);
    else setEnrollments([]);
  }, [selectedClassroom]);

  const fetchMeta = async () => {
    setLoading(true);
    try {
      const [classRes, studentRes] = await Promise.all([
        api.get('/classrooms/'),
        api.get('/users/?role=student&page_size=500'),
      ]);
      setClassrooms(classRes.data.results || classRes.data);
      setStudents(studentRes.data.results || studentRes.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to load data';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async (classroomId) => {
    try {
      const res = await api.get(`/enrollments/?classroom=${classroomId}`);
      setEnrollments(res.data.results || res.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to load enrollments';
      toast.error(msg);
    }
  };

  const openModal = () => {
    setFormData({ classroom: selectedClassroom });
    setSelectedStudents([]);
    setStudentSearch('');
    setShowModal(true);
  };

  const handleRemove = (enrollment) => {
    setWithdrawStudent(enrollment);
    setWithdrawReasonType('withdrawn');
    setWithdrawReason('');
    setShowWithdrawModal(true);
  };

  const handleWithdrawConfirm = async () => {
    if (!withdrawReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    setWithdrawing(true);
    try {
      await api.post(`/enrollment-applications/${withdrawStudent.id}/withdraw_student/`, {
        reason_type: withdrawReasonType,
        reason: withdrawReason.trim(),
      });
      toast.success('Student removed successfully');
      setShowWithdrawModal(false);
      setWithdrawStudent(null);
      fetchEnrollments(selectedClassroom);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to remove student';
      toast.error(msg);
    }
    setWithdrawing(false);
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedStudents.length === 0) return toast.error('Please select at least one student');
    setSaving(true);
    
    const loadingToast = toast.loading(`Enrolling ${selectedStudents.length} student(s)...`);
    
    try {
      // Use bulk enrollment endpoint for efficiency
      await api.post(`/classrooms/${parseInt(formData.classroom)}/bulk_enroll/`, {
        student_ids: selectedStudents.map(id => parseInt(id)),
      });
      
      toast.success(`${selectedStudents.length} student(s) enrolled successfully`, { id: loadingToast });
      setShowModal(false);
      fetchEnrollments(selectedClassroom);
    } catch (err) {
      const msg = err.response?.data?.error
        || err.response?.data?.detail
        || err.response?.data?.non_field_errors?.[0];
      toast.error(msg || 'Failed to enroll student(s)', { id: loadingToast });
    } finally {
      setSaving(false);
    }
  };

  const enrolledIds = new Set(enrollments.map(e => e.student));
  const filteredStudents = students.filter(s => {
    if (enrolledIds.has(s.id)) return false;
    if (!studentSearch) return true;
    const q = studentSearch.toLowerCase();
    const lrn = s.profile?.lrn || s.profile?.registration_number || '';
    return (s.username || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (`${s.first_name || ''} ${s.last_name || ''}`).toLowerCase().includes(q) ||
      lrn.toLowerCase().includes(q);
  });

  // Sort classrooms by grade level (Grade 7-12)
  const sortedClassrooms = [...classrooms].sort((a, b) => {
    const gradeOrder = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    const getGrade = (name) => gradeOrder.find(g => name.toLowerCase().includes(g.toLowerCase())) || '';
    const gradeA = getGrade(a.name);
    const gradeB = getGrade(b.name);
    const indexA = gradeOrder.indexOf(gradeA);
    const indexB = gradeOrder.indexOf(gradeB);
    if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const getRemarksLabel = (avg) => {
    if (!avg) return null;
    const n = parseFloat(avg);
    if (n >= 90) return { label: 'Outstanding', color: 'text-green-600 bg-green-50' };
    if (n >= 85) return { label: 'Very Satisfactory', color: 'text-violet-600 bg-violet-50' };
    if (n >= 80) return { label: 'Satisfactory', color: 'text-yellow-600 bg-yellow-50' };
    if (n >= 75) return { label: 'Fairly Satisfactory', color: 'text-orange-600 bg-orange-50' };
    return { label: 'Did Not Meet Expectations', color: 'text-red-600 bg-red-50' };
  };

  return (
    <div className="p-1.5 md:p-6 space-y-2 md:space-y-6 bg-slate-50/50 max-w-full">
      <div className="mb-2 md:mb-6 text-center md:text-left">
        <h1 className="text-lg md:text-3xl font-black text-slate-800 tracking-tight uppercase">Student Enrollment</h1>
        <p className="text-slate-500 text-[8px] md:text-base mt-0.5 font-medium uppercase tracking-widest">Enroll students per classroom</p>
      </div>

      {/* Classroom picker */}
      <div className="space-y-2 md:space-y-3">
        <label className="block text-[10px] md:text-sm font-bold text-slate-700 uppercase tracking-wider">Select Classroom</label>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 md:h-24 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sortedClassrooms.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs md:text-sm font-medium">No classrooms available</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {sortedClassrooms.map(c => {
              const cap = c.capacity || 40;
              const isSelected = String(c.id) === String(selectedClassroom);
              const gradeMatch = c.name.match(/grade\s*(\d+)/i);
              const gradeNum = gradeMatch ? parseInt(gradeMatch[1]) : 0;
              const gradeColors = {
                7: 'from-green-500 to-green-600',
                8: 'from-yellow-500 to-yellow-600',
                9: 'from-red-500 to-red-600',
                10: 'from-blue-500 to-blue-600',
                11: 'from-pink-500 to-pink-600',
                12: 'from-gray-900 to-black',
              };
              const gradient = gradeColors[gradeNum] || 'from-slate-500 to-slate-600';
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedClassroom(isSelected ? '' : c.id)}
                  className={`relative text-left rounded-xl border-2 transition-all duration-200 p-3 md:p-4 group
                    ${isSelected
                      ? 'border-violet-500 bg-violet-50 shadow-md ring-2 ring-violet-200'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center mb-2`}>
                    <span className="text-white text-[10px] md:text-xs font-black">{gradeNum || '?'}</span>
                  </div>
                  <p className={`text-[10px] md:text-sm font-black uppercase tracking-tight truncate leading-tight ${isSelected ? 'text-violet-900' : 'text-slate-800'}`}>
                    {c.name}
                  </p>
                  <p className={`text-[8px] md:text-[11px] font-semibold mt-0.5 ${isSelected ? 'text-violet-600' : 'text-slate-400'}`}>
                    Max {cap} students
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Enrollments table */}
      {selectedClassroom && (
        <div className="bg-white border border-slate-200 rounded-lg md:rounded-xl shadow-sm overflow-hidden min-w-0">
          <div className="flex items-center justify-between px-2 py-1 md:px-6 md:py-4 border-b border-slate-100 bg-[#2D1B4D]">
            <h2 className="font-black text-[9px] md:text-base uppercase tracking-tight !text-white flex items-center gap-1">
              ENROLLED
              <span className="text-[7px] md:text-sm font-bold !text-white">
                ({enrollments.length}{classrooms.find(c => String(c.id) === String(selectedClassroom)) ? ` / ${classrooms.find(c => String(c.id) === String(selectedClassroom)).capacity || 40}` : ''})
              </span>
            </h2>
            <button
              onClick={openModal}
              className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white text-[7px] md:text-sm font-black py-0.5 px-1.5 md:py-2 md:px-3 rounded md:rounded-lg transition-all active:scale-95 uppercase tracking-widest shadow-sm"
            >
              <svg className="w-2.5 h-2.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Enroll
            </button>
          </div>

          {enrollments.length === 0 ? (
            <div className="text-center py-6 md:py-12 text-slate-400 font-bold text-[9px] md:text-sm uppercase tracking-widest">
              No students enrolled yet.
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 max-w-full">
              <table className="w-full min-w-[320px] md:min-w-full">
                <thead className="bg-slate-50">
                  <tr className="text-[6px] md:text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="text-left px-2 py-1 md:px-6 md:py-3">Student</th>
                    <th className="text-center px-1 py-1 md:px-6 md:py-3" title="Term 1">T1</th>
                    <th className="text-center px-1 py-1 md:px-6 md:py-3" title="Term 2">T2</th>
                    <th className="text-center px-1 py-1 md:px-6 md:py-3" title="Term 3">T3</th>
                    <th className="text-center px-1 py-1 md:px-6 md:py-3">AVG</th>
                    <th className="text-center px-2 py-1 md:px-6 md:py-3">ACT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrollments.map(e => {
                    const remarks = getRemarksLabel(e.general_average || e.gpa);
                    return (
                      <tr key={e.id} className="hover:bg-violet-50 transition-colors">
                        <td className="px-2 py-1 md:px-6 md:py-4">
                          <div className="font-black text-slate-800 text-[8px] md:text-sm uppercase tracking-tighter truncate max-w-[100px] md:max-w-none">{e.student_name}</div>
                          <div className="text-[6px] md:text-xs text-slate-400 font-bold truncate max-w-[100px] md:max-w-none leading-none">{e.student_email}</div>
                          {e.student_lrn && <div className="text-[5px] md:text-[10px] text-slate-300 font-bold">LRN: {e.student_lrn}</div>}
                        </td>
                        {['q1','q2','q3'].map((q, idx) => (
                          <td key={q} className="px-1 py-1 md:px-6 md:py-4 text-center text-[8px] md:text-sm font-bold text-slate-600" title={`Term ${idx + 1}`}>
                            {e[q] ?? <span className="text-slate-300">—</span>}
                          </td>
                        ))}
                        <td className="px-1 py-1 md:px-6 md:py-4 text-center">
                          {remarks ? (
                            <span className={`inline-flex items-center justify-center min-w-[18px] md:min-w-[32px] px-1 py-0 rounded-full text-[7px] md:text-xs font-black shadow-inner ${remarks.color}`}>
                              {e.general_average || e.gpa}
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[8px] md:text-sm">—</span>
                          )}
                        </td>
                        <td className="px-2 py-1 md:px-6 md:py-4 text-center">
                          <button
                            onClick={() => handleRemove(e)}
                            className="p-0.5 md:px-3 md:py-1.5 text-[7px] md:text-xs font-black text-red-700 bg-red-100 hover:bg-red-200 rounded transition-all active:scale-90 uppercase tracking-widest"
                            title="Remove student from this section"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-2 md:p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md border border-gray-300 shadow-2xl rounded-sm flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-[#5e2a84] flex items-center justify-between px-5 py-3 flex-shrink-0 border-b-2 border-violet-900">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Enroll Student</h2>
                  <p className="text-violet-200 text-[10px] mt-0.5 font-medium uppercase tracking-wide">
                    Classroom: {classrooms.find(c => String(c.id) === String(selectedClassroom))?.name || ''}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setShowModal(false)}
                className="ml-4 w-7 h-7 flex items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-4 md:px-6 py-4 md:py-5 overflow-y-auto flex-1 space-y-3 md:space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-1.5">
                    Select Student
                    <span className="ml-2 text-[10px] font-bold text-gray-400 normal-case tracking-normal">
                      ({filteredStudents.length} available)
                    </span>
                  </label>

                  {/* Search */}
                  <div className="relative mb-2">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="Search name, email, or LRN..." value={studentSearch}
                      onChange={e => setStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-9 py-1.5 md:py-2.5 border border-gray-300 rounded-sm bg-white text-[10px] md:text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 placeholder:text-gray-400" />
                    {studentSearch && (
                      <button type="button" onClick={() => setStudentSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                        <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Student card list */}
                  <div className="border border-gray-200 rounded-sm overflow-hidden shadow-sm">
                    {filteredStudents.length === 0 ? (
                      <div className="py-6 md:py-8 text-center text-gray-400 text-[10px] md:text-sm font-bold uppercase tracking-widest">
                        <svg className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {studentSearch ? 'No matches' : 'All enrolled'}
                      </div>
                    ) : (
                      <div className="max-h-40 md:max-h-56 overflow-y-auto divide-y divide-gray-100 scrollbar-thin scrollbar-thumb-gray-200">
                        {filteredStudents.map(s => {
                          const fullName = s.first_name && s.last_name ? `${s.first_name} ${s.last_name}` : s.username;
                          const initials = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                          const isSelected = selectedStudents.includes(s.id);
                          return (
                            <button key={s.id} type="button" onClick={() => toggleStudentSelection(s.id)}
                              className={`w-full flex items-center gap-2 md:gap-3 px-3 py-2 md:px-4 md:py-3 text-left transition-colors border-l-2 md:border-l-4 ${
                                isSelected ? 'bg-violet-50 border-violet-500' : 'hover:bg-gray-50 border-transparent'
                              }`}>
                              <div className={`w-3.5 h-3.5 md:w-5 md:h-5 rounded border flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-violet-600 border-violet-600' : 'bg-white border-gray-300'
                              }`}>
                                {isSelected && (
                                  <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className={`w-7 h-7 md:w-9 md:h-9 rounded flex items-center justify-center text-[8px] md:text-sm font-black flex-shrink-0 shadow-sm ${
                                isSelected ? 'bg-violet-600 text-white' : 'bg-gradient-to-br from-violet-400 to-indigo-500 text-white'
                              }`}>{initials}</div>
                              <div className="flex-1 min-w-0 leading-tight">
                                <div className={`text-[9px] md:text-sm font-black truncate uppercase tracking-tighter ${isSelected ? 'text-violet-800' : 'text-gray-800'}`}>{fullName}</div>
                                <div className="text-[7px] md:text-xs text-gray-400 truncate font-bold">{s.email}</div>
                                {s.profile?.lrn && <div className="text-[6px] md:text-[10px] text-gray-300 font-bold">LRN: {s.profile.lrn}</div>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {selectedStudents.length > 0 && (
                    <div className="mt-1.5 flex items-center justify-between text-[8px] md:text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded px-2 py-1 md:px-3 md:py-2 font-bold uppercase tracking-widest">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Selected: {selectedStudents.length} Student(s)
                      </div>
                      <button type="button" onClick={() => setSelectedStudents([])} className="text-violet-400 hover:text-violet-600 transition-colors px-1">Clear</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-4 md:px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3 flex-shrink-0">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 bg-white text-gray-700 text-xs font-black uppercase tracking-widest border border-gray-300 hover:bg-gray-100 rounded-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving || selectedStudents.length === 0}
                  className="px-6 py-2.5 bg-[#5e2a84] text-white text-xs font-black uppercase tracking-widest hover:bg-violet-700 rounded-sm disabled:opacity-60">
                  {saving ? 'Enrolling...' : `Enroll ${selectedStudents.length || ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && withdrawStudent && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-2 md:p-4" onClick={() => { if (!withdrawing) { setShowWithdrawModal(false); setWithdrawStudent(null); } }}>
          <div className="bg-white w-full max-w-md border border-gray-300 shadow-2xl rounded-lg flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-red-600 flex items-center justify-between px-5 py-3 flex-shrink-0 rounded-t-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">Remove Student</h2>
                  <p className="text-red-200 text-[10px] mt-0.5 font-medium truncate max-w-[200px]">
                    {withdrawStudent.student_name}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => { setShowWithdrawModal(false); setWithdrawStudent(null); }}
                disabled={withdrawing}
                className="ml-4 w-7 h-7 flex items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white transition-all disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <p className="text-xs text-slate-600">
                Select the reason for removing this student from the classroom. This will update their enrollment status and remove them from the class roster.
              </p>

              {/* Reason Type */}
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Reason Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {REASON_TYPES.map(rt => (
                    <button
                      key={rt.value}
                      onClick={() => setWithdrawReasonType(rt.value)}
                      className={`text-left p-2.5 rounded-lg border-2 transition-all ${
                        withdrawReasonType === rt.value
                          ? 'border-red-500 bg-red-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <p className={`text-[10px] font-black uppercase tracking-tight ${withdrawReasonType === rt.value ? 'text-red-700' : 'text-slate-700'}`}>
                        {rt.label}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{rt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason Text */}
              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">
                  Details <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={withdrawReason}
                  onChange={e => setWithdrawReason(e.target.value)}
                  placeholder="Provide a specific reason for this action..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-slate-400 resize-none"
                  disabled={withdrawing}
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => { setShowWithdrawModal(false); setWithdrawStudent(null); }}
                disabled={withdrawing}
                className="px-4 py-2 text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 uppercase tracking-widest"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawConfirm}
                disabled={withdrawing || !withdrawReason.trim()}
                className="px-4 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 uppercase tracking-widest"
              >
                {withdrawing ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentEnrollment;
