import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import GradingPeriodManagement from './GradingPeriodManagement';
import AdminGradeMonitoring from './AdminGradeMonitoring';
import GradeReopeningManagement from './GradeReopeningManagement';
import GradeReportsPage from './GradeReportsPage';
import MasterSheet from './MasterSheet';

const TABS = [
  { id: 'periods', label: 'Grading Periods', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'monitoring', label: 'Monitoring', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'reopening', label: 'Reopening Requests', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  { id: 'reports', label: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'master', label: 'Master Sheet', icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
];

const TAB_COMPONENTS = {
  periods: GradingPeriodManagement,
  monitoring: AdminGradeMonitoring,
  reopening: GradeReopeningManagement,
  reports: GradeReportsPage,
  master: MasterSheet,
};

export default function GradeManagementAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'periods');
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Grade Management</h1>
        <p className="text-sm text-gray-500 mt-1">Manage grading periods, monitor submissions, and generate reports</p>
      </div>

      <div className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-brand-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
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
