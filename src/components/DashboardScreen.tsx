import React, { useRef, useState, useMemo } from 'react';
import { FileItem, OrganizationStats } from '../types';
import { getMaterialIconForFile } from '../utils/fileHelpers';
import { determineCategory, CATEGORIES } from '../data/categoriesData';
import { FilePreviewModal } from './FilePreviewModal';
import { BatchRenameModal } from './BatchRenameModal';
import { FileTypeDistributionChart } from './FileTypeDistributionChart';
import { processDroppedItems, processNativeFolderFileList } from '../utils/folderDrop';

interface DashboardScreenProps {
  folderPath: string;
  files: FileItem[];
  isDryRun: boolean;
  onToggleDryRun: (val: boolean) => void;
  includeSubfolders: boolean;
  onToggleIncludeSubfolders: (val: boolean) => void;
  onChooseFolder: () => void;
  onOrganizeClick: () => void;
  onGoTo: (screen: 'dashboard' | 'preview' | 'progress' | 'complete' | 'settings') => void;
  stats: OrganizationStats;
  recentActivity: Array<{
    id: string;
    name: string;
    category: string;
    timeAgo: string;
    status: 'done' | 'skip' | 'err';
    fileItem?: FileItem;
  }>;
  onFilesDropped: (files: File[]) => void;
  onFolderDropped?: (folderName: string, files: FileItem[]) => void;
  onBatchRenameFiles?: (updatedFiles: FileItem[], renameCount: number) => void;
  onBatchCategorizeFiles?: (updatedFiles: FileItem[], count: number, targetCategory: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  folderPath,
  files,
  isDryRun,
  onToggleDryRun,
  includeSubfolders,
  onToggleIncludeSubfolders,
  onChooseFolder,
  onOrganizeClick,
  onGoTo,
  stats,
  recentActivity,
  onFilesDropped,
  onFolderDropped,
  onBatchRenameFiles,
  onBatchCategorizeFiles,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [isFileListCollapsed, setIsFileListCollapsed] = useState<boolean>(false);
  const [previewingFile, setPreviewingFile] = useState<FileItem | null>(null);
  const [isDropzoneActive, setIsDropzoneActive] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [isBatchRenameOpen, setIsBatchRenameOpen] = useState<boolean>(false);

  // Batch category update states
  const [targetBatchCategory, setTargetBatchCategory] = useState<string>('Documents');
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [batchProcessingState, setBatchProcessingState] = useState<{
    current: number;
    total: number;
    currentFileId: string;
    currentFileName: string;
    targetCategory: string;
    isComplete: boolean;
  } | null>(null);
  const [recentlyCategorizedIds, setRecentlyCategorizedIds] = useState<Set<string>>(new Set());

  const handleIncomingDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropzoneActive(false);

    if (!e.dataTransfer) return;

    setIsScanning(true);
    try {
      const result = await processDroppedItems(e.dataTransfer);
      if (result.files.length > 0) {
        if (onFolderDropped) {
          onFolderDropped(result.folderName, result.files);
        } else {
          const realFiles = result.files.map((f) => f.realFile).filter(Boolean) as File[];
          if (realFiles.length > 0) {
            onFilesDropped(realFiles);
          }
        }
      }
    } catch (err) {
      console.error('Error processing dropped folder:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleNativeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesDropped(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleNativeFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const result = processNativeFolderFileList(e.target.files);
      if (result.files.length > 0) {
        if (onFolderDropped) {
          onFolderDropped(result.folderName, result.files);
        } else {
          onFilesDropped(Array.from(e.target.files));
        }
      }
      e.target.value = '';
    }
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    files.forEach((f) => {
      const cat = f.isFolder ? 'Folders' : (f.category || determineCategory(f.name));
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [files]);

  const activeCategoryList = useMemo(() => {
    const list: Array<{ name: string; count: number }> = [];
    CATEGORIES.forEach((cat) => {
      if (categoryCounts[cat.name]) {
        list.push({ name: cat.name, count: categoryCounts[cat.name] });
      }
    });
    if (categoryCounts['Folders']) {
      list.push({ name: 'Folders', count: categoryCounts['Folders'] });
    }
    return list;
  }, [categoryCounts]);

  // Filtered files based on search input and toggled category filters
  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return files.filter((file) => {
      const fileCategory = file.isFolder ? 'Folders' : (file.category || determineCategory(file.name));

      // Category filter check (multi-category toggle)
      if (selectedCategories.size > 0) {
        if (!selectedCategories.has(fileCategory)) {
          return false;
        }
      }

      // Search query check
      if (!q) return true;

      const cleanQ = q.startsWith('.') ? q.slice(1) : q;
      const matchesName = file.name.toLowerCase().includes(q);
      const matchesExt = file.extension && file.extension.toLowerCase().includes(cleanQ);
      const matchesCat = fileCategory.toLowerCase().includes(q);

      return matchesName || matchesExt || matchesCat;
    });
  }, [files, searchQuery, selectedCategories]);

  // Category filter handlers
  const handleToggleCategory = (catName: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) {
        next.delete(catName);
      } else {
        next.add(catName);
      }
      return next;
    });
  };

  const handleClearCategoryFilters = () => {
    setSelectedCategories(new Set());
  };

  const getCategorySymbolIcon = (catName: string) => {
    switch (catName) {
      case 'Documents':
        return 'description';
      case 'Images':
        return 'image';
      case 'Videos':
        return 'movie';
      case 'Audio':
        return 'audiotrack';
      case 'Archives':
        return 'folder_zip';
      case 'Code':
        return 'code';
      case 'Folders':
        return 'folder';
      default:
        return 'draft';
    }
  };

  const getCategoryColor = (catName: string) => {
    switch (catName) {
      case 'Documents':
        return { color: '#2563eb', bg: '#eff6ff' };
      case 'Images':
        return { color: '#7c3aed', bg: '#f5f3ff' };
      case 'Videos':
        return { color: '#e11d48', bg: '#fff1f2' };
      case 'Audio':
        return { color: '#d97706', bg: '#fffbeb' };
      case 'Archives':
        return { color: '#059669', bg: '#ecfdf5' };
      case 'Code':
        return { color: '#0891b2', bg: '#ecfeff' };
      case 'Folders':
        return { color: '#ea580c', bg: '#fff7ed' };
      default:
        return { color: '#4b5563', bg: '#f3f4f6' };
    }
  };

  // Selection helpers for batch operations
  const toggleFileSelection = (id: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    const selectableFiles = filteredFiles.filter((f) => !f.isFolder);
    const allSelected =
      selectableFiles.length > 0 && selectableFiles.every((f) => selectedFileIds.has(f.id));
    if (allSelected) {
      setSelectedFileIds((prev) => {
        const next = new Set(prev);
        selectableFiles.forEach((f) => next.delete(f.id));
        return next;
      });
    } else {
      setSelectedFileIds((prev) => {
        const next = new Set(prev);
        selectableFiles.forEach((f) => next.add(f.id));
        return next;
      });
    }
  };

  const handleSelectAllVisible = () => {
    const selectableFiles = filteredFiles.filter((f) => !f.isFolder);
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      selectableFiles.forEach((f) => next.add(f.id));
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedFileIds(new Set());
  };

  const handleApplyCategoryToSelection = async () => {
    const targetFiles = files.filter((f) => selectedFileIds.has(f.id) && !f.isFolder);
    if (targetFiles.length === 0 || isBatchProcessing) return;

    setIsBatchProcessing(true);
    const targetCat = targetBatchCategory;
    let currentList = [...files];
    const processedIds = new Set<string>();

    for (let i = 0; i < targetFiles.length; i++) {
      const targetFile = targetFiles[i];
      setBatchProcessingState({
        current: i + 1,
        total: targetFiles.length,
        currentFileId: targetFile.id,
        currentFileName: targetFile.name,
        targetCategory: targetCat,
        isComplete: false,
      });

      // Update the file in the active list
      currentList = currentList.map((f) =>
        f.id === targetFile.id ? { ...f, category: targetCat } : f
      );

      processedIds.add(targetFile.id);
      setRecentlyCategorizedIds(new Set(processedIds));

      // Asynchronous stepping delay so users can clearly see the real-time progress indicator across multiple files
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    // Set completed status
    setBatchProcessingState({
      current: targetFiles.length,
      total: targetFiles.length,
      currentFileId: '',
      currentFileName: '',
      targetCategory: targetCat,
      isComplete: true,
    });

    if (onBatchCategorizeFiles) {
      onBatchCategorizeFiles(currentList, targetFiles.length, targetCat);
    }

    // Keep completed state visible briefly then reset
    setTimeout(() => {
      setBatchProcessingState(null);
      setIsBatchProcessing(false);
      setRecentlyCategorizedIds(new Set());
    }, 2500);
  };

  const handleOpenBatchRename = () => {
    if (selectedFileIds.size === 0) {
      const defaultToSelect = filteredFiles.filter((f) => !f.isFolder);
      if (defaultToSelect.length === 0) return;
      setSelectedFileIds(new Set(defaultToSelect.map((f) => f.id)));
    }
    setIsBatchRenameOpen(true);
  };

  const selectedFilesForRename = useMemo(() => {
    return files.filter((f) => selectedFileIds.has(f.id));
  }, [files, selectedFileIds]);

  return (
    <section className="screen" data-screen="dashboard" data-shown="true">
      {/* App Bar */}
      <header className="appbar">
        <div className="mark">
          <span className="material-symbols-rounded">rule_folder</span>
        </div>
        <div className="appbar-text">
          <span className="name">Sortly</span>
          <span className="sub">Organize your files automatically.</span>
        </div>
        <div className="appbar-spacer"></div>
        <button
          className="icon-btn"
          aria-label="Settings"
          onClick={() => onGoTo('settings')}
          title="Open Settings"
        >
          <span className="material-symbols-rounded">settings</span>
        </button>
      </header>

      {/* Main Content */}
      <main
        className="main-scroll"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={handleIncomingDrop}
      >
        <h2 className="page-title">Organize your files</h2>
        <p className="page-desc">Choose a folder and let Sortly handle the rest.</p>

        {/* Card 1: Folder to organize */}
        <section className="md3-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--s1)' }}>
            <span className="material-symbols-rounded" style={{ color: 'var(--on-surface-variant)', fontSize: '18px' }}>
              folder_open
            </span>
            <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)', fontWeight: 500 }}>
              Folder to organize ({files.length} files loaded)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--s2)', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '260px' }} className="field-wrap">
              <div className="field">
                <span className="mono">{folderPath}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id="dashboard-choose-folder-btn"
                className="btn btn-tonal"
                onClick={onChooseFolder}
                type="button"
                title="Choose folder (Ctrl+O)"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-symbols-rounded">drive_folder_upload</span>
                <span>Choose folder</span>
                <span className="kbd-shortcut">Ctrl+O</span>
              </button>
              <button
                className="btn btn-outline"
                onClick={() => folderInputRef.current?.click()}
                type="button"
                title="Select folder from device"
              >
                <span className="material-symbols-rounded">folder</span>
                Browse folder
              </button>
            </div>
          </div>

          {/* Dedicated Drag-and-Drop Zone for OS Folders */}
          <div
            id="dashboard-folder-dropzone"
            className={`dashboard-dropzone ${isDropzoneActive ? 'drag-active' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDropzoneActive(true);
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDropzoneActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.currentTarget === e.target) {
                setIsDropzoneActive(false);
              }
            }}
            onDrop={handleIncomingDrop}
            onClick={() => folderInputRef.current?.click()}
            role="region"
            aria-label="Folder Drag and Drop Zone"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                folderInputRef.current?.click();
              }
            }}
          >
            {isScanning ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: '3px solid var(--outline-variant)',
                    borderTopColor: 'var(--primary)',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--on-surface)' }}>
                  Scanning folder contents...
                </div>
                <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                  Extracting files, directory tree, and metadata
                </div>
              </div>
            ) : (
              <>
                <div className="dashboard-dropzone-icon-wrap">
                  <span className="material-symbols-rounded" style={{ fontSize: '30px' }}>
                    {isDropzoneActive ? 'file_download' : 'drive_folder_upload'}
                  </span>
                </div>

                <div className="dashboard-dropzone-title">
                  {isDropzoneActive ? 'Release to drop folder & load files' : 'Drop a folder from your OS here'}
                </div>

                <div className="dashboard-dropzone-desc">
                  {isDropzoneActive
                    ? 'Sortly will immediately inspect the directory and populate all files below.'
                    : 'Drag and drop any folder directly from macOS Finder, Windows Explorer, or Linux to automatically scan and update your files.'}
                </div>

                <div className="dashboard-dropzone-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    id="dropzone-select-folder-btn"
                    type="button"
                    className="btn btn-filled"
                    style={{ height: '34px', fontSize: '12px', padding: '0 14px', borderRadius: '17px' }}
                    onClick={() => folderInputRef.current?.click()}
                    title="Select folder from your computer"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                      folder_open
                    </span>
                    Browse OS Folder
                  </button>

                  <button
                    id="dropzone-choose-sample-btn"
                    type="button"
                    className="btn btn-tonal"
                    style={{ height: '34px', fontSize: '12px', padding: '0 14px', borderRadius: '17px' }}
                    onClick={onChooseFolder}
                    title="Browse preset demo folders"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                      auto_stories
                    </span>
                    Sample Folders
                  </button>

                  <button
                    id="dropzone-upload-files-btn"
                    type="button"
                    className="btn btn-outline"
                    style={{ height: '34px', fontSize: '12px', padding: '0 14px', borderRadius: '17px' }}
                    onClick={() => fileInputRef.current?.click()}
                    title="Select individual files without a folder"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                      upload_file
                    </span>
                    Upload Files
                  </button>
                </div>
              </>
            )}

            {/* Hidden Native Inputs */}
            <input
              type="file"
              ref={folderInputRef}
              onChange={handleNativeFolderSelect}
              // @ts-expect-error webkitdirectory is standard in HTML5 directory pickers
              webkitdirectory=""
              directory=""
              multiple
              style={{ display: 'none' }}
              id="dashboard-native-folder-input"
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleNativeFileSelect}
              multiple
              style={{ display: 'none' }}
              id="dashboard-native-file-input"
            />
          </div>

          <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '10px' }}>
            Tip: You can drop an entire folder or individual files anywhere onto this window.
          </div>
        </section>

        {/* Card: Current Files & Search Bar */}
        <section className="md3-card" id="dashboard-current-files-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '20px' }}>
                inventory_2
              </span>
              <h3 className="card-title" style={{ margin: 0, fontSize: '15px' }}>
                Files in current folder
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '100px',
                  background: 'var(--surface-container-high)',
                  color: 'var(--on-surface-variant)',
                  fontFamily: 'monospace',
                }}
              >
                {files.length} {files.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {searchQuery && (
                <span style={{ fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                  {filteredFiles.length} of {files.length} found
                </span>
              )}
              {files.length > 0 && (
                <button
                  id="dashboard-header-batch-rename-btn"
                  type="button"
                  className={selectedFileIds.size > 0 ? 'btn btn-filled' : 'btn btn-tonal'}
                  style={{
                    height: '28px',
                    padding: '0 10px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onClick={handleOpenBatchRename}
                  title="Batch rename selected files with regex or date patterns"
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>
                    drive_file_rename_outline
                  </span>
                  <span>
                    Batch Rename{selectedFileIds.size > 0 ? ` (${selectedFileIds.size})` : ''}
                  </span>
                </button>
              )}
              <button
                type="button"
                className="btn-text"
                style={{ height: '28px', padding: '0 8px', fontSize: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setIsFileListCollapsed(!isFileListCollapsed)}
                title={isFileListCollapsed ? 'Expand file list' : 'Collapse file list'}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                  {isFileListCollapsed ? 'expand_more' : 'expand_less'}
                </span>
                <span>{isFileListCollapsed ? 'Show list' : 'Collapse'}</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="dashboard-search">
            <span className="material-symbols-rounded dashboard-search-icon">
              search
            </span>
            <input
              id="dashboard-file-search-input"
              type="text"
              className="dashboard-search-input"
              placeholder="Search files by name, extension (e.g. .pdf), or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                }
              }}
              aria-label="Search files in current list"
            />
            {searchQuery && (
              <button
                id="dashboard-clear-search-btn"
                type="button"
                className="dashboard-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search (Esc)"
                aria-label="Clear search"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            )}
          </div>

          {/* Category-based Filter Bar */}
          {activeCategoryList.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                  padding: '0 2px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    className="material-symbols-rounded"
                    style={{ fontSize: '15px', color: 'var(--on-surface-variant)' }}
                  >
                    filter_alt
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--on-surface)' }}>
                    Filter by file type:
                  </span>
                  {selectedCategories.size > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        background: 'var(--primary-container)',
                        color: 'var(--on-primary-container)',
                        padding: '1px 8px',
                        borderRadius: '100px',
                        fontWeight: 600,
                      }}
                    >
                      {selectedCategories.size} active
                    </span>
                  )}
                </div>
                {selectedCategories.size > 0 && (
                  <button
                    id="dashboard-clear-category-filter-btn"
                    type="button"
                    className="btn-text"
                    style={{
                      height: '22px',
                      padding: '0 6px',
                      fontSize: '11px',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                    }}
                    onClick={handleClearCategoryFilters}
                  >
                    Show all categories
                  </button>
                )}
              </div>

              <div
                className="filter-chips"
                id="dashboard-category-filter-chips"
                role="group"
                aria-label="Category file filters"
              >
                {/* 'All' category chip */}
                <button
                  id="dashboard-filter-category-all"
                  type="button"
                  className="filter-chip"
                  data-active={selectedCategories.size === 0 ? 'true' : 'false'}
                  onClick={handleClearCategoryFilters}
                  title="Show all file types"
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
                    {selectedCategories.size === 0 ? 'done_all' : 'layers'}
                  </span>
                  <span>All</span>
                  <span style={{ opacity: 0.75, fontSize: '11px', fontFamily: 'monospace' }}>
                    ({files.length})
                  </span>
                </button>

                {/* Individual category toggle chips */}
                {activeCategoryList.map((cat) => {
                  const isSelected = selectedCategories.has(cat.name);
                  const catColor = getCategoryColor(cat.name);

                  return (
                    <button
                      key={cat.name}
                      id={`dashboard-filter-category-${cat.name.toLowerCase()}`}
                      type="button"
                      className="filter-chip"
                      data-active={isSelected ? 'true' : 'false'}
                      onClick={() => handleToggleCategory(cat.name)}
                      style={
                        isSelected
                          ? {
                              borderColor: catColor.color,
                              backgroundColor: catColor.bg,
                              color: catColor.color,
                            }
                          : undefined
                      }
                      title={`Toggle ${cat.name} visibility (${cat.count} files)`}
                      aria-pressed={isSelected}
                    >
                      <span
                        className="material-symbols-rounded"
                        style={{
                          fontSize: '14px',
                          color: isSelected ? catColor.color : 'inherit',
                        }}
                      >
                        {isSelected ? 'check' : getCategorySymbolIcon(cat.name)}
                      </span>
                      <span>{cat.name}</span>
                      <span
                        style={{
                          opacity: isSelected ? 0.95 : 0.75,
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          fontWeight: isSelected ? 700 : 500,
                        }}
                      >
                        ({cat.count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Collapsible File List Body */}
          {!isFileListCollapsed && (
            <div style={{ marginTop: '10px' }}>
              {files.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '13px' }}>
                  No files loaded in this folder. Choose another folder or drop files above.
                </div>
              ) : filteredFiles.length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    border: '1px dashed var(--outline-variant)',
                    borderRadius: '12px',
                    background: 'var(--surface-container-low)',
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '32px', color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                    search_off
                  </span>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--on-surface)', marginTop: '4px' }}>
                    {searchQuery
                      ? `No files matching "${searchQuery}"`
                      : 'No files match the selected category filters'}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--on-surface-variant)', margin: '4px 0 12px' }}>
                    {selectedCategories.size > 0
                      ? `Filtered by: ${Array.from(selectedCategories).join(', ')}. Try toggling other categories or clearing your filters.`
                      : 'Try searching with another filename, extension (e.g. .jpg, .pdf), or clear your filter.'}
                  </p>
                  <button
                    type="button"
                    className="btn btn-tonal"
                    style={{ height: '32px', padding: '0 14px', fontSize: '12px' }}
                    onClick={() => {
                      setSearchQuery('');
                      handleClearCategoryFilters();
                    }}
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <>
                  {/* Selection and Batch Toolbar */}
                  <div className="dashboard-selection-bar" id="dashboard-selection-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        id="dashboard-select-all-checkbox"
                        type="checkbox"
                        className="dashboard-file-checkbox"
                        checked={
                          filteredFiles.filter((f) => !f.isFolder).length > 0 &&
                          filteredFiles
                            .filter((f) => !f.isFolder)
                            .every((f) => selectedFileIds.has(f.id))
                        }
                        ref={(el) => {
                          if (el) {
                            const nonFolders = filteredFiles.filter((f) => !f.isFolder);
                            const someSelected = nonFolders.some((f) => selectedFileIds.has(f.id));
                            const allSelected =
                              nonFolders.length > 0 &&
                              nonFolders.every((f) => selectedFileIds.has(f.id));
                            el.indeterminate = someSelected && !allSelected;
                          }
                        }}
                        onChange={toggleSelectAllFiltered}
                        title="Select or deselect all visible files"
                        aria-label="Select all visible files checkbox"
                      />
                      <label
                        htmlFor="dashboard-select-all-checkbox"
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          userSelect: 'none',
                          color: 'var(--on-surface)',
                        }}
                      >
                        {selectedFileIds.size > 0 ? (
                          <span>
                            <strong>{selectedFileIds.size}</strong> of {files.filter((f) => !f.isFolder).length} selected
                          </span>
                        ) : (
                          <span>
                            {filteredFiles.filter((f) => !f.isFolder).length} visible files
                          </span>
                        )}
                      </label>
                    </div>

                    <div className="dashboard-selection-actions">
                      {/* Select All Button */}
                      <button
                        id="dashboard-select-all-btn"
                        type="button"
                        className="btn btn-tonal"
                        style={{
                          height: '26px',
                          padding: '0 10px',
                          fontSize: '11px',
                          borderRadius: '13px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        onClick={handleSelectAllVisible}
                        disabled={
                          filteredFiles.filter((f) => !f.isFolder).length === 0 ||
                          filteredFiles
                            .filter((f) => !f.isFolder)
                            .every((f) => selectedFileIds.has(f.id))
                        }
                        title="Select all visible files in list"
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                          select_all
                        </span>
                        <span>Select All</span>
                      </button>

                      {/* Clear Selection Button */}
                      <button
                        id="dashboard-clear-selection-btn"
                        type="button"
                        className="btn btn-outline"
                        style={{
                          height: '26px',
                          padding: '0 10px',
                          fontSize: '11px',
                          borderRadius: '13px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          opacity: selectedFileIds.size === 0 ? 0.5 : 1,
                          cursor: selectedFileIds.size === 0 ? 'not-allowed' : 'pointer',
                        }}
                        onClick={handleClearSelection}
                        disabled={selectedFileIds.size === 0}
                        title="Deselect all files"
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                          deselect
                        </span>
                        <span>Clear Selection</span>
                      </button>

                      {/* Batch Category Selector & Apply Button */}
                      <div
                        id="dashboard-batch-category-control-group"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'var(--surface-container-high)',
                          padding: '2px 6px 2px 8px',
                          borderRadius: '14px',
                          border: '1px solid var(--outline-variant)',
                        }}
                      >
                        <span
                          className="material-symbols-rounded"
                          style={{ fontSize: '15px', color: 'var(--on-surface-variant)' }}
                        >
                          category
                        </span>
                        <select
                          id="dashboard-batch-category-select"
                          value={targetBatchCategory}
                          onChange={(e) => setTargetBatchCategory(e.target.value)}
                          disabled={isBatchProcessing}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: 'var(--on-surface)',
                            cursor: isBatchProcessing ? 'not-allowed' : 'pointer',
                            outline: 'none',
                            padding: '2px 2px',
                          }}
                          aria-label="Select target category for batch update"
                          title="Select target category"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>

                        <button
                          id="dashboard-apply-category-btn"
                          type="button"
                          className={`btn ${selectedFileIds.size > 0 && !isBatchProcessing ? 'btn-filled' : 'btn-tonal'}`}
                          style={{
                            height: '24px',
                            padding: '0 8px',
                            fontSize: '11px',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor:
                              selectedFileIds.size > 0 && !isBatchProcessing
                                ? 'pointer'
                                : 'not-allowed',
                            opacity: selectedFileIds.size === 0 || isBatchProcessing ? 0.6 : 1,
                          }}
                          onClick={handleApplyCategoryToSelection}
                          disabled={selectedFileIds.size === 0 || isBatchProcessing}
                          title={
                            selectedFileIds.size > 0
                              ? `Apply category "${targetBatchCategory}" to ${selectedFileIds.size} selected file(s)`
                              : 'Select files to apply category'
                          }
                        >
                          {isBatchProcessing ? (
                            <span
                              className="material-symbols-rounded"
                              style={{ fontSize: '14px', animation: 'spin 1.2s linear infinite' }}
                            >
                              autorenew
                            </span>
                          ) : (
                            <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
                              done
                            </span>
                          )}
                          <span>Apply to Selection</span>
                        </button>
                      </div>

                      {/* Batch Rename Action Button */}
                      <button
                        id="dashboard-batch-rename-action-btn"
                        type="button"
                        className={`btn ${selectedFileIds.size > 0 ? 'btn-filled' : 'btn-tonal'}`}
                        style={{
                          height: '26px',
                          padding: '0 10px',
                          fontSize: '11px',
                          borderRadius: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        onClick={handleOpenBatchRename}
                        disabled={isBatchProcessing}
                        title="Batch rename selected files with regex or date patterns"
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: '15px' }}>
                          drive_file_rename_outline
                        </span>
                        <span>
                          {selectedFileIds.size > 0
                            ? `Rename (${selectedFileIds.size})`
                            : 'Batch Rename...'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Batch Processing Progress Indicator Banner */}
                  {batchProcessingState && (
                    <div
                      id="dashboard-batch-progress-indicator"
                      style={{
                        padding: '10px 14px',
                        marginBottom: '10px',
                        background: batchProcessingState.isComplete
                          ? 'var(--surface-container-high)'
                          : 'var(--surface-container-highest)',
                        border: `1px solid ${
                          batchProcessingState.isComplete ? '#16a34a' : 'var(--primary)'
                        }`,
                        borderRadius: '10px',
                        transition: 'all 0.2s ease',
                      }}
                      role="status"
                      aria-live="polite"
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            className="material-symbols-rounded"
                            style={{
                              fontSize: '18px',
                              color: batchProcessingState.isComplete ? '#16a34a' : 'var(--primary)',
                              animation: batchProcessingState.isComplete
                                ? 'none'
                                : 'spin 1.2s linear infinite',
                            }}
                          >
                            {batchProcessingState.isComplete ? 'check_circle' : 'autorenew'}
                          </span>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--on-surface)',
                            }}
                          >
                            {batchProcessingState.isComplete
                              ? `Successfully updated ${batchProcessingState.total} file${
                                  batchProcessingState.total === 1 ? '' : 's'
                                } to "${batchProcessingState.targetCategory}"`
                              : `Processing ${batchProcessingState.current} of ${batchProcessingState.total} files...`}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--on-surface-variant)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {Math.round(
                            (batchProcessingState.current / batchProcessingState.total) * 100
                          )}
                          % ({batchProcessingState.current}/{batchProcessingState.total})
                        </span>
                      </div>

                      {/* Linear progress track */}
                      <div
                        style={{
                          height: '6px',
                          width: '100%',
                          backgroundColor: 'var(--surface-container-low)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${
                              (batchProcessingState.current / batchProcessingState.total) * 100
                            }%`,
                            backgroundColor: batchProcessingState.isComplete
                              ? '#16a34a'
                              : 'var(--primary)',
                            transition: 'width 0.1s ease',
                            borderRadius: '3px',
                          }}
                        />
                      </div>

                      {!batchProcessingState.isComplete && batchProcessingState.currentFileName && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '6px',
                            fontSize: '11px',
                            color: 'var(--on-surface-variant)',
                          }}
                        >
                          <span
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '70%',
                            }}
                          >
                            Updating: <strong style={{ color: 'var(--on-surface)' }}>{batchProcessingState.currentFileName}</strong>
                          </span>
                          <span>
                            Target: <strong style={{ color: 'var(--primary)' }}>{batchProcessingState.targetCategory}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="dashboard-file-list" role="region" aria-label="Loaded files list">
                    {filteredFiles.map((file) => {
                      const cat = file.isFolder ? 'Folders' : (file.category || determineCategory(file.name));
                      const isSkipped = !!(file.isFolder || file.isHidden || file.isSystem);
                      const catColor = getCategoryColor(cat);
                      const isCurrentlyUpdating = batchProcessingState?.currentFileId === file.id;
                      const wasJustUpdated = recentlyCategorizedIds.has(file.id);

                      return (
                        <div
                          className="dashboard-file-row"
                          key={file.id}
                          data-selected={selectedFileIds.has(file.id) ? 'true' : 'false'}
                          onClick={() => !file.isFolder && toggleFileSelection(file.id)}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.code === 'Space') {
                              e.preventDefault();
                              setPreviewingFile(file);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`${file.name}, ${cat}. Press Space for Quick Look`}
                          style={{
                            cursor: file.isFolder ? 'default' : 'pointer',
                            borderLeft: isCurrentlyUpdating ? '3px solid var(--primary)' : undefined,
                            backgroundColor: isCurrentlyUpdating ? 'var(--surface-container-high)' : undefined,
                            transition: 'background-color 0.15s ease, border-left 0.15s ease',
                          }}
                        >
                          {/* Row Checkbox */}
                          {!file.isFolder ? (
                            <input
                              id={`dashboard-file-check-${file.id}`}
                              type="checkbox"
                              className="dashboard-file-checkbox"
                              checked={selectedFileIds.has(file.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleFileSelection(file.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select ${file.name}`}
                            />
                          ) : (
                            <div style={{ width: '17px', flexShrink: 0 }} />
                          )}

                          <div className="dashboard-file-icon">
                            <span className="material-symbols-rounded">
                              {getMaterialIconForFile(file)}
                            </span>
                          </div>
                          <div className="dashboard-file-body">
                            <div className="dashboard-file-name" title={file.name}>
                              {file.name}
                            </div>
                            <div className="dashboard-file-meta">
                              <span>{file.size}</span>
                              {file.extension && (
                                <>
                                  <span>•</span>
                                  <span className="mono">.{file.extension.toLowerCase()}</span>
                                </>
                              )}
                              {file.dateModified && (
                                <>
                                  <span>•</span>
                                  <span>{file.dateModified}</span>
                                </>
                              )}
                            </div>
                          </div>

                        {/* Category badge & live batch processing indicator */}
                        {isCurrentlyUpdating ? (
                          <div
                            className="dashboard-file-badge"
                            style={{
                              background: 'var(--primary-container)',
                              color: 'var(--on-primary-container)',
                              border: '1px solid var(--primary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 600,
                            }}
                          >
                            <span
                              className="material-symbols-rounded"
                              style={{
                                fontSize: '13px',
                                animation: 'spin 1.2s linear infinite',
                              }}
                            >
                              autorenew
                            </span>
                            <span>Updating...</span>
                          </div>
                        ) : wasJustUpdated ? (
                          <div
                            className="dashboard-file-badge"
                            style={{
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #10b981',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontWeight: 600,
                            }}
                          >
                            <span
                              className="material-symbols-rounded"
                              style={{ fontSize: '13px' }}
                            >
                              check
                            </span>
                            <span>{cat}</span>
                          </div>
                        ) : (
                          <div
                            className="dashboard-file-badge"
                            style={{
                              background: catColor.bg,
                              color: catColor.color,
                              border: `1px solid ${catColor.color}30`,
                            }}
                          >
                            {cat}
                          </div>
                        )}

                        {/* Status if skipped */}
                        {isSkipped && (
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: 'var(--surface-container-high)',
                              color: 'var(--on-surface-variant)',
                              fontWeight: 500,
                            }}
                            title="Skipped or kept at root during sorting"
                          >
                            Untouched
                          </span>
                        )}

                        {/* Quick Look Eye Action Button */}
                        <button
                          id={`dashboard-file-preview-btn-${file.id}`}
                          data-testid={`quick-look-btn-${file.id}`}
                          type="button"
                          className="dashboard-file-action-btn quick-look-btn"
                          title={`Quick Look: ${file.name} (Space)`}
                          aria-label={`Quick Look for ${file.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewingFile(file);
                          }}
                        >
                          <span className="material-symbols-rounded">visibility</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            </div>
          )}
        </section>

        {/* Card: File Type Distribution Chart */}
        <FileTypeDistributionChart
          files={files}
          onSelectCategory={(cat) => handleToggleCategory(cat)}
        />

        {/* Card 2: Organization settings */}
        <section className="md3-card">
          <h3 className="card-title">Organization settings</h3>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s3)', padding: 'var(--s1) 0' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>Dry run</div>
              <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                Preview changes without moving files.
              </div>
            </div>
            <div
              className="switch"
              data-on={isDryRun ? 'true' : 'false'}
              role="switch"
              aria-checked={isDryRun}
              aria-label="Dry run"
              tabIndex={0}
              onClick={() => onToggleDryRun(!isDryRun)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleDryRun(!isDryRun);
                }
              }}
            />
          </div>
          <div style={{ borderTop: '1px solid var(--outline-variant)', marginTop: 'var(--s1)', paddingTop: 'var(--s2)' }}>
            <label
              className="checkbox-row"
              tabIndex={0}
              role="checkbox"
              aria-checked={includeSubfolders}
              onClick={() => onToggleIncludeSubfolders(!includeSubfolders)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleIncludeSubfolders(!includeSubfolders);
                }
              }}
            >
              <span className="checkbox" data-checked={includeSubfolders ? 'true' : 'false'}>
                <span className="material-symbols-rounded">check</span>
              </span>
              <span className="t">Include subfolders</span>
            </label>
            <div style={{ fontSize: '13px', color: 'var(--on-surface-variant)', margin: '2px 0 0 32px' }}>
              Also scan and sort files inside nested folders.
            </div>
          </div>
        </section>

        {/* Big Action Button */}
        <button
          id="dashboard-organize-files-btn"
          className="btn btn-filled full"
          style={{
            height: '56px',
            borderRadius: '16px',
            fontSize: '16px',
            boxShadow: 'var(--el2)',
            margin: 'var(--s3) 0 var(--s4)',
            justifyContent: 'center',
            gap: '8px',
          }}
          onClick={onOrganizeClick}
          type="button"
          title="Start organization (Ctrl+Enter)"
        >
          <span className="material-symbols-rounded fill">bolt</span>
          <span>Organize files</span>
          <span
            className="kbd-shortcut"
            style={{
              background: 'rgba(255, 255, 255, 0.22)',
              color: 'inherit',
              borderColor: 'transparent',
              fontSize: '11px',
              padding: '2px 8px',
            }}
          >
            Ctrl+↵
          </span>
        </button>

        {/* Summary Stats */}
        <div className="section-head">
          <h3>Summary</h3>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="stat-top">
              <div className="stat-icon" style={{ background: 'var(--secondary-container)' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--on-secondary-container)' }}>
                  search
                </span>
              </div>
            </div>
            <div className="v">{stats.scanned}</div>
            <div className="l">Files scanned</div>
          </div>
          <div className="stat">
            <div className="stat-top">
              <div className="stat-icon" style={{ background: 'var(--primary-container)' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--on-primary-container)' }}>
                  move_up
                </span>
              </div>
            </div>
            <div className="v">{stats.moved}</div>
            <div className="l">Files moved</div>
          </div>
          <div className="stat">
            <div className="stat-top">
              <div className="stat-icon" style={{ background: 'var(--surface-container-high)' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--on-surface-variant)' }}>
                  block
                </span>
              </div>
            </div>
            <div className="v">{stats.skipped}</div>
            <div className="l">Skipped</div>
          </div>
          <div className="stat">
            <div className="stat-top">
              <div className="stat-icon" style={{ background: 'var(--error-container)' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--on-error-container)' }}>
                  error
                </span>
              </div>
            </div>
            <div className="v">{stats.errors}</div>
            <div className="l">Errors</div>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="section-head">
          <h3>Recent activity</h3>
        </div>
        <div className="list">
          {recentActivity.length === 0 ? (
            <div style={{ padding: 'var(--s3)', textAlign: 'center', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
              No recent activity yet. Click "Organize files" to begin.
            </div>
          ) : (
            recentActivity.map((item) => (
              <div className="item" key={item.id}>
                <div className="item-icon">
                  <span className="material-symbols-rounded">
                    {item.fileItem ? getMaterialIconForFile(item.fileItem) : 'description'}
                  </span>
                </div>
                <div className="item-body">
                  <div className="item-title">{item.name}</div>
                  <div className="item-sub">{item.category}</div>
                </div>
                <span className="item-time">{item.timeAgo}</span>
                <span className={`status-dot ${item.status}`}></span>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Quick Look & File Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewingFile}
        file={previewingFile}
        files={filteredFiles}
        onNavigateFile={(newFile) => setPreviewingFile(newFile)}
        onClose={() => setPreviewingFile(null)}
      />

      {/* Batch Renaming Modal */}
      {isBatchRenameOpen && (
        <BatchRenameModal
          isOpen={isBatchRenameOpen}
          onClose={() => setIsBatchRenameOpen(false)}
          selectedFiles={selectedFilesForRename}
          allFolderFiles={files}
          onApplyRename={(updatedFiles, count) => {
            if (onBatchRenameFiles) {
              onBatchRenameFiles(updatedFiles, count);
            }
            setSelectedFileIds(new Set());
          }}
        />
      )}
    </section>
  );
};
