import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useComplianceTypes } from '../../hooks/useCompliance';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const defaultForm = {
  name: '',
  slug: '',
  description: '',
  frequency: 'weekly',
  deadline_day: 5,
  max_file_size_mb: 50,
  is_active: true,
  order: 0,
};

export default function ComplianceTypesPage() {
  const { types, loading, fetchTypes, createType, updateType, deleteType } = useComplianceTypes();
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const handleCreate = () => {
    setEditingType(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setForm({
      name: type.name,
      slug: type.slug,
      description: type.description || '',
      frequency: type.frequency,
      deadline_day: type.deadline_day,
      max_file_size_mb: type.max_file_size_mb,
      is_active: type.is_active,
      order: type.order,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!form.slug.trim()) {
      setForm(prev => ({ ...prev, slug: form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }));
    }

    setSaving(true);
    try {
      if (editingType) {
        await updateType(editingType.id, form);
      } else {
        await createType(form);
      }
      setShowModal(false);
      fetchTypes();
    } catch (err) {
      // handled by hook
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type) => {
    const result = await Swal.fire({
      title: `Deactivate "${type.name}"?`,
      text: 'Teachers will no longer see this compliance type.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      confirmButtonText: 'Deactivate',
    });
    if (result.isConfirmed) {
      await deleteType(type.id);
    }
  };

  const handleToggleActive = async (type) => {
    await updateType(type.id, { ...type, is_active: !type.is_active });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Compliance Types</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700"
        >
          + Add Type
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl p-5 animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 rounded w-40" />
              <div className="h-4 bg-slate-100 rounded w-60" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Frequency</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deadline</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {types.map(type => (
                  <tr key={type.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-slate-500">{type.order}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-bold text-slate-900">{type.name}</p>
                      {type.description && (
                        <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">{type.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{type.frequency_display}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">
                      {type.frequency === 'weekly' ? 'Day 5 (Friday)' :
                       type.frequency === 'monthly' ? `Day ${type.deadline_day}` :
                       type.frequency === 'quarterly' ? 'End of term' : 'End of year'}
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggleActive(type)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          type.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          type.is_active ? 'translate-x-4.5' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(type)}
                          className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(type)}
                          className="text-sm text-red-500 hover:text-red-600 font-medium"
                        >
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {types.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-400">
                      No compliance types created yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingType ? 'Edit Compliance Type' : 'Create Compliance Type'}
        size="md"
      >
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="e.g., Lesson Plan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              placeholder="auto-generated from name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Frequency *</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm(prev => ({ ...prev, frequency: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              >
                {FREQUENCY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deadline Day</label>
              <input
                type="number"
                value={form.deadline_day}
                onChange={(e) => setForm(prev => ({ ...prev, deadline_day: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                min="1"
                max="31"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max File Size (MB)</label>
              <input
                type="number"
                value={form.max_file_size_mb}
                onChange={(e) => setForm(prev => ({ ...prev, max_file_size_mb: parseInt(e.target.value) || 50 }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingType ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
