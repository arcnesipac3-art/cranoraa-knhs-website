import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardBody, CardTitle, Button,
  Skeleton, EmptyState
} from '../components/ui';
import {
  Calendar, Plus, Trash2, Edit2, Cloud, Sun, Coffee, AlertTriangle, X
} from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'holiday', label: 'Holiday', icon: Sun, color: 'text-amber-500' },
  { value: 'weather', label: 'Weather Disruption', icon: Cloud, color: 'text-blue-500' },
  { value: 'break', label: 'School Break', icon: Coffee, color: 'text-green-500' },
  { value: 'other', label: 'Other', icon: AlertTriangle, color: 'text-slate-500' },
];

const SchoolCalendarAdmin = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ date: '', title: '', description: '', type: 'holiday' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchEntries(); }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await api.get('/school-calendar/');
      setEntries(res.data.results || res.data || []);
    } catch {
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ date: '', title: '', description: '', type: 'holiday' });
    setShowForm(true);
  };

  const openEdit = (entry) => {
    setEditing(entry);
    setForm({ date: entry.date, title: entry.title, description: entry.description || '', type: entry.type });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.date || !form.title) {
      toast.error('Date and title are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/school-calendar/${editing.id}/`, form);
        toast.success('Updated');
      } else {
        await api.post('/school-calendar/', form);
        toast.success('Added');
      }
      setShowForm(false);
      fetchEntries();
    } catch (err) {
      const msg = err.response?.data?.date?.[0] || err.response?.data?.detail || 'Failed to save';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this calendar entry?')) return;
    try {
      await api.delete(`/school-calendar/${id}/`);
      toast.success('Removed');
      fetchEntries();
    } catch {
      toast.error('Failed to remove');
    }
  };

  const getTypeInfo = (type) => TYPE_OPTIONS.find(t => t.value === type) || TYPE_OPTIONS[3];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-violet-600" />
          School Calendar
        </h1>
        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Entry
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editing ? 'Edit Entry' : 'New Entry'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none">
                  {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
              <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Christmas Day, Typhoon Suspension"
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
                {editing ? 'Update' : 'Add'}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <Skeleton.ListItem />
      ) : entries.length === 0 ? (
        <EmptyState message="No calendar entries yet" />
      ) : (
        <div className="space-y-2">
          {entries.map(entry => {
            const typeInfo = getTypeInfo(entry.type);
            const Icon = typeInfo.icon;
            return (
              <Card key={entry.id}>
                <CardBody className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${typeInfo.color}`} />
                      <div>
                        <div className="font-medium text-sm text-slate-900">{entry.title}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          <span className="ml-2 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium">{typeInfo.label}</span>
                        </div>
                        {entry.description && <div className="text-xs text-slate-400 mt-0.5">{entry.description}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(entry)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SchoolCalendarAdmin;
