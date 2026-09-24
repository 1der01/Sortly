import React, { useState, useEffect, useRef } from 'react';
import { SAMPLE_PRESETS } from '../data/samplePresets';
import { FileItem } from '../types';
import { createFileItemFromNativeFile } from '../utils/fileHelpers';

interface BrowseFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (presetId: string, folderPath: string, files: FileItem[]) => void;
  currentPath: string;
  onFilesAdded?: (newFiles: FileItem[], folderName: string) => void;
}

export const BrowseFolderModal: React.FC<BrowseFolderModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  currentPath,
  onFilesAdded,
}) => {
  const [customPath, setCustomPath] = useState(currentPath);
  const nativeFileInputRef = useRef<HTMLInputElement>(null);
  const nativeFolderInputRef = useRef<HTMLInputElement>(null);

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

  const handleApplyCustom = () => {
    if (!customPath.trim()) return;
    const defaultPreset = SAMPLE_PRESETS[0];
    onSelectPreset('custom', customPath, defaultPreset.files);
    onClose();
  };

  const handleNativeFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      const items = filesArr.map((f, i) => createFileItemFromNativeFile(f, i));
      const firstFolder = (e.target.files[0] as unknown as { webkitRelativePath?: string }).webkitRelativePath?.split('/')[0];
      const folderTitle = firstFolder ? `Folder: ${firstFolder}` : `Files (${items.length} items)`;
      if (onFilesAdded) {
        onFilesAdded(items, folderTitle);
      }
      onSelectPreset('custom', firstFolder ? `~/${firstFolder}` : `~/Selected/${folderTitle}`, items);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="browse-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
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
                folder_open
              </span>
            </div>
            <div>
              <h3 id="browse-modal-title" style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--on-surface)' }}>
                Choose Folder to Organize
              </h3>
              <p style={{ fontSize: '12px', margin: '2px 0 0', color: 'var(--on-surface-variant)' }}>
                Select a local folder or choose a test environment
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

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Real Directory / Files Picker */}
          <div
            className="p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{
              background: 'var(--secondary-container)',
              color: 'var(--on-secondary-container)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, display: 'block' }}>
                Open Local Folder from Device
              </span>
              <span style={{ fontSize: '12px', opacity: 0.85, display: 'block', marginTop: '2px' }}>
                Loads all real files in the directory directly into Sortly
              </span>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {/* Native Folder Picker */}
              <input
                type="file"
                // @ts-expect-error webkitdirectory is standard in Chromium/Safari/Firefox for directory selection
                webkitdirectory=""
                directory=""
                multiple
                ref={nativeFolderInputRef}
                onChange={handleNativeFiles}
                style={{ display: 'none' }}
              />
              {/* Native Multi-File Picker */}
              <input
                type="file"
                multiple
                ref={nativeFileInputRef}
                onChange={handleNativeFiles}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => nativeFolderInputRef.current?.click()}
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                  drive_folder_upload
                </span>
                <span>Select Folder</span>
              </button>
              <button
                type="button"
                onClick={() => nativeFileInputRef.current?.click()}
                className="btn btn-tonal"
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                  upload_file
                </span>
                <span>Select Files</span>
              </button>
            </div>
          </div>

          {/* Presets List */}
          <div>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--on-surface-variant)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Presets & Sample Environments
            </label>
            <div className="space-y-2">
              {SAMPLE_PRESETS.map((preset) => {
                const isSelected = currentPath === preset.folderPath;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onSelectPreset(preset.id, preset.folderPath, preset.files);
                      onClose();
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: isSelected
                        ? '2px solid var(--primary)'
                        : '1px solid var(--outline-variant)',
                      background: isSelected
                        ? 'var(--surface-container-highest)'
                        : 'var(--surface-container)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease, border-color 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span
                        className="material-symbols-rounded"
                        style={{
                          fontSize: '20px',
                          color: isSelected ? 'var(--primary)' : 'var(--on-surface-variant)',
                          marginTop: '2px',
                        }}
                      >
                        folder
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'var(--on-surface)' }}>{preset.name}</span>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '100px',
                              background: 'var(--surface-container-high)',
                              color: 'var(--on-surface-variant)',
                              fontFamily: 'monospace',
                            }}
                          >
                            {preset.files.length} items
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                          {preset.folderPath}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
                          {preset.description}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span
                        className="material-symbols-rounded fill"
                        style={{ color: 'var(--primary)', fontSize: '20px', marginTop: '2px' }}
                      >
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Path Input */}
          <div style={{ paddingTop: '12px', borderTop: '1px solid var(--outline-variant)' }}>
            <label
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--on-surface)',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Or specify a custom directory path:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="~/Downloads or C:\Users\Name\Downloads"
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  background: 'var(--surface-container-lowest)',
                  border: '1px solid var(--outline-variant)',
                  borderRadius: '10px',
                  color: 'var(--on-surface)',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleApplyCustom}
                className="btn btn-tonal"
                style={{ fontSize: '12px', padding: '9px 14px' }}
              >
                Set Path
              </button>
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
