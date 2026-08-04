import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ComplianceTypesPage from './compliance/ComplianceTypesPage';
import ComplianceSubmissionsPage from './compliance/ComplianceSubmissionsPage';
import ComplianceDashboardPage from './compliance/ComplianceDashboardPage';
import LegacySubmissionsPage from './compliance/LegacySubmissionsPage';

const TABS = [
  { id: 'submissions', label: 'Submissions',   icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', roles: ['admin'] },
  { id: 'types',       label: 'Types',          icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', roles: ['admin'] },
  { id: 'dashboard',   label: 'Dashboard',      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', roles: ['admin'] },
  { id: 'legacy',      label: 'Legacy',         icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', roles: ['admin'] },
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
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">Compliance Monitoring</h1>
        <p className="text-sm text-slate-500 mt-0.5">Teacher compliance submissions and tracking</p>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 bg-slate-50 pt-1 pb-2">
        <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit shadow-sm">
          {filteredTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'types'       && <ComplianceTypesPage />}
          {activeTab === 'submissions' && <ComplianceSubmissionsPage />}
          {activeTab === 'dashboard'   && <ComplianceDashboardPage />}
          {activeTab === 'legacy'      && <LegacySubmissionsPage />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
