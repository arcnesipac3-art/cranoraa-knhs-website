import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useCurrentUser } from '../hooks/useCurrentUser';

const TrophyIcon = (p) => <svg width={p.size||20} height={p.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0012 0V2Z"/></svg>;
const FireIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>;
const MedalIcon = (p) => <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>;

const AVATAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'];

function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function Leaderboard() {
  const { user } = useCurrentUser();
  const [entries, setEntries] = useState([]);
  const [badges, setBadges] = useState([]);
  const [myBadges, setMyBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('leaderboard');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [lbRes, badgeRes, myBadgeRes] = await Promise.all([
          api.get('/leaderboard/'),
          api.get('/badges/'),
          api.get(`/student-badges/?student_id=${user.id}`),
        ]);
        setEntries(lbRes.data.results || lbRes.data);
        setBadges(badgeRes.data.results || badgeRes.data);
        setMyBadges(myBadgeRes.data.results || myBadgeRes.data);
      } catch { setError('Failed to load leaderboard data. Please try again later.'); }
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const tabs = [
    { id: 'leaderboard', label: 'Leaderboard', icon: <TrophyIcon size={16} /> },
    { id: 'badges', label: 'Badges', icon: <MedalIcon size={16} /> },
  ];

  const rankColors = ['text-yellow-500', 'text-slate-400', 'text-amber-600'];
  const rankBgs = ['bg-yellow-50 border-yellow-200', 'bg-slate-50 border-slate-200', 'bg-amber-50 border-amber-200'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Leaderboard & Badges</h1>
        <p className="text-sm text-slate-500 mt-1">See who&apos;s leading and what achievements have been earned</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeTab === tab.id ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-xs text-violet-600 font-bold hover:underline">Retry</button>
        </div>
      ) : activeTab === 'leaderboard' ? (
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="text-center py-16">
              <TrophyIcon size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No leaderboard data yet</p>
            </div>
          ) : (
            entries.map((entry, idx) => {
              const isMe = entry.student === user?.id;
              const medal = idx < 3 ? rankColors[idx] : '';
              const bg = idx < 3 ? rankBgs[idx] : isMe ? 'bg-violet-50 border-violet-200' : 'bg-white border-slate-200';
              return (
                <div key={entry.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${bg} ${isMe ? 'ring-2 ring-violet-400' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${idx < 3 ? medal : 'text-slate-400'}`}>
                    {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `#${idx + 1}`}
                  </div>
                  {entry.student_profile_picture ? (
                    <img src={entry.student_profile_picture} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${getAvatarColor(entry.student_name)}`}>
                      {getInitials(entry.student_name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${isMe ? 'text-violet-700' : 'text-slate-800'}`}>
                      {entry.student_name} {isMe && <span className="text-xs text-violet-500">(You)</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <FireIcon size={12} className="text-orange-500" />
                        {entry.attendance_streak}d streak
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MedalIcon size={12} className="text-violet-500" />
                        {entry.badge_count} badges
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900">{entry.total_points}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">points</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Badges Tab */
        <div>
          {myBadges.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">Your Badges ({myBadges.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {myBadges.map(sb => (
                  <div key={sb.id} className="bg-white border border-slate-200 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                    <span className="text-3xl block mb-2">{sb.badge_icon}</span>
                    <p className="text-xs font-bold text-slate-800">{sb.badge_name}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{sb.reason || sb.badge_category}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">All Badges</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {badges.map(badge => {
              const earned = myBadges.some(mb => mb.badge === badge.id);
              return (
                <div key={badge.id}
                  className={`rounded-xl p-4 text-center border transition-all ${earned ? 'bg-violet-50 border-violet-200 ring-2 ring-violet-300' : 'bg-white border-slate-200 opacity-60'}`}>
                  <span className="text-3xl block mb-2">{badge.icon}</span>
                  <p className="text-xs font-bold text-slate-800">{badge.name}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{badge.points} pts</p>
                  {earned && <span className="inline-block mt-2 text-[9px] font-bold text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">Earned</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
