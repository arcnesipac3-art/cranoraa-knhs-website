import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, ClipboardList, GraduationCap, FolderOpen, BarChart3, ChevronRight, Star } from 'lucide-react';
import { useAcademicYear } from '../context/AcademicYearContext';

const FORM_CARDS = [
  {
    id: 'sf1',
    title: 'SF1',
    subtitle: 'School Register',
    description: 'Class register with enrolled students, LRN, demographics, parent info, and enrollment status.',
    icon: ClipboardList,
    gradient: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
    iconColor: 'text-violet-600',
    borderHover: 'hover:border-violet-300',
    path: '/school-forms/sf1',
    features: ['Excel Export', 'PDF Export', 'Print', 'Male/Female Split'],
    status: 'ready',
  },
  {
    id: 'sf2',
    title: 'SF2',
    subtitle: 'Daily Attendance Report',
    description: 'Attendance sheets with daily, monthly, and quarterly summaries for each section.',
    icon: BarChart3,
    gradient: 'from-blue-500 to-cyan-600',
    bgLight: 'bg-blue-50',
    iconColor: 'text-blue-600',
    borderHover: 'hover:border-blue-300',
    path: '/school-forms/sf2',
    features: ['PDF Export', 'Excel Export', 'Print'],
    status: 'ready',
  },
  {
    id: 'sf9',
    title: 'SF9',
    subtitle: 'Learner Progress Report',
    description: 'Official report cards with quarter grades, core values, attendance summary, and remarks.',
    icon: GraduationCap,
    gradient: 'from-emerald-500 to-teal-600',
    bgLight: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    borderHover: 'hover:border-emerald-300',
    path: '/school-forms/sf9',
    features: ['PDF Export', 'Print'],
    status: 'ready',
  },
  {
    id: 'sf10',
    title: 'SF10',
    subtitle: 'Permanent Academic Record',
    description: 'Complete academic history with enrollment records, grades, and promotion status across years.',
    icon: FolderOpen,
    gradient: 'from-rose-500 to-pink-600',
    bgLight: 'bg-rose-50',
    iconColor: 'text-rose-600',
    borderHover: 'hover:border-rose-300',
    path: '/school-forms/sf10',
    features: ['PDF Export', 'Excel Export', 'Print'],
    status: 'ready',
  },
];

const STATUS_MAP = {
  ready: { label: 'Ready', dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50' },
};

export default function SchoolFormsDashboard() {
  const navigate = useNavigate();
  const { activeYear } = useAcademicYear();

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">School Forms</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Generate official DepEd forms from existing records
              {activeYear && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full text-[10px] font-bold uppercase">
                  <Star className="w-3 h-3" /> SY {activeYear.name}
                </span>
              )}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Quick Stats ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8"
      >
        {[
          { label: 'Available Forms', value: FORM_CARDS.length, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Ready', value: FORM_CARDS.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Active Year', value: activeYear?.name || 'N/A', color: 'text-amber-600', bg: 'bg-amber-50', isText: true },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} rounded-xl px-4 py-3 border border-white`}>
            <p className={`text-xl font-extrabold ${stat.color} ${stat.isText ? 'text-sm' : ''}`}>{stat.value}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Form Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {FORM_CARDS.map((card, index) => {
          const Icon = card.icon;
          const status = STATUS_MAP[card.status];

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
            >
              <button
                onClick={() => navigate(card.path)}
                className={`w-full text-left bg-white rounded-2xl border border-slate-200 ${card.borderHover} shadow-sm hover:shadow-lg transition-all duration-200 group overflow-hidden`}
              >
                {/* Color bar */}
                <div className={`h-1.5 bg-gradient-to-r ${card.gradient}`} />

                <div className="p-5">
                  {/* Icon + Title */}
                  <div className="flex items-start gap-3.5 mb-3">
                    <div className={`w-11 h-11 rounded-xl ${card.bgLight} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                      <Icon className={`w-5.5 h-5.5 ${card.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-violet-700 transition-colors">{card.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${status.bg} ${status.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">{card.subtitle}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 leading-relaxed mb-3.5 line-clamp-2">{card.description}</p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1.5">
                    {card.features.map(feature => (
                      <span key={feature} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* ── Help Text ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="mt-10 text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-slate-500">
            All forms are auto-generated from existing enrollment, student, and classroom data. No manual encoding required.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
