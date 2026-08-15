import { useState, useRef, useCallback } from 'react';
import { formatFileSize, isImageFile, isPdfFile } from '../../utils/validation';

/**
 * Enhanced file upload with image preview, file size display, progress state.
 * Drop-in replacement for the existing FileUpload in Enrollment.jsx.
 *
 * Props:
 *   label, required, file, onFile, onRemove, note, accept
 *   maxSizeMB - max file size in MB (default 10)
 */
const EnhancedFileUpload = ({ label, required, file, onFile, onRemove, note, accept, maxSizeMB = 10 }) => {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null); // null = not uploading
  const [sizeError, setSizeError] = useState('');

  const handleFile = useCallback((f) => {
    if (!f) return;
    setSizeError('');
    if (f.size > maxSizeMB * 1024 * 1024) {
      setSizeError(`File too large (${formatFileSize(f.size)}). Max: ${maxSizeMB} MB`);
      return;
    }
    if (isImageFile(f)) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
    // Simulate brief progress for UX feedback
    setUploadProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 40 + 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => setUploadProgress(null), 300);
      }
      setUploadProgress(Math.min(progress, 100));
    }, 120);
    onFile(f);
  }, [onFile, maxSizeMB]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    setUploadProgress(null);
    setSizeError('');
    onRemove();
    if (inputRef.current) inputRef.current.value = '';
  }, [onRemove]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const hasFile = !!file;

  return (
    <div className={`border-2 transition-all duration-200 rounded-xl ${
      sizeError ? 'border-red-300 bg-red-50' :
      dragOver ? 'border-violet-400 bg-violet-50' :
      hasFile ? 'border-emerald-400 bg-emerald-50/50' : 'border-gray-200 bg-white hover:border-gray-300'
    }`}>
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">
              {label} {required && <span className="text-red-500">*</span>}
            </p>
            {note && <p className="text-[11px] text-gray-500 mt-0.5 italic">{note}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {hasFile && (
              <button type="button" onClick={handleRemove}
                className="text-red-400 hover:text-red-600 p-1 transition-colors" title="Remove file">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <label className="cursor-pointer px-3 py-1.5 bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-all duration-200 rounded-lg">
              {hasFile ? 'Change' : 'Browse'}
              <input ref={inputRef} type="file" accept={accept || '.pdf,.jpg,.jpeg,.png'} className="hidden"
                onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
            </label>
          </div>
        </div>

        {/* Image preview */}
        {hasFile && preview && (
          <div className="mt-3 relative group">
            <img src={preview} alt={file.name}
              className="w-full max-h-48 object-contain rounded-lg border border-gray-200 bg-white" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded pointer-events-none" />
          </div>
        )}

        {/* PDF indicator */}
        {hasFile && !preview && isPdfFile(file) && (
          <div className="mt-3 flex items-center gap-2.5 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
            <svg className="w-8 h-8 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-xs font-bold text-red-800">{file.name}</p>
              <p className="text-[10px] text-red-500">PDF Document</p>
            </div>
          </div>
        )}

        {/* File info bar */}
        {hasFile && (
          <div className="mt-2 flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-green-700 font-semibold">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Uploaded
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500 font-medium">{formatFileSize(file.size)}</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500 font-medium truncate max-w-[150px]">{file.name}</span>
          </div>
        )}

        {/* Progress bar */}
        {uploadProgress !== null && (
          <div className="mt-2">
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500 rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5 text-right">{Math.round(uploadProgress)}%</p>
          </div>
        )}

        {/* Size error */}
        {sizeError && (
          <p className="mt-2 text-[10px] text-red-600 font-semibold flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {sizeError}
          </p>
        )}

        {/* Drop zone (no file yet) */}
        {!hasFile && (
          <div
            className="mt-3 text-center py-3 border border-dashed border-gray-300 rounded-xl transition-colors"
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <svg className="w-7 h-7 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-[10px] text-gray-500 font-medium">Drag & drop or click Browse</p>
            <p className="text-[9px] text-gray-400">PDF, JPG, PNG (max {maxSizeMB} MB)</p>
          </div>
        )}
      </div>
    </div>
  );
};

export { EnhancedFileUpload };
export default EnhancedFileUpload;
