import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardBody, CardTitle, Button, Badge,
  LoadingSpinner, EmptyState
} from '../components/ui';
import Modal, { ModalBody, ModalFooter, ModalBtnPrimary, ModalBtnSecondary, modalInputCls } from '../components/ui/Modal';
import {
  BookOpen, Users, FileText, Award, CheckSquare,
  Upload, Download, Clock, Folder, Trash2, Pencil,
  MessageSquare, Bell, ArrowLeft,
  Search, ChevronRight, BarChart2, X, Calendar,
  HelpCircle
} from 'lucide-react';
import { GradeManagementView, AttendanceView, AnalyticsView } from './ClassroomHub/EmbeddedViews';
import { QuizManagementView, StudentQuizzesView, LessonPlansView, ClassroomAnalyticsView } from './ClassroomHub/TeachingViews';

/**
 * ClassroomHub - Google Classroom-inspired class management
 * Combines classes, materials, assignments, and announcements
 */

const ClassroomHub = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get classroom from search params (separate from tab param)
  const classroomIdParam = searchParams.get('classroom');
  const classroomId = classroomIdParam ? parseInt(classroomIdParam) : null;

  // State
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementFiles, setAnnouncementFiles] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [students, setStudents] = useState([]);
  const [classroomSubjects, setClassroomSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stream'); // stream, materials, people, grades
  const [searchQuery, setSearchQuery] = useState('');
  const [announcementSearch, setAnnouncementSearch] = useState('');
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [editAnnouncementTitle, setEditAnnouncementTitle] = useState('');
  const [editAnnouncementContent, setEditAnnouncementContent] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', material_type: 'dlp', file: null, quarter: '', week: '' });
  const fileInputRef = useRef(null);

  // Sync activeTab with ?view= URL param
  const isTeacher = user?.role === 'staff' || user?.role === 'admin';
  const viewParam = searchParams.get('view');
  const validTabs = ['stream', 'materials', 'people', 'grades', 'attendance', 'quizzes'];
  const teacherTabs = ['stream', 'materials', 'people', 'grades', 'attendance', 'quizzes', 'lesson-plans', 'analytics'];

  useEffect(() => {
    if (viewParam && (isTeacher ? teacherTabs : validTabs).includes(viewParam)) {
      setActiveTab(viewParam);
    }
  }, [viewParam, isTeacher]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', key);
    setSearchParams(newParams);
  };

  useEffect(() => {
    fetchClasses();
  }, [user?.id]);

  useEffect(() => {
    if (classroomId && classes.length > 0) {
      const classroom = classes.find(c => c.id === classroomId);
      if (classroom) {
        selectClassroom(classroom);
      }
    }
  }, [classroomId, classes]);

  const fetchClasses = async () => {
    try {
      if (isTeacher) {
        // Use /classrooms/ directly — the backend already filters by advisory + subject assignments for staff.
        // The old by_teacher endpoint only returned classrooms with subject assignments,
        // leaving advisory-only teachers with an empty list.
        const res = await api.get('/classrooms/');
        const classroomList = Array.isArray(res.data) ? res.data : res.data?.results || [];

        // For each classroom, fetch subjects assigned to this teacher
        const withSubjects = await Promise.all(
          classroomList.map(async (cls) => {
            try {
              const subjRes = await api.get(`/classroom-subjects/by_classroom/?classroom_id=${cls.id}`);
              const mySubjects = (Array.isArray(subjRes.data) ? subjRes.data : [])
                .filter(s => s.teacher === user?.id)
                .map(s => ({ id: s.subject, name: s.subject_name, code: s.subject_code }));
              return {
                id: cls.id,
                name: cls.name,
                grade_level: cls.grade_level,
                teacher: cls.teacher,
                teacher_name: cls.teacher_name,
                teacher_profile_picture: cls.teacher_profile_picture,
                subjects: mySubjects,
                studentCount: cls.student_count ?? null,
                students: [],
                color: getClassroomColor(cls.name),
              };
            } catch {
              return {
                id: cls.id,
                name: cls.name,
                grade_level: cls.grade_level,
                teacher: cls.teacher,
                teacher_name: cls.teacher_name,
                teacher_profile_picture: cls.teacher_profile_picture,
                subjects: [],
                studentCount: cls.student_count ?? null,
                students: [],
                color: getClassroomColor(cls.name),
              };
            }
          })
        );

        setClasses(withSubjects);
      } else {
        // Students: fetch enrollments then resolve classroom details
        const res = await api.get(`/enrollments/?student=${user?.id}`);
        const classroomIds = [...new Set(res.data.map(e => e.classroom))];
        const classroomsData = await Promise.all(classroomIds.map(id => api.get(`/classrooms/${id}/`)));
        setClasses(classroomsData.map((r) => ({
          ...r.data,
          color: getClassroomColor(r.data.name),
        })));
      }
    } catch {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const selectClassroom = async (classroom) => {
    setSelectedClass(classroom);
    // Update URL with both tab and classroom params
    const newParams = new URLSearchParams(searchParams);
    newParams.set('classroom', classroom.id.toString());
    setSearchParams(newParams);
    setLoading(true);
    
    try {
      // Fetch classroom details
      const [materialsRes, studentsRes, announcementsRes, subjectsRes] = await Promise.all([
        api.get(`/materials/?classroom=${classroom.id}`),
        api.get(`/enrollments/?classroom=${classroom.id}`),
        api.get(`/announcements/?classroom=${classroom.id}`),
        api.get(`/classroom-subjects/?classroom=${classroom.id}`),
      ]);
      
      setMaterials(materialsRes.data);
      setStudents(studentsRes.data);
      setAnnouncements(announcementsRes.data.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      ));
      const subjData = Array.isArray(subjectsRes.data) ? subjectsRes.data : subjectsRes.data?.results || [];
      setClassroomSubjects(subjData);
    } catch {
      toast.error('Failed to load classroom details');
    } finally {
      setLoading(false);
    }
  };

  const handlePostAnnouncement = async () => {
    if (!announcementText.trim()) {
      toast.error('Announcement cannot be empty');
      return;
    }
    
    setLoadingAnnouncements(true);
    try {
      const formData = new FormData();
      formData.append('classroom', selectedClass.id);
      formData.append('content', announcementText.trim());
      formData.append('title', announcementTitle.trim() || '');
      announcementFiles.forEach(f => formData.append('attachments', f));

      const response = await api.post('/announcements/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setAnnouncements([response.data, ...announcements]);
      setAnnouncementText('');
      setAnnouncementTitle('');
      setAnnouncementFiles([]);
      toast.success('Announcement posted');
    } catch (error) {
      toast.error('Failed to post announcement');
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const handleEditAnnouncement = async () => {
    if (!editAnnouncementContent.trim()) return toast.error('Content cannot be empty');
    try {
      const res = await api.patch(`/announcements/${editingAnnouncement.id}/`, {
        title: editAnnouncementTitle.trim(),
        content: editAnnouncementContent.trim()
      });
      setAnnouncements(announcements.map(a => a.id === editingAnnouncement.id ? res.data : a));
      setEditingAnnouncement(null);
      toast.success('Announcement updated');
    } catch {
      toast.error('Failed to update announcement');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcements/${id}/`);
      setAnnouncements(announcements.filter(a => a.id !== id));
      toast.success('Announcement deleted');
    } catch {
      toast.error('Failed to delete announcement');
    }
  };

  const handleUploadMaterial = async () => {
    if (!uploadForm.title.trim()) return toast.error('Title is required');
    if (!uploadForm.file) return toast.error('Please select a file');

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', uploadForm.title.trim());
      fd.append('description', uploadForm.description.trim());
      fd.append('material_type', uploadForm.material_type);
      fd.append('classroom', selectedClass.id);
      fd.append('file', uploadForm.file);
      if (uploadForm.quarter) fd.append('quarter', uploadForm.quarter);
      if (uploadForm.week) fd.append('week', uploadForm.week);

      const res = await api.post('/materials/', fd, { headers: { 'Content-Type': undefined } });
      setMaterials([res.data, ...materials]);
      setShowUploadModal(false);
      setUploadForm({ title: '', description: '', material_type: 'dlp', file: null, quarter: '', week: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Material uploaded');
    } catch (err) {
      toast.error(err.response?.data?.file?.[0] || err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('Delete this material? This cannot be undone.')) return;
    try {
      await api.delete(`/materials/${materialId}/`);
      setMaterials(materials.filter(m => m.id !== materialId));
      toast.success('Material deleted');
    } catch {
      toast.error('Failed to delete material');
    }
  };

  const getClassroomColor = (name) => {
    const gradeMatch = name.match(/grade\s*(\d+)/i);
    const gradeNum = gradeMatch ? parseInt(gradeMatch[1]) : 0;
    const gradeColors = {
      7: 'bg-gradient-to-br from-green-500 to-green-600',
      8: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      9: 'bg-gradient-to-br from-red-500 to-red-600',
      10: 'bg-gradient-to-br from-blue-500 to-blue-600',
      11: 'bg-gradient-to-br from-pink-500 to-pink-600',
      12: 'bg-gradient-to-br from-gray-900 to-black',
    };
    return gradeColors[gradeNum] || 'bg-gradient-to-br from-slate-500 to-slate-600';
  };

  const getMaterialIcon = (type) => {
    const icons = {
      dlp: FileText,
      dll: BookOpen,
      module: Folder,
      activity: CheckSquare,
      assessment: Award,
      other: FileText
    };
    return icons[type] || FileText;
  };

  const filteredMaterials = useMemo(() => {
    if (!searchQuery) return materials;
    return materials.filter(m =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [materials, searchQuery]);

  // If no classroom is selected, show class list
  if (!selectedClass) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-bottom-safe max-w-[1800px] mx-auto bg-slate-50 px-4 py-6 md:px-8 md:py-8"
      >
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">My Classes</h1>
              <p className="text-[10px] text-slate-500">
                {isTeacher ? 'Classes you teach' : 'Your enrolled classes'}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        ) : classes.length === 0 ? (
          <Card>
            <CardBody className="p-8">
              <EmptyState
                title="No Classes Found"
                description={isTeacher
                  ? "You haven't been assigned to any classes yet."
                  : "You're not enrolled in any classes yet."}
                icon={<BookOpen className="w-6 h-6" />}
              />
            </CardBody>
          </Card>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3`}>
            {classes.map(classroom => (
              <motion.div
                key={classroom.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -3 }}
                className="group cursor-pointer"
                onClick={() => selectClassroom(classroom)}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-0">
                  {/* Header with gradient */}
                  <div className={`${classroom.color} h-20 relative`}>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
                    <div className="absolute bottom-2 left-3 right-3">
                      <h3 className="text-sm font-bold text-white truncate">
                        {classroom.name}
                      </h3>
                      {isTeacher && classroom.subjects && (
                        <p className="text-[10px] text-white/90 mt-0.5">
                          {classroom.subjects.length} {classroom.subjects.length === 1 ? 'Subject' : 'Subjects'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <CardBody className="p-2.5">
                    {classroom.teacher_name && classroom.teacher_name !== 'No Adviser' && (
                      <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-slate-100">
                        {classroom.teacher_profile_picture ? (
                          <img src={classroom.teacher_profile_picture} alt="" className="w-5 h-5 rounded-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-[8px] font-bold shrink-0">
                            {classroom.teacher_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                        )}
                        <span className="text-[10px] font-medium text-slate-600 truncate">{classroom.teacher_name}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-600">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>
                          {classroom.studentCount !== null && classroom.studentCount !== undefined
                            ? `${classroom.studentCount}`
                            : (classroom.students?.length || 0)
                          }
                        </span>
                      </div>
                      {isTeacher && (
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all" />
                      )}
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // Classroom detail view
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="page-bottom-safe min-h-screen bg-slate-50"
    >
      {/* Header Banner */}
      <div className={`${selectedClass.color} relative`}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
        <div className="relative max-w-[1800px] mx-auto px-3 py-4 md:px-6 md:py-6">
          <button
            onClick={() => {
              setSelectedClass(null);
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('classroom');
              setSearchParams(newParams);
            }}
            className="flex items-center gap-1.5 text-white/90 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[10px] font-medium">Back</span>
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
                {selectedClass.name}
              </h1>
              {selectedClass.teacher_name && selectedClass.teacher_name !== 'No Adviser' && (
                <div className="flex items-center gap-1.5 mb-2">
                  {selectedClass.teacher_profile_picture ? (
                    <img src={selectedClass.teacher_profile_picture} alt="" className="w-6 h-6 rounded-full object-cover border border-white/40" loading="lazy" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-[8px] font-bold border border-white/40 shrink-0">
                      {selectedClass.teacher_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                  )}
                  <span className="text-[10px] font-medium text-white/90">{selectedClass.teacher_name}</span>
                </div>
              )}
              {isTeacher && selectedClass.subjects && (
                <div className="flex flex-wrap gap-1">
                  {selectedClass.subjects.map(subject => (
                    <Badge key={subject.id} variant="white" className="bg-white/20 text-white border-white/30 text-[9px] px-1.5 py-0.5">
                      {subject.code}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading banner — shown while classroom data is being fetched */}
      {loading && (
        <div className="bg-white border-b border-slate-200 px-3 md:px-6 py-2 flex items-center gap-2 text-[10px] text-slate-600">
          <div className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Loading…</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1800px] mx-auto px-3 md:px-6">
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {[
              { key: 'stream', label: 'Stream', icon: MessageSquare },
              { key: 'materials', label: 'Materials', icon: Folder },
              { key: 'people', label: 'People', icon: Users },
              { key: 'attendance', label: isTeacher ? 'Attendance' : 'My Attendance', icon: CheckSquare },
              { key: 'grades', label: isTeacher ? 'Grades' : 'My Grades', icon: Award },
              { key: 'quizzes', label: isTeacher ? 'Quiz Management' : 'Quizzes', icon: HelpCircle },
              ...(isTeacher ? [
                { key: 'lesson-plans', label: 'Lesson Plans', icon: FileText },
                { key: 'analytics', label: 'Analytics', icon: BarChart2 },
              ] : []),
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`flex items-center gap-1 px-2.5 py-2 text-[10px] font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-violet-600 text-violet-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-[1800px] mx-auto px-3 py-4 md:px-6 md:py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'stream' && (
            <StreamTab
              classroom={selectedClass}
              isTeacher={isTeacher}
              announcements={announcements}
              classroomSubjects={classroomSubjects}
              announcementTitle={announcementTitle}
              setAnnouncementTitle={setAnnouncementTitle}
              announcementText={announcementText}
              setAnnouncementText={setAnnouncementText}
              announcementFiles={announcementFiles}
              setAnnouncementFiles={setAnnouncementFiles}
              handlePostAnnouncement={handlePostAnnouncement}
              handleEditAnnouncement={handleEditAnnouncement}
              handleDeleteAnnouncement={handleDeleteAnnouncement}
              editingAnnouncement={editingAnnouncement}
              setEditingAnnouncement={setEditingAnnouncement}
              editAnnouncementTitle={editAnnouncementTitle}
              setEditAnnouncementTitle={setEditAnnouncementTitle}
              editAnnouncementContent={editAnnouncementContent}
              setEditAnnouncementContent={setEditAnnouncementContent}
              loadingAnnouncements={loadingAnnouncements}
              announcementSearch={announcementSearch}
              setAnnouncementSearch={setAnnouncementSearch}
            />
          )}

          {activeTab === 'materials' && (
            <MaterialsTab
              classroom={selectedClass}
              materials={filteredMaterials}
              isTeacher={isTeacher}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              getMaterialIcon={getMaterialIcon}
              loading={loading}
              onUploadClick={() => setShowUploadModal(true)}
              onDeleteMaterial={handleDeleteMaterial}
            />
          )}

          {activeTab === 'people' && (
            <PeopleTab
              classroom={selectedClass}
              students={students}
              isTeacher={isTeacher}
              loading={loading}
              peopleSearch={peopleSearch}
              setPeopleSearch={setPeopleSearch}
              onStudentClick={setSelectedStudent}
              isStudent={user?.role === 'student'}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceView
              classroom={selectedClass}
              isStudent={user?.role === 'student'}
              onBack={() => handleTabChange('stream')}
            />
          )}

          {activeTab === 'grades' && (
            <GradesTab
              classroom={selectedClass}
              isTeacher={isTeacher}
              navigate={navigate}
            />
          )}

          {activeTab === 'quizzes' && isTeacher && (
            <QuizManagementView classroom={selectedClass} />
          )}

          {activeTab === 'quizzes' && !isTeacher && (
            <StudentQuizzesView classroom={selectedClass} />
          )}

          {activeTab === 'lesson-plans' && isTeacher && (
            <LessonPlansView classroom={selectedClass} />
          )}

          {activeTab === 'analytics' && isTeacher && (
            <ClassroomAnalyticsView classroom={selectedClass} />
          )}
        </AnimatePresence>
      </div>

      {/* Upload Material Modal */}
      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} size="md">
        <ModalBody>
          <h3 className="text-sm font-bold text-slate-900 mb-0.5">Upload Material</h3>
          <p className="text-[10px] text-slate-500 mb-3">Add a learning material to {selectedClass?.name}</p>
          <div className="space-y-2">
            <div>
              <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Title *</label>
              <input type="text" value={uploadForm.title} onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                className={modalInputCls + ' text-xs py-1.5'} placeholder="Material title" required />
            </div>
            <div>
              <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Description</label>
              <textarea value={uploadForm.description} onChange={e => setUploadForm({ ...uploadForm, description: e.target.value })}
                className={modalInputCls + ' text-xs'} rows={2} placeholder="Brief description (optional)" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Type *</label>
                <select value={uploadForm.material_type} onChange={e => setUploadForm({ ...uploadForm, material_type: e.target.value })}
                  className={modalInputCls + ' text-xs py-1.5'}>
                  <option value="dlp">Daily Lesson Plan</option>
                  <option value="dll">Daily Lesson Log</option>
                  <option value="module">Learning Module</option>
                  <option value="activity">Activity Sheet</option>
                  <option value="assessment">Assessment</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">File *</label>
                <input type="file" ref={fileInputRef} onChange={e => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                  className="w-full text-[10px] text-slate-700 file:mr-1 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-violet-100 file:text-violet-700 hover:file:bg-violet-200" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Term</label>
                <select value={uploadForm.quarter} onChange={e => setUploadForm({ ...uploadForm, quarter: e.target.value })}
                  className={modalInputCls + ' text-xs py-1.5'}>
                  <option value="">None</option>
                  <option value="1">1st Term</option>
                  <option value="2">2nd Term</option>
                  <option value="3">3rd Term</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-slate-700 mb-0.5">Week</label>
                <input type="number" min="1" value={uploadForm.week} onChange={e => setUploadForm({ ...uploadForm, week: e.target.value })}
                  className={modalInputCls + ' text-xs py-1.5'} placeholder="Week #" />
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <ModalBtnSecondary onClick={() => setShowUploadModal(false)} className="text-[10px] px-2 py-1">Cancel</ModalBtnSecondary>
          <ModalBtnPrimary onClick={handleUploadMaterial} loading={uploading} disabled={!uploadForm.title.trim() || !uploadForm.file} className="text-[10px] px-2 py-1">
            Upload
          </ModalBtnPrimary>
        </ModalFooter>
      </Modal>
      {/* Student Detail Drawer */}
      {selectedStudent && (
        <StudentDetailDrawer
          student={selectedStudent}
          classroom={selectedClass}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </motion.div>
  );
};

// ── Student Detail Drawer ─────────────────────────────────────────────────
const StudentDetailDrawer = ({ student, classroom, onClose }) => {
  const [tab, setTab] = useState('personal');
  const [profileData, setProfileData] = useState(null);
  const [appData, setAppData] = useState(null);
  const [grades, setGrades] = useState([]);
  const [attend, setAttend] = useState([]);
  const [records, setRecords] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!student?.student) return;
    setLoadingData(true);
    Promise.allSettled([
      api.get(`/student/profile/?student_id=${student.student}`),
      api.get(`/enrollment-applications/?enrolled_student=${student.student}`),
      api.get(`/grades/?student=${student.student}`),
      api.get(`/attendance/?student=${student.student}`),
      api.get(`/record-requests/?student=${student.student}`),
    ]).then(([profRes, appRes, gradeRes, attRes, recRes]) => {
      if (profRes.status === 'fulfilled') setProfileData(profRes.value.data);
      if (appRes.status === 'fulfilled') {
        const apps = appRes.value.data?.results || appRes.value.data || [];
        setAppData(Array.isArray(apps) ? apps[0] || null : null);
      }
      if (gradeRes.status === 'fulfilled') setGrades(Array.isArray(gradeRes.value.data) ? gradeRes.value.data : gradeRes.value.data?.results || []);
      if (attRes.status === 'fulfilled') setAttend(Array.isArray(attRes.value.data) ? attRes.value.data : attRes.value.data?.results || []);
      if (recRes.status === 'fulfilled') setRecords(Array.isArray(recRes.value.data) ? recRes.value.data : recRes.value.data?.results || []);
    }).finally(() => setLoadingData(false));
  }, [student?.student]);

  const fullName = student.student_name || '—';
  const lrn = student.student_lrn || profileData?.profile?.registration_number || '—';
  const email = student.student_email || profileData?.email || '—';
  const initials = fullName.trim().split(/\s+/).slice(0, 2).map(n => n.charAt(0).toUpperCase()).join('');

  const presentCount = attend.filter(a => a.status === 'present').length;
  const lateCount = attend.filter(a => a.status === 'late').length;
  const absentCount = attend.filter(a => a.status === 'absent').length;
  const attRate = attend.length > 0
    ? Math.round(((presentCount + lateCount) / attend.length) * 100) : null;

  const finalGrades = grades.filter(g => g.grade_type === 'final_grade' && g.raw_score != null);
  const overallAvg = finalGrades.length
    ? (finalGrades.reduce((s, g) => s + parseFloat(g.raw_score), 0) / finalGrades.length).toFixed(1) : null;

  const TABS = [
    { id: 'personal', label: 'Personal' },
    { id: 'academic', label: 'Academic' },
    { id: 'family', label: 'Family' },
    { id: 'documents', label: 'Documents' },
    { id: 'records', label: 'Records' },
  ];

  const Field = ({ label, value, mono = false }) => (
    <div className="py-1.5 border-b border-slate-100 last:border-0">
      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`text-[10px] font-semibold text-slate-800 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );

  const docTypeLabel = {
    birth_certificate: 'PSA Birth Certificate',
    report_card: 'Report Card',
    form_138: 'Form 138',
    certificate_of_completion: 'Certificate of Completion',
    good_moral: 'Good Moral Certificate',
    id_picture: 'ID Picture',
    last_school_attended: 'Last School Attended Cert.',
    other: 'Other Document',
  };

  return (
    <div className="fixed inset-0 z-[9999] flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        <div className="bg-[#5e2a84] px-4 py-3 flex items-start gap-3 flex-shrink-0">
          {student.student_profile_picture ? (
            <img src={student.student_profile_picture} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/30 flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-black text-white">{initials}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-black text-white uppercase tracking-wide leading-tight truncate">{fullName}</h2>
            <p className="text-violet-200 text-[9px] mt-0.5 font-mono">LRN: {lrn}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-violet-300 text-[9px]">{classroom?.name || ''}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white transition-all flex-shrink-0 mt-0.5">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white border-b border-slate-200 px-3 flex gap-0 flex-shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-[9px] font-bold whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50">
          {loadingData && tab !== 'personal' ? (
            <div className="flex items-center justify-center h-24">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {tab === 'personal' && (
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Personal Information</p>
                  </div>
                  <div className="px-3">
                    <Field label="Full Name" value={fullName} />
                    <Field label="Student ID / LRN" value={lrn} mono />
                    <Field label="Date of Birth" value={profileData?.profile?.date_of_birth} />
                    <Field label="Sex" value={student.student_sex || profileData?.profile?.sex} />
                    <Field label="Nationality" value={profileData?.profile?.nationality} />
                    <Field label="Address" value={profileData?.profile?.address} />
                    <Field label="Phone Number" value={profileData?.profile?.phone_number} />
                    <Field label="Email" value={email} />
                  </div>
                </div>
              )}

              {tab === 'academic' && (
                <div className="space-y-3">
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Enrollment Info</p>
                    </div>
                    <div className="px-3">
                      <Field label="Grade Level" value={profileData?.profile?.grade_level} />
                      <Field label="Section / Classroom" value={classroom?.name || '—'} />
                      <Field label="School Year" value={appData?.school_year} />
                      <Field label="Enrollment Type" value={appData?.enrollment_type?.replace(/_/g, ' ')} />
                      <Field label="Strand" value={appData?.strand} />
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Attendance Summary</p>
                    </div>
                    <div className="p-3 grid grid-cols-4 gap-2">
                      {[
                        { label: 'Present', val: presentCount, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                        { label: 'Late', val: lateCount, color: 'text-amber-700 bg-amber-50 border-amber-200' },
                        { label: 'Absent', val: absentCount, color: 'text-rose-700 bg-rose-50 border-rose-200' },
                        { label: 'Rate', val: attRate !== null ? `${attRate}%` : '—', color: 'text-violet-700 bg-violet-50 border-violet-200' },
                      ].map(s => (
                        <div key={s.label} className={`border rounded-lg p-2 text-center ${s.color}`}>
                          <p className="text-sm font-black">{s.val}</p>
                          <p className="text-[8px] font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {finalGrades.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Subject Grades</p>
                        {overallAvg && <span className="text-[10px] font-black text-violet-700">Avg: {overallAvg}</span>}
                      </div>
                      <div className="divide-y divide-slate-100">
                        {finalGrades.map(g => (
                          <div key={g.id} className="flex items-center justify-between px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-900 truncate">{g.subject_name}</p>
                              <p className="text-[8px] text-slate-400">T{g.quarter} · {g.academic_year}</p>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                              parseFloat(g.raw_score) >= 90 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                              parseFloat(g.raw_score) >= 75 ? 'text-blue-700 bg-blue-50 border-blue-200' :
                              'text-rose-700 bg-rose-50 border-rose-200'
                            }`}>{g.raw_score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'family' && (
                <div className="space-y-3">
                  {[
                    { title: 'Father', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700',
                      fields: [['Name', appData?.father_name], ['Contact', appData?.father_contact], ['Email', appData?.father_email], ['Occupation', appData?.father_occupation]] },
                    { title: 'Mother', color: 'bg-rose-50 border-rose-200', textColor: 'text-rose-700',
                      fields: [['Name', appData?.mother_name], ['Contact', appData?.mother_contact], ['Email', appData?.mother_email], ['Occupation', appData?.mother_occupation]] },
                    ...(appData?.guardian_name ? [{ title: 'Guardian', color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-700',
                      fields: [['Name', appData?.guardian_name], ['Relationship', appData?.guardian_relationship], ['Contact', appData?.guardian_contact]] }] : []),
                  ].map(({ title, color, textColor, fields }) => (
                    <div key={title} className={`rounded-xl border ${color} overflow-hidden`}>
                      <div className={`px-3 py-2 ${color}`}>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${textColor}`}>{title}</p>
                      </div>
                      <div className="px-3 bg-white divide-y divide-slate-100">
                        {fields.map(([label, val]) => val ? <Field key={label} label={label} value={val} /> : null)}
                        {fields.every(([, v]) => !v) && <p className="py-2 text-[10px] text-slate-400 italic">No information provided</p>}
                      </div>
                    </div>
                  ))}
                  {!appData && !loadingData && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                      <p className="text-[10px] text-slate-400">No enrollment application found.</p>
                    </div>
                  )}
                </div>
              )}

              {tab === 'documents' && (
                <div className="space-y-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-[9px] text-amber-800">Documents submitted during enrollment.</p>
                  </div>

                  {appData?.documents && appData.documents.length > 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {appData.documents.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                              doc.verification_status === 'verified' ? 'bg-emerald-50' :
                              doc.verification_status === 'rejected' ? 'bg-rose-50' : 'bg-slate-100'
                            }`}>
                              <FileText className={`w-3 h-3 ${
                                doc.verification_status === 'verified' ? 'text-emerald-600' :
                                doc.verification_status === 'rejected' ? 'text-rose-600' : 'text-slate-400'
                              }`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-900 truncate">{docTypeLabel[doc.document_type] || doc.document_type_display || doc.document_type}</p>
                              <span className={`text-[8px] font-bold uppercase px-1 py-0 rounded ${
                                doc.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                                doc.verification_status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>{doc.verification_status_display || doc.verification_status}</span>
                            </div>
                          </div>
                          {doc.file_url && (
                            <a href={doc.file_url} target="_blank" rel="noreferrer"
                              className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors flex-shrink-0">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                      <FileText className="w-6 h-6 text-slate-200 mx-auto mb-2" />
                      <p className="text-[10px] font-semibold text-slate-400">No documents on file</p>
                    </div>
                  )}
                </div>
              )}

              {tab === 'records' && (
                <div className="space-y-3">
                  {records.length > 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Document Requests</p>
                      </div>
                      {records.map(r => (
                        <div key={r.id} className="flex items-center justify-between px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-900 truncate">{r.record_type_display || r.record_type}</p>
                            <p className="text-[8px] text-slate-400">{r.purpose || ''} · {new Date(r.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className={`text-[8px] font-bold px-1.5 py-0 rounded border uppercase ${
                            r.status === 'approved' || r.status === 'released' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            r.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>{r.status}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                      <FileText className="w-6 h-6 text-slate-200 mx-auto mb-2" />
                      <p className="text-[10px] font-semibold text-slate-400">No record requests</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Stream Tab Component
const StreamTab = ({ classroom, isTeacher, announcements, classroomSubjects, announcementTitle, setAnnouncementTitle, announcementText, setAnnouncementText, announcementFiles, setAnnouncementFiles, handlePostAnnouncement, handleEditAnnouncement, handleDeleteAnnouncement, editingAnnouncement, setEditingAnnouncement, editAnnouncementTitle, setEditAnnouncementTitle, editAnnouncementContent, setEditAnnouncementContent, loadingAnnouncements, announcementSearch, setAnnouncementSearch }) => {
  const filteredAnnouncements = useMemo(() => {
    if (!announcementSearch) return announcements;
    const q = announcementSearch.toLowerCase();
    return announcements.filter(a =>
      (a.title || '').toLowerCase().includes(q) ||
      (a.content || '').toLowerCase().includes(q) ||
      (a.author_name || '').toLowerCase().includes(q)
    );
  }, [announcements, announcementSearch]);

  return (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-6"
  >
    {isTeacher && (
      <Card>
        <CardBody className="p-3">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              className="px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs font-semibold"
              placeholder="Announcement title (optional)"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <textarea
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none text-xs"
                placeholder="Share an announcement..."
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                rows={2}
              />
            </div>
            {announcementFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {announcementFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-[10px] text-slate-700">
                    {f.type?.startsWith('image/') ? (
                      <img src={URL.createObjectURL(f)} alt="" className="w-6 h-6 rounded object-cover" onLoad={(e) => URL.revokeObjectURL(e.target.src)} />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-violet-500" />
                    )}
                    <span className="max-w-[100px] truncate">{f.name}</span>
                    <button onClick={() => setAnnouncementFiles(prev => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-500 hover:bg-slate-100 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Attach files</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setAnnouncementFiles(prev => [...prev, ...files].slice(0, 5));
                    e.target.value = '';
                  }}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt"
                />
              </label>
              <Button
                onClick={handlePostAnnouncement}
                variant="primary"
                size="sm"
                disabled={(!announcementText.trim() && announcementFiles.length === 0) || loadingAnnouncements}
                loading={loadingAnnouncements}
                className="text-[10px] px-2 py-1"
              >
                Post
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    )}

    {/* Teachers & Subjects */}
    {classroomSubjects.length > 0 && (
      <Card>
        <CardBody className="p-3">
          <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Teachers & Subjects</h3>
          <div className="space-y-1">
            {classroomSubjects.map(cs => (
              <div key={cs.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-[8px] flex-shrink-0">
                  {cs.teacher_name ? cs.teacher_name.trim().split(/\s+/).slice(0, 2).map(n => n.charAt(0).toUpperCase()).join('') : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-900 truncate">{cs.teacher_name}</p>
                  <p className="text-[9px] text-slate-500 truncate">{cs.subject_name} ({cs.subject_code})</p>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    )}

    {/* Search announcements */}
    {announcements.length > 0 && (
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={announcementSearch}
          onChange={(e) => setAnnouncementSearch(e.target.value)}
          placeholder="Search announcements..."
          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs"
        />
      </div>
    )}

    {filteredAnnouncements.length === 0 ? (
      <Card>
        <CardBody className="p-6 text-center">
          <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-600">{announcementSearch ? 'No matching announcements' : 'No announcements yet'}</p>
        </CardBody>
      </Card>
    ) : (
      <div className="space-y-2">
        {filteredAnnouncements.map(announcement => (
          <Card key={announcement.id}>
            <CardBody className="p-3">
              {editingAnnouncement?.id === announcement.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editAnnouncementTitle}
                    onChange={(e) => setEditAnnouncementTitle(e.target.value)}
                    placeholder="Title (optional)"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs font-semibold"
                  />
                  <textarea
                    value={editAnnouncementContent}
                    onChange={(e) => setEditAnnouncementContent(e.target.value)}
                    rows={2}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs resize-none"
                  />
                  <div className="flex items-center gap-1.5 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingAnnouncement(null)} className="text-[10px] px-2 py-1">Cancel</Button>
                    <Button variant="primary" size="sm" onClick={handleEditAnnouncement} className="text-[10px] px-2 py-1">Save</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {announcement.title && (
                      <h4 className="text-xs font-semibold text-slate-900 mb-0.5">{announcement.title}</h4>
                    )}
                    <p className="text-[11px] text-slate-700 whitespace-pre-wrap">{announcement.content}</p>
                    {announcement.attachments?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {announcement.attachments.map(att => (
                          <a key={att.id} href={att.url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-violet-700 hover:bg-violet-50 transition-colors">
                            {att.is_image ? (
                              <img src={att.url} alt="" className="w-5 h-5 rounded object-cover" />
                            ) : (
                              <FileText className="w-3.5 h-3.5" />
                            )}
                            <span className="max-w-[120px] truncate">{att.filename || 'File'}</span>
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5 text-[9px] text-slate-500">
                      <span>{announcement.author_name || 'Teacher'}</span>
                      <span>·</span>
                      <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                      {isTeacher && (
                        <>
                          <span>·</span>
                          <button onClick={() => {
                            setEditingAnnouncement(announcement);
                            setEditAnnouncementTitle(announcement.title || '');
                            setEditAnnouncementContent(announcement.content || '');
                          }} className="text-violet-600 hover:text-violet-800 font-semibold">Edit</button>
                          <button onClick={() => handleDeleteAnnouncement(announcement.id)} className="text-red-500 hover:text-red-700 font-semibold">Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    )}
  </motion.div>
  );
};

// Materials Tab Component
const MaterialsTab = ({ classroom, materials, isTeacher, searchQuery, setSearchQuery, getMaterialIcon, loading, onUploadClick, onDeleteMaterial }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-6"
  >
    {/* Search and Actions */}
    <div className="flex items-center gap-2">
      <div className="flex-1 relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search materials..."
          className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs"
        />
      </div>
      {isTeacher && (
        <Button variant="primary" onClick={onUploadClick} className="text-[10px] px-2 py-1">
          <Upload className="w-3 h-3 mr-1" />
          Upload
        </Button>
      )}
    </div>

    {loading ? (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    ) : materials.length === 0 ? (
      <Card>
        <CardBody className="p-8">
          <EmptyState
            title="No Materials Yet"
            description={isTeacher ? "Upload your first material to get started" : "Your teacher hasn't uploaded any materials yet"}
            icon={<Folder className="w-6 h-6" />}
          />
        </CardBody>
      </Card>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {materials.map(material => {
          const Icon = getMaterialIcon(material.material_type);
          return (
            <a
              key={material.id}
              href={material.file || undefined}
              target={material.file ? '_blank' : undefined}
              rel={material.file ? 'noopener noreferrer' : undefined}
              className="block"
              onClick={(e) => { if (!material.file) e.preventDefault(); }}
            >
              <Card className={`hover:shadow-md transition-shadow ${material.file ? 'cursor-pointer' : ''}`}>
                <CardBody className="p-3">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-semibold text-slate-900 truncate">{material.title}</h3>
                      <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-1">{material.description}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Badge variant="slate" size="sm" className="text-[8px] px-1 py-0">{material.material_type?.toUpperCase()}</Badge>
                        {material.quarter && (
                          <Badge variant="blue" size="sm" className="text-[8px] px-1 py-0">T{material.quarter}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-100">
                    <span className="text-[9px] text-slate-500">
                      <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                      {new Date(material.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {material.file ? (
                        <span className="text-[9px] text-violet-600 font-medium flex items-center gap-0.5">
                          <Download className="w-2.5 h-2.5" /> Open
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400">No file</span>
                      )}
                      {isTeacher && (
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDeleteMaterial(material.id); }} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-0.5">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            </a>
          );
        })}
      </div>
    )}
  </motion.div>
);

// People Tab Component
const PeopleTab = ({ classroom, students, isTeacher, loading, peopleSearch, setPeopleSearch, onStudentClick, isStudent }) => {
  const sortedStudents = useMemo(() => {
    const list = Array.isArray(students) ? [...students] : [];
    const filtered = peopleSearch
      ? list.filter(s => (s.student_name || '').toLowerCase().includes(peopleSearch.toLowerCase()) || (s.student_email || '').toLowerCase().includes(peopleSearch.toLowerCase()))
      : list;
    filtered.sort((a, b) => {
      const sexA = (a.student_sex || '').toLowerCase();
      const sexB = (b.student_sex || '').toLowerCase();
      if (sexA !== sexB) {
        if (sexA === 'male') return -1;
        if (sexB === 'male') return 1;
      }
      const nameA = (a.student_name || '').toLowerCase();
      const nameB = (b.student_name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
    return filtered;
  }, [students, peopleSearch]);

  const maleStudents = sortedStudents.filter(s => (s.student_sex || '').toLowerCase() === 'male');
  const femaleStudents = sortedStudents.filter(s => (s.student_sex || '').toLowerCase() === 'female');
  const otherStudents = sortedStudents.filter(s => !['male', 'female'].includes((s.student_sex || '').toLowerCase()));

  const renderStudent = (student) => (
    <div key={student.id} onClick={() => !isStudent && onStudentClick?.(student)} className={`flex items-center gap-2 p-2 rounded-lg hover:bg-violet-50 transition-colors ${isStudent ? 'cursor-default' : 'cursor-pointer'} border border-transparent hover:border-violet-200`}>
      {student.student_profile_picture ? (
        <img src={student.student_profile_picture} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px]">
          {student.student_name
            ? student.student_name.trim().split(/\s+/).slice(0, 2).map(n => n.charAt(0).toUpperCase()).join('')
            : '?'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-slate-900 truncate">
          {student.student_name || student.student_email || 'Unknown Student'}
        </p>
        {student.student_email && (
          <p className="text-[9px] text-slate-500 truncate">{student.student_email}</p>
        )}
        {student.student_lrn && (
          <p className="text-[9px] text-slate-400">LRN: {student.student_lrn}</p>
        )}
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <Card>
      <CardHeader divider>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs">Students</CardTitle>
          <Badge variant="slate" className="text-[9px]">{sortedStudents.length} enrolled</Badge>
        </div>
      </CardHeader>
      <CardBody className="p-3">
        {students.length > 3 && (
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={peopleSearch}
              onChange={(e) => setPeopleSearch(e.target.value)}
              placeholder="Search students..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs"
            />
          </div>
        )}
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner />
            </div>
          ) : sortedStudents.length === 0 ? (
            <EmptyState
              title="No Students"
              description="No students are enrolled in this class"
              icon={<Users className="w-6 h-6" />}
            />
          ) : (
            <div className="space-y-3">
              {maleStudents.length > 0 && (
                <div>
                  <h4 className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-1 px-1">Male ({maleStudents.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0.5">
                    {maleStudents.map(renderStudent)}
                  </div>
                </div>
              )}
              {femaleStudents.length > 0 && (
                <div>
                  <h4 className="text-[9px] font-bold text-pink-600 uppercase tracking-widest mb-1 px-1">Female ({femaleStudents.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0.5">
                    {femaleStudents.map(renderStudent)}
                  </div>
                </div>
              )}
              {otherStudents.length > 0 && (
                <div>
                  <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 px-1">Other ({otherStudents.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0.5">
                    {otherStudents.map(renderStudent)}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </motion.div>
  );
};

// Grades Tab Component - Enhanced with inline functionality
const GradesTab = ({ classroom, isTeacher, navigate }) => {
  const [activeView, setActiveView] = useState('overview'); // overview, input, manage, attendance, analytics
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeView === 'overview') {
      fetchGradesOverview();
    }
  }, [activeView, classroom.id]);

  const fetchGradesOverview = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/grades/?classroom=${classroom.id}`);
      setGrades(res.data);
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  // Render different views based on activeView
  const renderView = () => {
    switch (activeView) {
      case 'input':
        return (
          <GradeInputView
            classroom={classroom}
            onBack={() => setActiveView('overview')}
          />
        );
      case 'manage':
        return (
          <GradeManagementView
            classroom={classroom}
            onBack={() => setActiveView('overview')}
          />
        );
      case 'analytics':
        return (
          <AnalyticsView
            classroom={classroom}
            onBack={() => setActiveView('overview')}
          />
        );
      default:
        return (
          <OverviewView
            classroom={classroom}
            grades={grades}
            loading={loading}
            isTeacher={isTeacher}
            onNavigate={(view) => setActiveView(view)}
            navigate={navigate}
          />
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-3"
    >
      {renderView()}
    </motion.div>
  );
};

// Overview View - Quick Actions Dashboard
const OverviewView = ({ classroom, grades, loading, isTeacher, onNavigate, navigate }) => {
  if (!isTeacher) {
    const [myGrades, setMyGrades] = useState([]);
    const [gradesLoading, setGradesLoading] = useState(true);

    useEffect(() => {
      const fetchMyGrades = async () => {
        try {
          const res = await api.get(`/grades/?classroom=${classroom.id}&grade_type=final_grade`);
          setMyGrades(res.data);
        } catch {
          // silent
        } finally {
          setGradesLoading(false);
        }
      };
      fetchMyGrades();
    }, [classroom.id]);

    const grouped = {};
    myGrades.forEach(g => {
      const key = g.subject_name || g.subject;
      if (!grouped[key]) grouped[key] = { subject: g.subject_name || g.subject, quarters: {} };
      grouped[key].quarters[g.quarter] = g.raw_score;
    });
    const subjects = Object.values(grouped);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xs">My Grades — {classroom.name}</CardTitle>
        </CardHeader>
        <CardBody className="p-3">
          {gradesLoading ? (
            <LoadingSpinner />
          ) : subjects.length === 0 ? (
            <EmptyState title="No grades yet" description="Your teacher hasn't posted grades yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-2 font-semibold text-slate-700">Subject</th>
                    <th className="text-center py-2 px-1 font-semibold text-slate-700">T1</th>
                    <th className="text-center py-2 px-1 font-semibold text-slate-700">T2</th>
                    <th className="text-center py-2 px-1 font-semibold text-slate-700">T3</th>
                    <th className="text-center py-2 px-2 font-semibold text-slate-700">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s, i) => {
                    const vals = Object.values(s.quarters).filter(v => v != null && !isNaN(v));
                    const avg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
                    return (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-1.5 px-2 font-medium text-slate-900 truncate max-w-[100px]">{s.subject}</td>
                        {[1, 2, 3].map(q => (
                          <td key={q} className="text-center py-1.5 px-1">
                            {s.quarters[q] != null ? (
                              <span className={`font-bold ${s.quarters[q] >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {parseFloat(s.quarters[q]).toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        ))}
                        <td className="text-center py-1.5 px-2">
                          {avg != null ? (
                            <span className={`font-extrabold ${parseFloat(avg) >= 75 ? 'text-emerald-700' : 'text-red-700'}`}>
                              {avg}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      {/* Quick Actions for Teachers */}
      <div className="grid grid-cols-3 gap-2">
        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer group" 
          onClick={() => onNavigate('input')}
        >
          <CardBody className="p-3 text-center">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center mx-auto mb-1.5 group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4 text-violet-600" />
            </div>
            <h3 className="text-[10px] font-semibold text-slate-900 mb-0.5">Input Grades</h3>
            <p className="text-[8px] text-slate-600">Enter grades</p>
          </CardBody>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer group" 
          onClick={() => onNavigate('manage')}
        >
          <CardBody className="p-3 text-center">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-1.5 group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-[10px] font-semibold text-slate-900 mb-0.5">Manage Grades</h3>
            <p className="text-[8px] text-slate-600">Review & adjust</p>
          </CardBody>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer group" 
          onClick={() => onNavigate('analytics')}
        >
          <CardBody className="p-3 text-center">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mx-auto mb-1.5 group-hover:scale-110 transition-transform">
              <BarChart2 className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-[10px] font-semibold text-slate-900 mb-0.5">Analytics</h3>
            <p className="text-[8px] text-slate-600">Performance</p>
          </CardBody>
        </Card>
      </div>

      {/* Grade Overview */}
      <Card>
        <CardHeader divider>
          <CardTitle className="text-xs">Grade Overview</CardTitle>
        </CardHeader>
        <CardBody className="p-3">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <LoadingSpinner />
            </div>
          ) : grades.length === 0 ? (
            <EmptyState
              title="No Grades Yet"
              description="Start by inputting grades"
              icon={<Award className="w-6 h-6" />}
            />
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-slate-600">
                {grades.length} grade records
              </p>
              <Button
                variant="primary"
                className="mt-2 text-[10px] px-2 py-1"
                onClick={() => onNavigate('manage')}
              >
                View All
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
};

// Grade Input View - Custom inline implementation
const GradeInputView = ({ classroom, onBack }) => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const [grades, setGrades] = useState({});
  const [existingGrades, setExistingGrades] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentAcademicYear, setCurrentAcademicYear] = useState(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Modal state for replace browser dialogs
  const [modalState, setModalState] = useState({
    open: false,
    type: 'confirm', // 'confirm' or 'input'
    title: '',
    message: '',
    inputValue: '',
    onConfirm: null
  });

  // Load current academic year from system settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/system/settings/');
        if (res.data?.academic_year) {
          setCurrentAcademicYear(res.data.academic_year);
        }
        if (res.data?.current_term) {
          setSelectedQuarter(parseInt(res.data.current_term, 10));
        }
      } catch {
        toast.error('Failed to load system settings. Cannot submit grades.');
      } finally {
        setSettingsLoaded(true);
      }
    };
    fetchSettings();
  }, []);

  // Load subjects for this classroom
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get(`/classroom-subjects/by_classroom/?classroom_id=${classroom.id}`);
        setSubjects(res.data);
        if (res.data.length > 0) {
          setSelectedSubject(res.data[0].subject.toString());
        }
      } catch {
        toast.error('Failed to load subjects');
      }
    };
    fetchSubjects();
  }, [classroom.id]);

  // Load students
  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/enrollments/?classroom=${classroom.id}`);
        // Sort by name
        const sorted = res.data.sort((a, b) => {
          const nameA = (a.student_name || '').toLowerCase();
          const nameB = (b.student_name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setStudents(sorted);
        // Initialize grades object
        const initGrades = {};
        sorted.forEach(s => { initGrades[s.student] = ''; });
        setGrades(initGrades);
      } catch {
        toast.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    };
    if (classroom.id) {
      fetchStudents();
    }
  }, [classroom.id]);

  // Clear entered grades when subject or quarter changes
  useEffect(() => {
    if (students.length > 0) {
      const clearedGrades = {};
      students.forEach(s => { clearedGrades[s.student] = ''; });
      setGrades(clearedGrades);
    }
  }, [selectedSubject, selectedQuarter]);

  // Load existing grades when subject or quarter changes
  useEffect(() => {
    const fetchExistingGrades = async () => {
      if (!selectedSubject || !selectedQuarter) return;
      try {
        const res = await api.get(
          `/grades/?classroom=${classroom.id}&subject=${selectedSubject}&quarter=${selectedQuarter}&grade_type=final_grade&academic_year=${currentAcademicYear}`
        );
        const gradeMap = {};
        res.data.forEach(g => {
          gradeMap[g.student] = g; // store full grade object (id, raw_score, etc.)
        });
        setExistingGrades(gradeMap);
      } catch {
        console.error('Failed to load existing grades');
      }
    };
    fetchExistingGrades();
  }, [selectedSubject, selectedQuarter, classroom.id, currentAcademicYear]);

  const handleGradeChange = (studentId, value) => {
    setGrades(prev => ({ ...prev, [studentId]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedSubject) {
      toast.error('Please select a subject');
      return;
    }

    if (!currentAcademicYear) {
      toast.error('System settings not loaded. Please refresh and try again.');
      return;
    }

    const toSubmit = students.filter(s => grades[s.student] && grades[s.student] !== '');
    if (toSubmit.length === 0) {
      toast.error('Enter at least one grade');
      return;
    }

    // Validate grades
    for (const s of toSubmit) {
      const val = parseFloat(grades[s.student]);
      if (isNaN(val) || val < 0 || val > 100) {
        toast.error(`Invalid grade for ${s.student_name || s.student_email}`);
        return;
      }
    }

    const subjectAssignment = subjects.find(s => s.subject.toString() === selectedSubject);
    if (!subjectAssignment) {
      toast.error('Subject assignment not found');
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const student of toSubmit) {
      try {
        const payload = {
          student: student.student,
          subject: parseInt(selectedSubject, 10),
          classroom: classroom.id,
          teacher: subjectAssignment.teacher,
          grade_type: 'final_grade',
          quarter: selectedQuarter,
          academic_year: currentAcademicYear,
          raw_score: parseFloat(grades[student.student]),
          total_score: 100,
        };
        const existing = existingGrades[student.student];
        if (existing?.id) {
          await api.put(`/grades/${existing.id}/`, payload);
        } else {
          await api.post('/grades/', payload);
        }
        successCount++;
      } catch (err) {
        errorCount++;
        console.error(`Failed to submit grade for ${student.student_name}`, err);
      }
    }

    setSubmitting(false);

    if (successCount > 0) {
      toast.success(`Successfully submitted ${successCount} grade(s)`);
      // Clear submitted grades
      const clearedGrades = { ...grades };
      toSubmit.forEach(s => { clearedGrades[s.student] = ''; });
      setGrades(clearedGrades);
      // Reload existing grades
      const res = await api.get(
        `/grades/?classroom=${classroom.id}&subject=${selectedSubject}&quarter=${selectedQuarter}&grade_type=final_grade&academic_year=${currentAcademicYear}`
      );
      const gradeMap = {};
      res.data.forEach(g => {
        gradeMap[g.student] = g; // store full grade object
      });
      setExistingGrades(gradeMap);
    }

    if (errorCount > 0) {
      toast.error(`Failed to submit ${errorCount} grade(s)`);
    }
  };

  const handleClearAll = () => {
    const clearedGrades = {};
    students.forEach(s => { clearedGrades[s.student] = ''; });
    setGrades(clearedGrades);
    toast.success('All grades cleared');
  };

  const handleFillAll = () => {
    setModalState({
      open: true,
      type: 'input',
      title: 'Fill All Grades',
      message: 'Enter a grade to apply to all students (0–100):',
      inputValue: '',
      onConfirm: (value) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0 || numValue > 100) {
          toast.error('Grade must be between 0 and 100');
          return;
        }
        const filledGrades = {};
        students.forEach(s => { filledGrades[s.student] = value; });
        setGrades(filledGrades);
        toast.success(`Filled all with ${value}`);
        setModalState(prev => ({ ...prev, open: false }));
      }
    });
  };

  const filled = students.filter(s => grades[s.student] && grades[s.student] !== '').length;
  const scores = students
    .map(s => parseFloat(grades[s.student]))
    .filter(v => !isNaN(v) && v >= 0 && v <= 100);
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : null;
  const highest = scores.length ? Math.max(...scores) : null;
  const lowest = scores.length ? Math.min(...scores) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Overview
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={filled === 0}
          >
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!selectedSubject || filled === 0 || !currentAcademicYear || !settingsLoaded}
            loading={submitting}
            title={!currentAcademicYear ? 'System settings not loaded' : undefined}
          >
            <Upload className="w-4 h-4 mr-2" />
            {!settingsLoaded ? 'Loading...' : `Submit (${filled})`}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader divider>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Grade Input - {classroom.name}</CardTitle>
              {currentAcademicYear && (
                <p className="text-xs text-slate-500 mt-0.5">Academic Year: <span className="font-semibold text-violet-600">{currentAcademicYear}</span></p>
              )}
              {!currentAcademicYear && settingsLoaded && (
                <p className="text-xs text-red-500 mt-0.5">⚠ Academic year not configured in system settings</p>
              )}
            </div>
            {scores.length > 0 && (
              <div className="flex gap-2">
                <Badge variant="violet" className="text-sm px-2 py-1">
                  Avg: {avg}
                </Badge>
                <Badge variant="green" className="text-sm px-2 py-1">
                  High: {highest}
                </Badge>
                <Badge variant="red" className="text-sm px-2 py-1">
                  Low: {lowest}
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardBody className="p-6">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Select subject</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.subject}>
                    {s.subject_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Term
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map(q => (
                  <button
                    key={q}
                    onClick={() => setSelectedQuarter(q)}
                    className={`px-4 py-3 min-h-[44px] min-w-[44px] text-sm font-semibold transition-colors rounded-md ${
                      selectedQuarter === q
                        ? 'bg-violet-600 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-300'
                    }`}
                  >
                    T{q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedSubject && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-900 font-medium">
                  Bulk Actions
                </span>
              </div>
              <Button variant="outline" size="sm" className="border-blue-300 text-blue-600 hover:bg-blue-100" onClick={handleFillAll}>
                <Upload className="w-4 h-4 mr-2" />
                Fill All with Same Grade
              </Button>
            </div>
          )}

          {/* Grade Table */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : !selectedSubject ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Select a subject to start entering grades</p>
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              title="No Students"
              description="No students enrolled in this class"
              icon={<Users className="w-8 h-8" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b-2 border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">
                      Student Name
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-32">
                      New Grade (0-100)
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-700 uppercase w-32">
                      Current
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {students.map((student, idx) => {
                    const currentGrade = existingGrades[student.student];
                    const newGrade = grades[student.student];
                    const hasValue = newGrade && newGrade !== '';
                    const isOverwrite = currentGrade && hasValue;
                    
                    return (
                      <tr 
                        key={student.id} 
                        className={`hover:bg-slate-50 ${hasValue ? 'bg-violet-50/30' : ''} ${isOverwrite ? 'bg-yellow-50 border-l-4 border-yellow-500' : ''}`}
                      >
                        <td className="px-4 py-3 text-sm text-slate-500 font-semibold">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {student.student_profile_picture ? (
                              <img src={student.student_profile_picture} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs">
                                {student.student_name
                                  ? student.student_name.trim().split(/\s+/).slice(0, 2).map(n => n.charAt(0).toUpperCase()).join('')
                                  : '?'}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {student.student_name || student.student_email || 'Unknown'}
                              </p>
                              <p className="text-xs text-slate-500">{student.student_username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={newGrade}
                            onChange={e => handleGradeChange(student.student, e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md text-center font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                              isOverwrite ? 'border-yellow-500' : hasValue ? 'border-violet-400 bg-white' : 'border-slate-300'
                            }`}
                            placeholder="0-100"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-center gap-1">
                            {currentGrade ? (
                              <Badge variant="slate" className="font-semibold">
                                {currentGrade.raw_score}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 text-sm">—</span>
                            )}
                            {isOverwrite && (
                              <div className="flex items-center gap-1 text-yellow-700 text-xs">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                                </svg>
                                <span className="font-semibold">Overwrite</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Modal for confirmations and inputs */}
      <Modal
        open={modalState.open}
        onClose={() => setModalState(prev => ({ ...prev, open: false }))}
        title={modalState.title}
        size="md"
      >
        <ModalBody>
          <p className="text-sm text-slate-700 mb-4">{modalState.message}</p>
          {modalState.type === 'input' && (
            <input
              type="number"
              className={modalInputCls}
              value={modalState.inputValue}
              onChange={(e) => setModalState(prev => ({ ...prev, inputValue: e.target.value }))}
              placeholder="0-100"
              min="0"
              max="100"
              step="0.01"
            />
          )}
        </ModalBody>
        <ModalFooter>
          <ModalBtnSecondary onClick={() => setModalState(prev => ({ ...prev, open: false }))}>
            Cancel
          </ModalBtnSecondary>
          <ModalBtnPrimary onClick={() => {
            if (modalState.onConfirm) {
              if (modalState.type === 'input') {
                modalState.onConfirm(modalState.inputValue);
              } else {
                modalState.onConfirm();
              }
            }
          }}>
            Confirm
          </ModalBtnPrimary>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default ClassroomHub;
