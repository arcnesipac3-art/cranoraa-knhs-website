import { useState, useEffect, useCallback } from 'react';
import { getInitials } from '../data/facultyData';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useAcademicYear } from '../context/AcademicYearContext';

const BADGE_COLORS = {
  'School Principal I': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'School Guidance Designate': 'bg-blue-100 text-blue-800 border-blue-200',
  'Administrative Officer I': 'bg-slate-100 text-slate-700 border-slate-200',
  'Administrative Assistant III': 'bg-slate-100 text-slate-700 border-slate-200',
  'Master Teacher I': 'bg-violet-100 text-violet-800 border-violet-200',
  'Special Science Teacher I': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Teacher VI': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Teacher V': 'bg-purple-100 text-purple-800 border-purple-200',
  'Teacher IV': 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  'Teacher III': 'bg-sky-100 text-sky-800 border-sky-200',
  'Teacher II': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Teacher I': 'bg-teal-100 text-teal-800 border-teal-200',
  'ALS Teacher': 'bg-orange-100 text-orange-800 border-orange-200',
};

function badgeColor(position) {
  return BADGE_COLORS[position] ?? 'bg-slate-100 text-slate-700 border-slate-200';
}

function PhotoArea({ name, photo }) {
  const [imgError, setImgError] = useState(false);
  const showPhoto = photo && !imgError;
  const initials = getInitials(name);

  return (
    <div className="w-full aspect-[3/4] bg-slate-100 overflow-hidden relative">
      {showPhoto ? (
        <img src={photo} alt={name} className="absolute inset-0 w-full h-full object-cover object-top"
          onError={() => setImgError(true)} loading="lazy" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-violet-50">
          <span className="text-3xl font-black text-violet-400 select-none">{initials}</span>
        </div>
      )}
    </div>
  );
}

function PersonCard({ person, isAdmin, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden
      hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 group relative">
      {isAdmin && (
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(person)} className="bg-white/90 hover:bg-violet-100 text-violet-700 rounded-lg p-1.5 shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button onClick={() => onDelete(person)} className="bg-white/90 hover:bg-red-100 text-red-600 rounded-lg p-1.5 shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      )}
      <PhotoArea name={person.name} photo={person.photo} />
      <div className="px-3 py-3 text-center">
        <h3 className="text-[11px] font-bold text-slate-900 leading-tight tracking-wide line-clamp-2">{person.name}</h3>
        <span className={`mt-1.5 inline-block px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeColor(person.position)}`}>
          {person.position}
        </span>
      </div>
    </div>
  );
}

function AdminCard({ person, isAdmin, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-xl border-2 border-violet-200 overflow-hidden
      hover:shadow-lg hover:-translate-y-0.5 transition-all duration-150 relative group">
      {isAdmin && (
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(person)} className="bg-white/90 hover:bg-violet-100 text-violet-700 rounded-lg p-1.5 shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button onClick={() => onDelete(person)} className="bg-white/90 hover:bg-red-100 text-red-600 rounded-lg p-1.5 shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      )}
      <PhotoArea name={person.name} photo={person.photo} />
      <div className="px-3 py-3 text-center border-t-2 border-violet-100">
        <h3 className="text-xs font-bold text-slate-900 leading-tight tracking-wide line-clamp-2">{person.name}</h3>
        <span className={`mt-1.5 inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${badgeColor(person.position)}`}>
          {person.position}
        </span>
      </div>
    </div>
  );
}

const RANK_ORDER = [
  'Master Teacher I', 'Special Science Teacher I', 'Teacher VI', 'Teacher V',
  'Teacher IV', 'Teacher III', 'Teacher II', 'Teacher I', 'ALS Teacher',
];

function groupByPosition(list) {
  const groups = {};
  for (const person of list) {
    if (!groups[person.position]) groups[person.position] = [];
    groups[person.position].push(person);
  }
  const ordered = [];
  for (const rank of RANK_ORDER) {
    if (groups[rank]) ordered.push({ position: rank, members: groups[rank] });
  }
  for (const [pos, members] of Object.entries(groups)) {
    if (!RANK_ORDER.includes(pos)) ordered.push({ position: pos, members });
  }
  return ordered;
}

const EMPTY_FORM = { name: '', position: '', category: 'faculty', photo: '', display_order: 0 };

function FacultyModal({ isOpen, onClose, onSave, editingMember }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingMember) {
      setForm({ name: editingMember.name, position: editingMember.position, category: editingMember.category, photo: editingMember.photo || '', display_order: editingMember.display_order || 0 });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [editingMember, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingMember) {
        await api.put(`/api/accounts/v1/faculty-members/${editingMember.id}/`, form);
      } else {
        await api.post('/api/accounts/v1/faculty-members/', form);
      }
      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to save faculty member:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">{editingMember ? 'Edit Faculty Member' : 'Add Faculty Member'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Name *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Position *</label>
            <input type="text" required value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent">
              <option value="administration">Administration</option>
              <option value="faculty">Faculty</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Photo URL (optional)</label>
            <input type="url" value={form.photo} onChange={(e) => setForm({ ...form, photo: e.target.value })}
              placeholder="https://..." className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Display Order</label>
            <input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">{saving ? 'Saving...' : editingMember ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const Faculty = () => {
  const { user } = useAuth();
  const { academicYear } = useAcademicYear();
  const isAdmin = user?.role === 'admin';
  const [search, setSearch] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const fetchMembers = useCallback(async () => {
    try {
      const { data } = await api.get('/api/accounts/v1/faculty-members/');
      const results = data.results || data;
      setMembers(results);
    } catch (err) {
      console.error('Failed to fetch faculty:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const administration = members.filter(m => m.category === 'administration');
  const faculty = members.filter(m => m.category === 'faculty');
  const groups = groupByPosition(faculty);

  const filteredAdmin = administration.filter(
    (p) => search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.position.toLowerCase().includes(search.toLowerCase()),
  );
  const filteredGroups = groups
    .map((g) => ({ ...g, members: search ? g.members.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.position.toLowerCase().includes(search.toLowerCase())) : g.members }))
    .filter((g) => g.members.length > 0);
  const totalResults = filteredAdmin.length + filteredGroups.reduce((s, g) => s + g.members.length, 0);

  const STATS = [
    { label: 'Administration', value: administration.length },
    { label: 'Teaching Staff', value: faculty.filter(f => !f.position.includes('ALS') && !f.position.includes('ALIVE')).length },
    { label: 'ALS', value: faculty.filter(f => f.position.includes('ALS') || f.position.includes('ALIVE')).length },
    { label: 'Total Personnel', value: members.length },
  ];

  const handleEdit = (member) => { setEditingMember(member); setModalOpen(true); };
  const handleAdd = () => { setEditingMember(null); setModalOpen(true); };
  const handleDelete = async (member) => {
    if (!window.confirm(`Delete ${member.name}?`)) return;
    try {
      await api.delete(`/api/accounts/v1/faculty-members/${member.id}/`);
      setMembers(prev => prev.filter(m => m.id !== member.id));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <section className="bg-violet-950 py-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-5"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '50px 50px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-[10px] font-semibold text-violet-400 tracking-widest mb-1">Kiwalan National High School · SY {academicYear || '2025–2026'}</p>
              <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">Faculty & Staff</h1>
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              {isAdmin && (
                <button onClick={handleAdd} className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Member
                </button>
              )}
              {STATS.map((s) => (
                <div key={s.label} className="bg-white/10 border border-white/15 rounded-xl px-4 py-2 text-center min-w-[80px]">
                  <div className="text-xl font-bold text-white">{s.value}</div>
                  <div className="text-[9px] font-medium text-violet-300 tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 py-2.5 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
          <div className="relative w-72">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="search" placeholder="Search name or position…" value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent placeholder:text-slate-400 bg-slate-50" />
          </div>
          {search && <span className="text-xs text-slate-500 font-semibold">{totalResults} result{totalResults !== 1 ? 's' : ''}</span>}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {loading ? (
          <div className="py-16 text-center"><div className="animate-spin w-8 h-8 border-4 border-violet-300 border-t-transparent rounded-full mx-auto" /><p className="text-slate-400 mt-3 text-sm">Loading faculty...</p></div>
        ) : (
          <>
            {filteredAdmin.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div><p className="text-[10px] font-semibold text-violet-600 tracking-widest">Leadership</p><h2 className="text-lg font-bold text-slate-900">School Administration</h2></div>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {filteredAdmin.map((person) => (
                    <AdminCard key={person.id} person={person} isAdmin={isAdmin} onEdit={handleEdit} onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            )}

            {filteredGroups.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div><p className="text-[10px] font-semibold text-violet-600 tracking-widest">Our Educators</p><h2 className="text-lg font-bold text-slate-900">Teaching Staff</h2></div>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
                <div className="space-y-8">
                  {filteredGroups.map(({ position, members }) => (
                    <div key={position}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${badgeColor(position)}`}>{position}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{members.length} {members.length === 1 ? 'member' : 'members'}</span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                        {members.map((person) => (
                          <PersonCard key={person.id} person={person} isAdmin={isAdmin} onEdit={handleEdit} onDelete={handleDelete} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {totalResults === 0 && search && (
              <div className="py-16 text-center">
                <p className="text-slate-400 font-semibold">No results for &ldquo;{search}&rdquo;</p>
                <button onClick={() => setSearch('')} className="mt-3 text-sm font-bold text-violet-700 hover:underline">Clear search</button>
              </div>
            )}
          </>
        )}
      </div>

      <section className="mt-6 py-10 bg-violet-950 text-white">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-xl font-bold mb-2">Join Our Team</h2>
          <p className="text-violet-300 mb-5 text-sm">Looking for passionate educators to join the Kiwalan NHS family.</p>
          <a href="/contact" className="inline-flex items-center gap-2 bg-white text-violet-950 font-bold text-xs px-5 py-2.5 rounded-lg hover:bg-violet-100 transition-colors">
            Get in Touch
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </a>
        </div>
      </section>

      <FacultyModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSave={fetchMembers} editingMember={editingMember} />
    </div>
  );
};

export default Faculty;
