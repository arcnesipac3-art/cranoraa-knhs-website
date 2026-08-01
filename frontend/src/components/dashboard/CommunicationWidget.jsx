import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

function formatMessageTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const today = now.toDateString() === d.toDateString();
  if (today) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === d.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const CommunicationWidget = memo(({ messages = [], notifUnread = 0 }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="px-4 md:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Messages</h3>
            <p className="text-[10px] text-slate-500 font-medium">Recent conversations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {notifUnread > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
              {notifUnread} unread
            </span>
          )}
          <button
            onClick={() => navigate('/communication-center')}
            className="text-[11px] font-bold text-violet-600 hover:text-violet-700 uppercase tracking-wide transition-colors"
          >
            Open
          </button>
        </div>
      </div>
      <div className="px-4 md:px-5 py-3 flex-1 min-h-0">
        {!messages || messages.length === 0 ? (
          <div className="py-6 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-xs text-slate-500 font-medium">No messages yet</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Start a conversation</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[280px] overflow-y-auto">
            {messages.map((msg, idx) => (
              <motion.button
                key={msg.id || idx}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate('/communication-center')}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0 overflow-hidden">
                  {msg.sender_profile_picture ? (
                    <img src={msg.sender_profile_picture} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    (msg.sender || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900 truncate group-hover:text-violet-700 transition-colors">{msg.sender}</p>
                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">{formatMessageTime(msg.timestamp)}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{typeof msg.content === 'string' ? msg.content : ''}</p>
                </div>
                {!msg.is_read && (
                  <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

CommunicationWidget.displayName = 'CommunicationWidget';
export default CommunicationWidget;
