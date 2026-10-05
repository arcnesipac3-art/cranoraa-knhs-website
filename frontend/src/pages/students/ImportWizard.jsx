/**
 * ImportWizard — guided 5-step CSV import (§17–§19).
 *
 *  1 Upload → 2 Validate (server dry run) → 3 Review (row-numbered errors +
 *  warnings, error-report download) → 4 Confirm → 5 Result (credentials).
 *
 * The backend validates in a single pass: a dry run and the real import can
 * never disagree, invalid rows are never written, and the dry run is exempt
 * from the import rate limit (only real imports count toward it).
 *
 * Configurable per directory so Students, Staff and Parents share one flow:
 * pass `endpoint`, `noun`, `expectedColumns`, `previewColumns` and
 * `onDownloadTemplate`.
 */
import { useState, useRef } from 'react';
import {
  Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter,
  ModalBtnPrimary, ModalBtnSecondary,
} from '../../components/ui';
import api from '../../utils/api';
import { downloadTemplate } from './exportDirectory';

const STUDENT_PREVIEW_COLUMNS = [
  { key: 'student_id', label: 'Student ID' },
  { key: 'name', label: 'Name' },
  { key: 'grade_level', label: 'Grade' },
  { key: 'sex', label: 'Sex' },
];

const STEPS = [
  { id: 'upload', label: 'Upload' },
  { id: 'validating', label: 'Validate' },
  { id: 'review', label: 'Review' },
  { id: 'confirm', label: 'Confirm' },
  { id: 'done', label: 'Result' },
];

const btnBase = 'inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold tracking-[0.06em] rounded-lg transition-colors';

function downloadCsv(filename, headers, rows) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map(r => headers.map((_, i) => esc(r[i])).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** XLSX/XLS → CSV conversion happens client-side; the API only takes CSV. */
async function toCsvFile(file) {
  if (/\.csv$/i.test(file.name)) return file;
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const csv = XLSX.utils.sheet_to_csv(ws);
  return new File([csv], file.name.replace(/\.(xlsx|xls)$/i, '.csv'), { type: 'text/csv' });
}

function StepChips({ current }) {
  const currentIdx = STEPS.findIndex(s => s.id === current);
  return (
    <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1" aria-label="Import progress">
      {STEPS.map((s, i) => {
        const state = i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'todo';
        return (
          <li key={s.id} className="flex items-center gap-1 sm:gap-2 shrink-0">
            <span
              aria-current={state === 'active' ? 'step' : undefined}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-[0.08em] ${
                state === 'active' ? 'bg-violet-100 text-violet-700 border border-violet-300'
                  : state === 'done' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-50 text-slate-400 border border-slate-200'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                state === 'active' ? 'bg-violet-600 text-white'
                  : state === 'done' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {state === 'done' ? '✓' : i + 1}
              </span>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="w-3 sm:w-5 h-px bg-slate-200" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

export default function ImportWizard({
  isOpen,
  onClose,
  onImported,
  // Per-directory configuration — Students is the default.
  endpoint = '/users/import_csv/',
  title = 'Import Students',
  noun = 'student',
  nounPlural = 'students',
  idLabel = 'Student ID',
  expectedColumns = (
    <p><code className="font-mono">Student ID</code> (12-digit LRN) · <code className="font-mono">Email</code> · <code className="font-mono">First Name</code> · <code className="font-mono">Last Name</code> · <code className="font-mono">Grade Level</code> · <code className="font-mono">Sex</code></p>
  ),
  previewColumns = STUDENT_PREVIEW_COLUMNS,
  onDownloadTemplate = downloadTemplate,
}) {
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [preview, setPreview] = useState(null);   // dry-run response
  const [result, setResult] = useState(null);      // real import response
  const inputRef = useRef(null);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setBusy(false);
    setApiError(null);
    setPreview(null);
    setResult(null);
  };

  const handleClose = () => {
    // Only a real import in flight is untouchable; validation can be abandoned.
    if (busy && step === 'confirm') return;
    onClose();
    // Reset after the modal hides so reopening starts clean.
    setTimeout(reset, 250);
  };

  const validate = async (csvFile) => {
    setBusy(true);
    setApiError(null);
    try {
      const fd = new FormData();
      fd.append('file', csvFile);
      fd.append('dry_run', '1');
      const res = await api.post(endpoint, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data);
      setStep('review');
    } catch (err) {
      const status = err.response?.status;
      setApiError(
        status === 429
          ? 'Import limit reached — the account can import 5 files per hour. Try again later.'
          : status === 403
            ? `You do not have permission to import ${nounPlural} accounts.`
            : err.response?.data?.error || 'Could not validate the file. Check the column format and encoding (UTF-8).',
      );
      setStep('upload');
    }
    setBusy(false);
  };

  const handleFile = async (picked) => {
    if (!picked) return;
    setBusy(true);
    try {
      const csvFile = await toCsvFile(picked);
      setFile(csvFile);
      setStep('validating');
      setBusy(false);
      await validate(csvFile);
    } catch {
      setBusy(false);
      setApiError('Could not read this file. Upload a CSV or Excel file with the expected columns.');
      setStep('upload');
    }
  };

  const runImport = async () => {
    setBusy(true);
    setApiError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post(endpoint, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      setStep('done');
      onImported?.();
    } catch (err) {
      const status = err.response?.status;
      setApiError(
        status === 429
          ? 'Import limit reached — the account can import 5 files per hour. Try again later.'
          : err.response?.data?.error || 'The import failed. Nothing was written — please retry.',
      );
      setStep('confirm');
    }
    setBusy(false);
  };

  const validCount = preview?.valid_count ?? 0;
  const errorCount = preview?.row_errors?.length ?? 0;
  const warnCount = preview?.row_warnings?.length ?? 0;
  const totalRows = validCount + errorCount;

  const downloadErrorReport = () => {
    const rows = [
      ...(preview?.row_errors || []).map(e => [e.row, 'error', e.message]),
      ...(preview?.row_warnings || []).map(w => [w.row, 'warning', w.message]),
    ];
    downloadCsv('knhs_import_error_report.csv', ['Row', 'Severity', 'Message'], rows);
  };

  const downloadCredentials = () => {
    downloadCsv(
      `knhs_${nounPlural}_import_credentials.csv`,
      ['Name', idLabel, 'Temporary Password'],
      (result?.created_users || []).map((u) => [u.name, u.username, u.password]),
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" closeOnOverlayClick={false}>
      <ModalHeader onClose={handleClose}>
        <ModalTitle title={title} subtitle="Guided CSV import with validation preview" />
      </ModalHeader>

      <ModalBody className="space-y-4">
        <StepChips current={step} />

        {apiError && (
          <div role="alert" className="px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700">
            {apiError}
          </div>
        )}

        {/* ── 1 · Upload ── */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={`border border-dashed p-6 sm:p-8 text-center transition-colors ${dragging ? 'border-violet-500 bg-violet-50' : 'border-slate-300 hover:border-slate-400'}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
            >
              <svg className="w-8 h-8 mx-auto text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-bold text-slate-700 mb-1">Drop your file here or click to browse</p>
              <p className="text-xs text-slate-400">CSV, XLSX or XLS — first row must be the header</p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => handleFile(e.target.files?.[0])}
              />
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                  className={`${btnBase} bg-[#5e2a84] text-white hover:bg-violet-700 disabled:opacity-50`}
                >
                  {busy ? 'Reading file…' : 'Select file'}
                </button>
                <button type="button" onClick={onDownloadTemplate} className={`${btnBase} bg-white border border-slate-200 text-slate-600 hover:border-slate-300`}>
                  Download template
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-700">Expected columns</p>
              {expectedColumns}
              <p>Nothing is imported until you review the validation results and confirm. Invalid rows are reported with their row number and are never created.</p>
            </div>
          </div>
        )}

        {/* ── 2 · Validating ── */}
        {step === 'validating' && (
          <div className="py-14 flex flex-col items-center gap-3">
            <span className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <p className="text-sm font-bold text-slate-700">Validating {file?.name}…</p>
            <p className="text-xs text-slate-400">Running a dry check against existing accounts. Nothing is written.</p>
          </div>
        )}

        {/* ── 3 · Review ── */}
        {step === 'review' && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Ready to import', value: validCount, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                { label: 'Row errors', value: errorCount, cls: errorCount ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-500 bg-slate-50 border-slate-200' },
                { label: 'Warnings', value: warnCount, cls: warnCount ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-500 bg-slate-50 border-slate-200' },
              ].map(c => (
                <div key={c.label} className={`border rounded-lg px-3 py-2.5 text-center ${c.cls}`}>
                  <p className="text-xl font-black tabular-nums">{c.value}</p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] mt-0.5">{c.label}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500 font-medium">
              {file?.name} · {totalRows} data row{totalRows === 1 ? '' : 's'} found.
              {errorCount > 0 && ' Rows with errors will be skipped — the rest import normally.'}
            </p>

            {errorCount + warnCount > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Row report</p>
                  <button type="button" onClick={downloadErrorReport} className="text-[11px] font-bold text-violet-600 hover:text-violet-800">
                    Download error report
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {(preview.row_errors || []).map(e => (
                    <div key={`e${e.row}`} className="flex gap-3 px-3 py-2 text-xs">
                      <span className="font-mono font-bold text-rose-600 w-12 shrink-0">Row {e.row}</span>
                      <span className="text-slate-600">{e.message}</span>
                      <span className="ml-auto text-[9px] font-bold text-rose-500 uppercase shrink-0">error</span>
                    </div>
                  ))}
                  {(preview.row_warnings || []).map(w => (
                    <div key={`w${w.row}`} className="flex gap-3 px-3 py-2 text-xs">
                      <span className="font-mono font-bold text-amber-600 w-12 shrink-0">Row {w.row}</span>
                      <span className="text-slate-600">{w.message}</span>
                      <span className="ml-auto text-[9px] font-bold text-amber-500 uppercase shrink-0">warning</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {validCount > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">
                    Preview · first {Math.min(validCount, 8)} of {validCount} valid rows
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                      <tr>
                        <th scope="col" className="px-3 py-2">Row</th>
                        {previewColumns.map((c) => (
                          <th key={c.key} scope="col" className="px-3 py-2">{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.preview.slice(0, 8).map((p) => (
                        <tr key={p.row}>
                          <td className="px-3 py-1.5 font-mono text-slate-400">{p.row}</td>
                          {previewColumns.map((c) => (
                            <td
                              key={c.key}
                              className={`px-3 py-1.5 ${c.key === 'name' ? 'font-semibold text-slate-700' : 'text-slate-500'} ${c.key === 'student_id' ? 'font-mono' : ''} ${c.key === 'sex' ? 'capitalize' : ''}`}
                            >
                              {String(p[c.key] ?? '—')}
                              {c.key === 'name' && p.has_warnings && (
                                <span className="ml-1.5 text-[9px] font-bold text-amber-500">⚠</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 4 · Confirm ── */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="px-4 py-3 bg-violet-50 border border-violet-200 rounded-lg">
              <p className="text-sm font-bold text-violet-800">
                Import {validCount} {noun} account{validCount === 1 ? '' : 's'}?
              </p>
              <p className="text-xs text-violet-600 mt-1">
                {errorCount > 0
                  ? `${errorCount} invalid row${errorCount === 1 ? '' : 's'} will be skipped and are not created.`
                  : 'Every row passed validation.'}
                {' '}Temporary passwords are generated for each account — you can download them afterwards.
              </p>
            </div>
            <p className="text-[11px] text-slate-400">
              File: <span className="font-semibold text-slate-600">{file?.name}</span> · imported accounts land in the
              directory immediately and the action is recorded in the audit trail.
            </p>
          </div>
        )}

        {/* ── 5 · Result ── */}
        {step === 'done' && result && (
          <div className="space-y-4">
            <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-emerald-700">
                  {result.created_count} {noun}{result.created_count === 1 ? '' : 's'} imported
                </p>
                {result.row_errors?.length > 0 && (
                  <p className="text-xs text-rose-600 mt-0.5">
                    {result.row_errors.length} row{result.row_errors.length === 1 ? '' : 's'} skipped due to errors.
                  </p>
                )}
              </div>
              <button type="button" onClick={downloadCredentials} className={`${btnBase} bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 shrink-0`}>
                Download credentials
              </button>
            </div>

            {result.created_users?.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                      <tr>
                        <th scope="col" className="px-3 py-2">Name</th>
                        <th scope="col" className="px-3 py-2">{idLabel}</th>
                        <th scope="col" className="px-3 py-2">Temporary password</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.created_users.map(u => (
                        <tr key={u.username}>
                          <td className="px-3 py-1.5 font-bold text-slate-800">{u.name}</td>
                          <td className="px-3 py-1.5 font-mono">{u.username}</td>
                          <td className="px-3 py-1.5 font-mono text-violet-700 select-all">{u.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-400">
              Give each {noun} their temporary password — they must change it on first login.
              Save the credentials file somewhere secure; it is not stored by the system.
            </p>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {step === 'upload' && (
          <ModalBtnSecondary onClick={handleClose}>Cancel</ModalBtnSecondary>
        )}

        {step === 'review' && (
          <>
            <ModalBtnSecondary onClick={() => setStep('upload')} disabled={busy}>Back</ModalBtnSecondary>
            <ModalBtnPrimary
              onClick={() => setStep('confirm')}
              disabled={validCount === 0}
              title={validCount === 0 ? 'No valid rows to import' : undefined}
            >
              Continue
            </ModalBtnPrimary>
          </>
        )}

        {step === 'confirm' && (
          <>
            <ModalBtnSecondary onClick={() => setStep('review')} disabled={busy}>Back</ModalBtnSecondary>
            <ModalBtnPrimary onClick={runImport} loading={busy} disabled={busy}>
              {busy ? 'Importing…' : `Import ${validCount} ${noun}${validCount === 1 ? '' : 's'}`}
            </ModalBtnPrimary>
          </>
        )}

        {step === 'done' && (
          <ModalBtnPrimary onClick={handleClose}>Done</ModalBtnPrimary>
        )}
      </ModalFooter>
    </Modal>
  );
}
