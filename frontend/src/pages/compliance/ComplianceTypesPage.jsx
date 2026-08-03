import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useComplianceTypes } from '../../hooks/useCompliance';
import Modal, { ModalBody, ModalFooter, ModalField, modalInputCls, modalSelectCls, modalTextareaCls, ModalBtnPrimary, ModalBtnSecondary } from '../../components/ui/Modal';
import ComplianceStatusBadge from '../../components/compliance/ComplianceStatusBadge';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly', desc: 'Every Friday' },
  { value: 'monthly', label: 'Monthly', desc: 'Day 15 of each month' },
  { value: 'quarterly', label: 'Quarterly', desc: 'End of each term' },
  { value: 'yearly', label: 'Yearly', desc: 'End of school year' },
];

const FREQUENCY_ICONS = {
  weekly: { emoji: '📋', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  monthly: { emoji: '📅', color: 'bg-violet-50 text-violet-600 border-violet-200' },
  quarterly: { emoji: '📊', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  yearly: { emoji: '📆', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
};

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

  const activeCount = types.filter(t => t.is_active).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Compliance Types</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {types.length} types \u2022 {activeCount} active
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Type
        </button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-32" />
                  <div className="h-3 bg-slate-100 rounded w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : types.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">No compliance types yet</h3>
          <p className="text-sm text-slate-500 mb-4">Create your first compliance type to get started.</p>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Create Type
          </button>
        </div>
      ) : (
        /* Card Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {types.map((type, i) => {
            const freq = FREQUENCY_ICONS[type.frequency] || FREQUENCY_ICONS.weekly;
            return (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-white rounded-xl border overflow-hidden transition-all ${
                  type.is_active ? 'border-slate-200 hover:border-violet-200 hover:shadow-md' : 'border-slate-100 opacity-60'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-lg flex-shrink-0 ${freq.color}`}>
                        {freq.emoji}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{type.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{type.frequency_display}</p>
                        {type.description && (
                          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{type.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleActive(type)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                        type.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      title={type.is_active ? 'Active' : 'Inactive'}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${
                        type.is_active ? 'translate-x-4' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-100 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {type.frequency_display}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-100 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Day {type.deadline_day}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-100 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Max {type.max_file_size_mb}MB
                    </span>
                    {type.order > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-100 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        #{type.order}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <ComplianceStatusBadge status={type.is_active ? 'reviewed' : 'draft'} size="xs" />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(type)}
                      className="text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors"
                    >
                      Edit
                    </button>
                    <span className="text-slate-200">|</span>
                    <button
                      onClick={() => handleDelete(type)}
                      className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingType ? 'Edit Compliance Type' : 'Create Compliance Type'}
        size="md"
      >
        <ModalBody>
          <div className="space-y-4">
            <ModalField label="Name" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                className={modalInputCls}
                placeholder="e.g., Lesson Plan"
                autoFocus
              />
            </ModalField>

            <ModalField label="Slug" hint="Auto-generated from name if left empty">
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
                className={modalInputCls}
                placeholder="lesson-plan"
              />
            </ModalField>

            <ModalField label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className={modalTextareaCls}
                rows={2}
                placeholder="Optional description..."
              />
            </ModalField>

            <div className="grid grid-cols-2 gap-4">
              <ModalField label="Frequency" required>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm(prev => ({ ...prev, frequency: e.target.value }))}
                  className={modalSelectCls}
                >
                  {FREQUENCY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </ModalField>

              <ModalField label="Deadline Day" hint={form.frequency === 'weekly' ? '5 = Friday' : `Day of ${form.frequency === 'monthly' ? 'month' : 'period'}`}>
                <input
                  type="number"
                  value={form.deadline_day}
                  onChange={(e) => setForm(prev => ({ ...prev, deadline_day: parseInt(e.target.value) || 0 }))}
                  className={modalInputCls}
                  min="1"
                  max="31"
                />
              </ModalField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ModalField label="Max File Size (MB)">
                <input
                  type="number"
                  value={form.max_file_size_mb}
                  onChange={(e) => setForm(prev => ({ ...prev, max_file_size_mb: parseInt(e.target.value) || 50 }))}
                  className={modalInputCls}
                  min="1"
                />
              </ModalField>

              <ModalField label="Display Order" hint="Lower = appears first">
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                  className={modalInputCls}
                  min="0"
                />
              </ModalField>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <ModalBtnSecondary onClick={() => setShowModal(false)}>
            Cancel
          </ModalBtnSecondary>
          <ModalBtnPrimary onClick={handleSave} loading={saving}>
            {editingType ? 'Update Type' : 'Create Type'}
          </ModalBtnPrimary>
        </ModalFooter>
      </Modal>
    </div>
  );
}
