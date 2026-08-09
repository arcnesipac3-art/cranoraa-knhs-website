import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const PortalHubShell = ({ title, description, tabs, showHeader = true }) => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabBarRef = useRef(null);

  const visibleTabs = useMemo(() => {
    const userIsAdmin = user?.role === 'admin' || user?.is_admin === true;
    return tabs.filter((tab) => {
      if (tab.roles) {
        const matchesRole = tab.roles.includes(user?.role) || (userIsAdmin && tab.roles.includes('admin'));
        if (!matchesRole) return false;
      }
      if (typeof tab.show === 'function' && !tab.show(user)) return false;
      return true;
    });
  }, [tabs, user]);

  const activeTabId = searchParams.get('tab');
  const activeTab = visibleTabs.find((tab) => tab.id === activeTabId) || visibleTabs[0];

  useEffect(() => {
    if (!visibleTabs.length) return;
    if (!activeTab || activeTab.id !== activeTabId) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', visibleTabs[0].id);
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeTab, activeTabId, searchParams, setSearchParams, visibleTabs]);

  if (!visibleTabs.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-base font-extrabold text-slate-900 mb-1">{title}</h2>
        <p className="text-sm text-slate-500">No tools are available in this workspace for your account.</p>
      </div>
    );
  }

  const ActiveComponent = activeTab.component;

  return (
    <div className="space-y-0">
      {/* Tab Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 md:px-4 md:py-2 sticky top-0 z-20">
        <div ref={tabBarRef} className="flex gap-1 overflow-x-auto scrollbar-none">
          {visibleTabs.map((tab) => {
            const isActive = tab.id === activeTab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  const nextParams = new URLSearchParams(searchParams);
                  nextParams.set('tab', tab.id);
                  setSearchParams(nextParams);
                }}
                className={`shrink-0 relative inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'text-violet-700 bg-violet-50 border border-violet-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent'
                }`}
              >
                {tab.icon && (
                  <svg className={`w-3.5 h-3.5 ${isActive ? 'text-violet-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                )}
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-violet-600 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Content */}
      <motion.section
        key={activeTab.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="min-w-0"
      >
        <ActiveComponent />
      </motion.section>
    </div>
  );
};

export default PortalHubShell;
