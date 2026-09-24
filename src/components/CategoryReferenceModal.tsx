import React, { useEffect } from 'react';
import { CATEGORIES } from '../data/categoriesData';

interface CategoryReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryReferenceModal: React.FC<CategoryReferenceModalProps> = ({ isOpen, onClose }) => {
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
      aria-labelledby="category-ref-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{
          background: 'var(--surface-container-high)',
          border: '1px solid var(--outline-variant)',
          boxShadow: 'var(--el3)',
          color: 'var(--on-surface)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            borderBottom: '1px solid var(--outline-variant)',
            background: 'var(--surface-container-high)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'var(--primary-container)',
                color: 'var(--on-primary-container)',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                category
              </span>
            </div>
            <div>
              <h3 id="category-ref-title" style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--on-surface)' }}>
                File Extension & Category Rules
              </h3>
              <p style={{ fontSize: '12px', margin: '2px 0 0', color: 'var(--on-surface-variant)' }}>
                How Sortly classifies extensions safely
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="btn-icon"
            type="button"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div
            className="p-4 rounded-xl flex items-start gap-3"
            style={{
              background: 'var(--secondary-container)',
              color: 'var(--on-secondary-container)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <span
              className="material-symbols-rounded fill"
              style={{ color: 'var(--primary)', fontSize: '20px', marginTop: '2px' }}
            >
              verified_user
            </span>
            <div style={{ fontSize: '13px' }} className="space-y-1">
              <span style={{ fontWeight: 600, display: 'block', color: 'var(--on-secondary-container)' }}>
                Safe File Handling Guarantees:
              </span>
              <ul className="list-disc pl-4 space-y-1 text-xs opacity-90">
                <li>
                  Zero overwrites: Duplicate filenames receive <code className="font-mono px-1 py-0.5 rounded bg-black/10 font-semibold">(1)</code>, <code className="font-mono px-1 py-0.5 rounded bg-black/10 font-semibold">(2)</code> suffixes.
                </li>
                <li>Files are never deleted and original byte contents are never modified.</li>
                <li>
                  Existing subdirectories and hidden/system files (e.g. <code className="font-mono px-1 py-0.5 rounded bg-black/10">.DS_Store</code>, <code className="font-mono px-1 py-0.5 rounded bg-black/10">.git</code>) are kept untouched at root.
                </li>
                <li>
                  Unrecognized extensions or extensionless files are placed into <code className="font-mono px-1 py-0.5 rounded bg-black/10">Others/</code>.
                </li>
              </ul>
            </div>
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--outline-variant)' }}
          >
            {CATEGORIES.map((cat, idx) => (
              <div
                key={cat.name}
                style={{
                  padding: '14px 16px',
                  background: 'var(--surface)',
                  borderTop: idx > 0 ? '1px solid var(--outline-variant)' : 'none',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: cat.color,
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>
                      {cat.name}/
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                    {cat.description}
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {cat.extensions.map((ext) => (
                    <span
                      key={ext}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'var(--surface-container-high)',
                        color: 'var(--on-surface-variant)',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        border: '1px solid var(--outline-variant)',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                      }}
                    >
                      .{ext}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3.5 flex justify-end"
          style={{
            borderTop: '1px solid var(--outline-variant)',
            background: 'var(--surface-container)',
          }}
        >
          <button
            onClick={onClose}
            type="button"
            className="btn btn-outline"
            style={{ fontSize: '12px', padding: '6px 16px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
