import { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../styles/designSystem';
import api from '../../utils/api';
import { Skeleton } from '../ui';

const PRIORITY_CFG = {
  urgent: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500', label: 'Urgent', leftBorder: 'border-l-red-500' },
  high:   { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'High', leftBorder: 'border-l-amber-500' },
  normal: { bg: 'bg-white', text: 'text-blue-700', border: 'border-slate-200', dot: 'bg-blue-400', label: 'Normal', leftBorder: 'border-l-blue-400' },
  low:    { bg: 'bg-white', text: 'text-slate-500', border: 'border-slate-100', dot: 'bg-slate-300', label: 'Low', leftBorder: 'border-l-slate-300' },
};

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diffH = Math.floor((Date.now() - date) / 3600000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const AnnouncementsFeed = memo(() => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('dashAnnRead') || '[]')); }
    catch { return new Set(); }
  });

  useEffect(() => {
    api.get('/announcements/?limit=6')
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : r.data?.results || [];
        setAnnouncements(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markRead = (id) => {
    setReadIds(prev => {
      const next = new Set([...prev, id]);
      try { localStorage.setItem('dashAnnRead', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const unreadCount = announcements.filter(a => !readIds.has(a.id)).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Announcements</h3>
            <p className="text-[10px] text-slate-500 font-medium">School updates</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {unreadCount} new
            </span>
          )}
          <button onClick={() => navigate('/announcements')}
            className="text-[11px] font-bold text-violet-600 hover:text-violet-700 uppercase tracking-wide transition-colors">
            View All
          </button>
        </div>
      </div>

      <div className="px-4 py-3 flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="space-y-2.5">
            {[1, 2, 3].map(i => <Skeleton.AnnouncementRow key={i} />)}
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-slate-500">No announcements yet</p>
            <p className="text-xs text-slate-400 mt-1">Check back later for school updates</p>
          </div>
        ) : (
          <div className="space-y-2">
            {announcements.map((a, idx) => {
              const p = PRIORITY_CFG[a.priority?.toLowerCase()] || PRIORITY_CFG.normal;
              const isUnread = !readIds.has(a.id);
              return (
                <motion.button key={a.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  onClick={() => { markRead(a.id); navigate('/announcements'); }}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-lg border border-l-4 transition-all group',
                    p.leftBorder, p.border, p.bg,
                    'hover:shadow-sm hover:brightness-[0.97]'
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0 animate-pulse" />
                        )}
                        <h4 className={cn(
                          'text-sm font-bold truncate group-hover:text-violet-700 transition-colors',
                          isUnread ? 'text-slate-900' : 'text-slate-600'
                        )}>
                          {a.title}
                        </h4>
                        {(a.priority === 'urgent' || a.priority === 'high') && (
                          <span className={cn('shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold border', p.bg, p.text, p.border)}>
                            {p.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{a.content}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-semibold text-slate-400">{a.author_name || a.author || 'Admin'}</span>
                        <span className="text-slate-200">&middot;</span>
                        <span className="text-[10px] font-semibold text-slate-400">{formatTime(a.created_at)}</span>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-violet-500 shrink-0 mt-0.5 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

AnnouncementsFeed.displayName = 'AnnouncementsFeed';
export default AnnouncementsFeed;
