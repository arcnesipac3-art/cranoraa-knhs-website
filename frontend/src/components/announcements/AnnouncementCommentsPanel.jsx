import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const formatCommentTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMins = Math.floor((now - date) / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const roleLabel = (role) => {
  if (role === 'staff') return 'Teacher';
  if (role === 'admin') return 'Admin';
  if (role === 'student') return 'Student';
  return role;
};

const AnnouncementCommentsPanel = ({
  announcementId,
  canComment,
  currentUserId,
  currentUserRole,
  initialCount = 0,
  onCountChange,
}) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const loadComments = useCallback(async () => {
    if (!announcementId) return;
    setLoading(true);
    try {
      const r = await api.get(`/announcements/${announcementId}/comments/`);
      setComments(r.data || []);
      onCountChange?.(r.data?.length ?? 0);
    } catch {
      toast.error('Could not load comments');
    } finally {
      setLoading(false);
    }
  }, [announcementId, onCountChange]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handlePost = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setPosting(true);
    try {
      const r = await api.post(`/announcements/${announcementId}/comments/`, { content });
      setComments((prev) => {
        const next = [...prev, r.data];
        onCountChange?.(next.length);
        return next;
      });
      setText('');
      toast.success('Comment posted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await api.delete(`/announcements/${announcementId}/comments/${commentId}/`);
      setComments((prev) => {
        const next = prev.filter((c) => c.id !== commentId);
        onCountChange?.(next.length);
        return next;
      });
      toast.success('Comment removed');
    } catch {
      toast.error('Could not delete comment');
    }
  };

  return (
    <div className="border-t border-slate-100 mt-5 pt-4">
      <h3 className="text-sm font-bold text-slate-800 mb-3">
        Comments {comments.length > 0 ? `(${comments.length})` : initialCount > 0 && loading ? `(${initialCount})` : ''}
      </h3>

      {canComment && (
        <form onSubmit={handlePost} className="flex gap-2 mb-4">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a comment…"
            maxLength={2000}
            className="flex-1 px-3 py-2.5 rounded-full bg-slate-100 border-0 text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:bg-white"
          />
          <button
            type="submit"
            disabled={posting || !text.trim()}
            className="px-4 py-2.5 rounded-full bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-50 shrink-0"
          >
            {posting ? '…' : 'Post'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-3 py-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-2 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-slate-100" />
              <div className="flex-1 h-10 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-500 py-2">
          {canComment ? 'No comments yet. Start the conversation.' : 'No comments yet.'}
        </p>
      ) : (
        <ul className="space-y-3 max-h-[280px] overflow-y-auto scrollbar-none pr-1">
          {comments.map((c) => {
            const canDelete = currentUserRole === 'admin' || c.author === currentUserId;
            return (
              <li key={c.id} className="flex gap-2.5">
                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {(c.author_name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-slate-100 rounded-lg rounded-tl-sm px-3 py-2 inline-block max-w-full">
                    <p className="text-xs font-semibold text-slate-800">
                      {c.author_name}
                      <span className="text-slate-400 font-normal ml-1.5">{roleLabel(c.author_role)}</span>
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap break-words mt-0.5">{c.content}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 ml-1">
                    <span className="text-[10px] text-slate-400">{formatCommentTime(c.created_at)}</span>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="text-[10px] font-semibold text-slate-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AnnouncementCommentsPanel;
