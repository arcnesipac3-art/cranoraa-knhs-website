import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { api } from '../../utils/api';
import { fetchAllFeeTypes } from './feeHelpers';

const EMPTY_TYPE_FORM = { name: '', code: '', is_active: true };

/**
 * Fee Types sub-view: the maintainable catalog of what the school charges
 * for (replaces the old hardcoded five types). Types with charges attached
 * can't be deleted — the backend answers 400 — so the UI pushes deactivation
 * instead and surfaces the server's message when deletion is attempted.
 */
export default function FeeTypesView() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | type object
  const [form, setForm] = useState(EMPTY_TYPE_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState(null); // type object

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const rows = await fetchAllFeeTypes();
      setTypes(rows.filter((t) => t && t.id != null));
    } catch (err) {
      setLoadError(err?.response?.data?.detail || err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setForm(EMPTY_TYPE_FORM);
    setFormError('');
    setEditing('new');
  };

  const openEdit = (type) => {
    setForm({ name: type.name, code: type.code, is_active: type.is_active });
    setFormError('');
    setEditing(type);
  };

  const closeForm = () => {
    setEditing(null);
    setFormError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = { name: form.name, code: form.code, is_active: form.is_active };
      if (editing === 'new') {
        await api.post('/fee-types/', payload);
        toast.success('Fee type created');
      } else {
        await api.patch(`/fee-types/${editing.id}/`, payload);
        toast.success('Fee type updated');
      }
      closeForm();
      fetchData();
    } catch (err) {
      const data = err.response?.data;
      if (data?.name) setFormError(`Name: ${data.name[0]}`);
      else if (data?.code) setFormError(`Code: ${data.code[0]}`);
      else if (data?.error) setFormError(data.error);
      else setFormError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (type) => {
    try {
      await api.patch(`/fee-types/${type.id}/`, { is_active: !type.is_active });
      toast.success(`"${type.name}" ${type.is_active ? 'deactivated' : 'activated'}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update fee type');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/fee-types/${deleting.id}/`);
      toast.success(`"${deleting.name}" deleted`);
      fetchData();
    } catch (err) {
      // 400 when charges still reference the type (deletion guard).
      toast.error(err.response?.data?.error || 'Failed to delete fee type');
    }
    setDeleting(null);
  };

  if (loading) {
    return <Skeleton.Table rows={5} cols={5} hasAvatar={false} />;
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-lg border border-rose-200 p-8 text-center">
        <h3 className="text-base font-semibold text-slate-900">Couldn&apos;t load fee types</h3>
        <p className="text-sm text-slate-500 mt-1 break-words">{loadError}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {types.length} fee type{types.length === 1 ? '' : 's'} · inactive types stay on historical charges but are
          hidden from new-charge forms.
        </p>
        <button
          onClick={openNew}
          className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Fee Type
        </button>
      </div>

      {/* Table / cards */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {types.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
            title="No fee types yet"
            description="Add the kinds of charges your school collects (Tuition, Laboratory, ...) — they become selectable when creating charges."
            actionLabel="Add Fee Type"
            onAction={openNew}
          />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Name', 'Code', 'Status', 'Charges', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {types.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{t.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 font-mono">
                          {t.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{t.charges_count ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(t)}
                            className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                            title="Edit"
                            aria-label={`Edit ${t.name}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => toggleActive(t)}
                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
                            title={t.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {t.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setDeleting(t)}
                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete"
                            aria-label={`Delete ${t.name}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-200">
              {types.map((t) => (
                <div key={t.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{t.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{t.code} · {t.charges_count ?? 0} charge(s)</p>
                    </div>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold shrink-0 ${t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(t)} className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                      Edit
                    </button>
                    <button onClick={() => toggleActive(t)} className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                      {t.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => setDeleting(t)} className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create/Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40" onClick={closeForm}>
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fee-type-modal-title"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 id="fee-type-modal-title" className="text-lg font-bold text-slate-900">
                {editing === 'new' ? 'Add Fee Type' : 'Edit Fee Type'}
              </h2>
              <button onClick={closeForm} aria-label="Close dialog" className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {formError && (
                <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-lg">
                  {formError}
                </div>
              )}
              <div>
                <label htmlFor="ft-name" className="block text-xs font-semibold text-slate-700 mb-1">Name *</label>
                <input
                  id="ft-name"
                  type="text" required maxLength={50}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="e.g. Laboratory Fee"
                />
              </div>
              <div>
                <label htmlFor="ft-code" className="block text-xs font-semibold text-slate-700 mb-1">Code *</label>
                <input
                  id="ft-code"
                  type="text" required maxLength={20}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="e.g. LAB"
                />
                <p className="text-[11px] text-slate-500 mt-1">Short unique code (letters, numbers, hyphens).</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                Active (available on new charges)
              </label>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={closeForm} disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmationDialog
        isOpen={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Delete Fee Type"
        message={deleting
          ? `Delete "${deleting.name}"? This is only possible while no charges reference it — otherwise deactivate it instead.`
          : ''}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
