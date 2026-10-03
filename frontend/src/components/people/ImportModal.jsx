import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { useScrollLock } from '../../hooks/useScrollLock';

const TEACHER_TEMPLATE = {
  sheetName: 'Teacher Template',
  filename: 'KNHS_Teacher_Import_Template.xlsx',
  headers: [['Title', 'First Name', 'Last Name', 'Email', 'Sex']],
  sampleData: [
    ['Mr.', 'John', 'Doe', 'john.doe@example.com', 'Male'],
    ['Ms.', 'Jane', 'Smith', 'jane.smith@example.com', 'Female'],
  ],
  instructions: [
    'Email is required and serves as the username.',
    'Valid Titles: Mr., Ms., Mrs., Dr., Prof.',
    'Sex: Male or Female',
    'Do NOT change the header names.',
  ],
};

const STUDENT_TEMPLATE = {
  sheetName: 'Student Template',
  filename: 'KNHS_Student_Import_Template.xlsx',
  headers: [['Student ID', 'First Name', 'Last Name', 'Grade Level', 'Sex', 'Email']],
  sampleData: [
    ['128150150092', 'Arc', 'Capisen', 'Grade 12', 'Male', ''],
    ['128150150093', 'Arcc', 'Capisenq', 'Grade 12', 'Female', ''],
    ['128150150094', 'Arcy', 'Capisenw', 'Grade 12', 'Male', ''],
  ],
  instructions: [
    'Student ID must be exactly 12 digits (LRN).',
    'Email is optional.',
    'Grade Level: Grade 7 to Grade 12.',
    'Do NOT change the header names.',
  ],
};

const PARENT_TEMPLATE = {
  sheetName: 'Parent Template',
  filename: 'KNHS_Parent_Import_Template.xlsx',
  headers: [['First Name', 'Last Name', 'Email', 'Password']],
  sampleData: [
    ['Juan', 'Dela Cruz', 'juan@example.com', ''],
    ['Maria', 'Santos', 'maria@example.com', ''],
  ],
  instructions: [
    'Email is required and serves as the username.',
    'Password is optional - leave blank to auto-generate.',
    'Do NOT change the header names.',
  ],
};

const TEMPLATES = {
  teacher: TEACHER_TEMPLATE,
  student: STUDENT_TEMPLATE,
  parent: PARENT_TEMPLATE,
};

export default function ImportModal({
  isOpen,
  onClose,
  onImport,
  userType,
}) {
  const { data: template } = useState(() => TEMPLATES[userType]);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { isLocked } = useScrollLock(isOpen);

  const downloadTemplate = () => {
    const { sheetName, filename, headers, sampleData } = template;
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);
    const headerRange = XLSX.utils.decode_range(ws['!ref']);
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + '1';
      if (!ws[address]) continue;
      ws[address].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "5e2a84" } },
        alignment: { horizontal: "center" }
      };
    }
    ws['!cols'] = headers[0].map((_, i) => ({ wch: i < 3 ? 20 : 30 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
    toast.success('Template downloaded');
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file || importing) return;
    
    const loadingToast = toast.loading('Reading file...');
    setImporting(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          
          // Convert sheet to CSV format for the backend
          const csvData = XLSX.utils.sheet_to_csv(ws);
          
          const blob = new Blob([csvData], { type: 'text/csv' });
          const formData = new FormData();
          formData.append('file', blob, 'import.csv');

          toast.loading('Importing...', { id: loadingToast });
          const response = await onImport(formData);
          toast.dismiss(loadingToast);
          
          const { created_count, created_users, errors } = response.data;

          if (created_count > 0) {
            Swal.fire({
              icon: 'success',
              title: 'Import Successful',
              width: '90%',
              html: `
                <div class="text-left">
                  <p class="mb-4 text-sm font-bold text-emerald-600">Successfully created ${created_count} ${userType}s!</p>
                  <div class="max-h-60 overflow-auto border border-slate-200 rounded">
                    <table class="w-full text-[10px] text-left">
                      <thead class="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th class="px-3 py-2">Name</th>
                          <th class="px-3 py-2">Email</th>
                          <th class="px-3 py-2">Temp Password</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        ${created_users.map(u => `
                          <tr>
                            <td class="px-3 py-2 font-bold">${u.name}</td>
                            <td class="px-3 py-2">${u.username}</td>
                            <td class="px-3 py-2 font-mono text-violet-600">${u.password}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                  <p class="mt-4 text-[10px] text-slate-500 italic">Please copy these credentials and provide them to the users.</p>
                  ${errors.length > 0 ? `
                    <div class="mt-4 p-3 bg-red-50 rounded-lg">
                      <p class="text-[10px] font-bold text-red-600 mb-1">Errors (${errors.length}):</p>
                      <ul class="text-[9px] text-red-500 list-disc list-inside">
                        ${errors.map(e => `<li>${e}</li>`).join('')}
                      </ul>
                    </div>
                  ` : ''}
                </div>
              `,
              confirmButtonColor: '#9333ea'
            });
          } else if (errors.length > 0) {
            Swal.fire({
              icon: 'error',
              title: 'Import Failed',
              html: `
                <div class="text-left text-sm text-red-500">
                  <ul class="list-disc list-inside">${errors.map(e => `<li>${e}</li>`).join('')}</ul>
                </div>
              `
            });
          }
          
          setFile(null);
          setImporting(false);
          onClose();
        } catch (err) {
          toast.dismiss(loadingToast);
          toast.error('Failed to parse Excel file');
          setImporting(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Failed to read file');
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md border border-gray-300 shadow-2xl rounded-sm flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
        <div className="bg-[#5e2a84] flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-violet-900">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-[0.1em] leading-none">Import {userType.charAt(0).toUpperCase() + userType.slice(1)}s</h2>
              <p className="text-violet-200 text-[10px] mt-0.5 font-medium tracking-wide">Upload CSV/Excel file to bulk create accounts</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="ml-4 w-7 h-7 flex items-center justify-center rounded text-white/60 hover:bg-white/20 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="p-5 space-y-5 flex-1 overflow-y-auto">
          <div
            className={`border dashed rounded-lg p-6 transition-colors ${dragActive ? 'border-violet-500 bg-violet-50' : 'border-slate-200'}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="import-file-input"
            />
            <div className="text-center" onClick={() => fileInputRef.current?.click()}>
              <svg className="mx-auto mb-3 w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-semibold text-slate-700 mb-1">Drag & drop or click to select file</p>
              <p className="text-xs text-slate-400">CSV or Excel (.xlsx, .xls)</p>
              {file && <p className="mt-2 text-xs font-bold text-violet-600">{file.name}</p>}
            </div>
          </div>

          <div className="space-y-3">
            {file && !importing && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full flex items-center justify-center gap-2 bg-[#5e2a84] hover:bg-violet-700 text-white font-bold py-2.5 px-4 rounded-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                Import {file.name}
              </button>
            )}

            <div className="relative group">
              <button
                onClick={downloadTemplate}
                className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 font-bold py-2 px-4 rounded text-sm hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download Template
              </button>
              <div className="absolute top-full left-0 mt-2 w-72 p-4 bg-slate-900 text-white rounded shadow-xl opacity-0 invisible group-hover/opacity-100 group-hover/visible transition-all z-[110]">
                <h4 className="text-xs font-bold tracking-wide text-violet-400 mb-3 border-b border-white/10 pb-2">Import Instructions</h4>
                <ul className="space-y-2">
                  {template.instructions.map((instruction, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-violet-400 font-bold text-xs">{i + 1}.</span>
                      <p className="text-xs leading-relaxed text-slate-300">{instruction}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
