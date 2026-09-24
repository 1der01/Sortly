import React, { useState, useMemo, useEffect } from 'react';
import { FileItem } from '../types';
import { getMaterialIconForFile } from '../utils/fileHelpers';
import {
  BatchRenameConfig,
  DEFAULT_RENAME_CONFIG,
  generateBatchRenamePreview,
  DateFormat,
  DatePosition,
  RenameMode,
  CaseOption,
} from '../utils/batchRenameEngine';

interface BatchRenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFiles: FileItem[];
  allFolderFiles: FileItem[];
  onApplyRename: (renamedFiles: FileItem[], renameCount: number) => void;
}

export const BatchRenameModal: React.FC<BatchRenameModalProps> = ({
  isOpen,
  onClose,
  selectedFiles,
  allFolderFiles,
  onApplyRename,
}) => {
  const [config, setConfig] = useState<BatchRenameConfig>(DEFAULT_RENAME_CONFIG);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'changed' | 'errors'>('all');
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset config on open if needed
  useEffect(() => {
    if (isOpen) {
      setExcludedIds(new Set());
    }
  }, [isOpen]);

  // Calculate active targets (excluding un-checked in preview)
  const activeSelectedFiles = useMemo(() => {
    return selectedFiles.filter((f) => !excludedIds.has(f.id));
  }, [selectedFiles, excludedIds]);

  // Generate real-time preview
  const previewItems = useMemo(() => {
    return generateBatchRenamePreview(activeSelectedFiles, config, allFolderFiles);
  }, [activeSelectedFiles, config, allFolderFiles]);

  const changedCount = useMemo(() => {
    return previewItems.filter((item) => item.changed && !item.error).length;
  }, [previewItems]);

  const errorCount = useMemo(() => {
    return previewItems.filter((item) => !!item.error).length;
  }, [previewItems]);

  const filteredPreview = useMemo(() => {
    if (previewFilter === 'changed') {
      return previewItems.filter((i) => i.changed);
    }
    if (previewFilter === 'errors') {
      return previewItems.filter((i) => !!i.error);
    }
    return previewItems;
  }, [previewItems, previewFilter]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (changedCount === 0 || errorCount > 0) return;

    // Build map of id -> newName
    const renameMap = new Map<string, string>();
    for (const item of previewItems) {
      if (item.changed && !item.error) {
        renameMap.set(item.file.id, item.newName);
      }
    }

    // Reconstruct full list of allFolderFiles with updated items
    const updatedAllFiles = allFolderFiles.map((f) => {
      if (renameMap.has(f.id)) {
        const newName = renameMap.get(f.id)!;
        const lastDot = newName.lastIndexOf('.');
        const newExt = lastDot > 0 ? newName.substring(lastDot + 1).toLowerCase() : '';
        return {
          ...f,
          name: newName,
          extension: newExt,
        };
      }
      return f;
    });

    onApplyRename(updatedAllFiles, renameMap.size);
    onClose();
  };

  const handleToggleExclude = (fileId: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const applyRegexPreset = (search: string, replace: string, caseInsensitive = true) => {
    setConfig((prev) => ({
      ...prev,
      mode: 'regex',
      regexSearch: search,
      regexReplace: replace,
      regexFlags: {
        ...prev.regexFlags,
        caseInsensitive,
        global: true,
      },
    }));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-rename-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--surface-container-high)',
          border: '1px solid var(--outline-variant)',
          boxShadow: 'var(--el4)',
          color: 'var(--on-surface)',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-3.5 flex items-center justify-between shrink-0"
          style={{
            borderBottom: '1px solid var(--outline-variant)',
            background: 'var(--surface-container-high)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'var(--primary-container)',
                color: 'var(--on-primary-container)',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>
                drive_file_rename_outline
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="batch-rename-title" style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                  Batch Rename Files
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '100px',
                    background: 'var(--secondary-container)',
                    color: 'var(--on-secondary-container)',
                  }}
                >
                  {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                </span>
              </div>
              <p style={{ fontSize: '12px', margin: '2px 0 0', color: 'var(--on-surface-variant)' }}>
                Apply regex search & replace, date-based prefixes, or sequential naming patterns.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close batch rename modal"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
          {/* Mode Selector Tabs */}
          <div className="segmented w-full" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <button
              type="button"
              className="segment flex-1 justify-center"
              data-active={config.mode === 'date' ? 'true' : 'false'}
              onClick={() => setConfig((prev) => ({ ...prev, mode: 'date' }))}
            >
              <span className="material-symbols-rounded">calendar_today</span>
              <span>Date-Based</span>
            </button>
            <button
              type="button"
              className="segment flex-1 justify-center"
              data-active={config.mode === 'regex' ? 'true' : 'false'}
              onClick={() => setConfig((prev) => ({ ...prev, mode: 'regex' }))}
            >
              <span className="material-symbols-rounded">regular_expression</span>
              <span>Regex Pattern</span>
            </button>
            <button
              type="button"
              className="segment flex-1 justify-center"
              data-active={config.mode === 'template' ? 'true' : 'false'}
              onClick={() => setConfig((prev) => ({ ...prev, mode: 'template' }))}
            >
              <span className="material-symbols-rounded">format_shapes</span>
              <span>Tokens / Template</span>
            </button>
          </div>

          {/* Configuration Card based on Mode */}
          <div
            className="p-4 rounded-xl flex flex-col gap-3.5"
            style={{
              background: 'var(--surface-container-lowest)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            {/* MODE 1: DATE-BASED */}
            {config.mode === 'date' && (
              <div className="flex flex-col gap-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface-variant)' }}>
                      Date Format
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg"
                      style={{
                        background: 'var(--surface-container)',
                        border: '1px solid var(--outline-variant)',
                        color: 'var(--on-surface)',
                      }}
                      value={config.dateFormat}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, dateFormat: e.target.value as DateFormat }))
                      }
                    >
                      <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-09-22)</option>
                      <option value="YYYYMMDD">YYYYMMDD (e.g. 20260922)</option>
                      <option value="YYYY_MM_DD">YYYY_MM_DD (e.g. 2026_09_22)</option>
                      <option value="DD-MM-YYYY">DD-MM-YYYY (e.g. 22-09-2026)</option>
                      <option value="YYYY-MM">YYYY-MM (e.g. 2026-09)</option>
                      <option value="custom">Custom Token Pattern...</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface-variant)' }}>
                      Date Source
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg"
                      style={{
                        background: 'var(--surface-container)',
                        border: '1px solid var(--outline-variant)',
                        color: 'var(--on-surface)',
                      }}
                      value={config.dateSource}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          dateSource: e.target.value as 'modified' | 'today' | 'custom',
                        }))
                      }
                    >
                      <option value="today">Today's Date</option>
                      <option value="modified">File's Last Modified Date</option>
                      <option value="custom">Custom Date Value</option>
                    </select>
                  </div>
                </div>

                {config.dateFormat === 'custom' && (
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface-variant)' }}>
                      Custom Date Format String (tokens: YYYY, YY, MM, DD, HH, mm)
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg font-mono"
                      style={{
                        background: 'var(--surface-container)',
                        border: '1px solid var(--outline-variant)',
                        color: 'var(--on-surface)',
                      }}
                      value={config.customDateFormat}
                      placeholder="e.g. [YYYY.MM.DD]"
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, customDateFormat: e.target.value }))
                      }
                    />
                  </div>
                )}

                {config.dateSource === 'custom' && (
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface-variant)' }}>
                      Choose Specific Date
                    </label>
                    <input
                      type="date"
                      className="px-3 py-2 text-sm rounded-lg"
                      style={{
                        background: 'var(--surface-container)',
                        border: '1px solid var(--outline-variant)',
                        color: 'var(--on-surface)',
                      }}
                      value={config.customDateValue}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, customDateValue: e.target.value }))
                      }
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface-variant)' }}>
                      Date Placement
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg"
                      style={{
                        background: 'var(--surface-container)',
                        border: '1px solid var(--outline-variant)',
                        color: 'var(--on-surface)',
                      }}
                      value={config.datePosition}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          datePosition: e.target.value as DatePosition,
                        }))
                      }
                    >
                      <option value="prefix">Prefix: [Date] - [Original Name]</option>
                      <option value="prefix_underscore">Prefix: [Date]_[Original Name]</option>
                      <option value="suffix">Suffix: [Original Name] - [Date]</option>
                      <option value="replace">Replace: [Date]_[Index]</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface-variant)' }}>
                      Separator
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg font-mono"
                      style={{
                        background: 'var(--surface-container)',
                        border: '1px solid var(--outline-variant)',
                        color: 'var(--on-surface)',
                      }}
                      value={config.dateSeparator}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, dateSeparator: e.target.value }))
                      }
                      placeholder="e.g. ' - ' or '_'"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: REGEX PATTERN */}
            {config.mode === 'regex' && (
              <div className="flex flex-col gap-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface-variant)' }}>
                      Find (RegEx or Text)
                    </label>
                    <input
                      id="batch-rename-regex-search"
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg font-mono"
                      style={{
                        background: 'var(--surface-container)',
                        border: '1px solid var(--outline-variant)',
                        color: 'var(--on-surface)',
                      }}
                      placeholder="e.g. \s+ or ^(IMG_) or \d+"
                      value={config.regexSearch}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, regexSearch: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface-variant)' }}>
                      Replace With (supports $1, $2)
                    </label>
                    <input
                      id="batch-rename-regex-replace"
                      type="text"
                      className="w-full px-3 py-2 text-sm rounded-lg font-mono"
                      style={{
                        background: 'var(--surface-container)',
                        border: '1px solid var(--outline-variant)',
                        color: 'var(--on-surface)',
                      }}
                      placeholder="e.g. _ or - or Photo_"
                      value={config.regexReplace}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, regexReplace: e.target.value }))
                      }
                    />
                  </div>
                </div>

                {/* Regex Flags & Quick Presets */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.regexFlags.caseInsensitive}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            regexFlags: { ...prev.regexFlags, caseInsensitive: e.target.checked },
                          }))
                        }
                      />
                      <span>Case-insensitive (i)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.regexFlags.global}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            regexFlags: { ...prev.regexFlags, global: e.target.checked },
                          }))
                        }
                      />
                      <span>Replace all occurrences (g)</span>
                    </label>
                  </div>
                </div>

                {/* Quick Regex Presets Chips */}
                <div>
                  <div className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--on-surface-variant)' }}>
                    Quick Regex Presets:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="filter-chip text-xs py-1 px-2.5"
                      onClick={() => applyRegexPreset('\\s+', '_')}
                    >
                      Spaces → Underscores
                    </button>
                    <button
                      type="button"
                      className="filter-chip text-xs py-1 px-2.5"
                      onClick={() => applyRegexPreset('\\s+', '-')}
                    >
                      Spaces → Hyphens
                    </button>
                    <button
                      type="button"
                      className="filter-chip text-xs py-1 px-2.5"
                      onClick={() => applyRegexPreset('^(IMG_|DSC_|PHOTO_)', '')}
                    >
                      Strip IMG_ prefix
                    </button>
                    <button
                      type="button"
                      className="filter-chip text-xs py-1 px-2.5"
                      onClick={() => applyRegexPreset('\\d+', '')}
                    >
                      Remove Digits
                    </button>
                    <button
                      type="button"
                      className="filter-chip text-xs py-1 px-2.5"
                      onClick={() => applyRegexPreset('^', 'Archive_')}
                    >
                      Add Prefix
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 3: TOKENS / TEMPLATE */}
            {config.mode === 'template' && (
              <div className="flex flex-col gap-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface-variant)' }}>
                    Naming Template
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 text-sm rounded-lg font-mono"
                    style={{
                      background: 'var(--surface-container)',
                      border: '1px solid var(--outline-variant)',
                      color: 'var(--on-surface)',
                    }}
                    value={config.templateString}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, templateString: e.target.value }))
                    }
                    placeholder="e.g. {date} - {name} - #{0n}"
                  />
                </div>

                {/* Token Insertion Helper Buttons */}
                <div>
                  <div className="text-[11px] font-semibold mb-1.5" style={{ color: 'var(--on-surface-variant)' }}>
                    Click token to insert into template:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '{name}', desc: 'Original Name' },
                      { label: '{date}', desc: 'Formatted Date' },
                      { label: '{0n}', desc: 'Padded Index (01, 02)' },
                      { label: '{category}', desc: 'Folder Category' },
                      { label: '{ext}', desc: 'Extension' },
                      { label: '{index:3}', desc: '3-digit (001)' },
                    ].map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        className="filter-chip text-xs py-1 px-2.5 font-mono"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            templateString: `${prev.templateString} ${t.label}`.trim(),
                          }))
                        }
                        title={t.desc}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface-variant)' }}>
                      Start Numbering Index
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="w-full px-3 py-2 text-sm rounded-lg"
                      style={{
                        background: 'var(--surface-container)',
                        border: '1px solid var(--outline-variant)',
                        color: 'var(--on-surface)',
                      }}
                      value={config.startIndex}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, startIndex: parseInt(e.target.value, 10) || 1 }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--on-surface-variant)' }}>
                      Digit Padding
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm rounded-lg"
                      style={{
                        background: 'var(--surface-container)',
                        border: '1px solid var(--outline-variant)',
                        color: 'var(--on-surface)',
                      }}
                      value={config.indexPadding}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          indexPadding: parseInt(e.target.value, 10) || 2,
                        }))
                      }
                    >
                      <option value={1}>1 (1, 2, 3...)</option>
                      <option value={2}>2 (01, 02, 03...)</option>
                      <option value={3}>3 (001, 002, 003...)</option>
                      <option value={4}>4 (0001, 0002...)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Additional Common Options Bar */}
            <div
              className="pt-2.5 flex flex-wrap items-center justify-between gap-3 text-xs"
              style={{ borderTop: '1px solid var(--outline-variant)' }}
            >
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={config.preserveExtension}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, preserveExtension: e.target.checked }))
                  }
                />
                <span>Preserve File Extension (.jpg, .pdf)</span>
              </label>

              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--on-surface-variant)' }}>Case Transform:</span>
                <select
                  className="px-2 py-1 text-xs rounded-md"
                  style={{
                    background: 'var(--surface-container)',
                    border: '1px solid var(--outline-variant)',
                    color: 'var(--on-surface)',
                  }}
                  value={config.caseTransform}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      caseTransform: e.target.value as CaseOption,
                    }))
                  }
                >
                  <option value="none">Original Case</option>
                  <option value="lowercase">lowercase</option>
                  <option value="uppercase">UPPERCASE</option>
                  <option value="titlecase">Title Case</option>
                  <option value="kebab">kebab-case</option>
                  <option value="snake">snake_case</option>
                </select>
              </div>
            </div>
          </div>

          {/* Live Preview Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-rounded" style={{ fontSize: '18px', color: 'var(--primary)' }}>
                  preview
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--on-surface)' }}>
                  Live Renaming Preview
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '100px',
                    background: 'var(--surface-container-high)',
                    color: 'var(--on-surface-variant)',
                    fontFamily: 'monospace',
                  }}
                >
                  {previewItems.length} items
                </span>
              </div>

              {/* Filter Tabs for Preview */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="filter-chip text-xs py-0.5 px-2"
                  data-active={previewFilter === 'all' ? 'true' : 'false'}
                  onClick={() => setPreviewFilter('all')}
                >
                  All ({previewItems.length})
                </button>
                <button
                  type="button"
                  className="filter-chip text-xs py-0.5 px-2"
                  data-active={previewFilter === 'changed' ? 'true' : 'false'}
                  onClick={() => setPreviewFilter('changed')}
                >
                  Changed ({changedCount})
                </button>
                {errorCount > 0 && (
                  <button
                    type="button"
                    className="filter-chip text-xs py-0.5 px-2"
                    style={{
                      background: previewFilter === 'errors' ? 'var(--error-container)' : undefined,
                      color: previewFilter === 'errors' ? 'var(--on-error-container)' : 'var(--error)',
                      borderColor: 'var(--error)',
                    }}
                    data-active={previewFilter === 'errors' ? 'true' : 'false'}
                    onClick={() => setPreviewFilter('errors')}
                  >
                    Conflicts ({errorCount})
                  </button>
                )}
              </div>
            </div>

            {/* Error or Notice Alert Banner */}
            {errorCount > 0 ? (
              <div
                className="p-2.5 rounded-lg flex items-center gap-2 text-xs"
                style={{
                  background: 'var(--error-container)',
                  color: 'var(--on-error-container)',
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                  warning
                </span>
                <span>
                  <b>{errorCount} naming conflict{errorCount === 1 ? '' : 's'} detected.</b> Fix duplicate names or invalid characters before applying.
                </span>
              </div>
            ) : changedCount === 0 ? (
              <div
                className="p-2.5 rounded-lg flex items-center gap-2 text-xs"
                style={{
                  background: 'var(--surface-container-low)',
                  color: 'var(--on-surface-variant)',
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                  info
                </span>
                <span>
                  No files will change with current configuration. Modify the pattern or select files to see changes.
                </span>
              </div>
            ) : (
              <div
                className="p-2.5 rounded-lg flex items-center gap-2 text-xs"
                style={{
                  background: 'var(--primary-container)',
                  color: 'var(--on-primary-container)',
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                  check_circle
                </span>
                <span>
                  <b>{changedCount} file{changedCount === 1 ? '' : 's'}</b> will be safely renamed upon applying.
                </span>
              </div>
            )}

            {/* Preview List Table */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                border: '1px solid var(--outline-variant)',
                background: 'var(--surface-container-lowest)',
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              {filteredPreview.length === 0 ? (
                <div className="p-5 text-center text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                  No items match the preview filter.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      style={{
                        background: 'var(--surface-container-low)',
                        borderBottom: '1px solid var(--outline-variant)',
                        color: 'var(--on-surface-variant)',
                      }}
                    >
                      <th className="py-2 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={excludedIds.size === 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExcludedIds(new Set());
                            } else {
                              setExcludedIds(new Set(selectedFiles.map((f) => f.id)));
                            }
                          }}
                          title="Toggle all selected files"
                        />
                      </th>
                      <th className="py-2 px-3">Original Name</th>
                      <th className="py-2 px-3 w-6 text-center"></th>
                      <th className="py-2 px-3">New Name Preview</th>
                      <th className="py-2 px-3 w-24 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPreview.map((item) => {
                      const isExcluded = excludedIds.has(item.file.id);
                      return (
                        <tr
                          key={item.file.id}
                          className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                          style={{
                            borderBottom: '1px solid var(--outline-variant)',
                            opacity: isExcluded ? 0.45 : 1,
                          }}
                        >
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              checked={!isExcluded}
                              onChange={() => handleToggleExclude(item.file.id)}
                            />
                          </td>

                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2 max-w-[240px]">
                              <span
                                className="material-symbols-rounded shrink-0"
                                style={{ fontSize: '16px', color: 'var(--on-surface-variant)' }}
                              >
                                {getMaterialIconForFile(item.file)}
                              </span>
                              <span className="truncate font-mono" title={item.originalName}>
                                {item.originalName}
                              </span>
                            </div>
                          </td>

                          <td className="py-2 px-3 text-center">
                            <span
                              className="material-symbols-rounded"
                              style={{
                                fontSize: '15px',
                                color: item.changed ? 'var(--primary)' : 'var(--outline)',
                              }}
                            >
                              arrow_forward
                            </span>
                          </td>

                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1.5 max-w-[280px]">
                              <span
                                className={`truncate font-mono ${
                                  item.changed ? 'font-semibold text-teal-700 dark:text-teal-300' : ''
                                }`}
                                title={item.newName}
                              >
                                {item.newName}
                              </span>
                            </div>
                            {item.error && (
                              <div className="text-[11px] text-red-600 dark:text-red-400 font-medium mt-0.5">
                                {item.error}
                              </div>
                            )}
                          </td>

                          <td className="py-2 px-3 text-right">
                            {item.error ? (
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold"
                                style={{
                                  background: 'var(--error-container)',
                                  color: 'var(--on-error-container)',
                                }}
                              >
                                Conflict
                              </span>
                            ) : item.changed ? (
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold"
                                style={{
                                  background: 'var(--primary-container)',
                                  color: 'var(--on-primary-container)',
                                }}
                              >
                                Renamed
                              </span>
                            ) : (
                              <span
                                className="inline-block px-1.5 py-0.5 rounded text-[10px]"
                                style={{
                                  background: 'var(--surface-container-high)',
                                  color: 'var(--on-surface-variant)',
                                }}
                              >
                                Unchanged
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3.5 flex items-center justify-between shrink-0"
          style={{
            borderTop: '1px solid var(--outline-variant)',
            background: 'var(--surface-container-high)',
          }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-text text-xs"
              onClick={() => setConfig(DEFAULT_RENAME_CONFIG)}
            >
              Reset Settings
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              id="apply-batch-rename-btn"
              type="button"
              className="btn btn-filled"
              disabled={changedCount === 0 || errorCount > 0}
              onClick={handleApply}
            >
              <span className="material-symbols-rounded">drive_file_rename_outline</span>
              Apply Rename ({changedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
