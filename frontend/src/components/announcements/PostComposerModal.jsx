import { useRef, useState } from 'react';

const CATEGORY_OPTIONS = [
  { value: 'general',      label: 'General' },
  { value: 'academic',     label: 'Academics' },
  { value: 'events',       label: 'Events' },
  { value: 'examinations', label: 'Examinations' },
  { value: 'guidance',     label: 'Guidance' },
  { value: 'sports',       label: 'Sports' },
  { value: 'emergency',    label: 'Emergency' },
  { value: 'holiday',      label: 'Holiday' },
  { value: 'system_update',label: 'System' },
];

const PRIORITY_OPTIONS = [
  { value: 'info',      label: 'Normal',   color: 'text-slate-600' },
  { value: 'important', label: 'Important', color: 'text-orange-600' },
  { value: 'critical',  label: 'Urgent',   color: 'text-red-600' },
];

const AUDIENCE_OPTIONS = [
  { value: 'all',      label: 'All Users',   icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { value: 'students', label: 'Students',    icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z' },
  { value: 'teachers',  label: 'Faculty',     icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { value: 'parents',   label: 'Parents',     icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
];

const isImageFile = (file) =>
  file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);

const getFileTypeLabel = (file) => {
  const ext = file.name?.split('.').pop()?.toLowerCase();
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return 'Image';
  if (ext === 'pdf') return 'PDF';
  if (['doc','docx'].includes(ext)) return 'Document';
  if (['xls','xlsx'].includes(ext)) return 'Spreadsheet';
  return 'File';
};

const PostComposerModal = ({
  open,
  onClose,
  form,
  setForm,
  isEditing,
  saving,
  onSubmit,
  classrooms = [],
  existingAttachments = [],
  onRemoveExistingAttachment,
  authorInitial = 'A',
}) => {
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('compose');

  if (!open) return null;

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setForm(f => ({ ...f, attachments: [...(f.attachments || []), ...incoming] }));
  };

  const removeNewFile = (index) => {
    setForm(f => ({ ...f, attachments: f.attachments.filter((_, i) => i !== index) }));
  };

  const toggleClassroom = (id) => {
    setForm(f => {
      const current = f.target_classrooms || [];
      const updated = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
      return { ...f, target_classrooms: updated };
    });
  };

  const previews = (form.attachments || []).map((file, i) => ({
    key: `new-${i}-${file.name}`,
    file,
    isImage: isImageFile(file),
    onRemove: () => removeNewFile(i),
  }));

  const totalAttachments = existingAttachments.length + previews.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-700 to-indigo-700 flex items-center justify-between px-5 py-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">
                {isEditing ? 'Edit Announcement' : 'New Announcement'}
              </h2>
              <p className="text-violet-200 text-[10px] mt-1 font-medium uppercase tracking-wide">
                Share with the school community
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="ml-4 w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:bg-white/20 hover:text-white transition-all"
            aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5">
          {[
            { id: 'compose', label: 'Compose' },
            { id: 'audience', label: 'Audience' },
            { id: 'settings', label: 'Settings' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-violet-700 border-violet-600'
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex-1 overflow-y-auto scrollbar-none">
          {/* Compose Tab */}
          {activeTab === 'compose' && (
            <div className="p-5 space-y-4">
              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {authorInitial}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Posting as Admin</p>
                  <p className="text-[11px] text-slate-400">Visible to selected audience</p>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Announcement title"
                  required
                  maxLength={150}
                  className="w-full text-base font-semibold text-slate-900 placeholder-slate-400 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all bg-white"
                />
                <p className="text-right text-[10px] text-slate-400 mt-1">{form.title.length}/150</p>
              </div>

              {/* Content */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 block">Content</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Write your announcement details here..."
                  required
                  rows={6}
                  className="w-full text-sm text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none transition-all bg-white"
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">Attachments</label>
                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx" multiple className="hidden"
                  onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
                <input ref={imageInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp" multiple className="hidden"
                  onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />

                {(totalAttachments > 0) && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    {existingAttachments.map(att => (
                      <div key={`existing-${att.id}`} className="relative aspect-square rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                        {att.is_image ? (
                          <img src={att.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                            <svg className="w-8 h-8 text-slate-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[10px] text-slate-500 truncate w-full font-medium">{att.filename}</span>
                          </div>
                        )}
                        {onRemoveExistingAttachment && (
                          <button type="button" onClick={() => onRemoveExistingAttachment(att.id)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-black/80 transition-colors">×</button>
                        )}
                      </div>
                    ))}
                    {previews.map(({ key, file, isImage, onRemove }) => (
                      <div key={key} className="relative aspect-square rounded-xl border border-violet-200 overflow-hidden bg-violet-50">
                        {isImage ? (
                          <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" onLoad={(e) => URL.revokeObjectURL(e.target.src)} />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                            <span className="text-[10px] font-bold text-violet-600 uppercase mb-1">{getFileTypeLabel(file)}</span>
                            <span className="text-[10px] text-slate-500 truncate w-full">{file.name}</span>
                          </div>
                        )}
                        <button type="button" onClick={onRemove}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-black/80 transition-colors">×</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-500 hover:border-violet-300 hover:bg-violet-50/50 hover:text-violet-700 transition-colors rounded-xl">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Attach File
                  </button>
                  <button type="button" onClick={() => imageInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-500 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-700 transition-colors rounded-xl">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Attach Image
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Audience Tab */}
          {activeTab === 'audience' && (
            <div className="p-5 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 block">Target Audience</label>
                <div className="grid grid-cols-2 gap-2">
                  {AUDIENCE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, target_audience: opt.value }))}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                        form.target_audience === opt.value
                          ? 'border-violet-500 bg-violet-50 text-violet-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={opt.icon} />
                      </svg>
                      <span className="text-sm font-bold">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {classrooms.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">
                    Specific Sections
                    <span className="text-slate-400 font-medium normal-case ml-1">(optional)</span>
                  </label>
                  <p className="text-[11px] text-slate-400 mb-3">Limit this announcement to specific class sections</p>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {classrooms.map(cls => (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => toggleClassroom(cls.id)}
                        className={`px-3 py-1.5 text-xs font-bold border rounded-lg transition-colors ${
                          (form.target_classrooms || []).includes(cls.id)
                            ? 'bg-violet-100 text-violet-800 border-violet-300'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {cls.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  >
                    {CATEGORY_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  >
                    {PRIORITY_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  >
                    <option value="live">Publish now</option>
                    <option value="draft">Save as draft</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.is_pinned}
                    onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Pin to top</p>
                    <p className="text-[11px] text-slate-400">This announcement will always appear at the top</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.is_public}
                    onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Show on public website</p>
                    <p className="text-[11px] text-slate-400">Visible on the school's public homepage</p>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">Schedule Post</label>
                  <input
                    type="datetime-local"
                    value={form.event_date}
                    onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Optional: set a future date</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 block">Expires</label>
                  <input
                    type="datetime-local"
                    value={form.end_date}
                    onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Optional: auto-archive after date</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="sticky bottom-0 flex gap-3 px-5 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 bg-white text-slate-700 text-xs font-bold uppercase tracking-widest border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-[2] py-2.5 bg-violet-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-violet-700 disabled:opacity-60 flex items-center justify-center gap-2 rounded-xl transition-colors shadow-sm">
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isEditing ? (
                'Save Changes'
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Publish Announcement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostComposerModal;
