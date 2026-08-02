import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useParallelFetch } from '../hooks/useFetch';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { LoadingSpinner, EmptyState } from '../components/ui';
import Teachers from './Teachers';
import StudentManagement from './StudentManagement';
import ParentManagement from './ParentManagement';

// ─── Tab shell ────────────────────────────────────────────────────────────────

const TABS = [
  {
    id: 'teachers',
    label: 'Teachers',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'students',
    label: 'Students',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m-3-3h6" />
      </svg>
    ),
  },
  {
    id: 'parents',
    label: 'Parents',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function PeopleHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const validTab = TABS.find(t => t.id === initialTab) ? initialTab : 'teachers';
  const [activeTab, setActiveTab] = useState(validTab);

  const { data, loading } = useParallelFetch({
    teachers: '/users/?role=staff',
    students: '/users/?role=student',
    parents: '/users/?role=parent',
  });

  const counts = useMemo(() => ({
    teachers: Array.isArray(data.teachers) ? data.teachers.length : 0,
    students: Array.isArray(data.students) ? data.students.length : 0,
    parents: Array.isArray(data.parents) ? data.parents.length : 0,
  }), [data]);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  }, [setSearchParams]);

  return (
    <div className="page-bottom-safe bg-slate-50 min-h-screen">

      {/* ── Tab bar ── */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3">
        <div className="flex items-center gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ml-0.5 ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {loading ? '—' : counts[tab.id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'teachers' && <Teachers />}
      {activeTab === 'students' && <StudentManagement />}
      {activeTab === 'parents'  && <ParentManagement />}
    </div>
  );
}
