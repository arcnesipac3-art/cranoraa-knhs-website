import { useState, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Users, BarChart3, ClipboardList, GraduationCap, Loader2 } from 'lucide-react';

const SF1Dashboard = lazy(() => import('../pages/SF1Dashboard'));
const SF2Dashboard = lazy(() => import('../pages/SF2Dashboard'));
const SF5Dashboard = lazy(() => import('../pages/SF5Dashboard'));
const SF9Dashboard = lazy(() => import('../pages/SF9Dashboard'));
const SF10Dashboard = lazy(() => import('../pages/SF10Dashboard'));

const TABS = [
  { id: 'sf1', label: 'SF1', fullLabel: 'School Register', icon: Users, desc: 'Learner enrollment and demographic data per section', Component: SF1Dashboard },
  { id: 'sf2', label: 'SF2', fullLabel: 'Attendance', icon: ClipboardList, desc: 'Daily attendance report of learners per month', Component: SF2Dashboard },
  { id: 'sf5', label: 'SF5', fullLabel: 'Promotion', icon: BarChart3, desc: 'Report on promotion, retention, and learning progress', Component: SF5Dashboard },
  { id: 'sf9', label: 'SF9', fullLabel: 'Report Card', icon: FileText, desc: 'Individual student report card with grades per term', Component: SF9Dashboard },
  { id: 'sf10', label: 'SF10', fullLabel: 'Permanent Record', icon: GraduationCap, desc: 'Learner permanent academic record across grade levels', Component: SF10Dashboard },
];

function TabSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      <span className="ml-3 text-sm text-slate-500 font-medium">Loading form...</span>
    </div>
  );
}

export default function SchoolForms() {
  const [activeTab, setActiveTab] = useState('sf1');
  const active = TABS.find(t => t.id === activeTab);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">School Forms</h1>
          <p className="text-xs text-slate-500 font-medium">Generate and manage DepEd official school forms</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-all duration-150 border-b-2 ${
                  isActive
                    ? 'border-violet-600 text-violet-700 bg-violet-50/60'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-violet-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span className={`hidden sm:inline text-xs font-normal ${isActive ? 'text-violet-500' : 'text-slate-400'}`}>
                  {tab.fullLabel}
                </span>
              </button>
            );
          })}
        </div>

        {active && (
          <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-100">
            <p className="text-xs text-slate-500 font-medium">{active.desc}</p>
          </div>
        )}

        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              <Suspense fallback={<TabSpinner />}>
                {active && <active.Component />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
