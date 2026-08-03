import { useState, useEffect } from 'react';
import api from '../utils/api';
import Swal from 'sweetalert2';
import { Skeleton, Button } from '../components/ui';
const WebsiteContentManagement = () => {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newSection, setNewSection] = useState({
    category: 'home',
    section: '',
    content: ''
  });

  const categories = [
    { id: 'all', label: 'All Content', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
    { id: 'home', label: 'Home Page', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'about', label: 'About Page', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'programs', label: 'Programs', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'contact', label: 'Contact', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
    { id: 'other', label: 'Other', icon: 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z' },
  ];

  const sectionSuggestions = {
    home: ['home_hero_title', 'home_hero_subtitle', 'home_feature_1_title', 'home_feature_1_content'],
    about: ['about_title', 'about_subtitle', 'about_mission_title', 'about_mission_content', 'about_history_title', 'about_history_content'],
    contact: ['contact_title', 'contact_subtitle', 'contact_address', 'contact_email', 'contact_phone'],
    programs: ['programs_title', 'programs_subtitle', 'programs_academic_title', 'programs_academic_details', 'programs_tech_details', 'programs_sports_details', 'programs_arts_details'],
    other: []
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const response = await api.get('/website-content/');
      setContent(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching website content:', error);
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditValue(item.content || '');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSave = async (id) => {
    try {
      await api.put(`/website-content/${id}/`, { content: editValue });
      Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Content updated successfully.',
        timer: 1500,
        showConfirmButton: false,
      });
      handleCancel();
      fetchContent();
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update content.' });
    }
  };

  const handleDelete = async (id, section) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete the "${section}" section. This cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/website-content/${id}/`);
        Swal.fire('Deleted!', 'Section has been removed.', 'success');
        fetchContent();
      } catch (error) {
        Swal.fire('Error', 'Failed to delete section.', 'error');
      }
    }
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!newSection.section) {
      Swal.fire('Error', 'Please enter a section key', 'error');
      return;
    }

    try {
      await api.post('/website-content/', newSection);
      Swal.fire({
        icon: 'success',
        title: 'Added!',
        text: 'New section added successfully.',
        timer: 1500,
        showConfirmButton: false,
      });
      setShowAddModal(false);
      setNewSection({ category: 'home', section: '', content: '' });
      fetchContent();
    } catch (error) {
      const errorMsg = error.response?.data?.section ? 'This section name already exists.' : 'Failed to add section.';
      Swal.fire('Error', errorMsg, 'error');
    }
  };

  const filteredContent = content.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = (item.section || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.content || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const groupedContent = filteredContent.reduce((acc, item) => {
    const cat = item.category_display || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-4 px-4 md:px-6 py-6">
        <Skeleton.PageHeader />
        <Skeleton.Table rows={5} cols={4} hasAvatar={false} />
      </div>
    );
  }

  return (
    <div className="p-1.5 md:p-6 bg-slate-50 min-h-full max-w-full overflow-x-hidden page-bottom-safe">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Website Content Management</h1>
        <p className="text-xs text-slate-500 mt-1">Public Portal Editor</p>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-3 md:mb-8 gap-2 md:gap-6 min-w-0">
        <div className="text-left min-w-0">
          <h1 className="text-lg md:text-3xl font-extrabold text-slate-900 tracking-tight truncate">Mini Website Editor</h1>
          <p className="text-[8px] md:text-base text-slate-500 mt-0.5 truncate uppercase tracking-wider font-medium">Customize your public portal's content</p>
        </div>
        
        <div className="flex flex-row gap-1 shrink-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center bg-violet-600 hover:bg-violet-700 text-white font-bold py-1.5 md:py-2.5 px-2.5 md:px-5 rounded-lg md:rounded-xl transition-all shadow-md md:shadow-lg shadow-violet-200 active:scale-95 text-[9px] md:text-base whitespace-nowrap"
          >
            <svg className="w-2.5 h-2.5 md:w-5 md:h-5 mr-1 md:mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add New
          </button>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none flex items-center justify-center bg-white border border-slate-200 text-slate-700 font-bold py-1.5 md:py-2.5 px-2.5 md:px-5 rounded-lg md:rounded-xl hover:bg-slate-50 transition-all shadow-sm active:scale-95 text-[9px] md:text-base whitespace-nowrap"
          >
            <svg className="w-2.5 h-2.5 md:w-5 md:h-5 mr-1 md:mr-2 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Live Site
          </a>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-1.5 md:p-4 rounded-xl md:rounded-2xl shadow-sm border border-slate-100 mb-4 md:mb-8 flex flex-col gap-2 md:gap-4 min-w-0">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <svg className="h-3 w-3 md:h-5 md:w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search sections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-7 pr-3 py-1.5 md:py-2.5 border border-slate-200 rounded-lg md:rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 transition-all text-[10px] md:text-sm"
          />
        </div>
        <div className="flex overflow-x-auto gap-1 scrollbar-none pb-0.5 -mx-0.5 px-0.5 min-w-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center whitespace-nowrap px-2 py-1 md:px-4 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-sm font-bold transition-all shrink-0 ${
                activeCategory === cat.id ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content List */}
      <div className="space-y-4 md:space-y-10 px-0.5">
        {Object.entries(groupedContent).length > 0 ? (
          Object.entries(groupedContent).map(([categoryName, items]) => (
            <div key={categoryName} className="animate-fadeIn">
              <div className="flex items-center mb-3 md:mb-6">
                <div className="h-px bg-slate-200 flex-grow"></div>
                <h2 className="px-2 md:px-4 text-[9px] md:text-sm font-black text-slate-400 uppercase tracking-widest">{categoryName}</h2>
                <div className="h-px bg-slate-200 flex-grow"></div>
              </div>
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 md:gap-6">
                {items.map((item) => (
                  <div key={item.id} className="group bg-white rounded-xl md:rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg md:hover:shadow-xl hover:border-violet-100 transition-all duration-300 overflow-hidden flex flex-col">
                    <div className="px-2 py-1 md:px-6 md:py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center group-hover:bg-violet-50/30 transition-colors">
                      <div className="flex items-center min-w-0">
                        <h3 className="font-bold text-slate-800 text-[8px] md:text-sm truncate uppercase tracking-tight">{item.section_display || item.section}</h3>
                      </div>
                      <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 ml-1.5">
                        {editingId === item.id ? (
                          <>
                            <button onClick={() => handleSave(item.id)} className="p-0.5 md:p-2 text-green-600 hover:bg-green-100 rounded-lg md:rounded-xl transition-colors" aria-label={`Save changes to ${item.section_display || item.section}`}>
                              <svg className="w-2.5 h-2.5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button onClick={handleCancel} className="p-0.5 md:p-2 text-slate-400 hover:bg-slate-100 rounded-lg md:rounded-xl transition-colors" aria-label="Cancel editing">
                              <svg className="w-2.5 h-2.5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEdit(item)} className="p-0.5 md:p-2 text-violet-600 hover:bg-violet-100 rounded-lg md:rounded-xl transition-colors" aria-label={`Edit ${item.section_display || item.section}`}>
                              <svg className="w-2.5 h-2.5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onClick={() => handleDelete(item.id, item.section)} className="p-0.5 md:p-2 text-red-400 hover:bg-red-50 rounded-lg md:rounded-xl transition-colors" aria-label={`Delete ${item.section_display || item.section}`}>
                              <svg className="w-2.5 h-2.5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-2 md:p-6 flex-grow min-w-0">
                      <div className="space-y-1 md:space-y-4 min-w-0">
                        <label className="block text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Text Content</label>
                        {editingId === item.id ? (
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-1.5 py-1 md:px-4 md:py-3 border-2 border-violet-100 rounded-lg md:rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none bg-violet-50/20 text-[9px] md:text-sm"
                            rows={3}
                          />
                        ) : (
                          <p className="text-slate-600 text-[9px] md:text-sm whitespace-pre-wrap break-words leading-relaxed min-h-[30px] md:min-h-[80px]">{item.content || <span className="text-slate-300 italic">No text</span>}</p>
                        )}
                      </div>
                    </div>
                    <div className="px-2 py-1 md:px-6 md:py-3 bg-slate-50/30 border-t border-slate-50 flex items-center text-[6px] md:text-[10px] font-bold text-slate-400 uppercase">
                      <span className="mr-auto truncate pr-2">{item.section}</span>
                      {item.updated_by_name && <span className="shrink-0">{item.updated_by_name}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 md:py-20 bg-white rounded-2xl md:rounded-3xl border-2 border-dashed border-slate-100">
            <h3 className="text-sm md:text-base font-black text-slate-900 tracking-tight">No content found</h3>
          </div>
        )}
      </div>

      {/* Add Section Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl md:rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden animate-slideUp max-h-[90vh] flex flex-col">
            <div className="p-4 md:p-8 border-b border-slate-100 flex justify-between items-center bg-violet-50/30 shrink-0">
              <h2 className="text-lg md:text-2xl font-black text-slate-900">Add New Section</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-white rounded-full transition-colors" aria-label="Close add section modal"><svg className="w-4 h-4 md:w-6 md:h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            
            <form onSubmit={handleAddSection} className="p-4 md:p-8 space-y-3 md:space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-1 md:mb-2 tracking-widest">Category</label>
                  <select
                    value={newSection.category}
                    onChange={(e) => setNewSection({ ...newSection, category: e.target.value })}
                    className="w-full px-3 py-2 md:px-4 md:py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 text-xs md:text-base"
                  >
                    {categories.filter(c => c.id !== 'all').map(cat => (<option key={cat.id} value={cat.id}>{cat.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-1 md:mb-2 tracking-widest">Section Key</label>
                  <input
                    list="section-suggestions"
                    placeholder="e.g. programs_academic_details"
                    value={newSection.section}
                    onChange={(e) => setNewSection({ ...newSection, section: e.target.value })}
                    className="w-full px-3 py-2 md:px-4 md:py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 text-xs md:text-base"
                  />
                  <datalist id="section-suggestions">
                    {sectionSuggestions[newSection.category]?.map(s => (<option key={s} value={s} />))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-1 md:mb-2 tracking-widest">Text Content</label>
                <textarea
                  placeholder="Enter content..."
                  value={newSection.content}
                  onChange={(e) => setNewSection({ ...newSection, content: e.target.value })}
                  className="w-full px-3 py-2 md:px-4 md:py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-violet-500 text-xs md:text-base"
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1 md:pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="order-2 sm:order-1 flex-grow py-2.5 md:py-3 bg-slate-100 text-slate-600 font-bold rounded-xl md:rounded-2xl text-xs md:text-base">Cancel</button>
                <button type="submit" className="order-1 sm:order-2 flex-grow py-2.5 md:py-3 bg-violet-600 text-white font-bold rounded-xl md:rounded-2xl shadow-lg active:scale-95 text-xs md:text-base">Create Section</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteContentManagement;
