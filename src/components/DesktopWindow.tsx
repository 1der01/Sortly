import React, { useState, useEffect, useRef } from 'react';
import { 
  Folder, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Upload, 
  Download, 
  FileText, 
  Layers, 
  Eye, 
  Sparkles, 
  FolderPlus, 
  Check, 
  ChevronDown, 
  ChevronUp,
  FileCheck2,
  HardDrive
} from 'lucide-react';
import { FileItem, LogEntry, OrganizationStats } from '../types';
import { determineCategory, CATEGORIES } from '../data/categoriesData';
import { createFileItemFromNativeFile } from '../utils/fileHelpers';
import { downloadOrganizedZip } from '../utils/zipExport';
import { ConfirmOrganizeModal } from './ConfirmOrganizeModal';

interface DesktopWindowProps {
  currentFolderPath: string;
  files: FileItem[];
  onBrowseFolderClick: () => void;
  onOrganizeComplete: (isDryRun: boolean, stagedFiles: FileItem[]) => void;
  onResetFiles: () => void;
  onUndoLastOrganize?: () => void;
  canUndo?: boolean;
  activePresetName: string;
  onFilesAdded?: (newFiles: FileItem[], folderName: string) => void;
  onToast: (msg: string) => void;
}

export const DesktopWindow: React.FC<DesktopWindowProps> = ({
  currentFolderPath,
  files,
  onBrowseFolderClick,
  onOrganizeComplete,
  onResetFiles,
  onUndoLastOrganize,
  canUndo = false,
  activePresetName,
  onFilesAdded,
  onToast,
}) => {
  const [folderPathInput, setFolderPathInput] = useState(currentFolderPath);
  const [isDryRun, setIsDryRun] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [showLogDrawer, setShowLogDrawer] = useState(true);
  const [progressInfo, setProgressInfo] = useState<{ current: number; total: number; currentFile: string }>({
    current: 0,
    total: 0,
    currentFile: '',
  });

  const [stats, setStats] = useState<OrganizationStats>({ scanned: 0, moved: 0, skipped: 0, errors: 0 });
  const [duplicateCount, setDuplicateCount] = useState(0);

  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      message: 'Sortly engine ready.',
      humanStory: 'Welcome! Safe automated organization is ready. You can test presets or drop your own files.',
      level: 'info',
      iconType: 'sparkle',
    },
    {
      id: 'init-2',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      message: 'Dry Run mode active by default.',
      humanStory: 'Peace of mind: Gentle Preview is enabled so you can inspect planned moves before any files move.',
      level: 'dry_run',
      iconType: 'shield',
    },
  ]);

  const [statusMessage, setStatusMessage] = useState('Ready to organize. Preview planned moves or organize directly.');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFolderPathInput(currentFolderPath);
  }, [currentFolderPath]);

  // Auto-scroll log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (
    message: string,
    humanStory: string,
    level: LogEntry['level'],
    iconType: LogEntry['iconType'] = 'check'
  ) => {
    const newEntry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
      humanStory,
      level,
      iconType,
    };
    setLogs((prev) => [...prev, newEntry]);
  };

  // Handle Drag & Drop of real files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processNativeFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processNativeFiles(Array.from(e.target.files));
    }
  };

  const processNativeFiles = (nativeFiles: File[]) => {
    const newItems: FileItem[] = nativeFiles.map((file, idx) =>
      createFileItemFromNativeFile(file, idx)
    );
    const folderLabel = nativeFiles.length === 1 ? nativeFiles[0].name : `Uploaded Files (${nativeFiles.length})`;
    if (onFilesAdded) {
      onFilesAdded(newItems, folderLabel);
    }
    setFolderPathInput(`~/Uploaded/${folderLabel}`);
    addLog(
      `Imported ${nativeFiles.length} real files from device.`,
      `Loaded ${nativeFiles.length} real files. Ready to organize automatically.`,
      'info',
      'folder'
    );
    onToast(`Loaded ${nativeFiles.length} files. Click "Preview" or "Organize".`);
  };

  const handleStartOrganize = () => {
    if (files.length === 0) {
      onToast('No files found in directory to organize.');
      return;
    }

    if (isRunning) return;

    // Error Prevention: If in live execution mode (not dry run), open accessible confirmation modal
    if (!isDryRun) {
      setIsConfirmModalOpen(true);
      return;
    }

    executeOrganize(true);
  };

  const executeOrganize = async (dryRunMode: boolean) => {
    setIsRunning(true);
    setProgressInfo({ current: 0, total: files.length, currentFile: 'Initializing...' });
    setStatusMessage(
      dryRunMode
        ? 'Scanning files for safe categorization preview (no files moved)...'
        : 'Organizing files safely into category folders...'
    );

    const modePrefix = dryRunMode ? '[PREVIEW] ' : '';
    addLog(
      `${modePrefix}Starting scan in: ${folderPathInput}`,
      `Analyzing ${files.length} items in "${folderPathInput}" to map into category folders...`,
      'info',
      'folder'
    );

    let scanned = 0;
    let moved = 0;
    let skipped = 0;
    let errors = 0;
    let duplicates = 0;

    const existingInCategory: Record<string, Set<string>> = {
      Documents: new Set(['Q3_Financial_Report.pdf']),
      Images: new Set(),
      Videos: new Set(),
      Audio: new Set(),
      Archives: new Set(),
      Code: new Set(),
      Others: new Set(),
    };

    const updatedFiles: FileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      scanned += 1;
      setProgressInfo({
        current: i + 1,
        total: files.length,
        currentFile: item.name,
      });

      // Skip folders
      if (item.isFolder) {
        skipped += 1;
        setStats({ scanned, moved, skipped, errors });
        addLog(
          `Skipped subdirectory: ${item.name}`,
          `Kept existing folder "${item.name}/" completely untouched at root.`,
          'skipped',
          'shield'
        );
        updatedFiles.push(item);
        await new Promise((r) => setTimeout(r, 30));
        continue;
      }

      // Skip hidden & system files
      if (item.isHidden || item.isSystem) {
        skipped += 1;
        setStats({ scanned, moved, skipped, errors });
        addLog(
          `Skipped system file: ${item.name}`,
          `Preserved hidden/system file "${item.name}" safely at root.`,
          'skipped',
          'shield'
        );
        updatedFiles.push(item);
        await new Promise((r) => setTimeout(r, 30));
        continue;
      }

      // Categorize
      const category = determineCategory(item.name);
      const catSet = existingInCategory[category] || new Set();
      let finalName = item.name;
      let isDuplicate = false;

      // Safe collision detection
      if (catSet.has(finalName)) {
        isDuplicate = true;
        duplicates += 1;
        setDuplicateCount(duplicates);
        const dotIdx = item.name.lastIndexOf('.');
        const stem = dotIdx !== -1 ? item.name.substring(0, dotIdx) : item.name;
        const ext = dotIdx !== -1 ? item.name.substring(dotIdx) : '';
        let counter = 1;
        while (catSet.has(`${stem} (${counter})${ext}`)) {
          counter += 1;
        }
        finalName = `${stem} (${counter})${ext}`;
      }

      catSet.add(finalName);
      existingInCategory[category] = catSet;

      moved += 1;
      setStats({ scanned, moved, skipped, errors });

      const renameNotice = isDuplicate ? ` (renamed to '${finalName}' to prevent overwrite)` : '';

      if (dryRunMode) {
        addLog(
          `[Preview] Would move '${item.name}' -> '${category}/${finalName}'${renameNotice}`,
          isDuplicate
            ? `Identified "${item.name}" already in ${category}. Would safely save as "${finalName}" so both files are preserved.`
            : `Would move "${item.name}" into ${category}/ folder.`,
          'dry_run',
          isDuplicate ? 'copy' : 'check'
        );
      } else {
        addLog(
          `Moved '${item.name}' -> '${category}/${finalName}'${renameNotice}`,
          isDuplicate
            ? `Preserved both copies: saved new version as "${finalName}" in ${category}/.`
            : `Organized "${item.name}" into ${category}/ folder.`,
          'success',
          isDuplicate ? 'copy' : 'check'
        );
      }

      updatedFiles.push({
        ...item,
        category,
        resolvedName: finalName,
        isDuplicate,
      });

      await new Promise((r) => setTimeout(r, 45));
    }

    const humanFinishMsg = dryRunMode
      ? `Preview complete! ${moved} files ready to organize, ${duplicates > 0 ? `${duplicates} duplicate names protected, ` : ''}${skipped} items preserved.`
      : `Organization complete! ${moved} files organized into category folders without loss.`;

    addLog(
      `${modePrefix}Finished: ${moved} organized, ${skipped} skipped, ${errors} errors`,
      humanFinishMsg,
      errors === 0 ? 'success' : 'warning',
      'sparkle'
    );

    setStatusMessage(humanFinishMsg);
    setIsRunning(false);
    onOrganizeComplete(dryRunMode, updatedFiles);
    onToast(humanFinishMsg);
  };

  const handleExportZip = async () => {
    try {
      await downloadOrganizedZip(files, `Sortly_Organized_${activePresetName.replace(/\s+/g, '_')}.zip`);
      onToast('Downloaded organized ZIP archive to your computer!');
      addLog(
        'Downloaded organized ZIP file.',
        'Exported neat category folders (Documents, Images, etc.) as a ZIP file.',
        'success',
        'check'
      );
    } catch (err) {
      onToast('Failed to create ZIP file.');
    }
  };

  const hasOrganizedFiles = files.some((f) => f.resolvedName || f.category !== 'Others');

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden flex flex-col h-full transition-all">
      {/* Window Title Bar */}
      <div className="bg-slate-50 border-b border-slate-200/80 px-5 py-3.5 flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
          </div>
          <span className="text-xs font-bold text-slate-800 ml-1.5 tracking-tight flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2a2 2 0 0 1 1.4.6L11.5 7H18.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z" />
                <path d="M12 11v5" />
                <path d="m10 14 2 2 2-2" />
              </svg>
            </span>
            Sortly Organizer Engine
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 font-medium text-xs text-slate-700">
            {activePresetName}
          </span>
        </div>
      </div>

      {/* Main Window Body */}
      <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto">
        {/* Step-by-Step Workflow Guidance Banner (#1 User-Centric & #3 Simplicity) */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Automated Organization
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                  Zero File Loss Guarantee
                </span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Sorts files into neat category folders. Colliding filenames are saved with a <code className="font-mono text-slate-800 bg-white px-1 py-0.5 rounded border border-slate-200">(1)</code> suffix so nothing is lost.
              </p>
            </div>
          </div>

          {/* Quick ZIP Export button if files are organized */}
          {hasOrganizedFiles && (
            <button
              type="button"
              onClick={handleExportZip}
              className="px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl transition shadow-2xs flex items-center gap-1.5 shrink-0 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              title="Download neat folders as a ZIP archive"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Download ZIP</span>
            </button>
          )}
        </div>

        {/* 1. Target Folder & Drag/Drop Zone (#7 Affordance & #1 User-Centric) */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 rounded-xl p-4 transition-all ${
            isDragOver
              ? 'border-blue-600 bg-blue-50/90 text-blue-900 shadow-inner'
              : 'border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Folder className="w-4 h-4 text-blue-600" />
              <span>Target Folder & Files</span>
            </label>
            <span className="text-xs font-medium text-slate-500 font-mono">
              {files.length} {files.length === 1 ? 'file' : 'files'} loaded
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="text"
              value={folderPathInput}
              onChange={(e) => setFolderPathInput(e.target.value)}
              placeholder="e.g. ~/Downloads or ~/Desktop"
              aria-label="Folder Path Input"
              className="flex-1 px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
            />

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onBrowseFolderClick}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition shadow-2xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
              >
                <Folder className="w-3.5 h-3.5 text-slate-500" />
                <span>Presets...</span>
              </button>

              {/* Native Real File Upload Input */}
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileInputChange}
                className="hidden"
                aria-label="Select files from computer"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-xl transition shadow-2xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                title="Upload real files from your computer to organize"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Select Files...</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-2.5 flex items-center gap-1.5">
            <Upload className="w-3 h-3 text-slate-400" />
            <span>Drag and drop real files from your desktop directly onto this box anytime.</span>
          </p>
        </div>

        {/* 2. Controls & Safe Execution Options (#6 Error Prevention & #7 Affordance) */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
          {/* Gentle Preview Toggle with Accessible Switch Affordance */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={isDryRun}
                onChange={(e) => setIsDryRun(e.target.checked)}
                disabled={isRunning}
                className="sr-only peer"
                aria-label="Toggle Gentle Preview Mode"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-blue-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                Preview Mode (Dry Run)
              </span>
              <span className="text-[11px] text-slate-500 block">
                {isDryRun
                  ? 'Safe preview: inspect what moves into folders before changes are made.'
                  : 'Live mode: files will be organized into category folders.'}
              </span>
            </div>
          </label>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {canUndo && onUndoLastOrganize && (
              <button
                type="button"
                onClick={onUndoLastOrganize}
                disabled={isRunning}
                className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none disabled:opacity-50"
                title="Restore files back to original root location"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                <span>Undo Last Organize</span>
              </button>
            )}

            <button
              type="button"
              onClick={onResetFiles}
              disabled={isRunning}
              className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition shadow-2xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none disabled:opacity-50"
              title="Reset files to original preset state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleStartOrganize}
              disabled={isRunning || files.length === 0}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                isRunning
                  ? 'bg-slate-400 text-white cursor-wait'
                  : isDryRun
                  ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isDryRun ? 'Preview Organization' : 'Organize Files'}</span>
            </button>
          </div>
        </div>

        {/* 3. Real-Time Progress Bar & Feedback (#5 Feedback) */}
        {isRunning && (
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                Processing: {progressInfo.currentFile}
              </span>
              <span className="font-mono text-blue-700 font-semibold">
                {progressInfo.current} / {progressInfo.total} files
              </span>
            </div>
            <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-150 rounded-full"
                style={{
                  width: `${(progressInfo.current / Math.max(progressInfo.total, 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* 4. Clear Quantitative Metrics (#5 Feedback & #2 Consistency) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-center">
            <span className="text-2xl font-extrabold text-slate-900 font-mono block">
              {stats.scanned}
            </span>
            <span className="text-xs font-medium text-slate-500 mt-0.5 block">Files Examined</span>
          </div>

          <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 text-center">
            <span className="text-2xl font-extrabold text-blue-700 font-mono block">
              {stats.moved}
            </span>
            <span className="text-xs font-medium text-blue-900 mt-0.5 block">
              {isDryRun ? 'Ready to Organize' : 'Organized in Folders'}
            </span>
          </div>

          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 text-center">
            <span className="text-2xl font-extrabold text-amber-800 font-mono block">
              {duplicateCount}
            </span>
            <span className="text-xs font-medium text-amber-900 mt-0.5 block">Duplicates Renamed</span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-center">
            <span className="text-2xl font-extrabold text-slate-700 font-mono block">
              {stats.skipped}
            </span>
            <span className="text-xs font-medium text-slate-500 mt-0.5 block">Protected & Skipped</span>
          </div>
        </div>

        {/* 5. Collapsible Activity Log Journal (#5 Feedback) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <button
            type="button"
            onClick={() => setShowLogDrawer(!showLogDrawer)}
            className="w-full bg-slate-50/80 hover:bg-slate-100/80 px-4 py-2.5 flex items-center justify-between border-b border-slate-200 text-xs font-bold text-slate-700 transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
          >
            <span className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-blue-600" />
              <span>Activity Log ({logs.length} events)</span>
            </span>
            <div className="flex items-center gap-1.5 text-slate-500">
              <span className="text-[11px] font-normal">{showLogDrawer ? 'Collapse' : 'Expand'}</span>
              {showLogDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {showLogDrawer && (
            <div
              ref={logContainerRef}
              className="p-3 bg-white max-h-48 overflow-y-auto space-y-2 text-xs font-mono text-slate-700"
              role="log"
              aria-live="polite"
            >
              {logs.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 py-0.5 border-b border-slate-50 last:border-0">
                  <span className="text-[10px] text-slate-400 shrink-0 font-sans mt-0.5">
                    {entry.timestamp}
                  </span>
                  <span
                    className={`shrink-0 px-1.5 py-0.2 text-[10px] font-semibold rounded ${
                      entry.level === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : entry.level === 'dry_run'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : entry.level === 'skipped'
                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {entry.level.toUpperCase()}
                  </span>
                  <span className="truncate flex-1 text-slate-800">{entry.humanStory || entry.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Accessible In-App Confirmation Dialog (#6 Error Prevention & #4 Accessibility) */}
      <ConfirmOrganizeModal
        isOpen={isConfirmModalOpen}
        folderPath={folderPathInput}
        fileCount={files.length}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={() => executeOrganize(false)}
      />
    </div>
  );
};
