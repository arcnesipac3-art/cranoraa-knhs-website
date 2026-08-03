import React, { useState, useRef } from 'react';
import { formatFileSize } from '../../utils/validation';

const ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

export default function ComplianceFileUpload({ files, onFilesChange, maxFiles = 10, maxSizeMB = 50, disabled = false }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const validateFile = (file) => {
    if (!Object.keys(ALLOWED_TYPES).includes(file.type)) {
      return `Invalid file type: ${file.name}`;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File too large: ${file.name} (max ${maxSizeMB}MB)`;
    }
    return null;
  };

  const handleFiles = (newFiles) => {
    const validFiles = [];
    const errors = [];

    for (const file of newFiles) {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    if (files.length + validFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    onFilesChange([...files, ...validFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    handleFiles(Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleInputChange = (e) => {
    handleFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const removeFile = (index) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const getFileIcon = (file) => {
    if (file.type?.startsWith('image/')) return '🖼️';
    if (file.type === 'application/pdf') return '📄';
    if (file.type?.includes('word')) return '📝';
    if (file.type?.includes('excel') || file.type?.includes('sheet')) return '📊';
    return '📎';
  };

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50' :
            dragOver ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-violet-300 hover:bg-slate-50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
        <div className="text-3xl mb-2">📁</div>
        <p className="text-sm font-medium text-slate-700">
          {dragOver ? 'Drop files here' : 'Click or drag files to upload'}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max {maxSizeMB}MB each, {maxFiles} files max)
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xl">{getFileIcon(file)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
