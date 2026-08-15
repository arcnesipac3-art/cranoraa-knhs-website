import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useComplianceTypes } from '../../hooks/useCompliance';
import { useFetch } from '../../hooks/useFetch';
import Modal, { ModalBody, ModalFooter, ModalField, modalInputCls, modalSelectCls, modalTextareaCls, ModalBtnPrimary, ModalBtnSecondary } from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly', desc: 'Every Friday' },
  { value: 'monthly', label: 'Monthly', desc: 'Day 15 of each month' },
  { value: 'quarterly', label: 'Quarterly', desc: 'End of each term' },
  { value: 'yearly', label: 'Yearly', desc: 'End of school year' },
];

const FREQUENCY_STYLES = {
  weekly:    { color: 'bg-blue-50 text-blue-600 border-blue-200' },
  monthly:   { color: 'bg-violet-50 text-violet-600 border-violet-200' },
  quarterly: { color: 'bg-amber-50 text-amber-600 border-amber-200' },
  yearly:    { color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
};

// SVG icon for each frequency
function FrequencyIcon({ frequency, className = 'w-5 h-5' }) {
  if (frequency === 'weekly') return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
  if (frequency === 'monthly') return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
  if (frequency === 'quarterly') return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

const defaultForm = {
  name: '',
  slug: '',
  description: '',
  frequency: 'weekly',
  deadline_day: 5,
  max_file_size_mb: 50,
  is_active: true,
  order: 0,
  assigned_subjects: [],  // array of subject IDs
};

export default function ComplianceTypesPage() {
  const { types, loading, fetchTypes, createType, updateType, deleteType, hardDeleteType } = useComplianceTypes();
  const { data: subjectsData } = useFetch('/subjects/');
  const subjects = subjectsData?.results || subjectsData || [];

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
      assigned_subjects: (type.assigned_subjects || []).map(s => s.id),
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
    if (type.is_active) {
      const result = await Swal.fire({
        title: `Deactivate "${type.name}"?`,
        text: 'Teachers will no longer see this compliance type. You can reactivate it later.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Deactivate',
      });
      if (result.isConfirmed) {
        await deleteType(type.id);
      }
    } else {
      // Reactivate
      await updateType(type.id, { is_active: true });
    }
  };

  const handleHardDelete = async (type) => {
    const result = await Swal.fire({
      title: `Permanently delete "${type.name}"?`,
      html: '<p style="color:#6b7280;font-size:0.875rem">This cannot be undone. The type and all its data will be removed from the database.<br><br>If this type has existing submissions it <strong>cannot</strong> be deleted — deactivate it instead.</p>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      confirmButtonText: 'Yes, delete permanently',
      cancelButtonText: 'Cancel',
    });
    if (result.isConfirmed) {
      try {
        await hardDeleteType(type.id);
      } catch {
        // error already toasted by hook
      }
    }
  };

  const handleToggleActive = async (type) => {
    await updateType(type.id, { is_active: !type.is_active });
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
            const style = FREQUENCY_STYLES[type.frequency] || FREQUENCY_STYLES.weekly;
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
                      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${style.color}`}>
                        <FrequencyIcon frequency={type.frequency} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{type.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{type.frequency_display}</p>
                        {type.description && (
                          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{type.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Active toggle */}
                    <button
                      onClick={() => handleToggleActive(type)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                        type.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      title={type.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
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
                    {/* Subject scope */}
                    {type.assigned_subjects?.length > 0 ? (
                      type.assigned_subjects.slice(0, 3).map(s => (
                        <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 bg-violet-50 border border-violet-100 rounded-md text-[10px] font-bold text-violet-600">
                          {s.code}
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-md text-[10px] font-bold text-emerald-600">
                        All subjects
                      </span>
                    )}
                    {type.assigned_subjects?.length > 3 && (
                      <span className="text-[10px] text-slate-400 font-bold">+{type.assigned_subjects.length - 3}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    type.is_active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${type.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {type.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEdit(type)}
                      className="text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors"
                    >
                      Edit
                    </button>
                    <span className="text-slate-200">|</span>
                    <button
                      onClick={() => handleDelete(type)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      {type.is_active ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <span className="text-slate-200">|</span>
                    <button
                      onClick={() => handleHardDelete(type)}
                      className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                    >
                      Delete
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Subject assignment */}
            <ModalField
              label="Applies to Subjects"
              hint="Leave empty to apply to ALL teachers. Select specific subjects to restrict."
            >
              <div className="border border-slate-200 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1 bg-white">
                {subjects.length === 0 ? (
                  <p className="text-xs text-slate-400 p-1">No subjects found.</p>
                ) : (
                  subjects.map(s => {
                    const checked = form.assigned_subjects.includes(s.id);
                    return (
                      <label key={s.id} className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-violet-50' : 'hover:bg-slate-50'}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setForm(prev => ({
                              ...prev,
                              assigned_subjects: checked
                                ? prev.assigned_subjects.filter(id => id !== s.id)
                                : [...prev.assigned_subjects, s.id],
                            }));
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${checked ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                          {s.code}
                        </span>
                        <span className="text-xs text-slate-700 truncate">{s.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
              {form.assigned_subjects.length === 0 && (
                <p className="text-[11px] text-emerald-600 font-semibold mt-1.5">
                  ✓ Applies to all teachers
                </p>
              )}
              {form.assigned_subjects.length > 0 && (
                <p className="text-[11px] text-violet-600 font-semibold mt-1.5">
                  Restricted to {form.assigned_subjects.length} subject{form.assigned_subjects.length !== 1 ? 's' : ''}
                </p>
              )}
            </ModalField>

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
