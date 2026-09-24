import React from 'react';
import { X, ShieldCheck, FileText, Calendar, HardDrive, Tag, ArrowRight, Sparkles, Folder } from 'lucide-react';
import { FileItem } from '../types';
import { CATEGORIES } from '../data/categoriesData';

interface FileDetailModalProps {
  file: FileItem | null;
  onClose: () => void;
  isOrganized: boolean;
}

export const FileDetailModal: React.FC<FileDetailModalProps> = ({ file, onClose, isOrganized }) => {
  if (!file) return null;

  const categoryInfo = CATEGORIES.find((c) => c.name === file.category);
  const isSkipped = file.isFolder || file.isHidden || file.isSystem;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-slate-800 flex flex-col animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: categoryInfo?.color || '#64748b' }}
            >
              {file.extension ? file.extension.slice(0, 3).toUpperCase() : 'DIR'}
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                {file.resolvedName || file.name}
              </h3>
              <p className="text-[11px] text-slate-500">File Inspection & Safety Profile</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Path Transformation Card */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Organization Pathway
            </span>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-600 bg-white px-2 py-1 rounded border border-slate-200 truncate max-w-[140px]">
                {file.name}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-1 rounded border border-blue-200 truncate">
                {isSkipped ? 'Kept at Root (Untouched)' : `${file.category}/${file.resolvedName || file.name}`}
              </span>
            </div>
          </div>

          {/* Human Reason */}
          <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/80">
            <div className="flex items-center gap-1.5 text-amber-900 font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Why is this file sorted here?</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              {file.humanReason ||
                (isSkipped
                  ? 'This is a system folder or protected file. For safety, it is always left untouched.'
                  : `Files ending in .${file.extension} are recognized as ${file.category}. They are placed in the ${file.category}/ folder for easy, intuitive retrieval.`)}
            </p>
          </div>

          {/* Safety Checklist */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Human Peace of Mind Checks
            </span>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero File Loss: Contents are never modified or deleted</span>
              </div>
              {file.isDuplicate && (
                <div className="flex items-center gap-2 text-amber-700">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Duplicate collision resolved: renamed safely with index to keep both copies</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Reversible: Can be restored with 1-click Undo anytime</span>
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-slate-600">
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span>Size: <strong className="text-slate-800 font-mono">{file.size}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Modified: <strong className="text-slate-800">{file.dateModified || 'Recent'}</strong></span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
