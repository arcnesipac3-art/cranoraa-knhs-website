import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../styles/designSystem';

/**
 * KNHS Portal Modal
 * Formal, professional dialog system
 * Consistent purple header bar with white content area
 *
 * Z-INDEX STACKING: Each modal that becomes visible gets an incrementing
 * z-index (starting at 9999, +10 per layer) so nested modals always sit
 * on top of the modal that opened them.
 */

let _zCounter = 9999;
const getNextZ = () => { _zCounter += 10; return _zCounter; };
/** Call this in inline modals to get an always-incrementing z-index */
export const getModalZ = getNextZ;

const Modal = ({
  isOpen,
  open,
  onClose,
  children,
  size = 'md',
  className = '',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  title,
  subtitle,
}) => {
  const visible = isOpen ?? open ?? false;
  const zRef = useRef(null);
  const previousFocusRef = useRef(null);
  const modalRef = useRef(null);
  
  if (visible && zRef.current === null) {
    zRef.current = getNextZ();
  }
  
  useEffect(() => {
    if (!visible) { zRef.current = null; }
  }, [visible]);

  // Focus trap and restoration
  useEffect(() => {
    if (visible) {
      previousFocusRef.current = document.activeElement;
      // Focus the modal container after render
      const timer = setTimeout(() => {
        modalRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
      previousFocusRef.current.focus();
    }
  }, [visible]);

  // Escape key handler
  useEffect(() => {
    if (!closeOnEscape) return;
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    if (visible) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [visible, onClose, closeOnEscape]);

  if (!visible) return null;

  const z = zRef.current ?? 9999;

  const sizes = {
    sm:   'max-w-sm',
    md:   'max-w-lg',
    lg:   'max-w-2xl',
    xl:   'max-w-4xl',
    full: 'max-w-6xl',
  };

  const modal = (
    <div
      style={{ zIndex: z }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          'bg-white w-full max-h-[92vh] overflow-hidden flex flex-col outline-none',
          'border border-slate-200 shadow-2xl rounded-xl',
          sizes[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Auto-header when title prop is passed */}
        {title && (
          <div className="bg-violet-600 flex items-center justify-between px-5 py-3 flex-shrink-0 border-b-2 border-violet-700">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <h2 id="modal-title" className="text-sm font-black text-white uppercase tracking-widest leading-none">{title}</h2>
                {subtitle && <p className="text-violet-200 text-[10px] mt-0.5 font-medium uppercase tracking-wide">{subtitle}</p>}
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Close dialog"
              className="ml-4 w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:bg-white/20 hover:text-white transition-all flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

/* ─── ModalHeader ─────────────────────────────────────────────────────────── */
export const ModalHeader = ({ children, onClose, className = '', icon, ...props }) => (
  <div className={cn(
    'bg-violet-600 flex items-center justify-between px-5 py-3 flex-shrink-0 border-b-2 border-violet-700',
    className
  )} {...props}>
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-7 h-7 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center flex-shrink-0">
        {icon || (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
    {onClose && (
      <button type="button" onClick={onClose} aria-label="Close dialog"
        className="ml-4 w-7 h-7 flex items-center justify-center rounded-lg text-white/60 hover:bg-white/20 hover:text-white transition-all flex-shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    )}
  </div>
);

/** Convenience: standard title + subtitle inside ModalHeader */
export const ModalTitle = ({ title, subtitle }) => (
  <div>
    <h2 className="text-sm font-black text-white uppercase tracking-widest leading-none">{title}</h2>
    {subtitle && <p className="text-violet-200 text-[10px] mt-0.5 font-medium uppercase tracking-wide">{subtitle}</p>}
  </div>
);

/* ─── ModalBody ───────────────────────────────────────────────────────────── */
export const ModalBody = ({ children, className = '', ...props }) => (
  <div className={cn('px-6 py-5 overflow-y-auto flex-1', className)} {...props}>
    {children}
  </div>
);

/* ─── ModalFooter ─────────────────────────────────────────────────────────── */
export const ModalFooter = ({ children, className = '', ...props }) => (
  <div className={cn(
    'px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 flex-shrink-0',
    className
  )} {...props}>
    {children}
  </div>
);

/* ─── ModalField ──────────────────────────────────────────────────────────── */
/** Standard labeled field wrapper for modal forms */
export const ModalField = ({ label, required, hint, children }) => (
  <div>
    <label className="block text-xs font-bold text-slate-700 mb-1.5">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
  </div>
);

/** Standard input styling for use inside ModalField — consistent with the rest of the UI */
export const modalInputCls = 'w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-colors placeholder:text-slate-400';
export const modalSelectCls = 'w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-colors cursor-pointer';
export const modalTextareaCls = 'w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-500 transition-colors resize-none';

/* ─── ModalBtn ────────────────────────────────────────────────────────────── */
/** Primary action button */
export const ModalBtnPrimary = ({ children, loading, className = '', ...props }) => (
  <button type="submit"
    className={cn('inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-violet-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-violet-700 active:bg-violet-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2', className)}
    disabled={loading}
    aria-busy={loading || undefined}
    {...props}
  >
    {loading && (
      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    )}
    {children}
  </button>
);

/** Cancel / secondary button */
export const ModalBtnSecondary = ({ children, className = '', ...props }) => (
  <button type="button"
    className={cn('inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-slate-700 text-xs font-bold uppercase tracking-wider border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2', className)}
    {...props}
  >
    {children}
  </button>
);

export default Modal;
