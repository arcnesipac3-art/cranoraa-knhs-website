import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ComplianceTypesPage from './compliance/ComplianceTypesPage';
import ComplianceSubmissionsPage from './compliance/ComplianceSubmissionsPage';
import ComplianceDashboardPage from './compliance/ComplianceDashboardPage';

const TABS = [
  { id: 'types', label: 'Types', roles: ['admin'] },
  { id: 'submissions', label: 'Submissions', roles: ['admin'] },
  { id: 'dashboard', label: 'Dashboard', roles: ['admin'] },
];

export default function ComplianceHub() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'submissions';

  const filteredTabs = TABS.filter(tab => tab.roles.includes(user?.role));

  const handleTabChange = useCallback((tabId) => {
    setSearchParams({ tab: tabId });
  }, [setSearchParams]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-bottom-safe max-w-[1800px] mx-auto min-h-0 bg-slate-50 px-4 py-4 md:px-6 md:py-6 space-y-5 md:space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">Compliance Monitoring</h1>
          <p className="text-sm text-slate-500 mt-1">Teacher compliance submissions and tracking</p>
        </div>
      </div>

      <div className="sticky top-0 z-20 bg-slate-50 pt-1 pb-2">
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit">
          {filteredTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'types' && <ComplianceTypesPage />}
          {activeTab === 'submissions' && <ComplianceSubmissionsPage />}
          {activeTab === 'dashboard' && <ComplianceDashboardPage />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
