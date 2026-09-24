import React, { useEffect } from 'react';

interface RunGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RunGuideModal: React.FC<RunGuideModalProps> = ({ isOpen, onClose }) => {
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
      aria-labelledby="run-guide-title"
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
                terminal
              </span>
            </div>
            <h3 id="run-guide-title" style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--on-surface)' }}>
              How to Run Sortly Native App on Your Computer
            </h3>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div
            className="p-4 rounded-xl"
            style={{
              background: 'var(--surface-container)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', margin: '0 0 4px' }}>
              Standard Python 3 (Zero Dependencies)
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', margin: 0 }}>
              Sortly uses standard Python libraries (<code className="font-mono" style={{ background: 'var(--surface-container-highest)', padding: '2px 4px', borderRadius: '4px' }}>pathlib</code>, <code className="font-mono" style={{ background: 'var(--surface-container-highest)', padding: '2px 4px', borderRadius: '4px' }}>shutil</code>, <code className="font-mono" style={{ background: 'var(--surface-container-highest)', padding: '2px 4px', borderRadius: '4px' }}>tkinter</code>). No external packages or installation required.
            </p>
          </div>

          <div
            className="p-4 rounded-xl space-y-3"
            style={{
              background: 'var(--surface-container)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', margin: 0 }}>
              Terminal & Native Desktop Commands
            </h4>
            <div className="space-y-3">
              <div
                style={{
                  border: '1px solid var(--outline-variant)',
                  borderRadius: '12px',
                  padding: '12px',
                  background: 'var(--surface)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                    laptop_mac
                  </span>
                  Desktop GUI Mode
                </div>
                <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', margin: '0 0 6px' }}>
                  Opens native graphical desktop window with folder browser and buttons:
                </p>
                <code className="block bg-[#171D1D] text-[#80D5D0] p-2.5 rounded-lg font-mono text-xs">
                  python3 main.py
                </code>
              </div>

              <div
                style={{
                  border: '1px solid var(--outline-variant)',
                  borderRadius: '12px',
                  padding: '12px',
                  background: 'var(--surface)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                    terminal
                  </span>
                  CLI Preview Mode (Dry Run)
                </div>
                <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', margin: '0 0 6px' }}>
                  Simulate safely in terminal without moving files:
                </p>
                <code className="block bg-[#171D1D] text-[#80D5D0] p-2.5 rounded-lg font-mono text-xs">
                  python3 main.py ~/Downloads --dry-run
                </code>
              </div>

              <div
                style={{
                  border: '1px solid var(--outline-variant)',
                  borderRadius: '12px',
                  padding: '12px',
                  background: 'var(--surface)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '16px', color: 'var(--primary)' }}>
                    undo
                  </span>
                  CLI Organize Mode & Instant Undo
                </div>
                <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', margin: '0 0 6px' }}>
                  Organize files and undo anytime:
                </p>
                <code className="block bg-[#171D1D] text-[#80D5D0] p-2.5 rounded-lg font-mono text-xs leading-relaxed">
                  python3 main.py ~/Downloads<br />
                  python3 main.py ~/Downloads --undo
                </code>
              </div>
            </div>
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
            className="btn btn-primary"
            style={{ fontSize: '12px', padding: '6px 20px' }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
