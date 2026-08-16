import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import GradingPeriodManagement from './GradingPeriodManagement';
import AdminGradeMonitoring from './AdminGradeMonitoring';
import GradeReopeningManagement from './GradeReopeningManagement';
import GradeReportsPage from './GradeReportsPage';
import MasterSheet from './MasterSheet';

const ALL_TABS = [
  { id: 'periods', label: 'Grading Periods', shortLabel: 'Grading', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', roles: ['admin'] },
  { id: 'monitoring', label: 'Monitoring', shortLabel: 'Monitor', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', roles: ['admin'] },
  { id: 'reopening', label: 'Reopening Requests', shortLabel: 'Reopening', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', roles: ['admin'] },
  { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', roles: ['admin'] },
  { id: 'master', label: 'Master Sheet', shortLabel: 'Master', icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', roles: ['admin', 'staff'] },
];

const TAB_COMPONENTS = {
  periods: GradingPeriodManagement,
  monitoring: AdminGradeMonitoring,
  reopening: GradeReopeningManagement,
  reports: GradeReportsPage,
  master: MasterSheet,
};

export default function GradeManagementAdmin() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isTeacher = user?.role === 'staff';

  const tabs = ALL_TABS.filter(t => t.roles.includes(user?.role));
  const defaultTab = isTeacher ? 'master' : (searchParams.get('tab') || 'periods');
  const [activeTab, setActiveTab] = useState(defaultTab);
  const ActiveComponent = TAB_COMPONENTS[activeTab] || MasterSheet;

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Grade Management</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          {isTeacher ? 'View master sheet for your assigned sections' : 'Manage grading periods, monitor submissions, and generate reports'}
        </p>
      </div>

      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto min-w-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              activeTab === tab.id
                ? 'text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            <span className="hidden min-[420px]:inline">{tab.label}</span>
            <span className="min-[420px]:hidden">{tab.shortLabel}</span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeGradeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600"
              />
            )}
          </button>
        ))}
      </div>

      <div>
        <ActiveComponent />
      </div>
    </div>
  );
}
