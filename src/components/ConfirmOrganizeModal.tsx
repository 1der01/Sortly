import React, { useEffect } from 'react';
import { X, ShieldCheck, ArrowRight, RotateCcw } from 'lucide-react';

interface ConfirmOrganizeModalProps {
  isOpen: boolean;
  folderPath: string;
  fileCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmOrganizeModal: React.FC<ConfirmOrganizeModalProps> = ({
  isOpen,
  folderPath,
  fileCount,
  onClose,
  onConfirm,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl overflow-hidden text-slate-800 flex flex-col">
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 id="confirm-modal-title" className="text-base font-bold text-slate-900">
              Confirm Organization
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-sm text-slate-600 leading-relaxed">
          <p>
            You are about to organize <strong className="text-slate-900 font-semibold">{fileCount} files</strong> in{' '}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-slate-800 border border-slate-200">
              {folderPath}
            </code>
            .
          </p>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span>
                <strong className="text-slate-800">Automatic Categorization:</strong> Files are sorted into Documents, Images, Code, etc.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
              <span>
                <strong className="text-slate-800">Zero Overwrites:</strong> Duplicate filenames are automatically preserved with a <code className="font-mono text-slate-700">(1)</code> suffix.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
              <span>
                <strong className="text-slate-800">1-Click Undo:</strong> You can restore files back to root at any time.
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-xs flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
          >
            <span>Proceed & Organize</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
