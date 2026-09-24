import React, { useState, useEffect, useRef } from 'react';
import { FileItem, OrganizationStats } from './types';
import { SAMPLE_PRESETS } from './data/samplePresets';
import { determineCategory } from './data/categoriesData';
import { createFileItemFromNativeFile, getMaterialIconForFile } from './utils/fileHelpers';
import { DashboardScreen } from './components/DashboardScreen';
import { PreviewScreen } from './components/PreviewScreen';
import { ProgressScreen } from './components/ProgressScreen';
import { CompleteScreen } from './components/CompleteScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { BrowseFolderModal } from './components/BrowseFolderModal';
import { CategoryReferenceModal } from './components/CategoryReferenceModal';
import { RunGuideModal } from './components/RunGuideModal';

export type ScreenId = 'dashboard' | 'preview' | 'progress' | 'complete' | 'settings';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('dashboard');
  const [selectedPreset, setSelectedPreset] = useState(SAMPLE_PRESETS[0]);
  const [currentFiles, setCurrentFiles] = useState<FileItem[]>(SAMPLE_PRESETS[0].files);
  const [previousSnapshot, setPreviousSnapshot] = useState<FileItem[] | null>(null);

  // Settings state
  const [isDryRun, setIsDryRun] = useState(true);
  const [includeSubfolders, setIncludeSubfolders] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(true);
  const [duplicateBehavior, setDuplicateBehavior] = useState<'rename' | 'skip'>('rename');
  const [unknownBehavior, setUnknownBehavior] = useState<'others' | 'leave'>('others');
  const [skipHidden, setSkipHidden] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');

  // Stats
  const [stats, setStats] = useState<OrganizationStats>({
    scanned: 214,
    moved: 198,
    skipped: 14,
    errors: 2,
  });

  // Recent activity for dashboard
  const [recentActivity, setRecentActivity] = useState<
    Array<{
      id: string;
      name: string;
      category: string;
      timeAgo: string;
      status: 'done' | 'skip' | 'err';
      fileItem?: FileItem;
    }>
  >([
    {
      id: 'act-1',
      name: 'Quarterly_Report_Q3.pdf',
      category: 'Documents',
      timeAgo: '2 min ago',
      status: 'done',
    },
    {
      id: 'act-2',
      name: 'Screenshot_2026-09-21.png',
      category: 'Images',
      timeAgo: '4 min ago',
      status: 'done',
    },
    {
      id: 'act-3',
      name: 'project_backup.zip',
      category: 'Skipped — hidden file',
      timeAgo: '6 min ago',
      status: 'skip',
    },
    {
      id: 'act-4',
      name: 'notes.yaml',
      category: 'Others — permission denied',
      timeAgo: '9 min ago',
      status: 'err',
    },
    {
      id: 'act-5',
      name: 'expenses_2026.csv',
      category: 'Documents',
      timeAgo: '11 min ago',
      status: 'done',
    },
  ]);

  // Organization progress state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentProcessingFile, setCurrentProcessingFile] = useState<FileItem | null>(null);
  const [targetCategory, setTargetCategory] = useState('');
  const [activityList, setActivityList] = useState<
    Array<{
      id: string;
      name: string;
      sub: string;
      state: 'done' | 'skipped' | 'current' | 'pending';
      icon: string;
    }>
  >([]);

  // Modals
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active pulsing shortcut indicator state
  const [pulsingShortcut, setPulsingShortcut] = useState<'ctrl-o' | 'ctrl-enter' | 'esc' | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Platform detection for OS-specific keyboard modifier (macOS vs Windows/Linux)
  const [isMac, setIsMac] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const platform =
        (navigator as any)?.userAgentData?.platform ||
        navigator.platform ||
        navigator.userAgent ||
        '';
      return /mac|iphone|ipad|ipod/i.test(platform);
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      const platform =
        (navigator as any)?.userAgentData?.platform ||
        navigator.platform ||
        navigator.userAgent ||
        '';
      setIsMac(/mac|iphone|ipad|ipod/i.test(platform));
    }
  }, []);

  const modifierKeyName = isMac ? 'Command' : 'Ctrl';
  const modifierSymbol = isMac ? '⌘' : 'Ctrl';

  const triggerShortcutPulse = (shortcut: 'ctrl-o' | 'ctrl-enter' | 'esc') => {
    if (pulseTimeoutRef.current) {
      clearTimeout(pulseTimeoutRef.current);
    }
    setPulsingShortcut(null);
    requestAnimationFrame(() => {
      setPulsingShortcut(shortcut);
      pulseTimeoutRef.current = setTimeout(() => {
        setPulsingShortcut(null);
      }, 700);
    });
  };

  // Ref to cancel ongoing loop if needed
  const isLoopRunningRef = useRef(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Sync theme
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else if (theme === 'light') {
      document.body.classList.remove('dark');
    } else {
      // System
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.body.classList.add('dark');
      } else {
        document.body.classList.remove('dark');
      }
    }
  }, [theme]);

  // Handle Preset selection
  const handleSelectPreset = (presetId: string, folderPath: string, files: FileItem[]) => {
    const found = SAMPLE_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setSelectedPreset(found);
      setCurrentFiles(found.files);
    } else {
      setSelectedPreset({
        id: 'custom',
        name: 'Custom Directory',
        folderPath,
        description: 'User specified directory path.',
        files,
      });
      setCurrentFiles(files);
    }
    setPreviousSnapshot(null);
    showToast(`Loaded ${files.length} files from ${folderPath}`);
  };

  // Handle Real Files dropped or uploaded
  const handleFilesDropped = (nativeFiles: File[]) => {
    const items = nativeFiles.map((f, i) => createFileItemFromNativeFile(f, i));
    const label = nativeFiles.length === 1 ? nativeFiles[0].name : `Uploaded Files (${nativeFiles.length})`;
    setSelectedPreset({
      id: 'uploaded',
      name: label,
      folderPath: `/Users/jj/Downloads/${label}`,
      description: 'Real files uploaded from your device.',
      files: items,
    });
    setCurrentFiles(items);
    setPreviousSnapshot(null);
    showToast(`Loaded ${items.length} real files. Ready to organize.`);
  };

  // Handle entire OS folder dropped or selected
  const handleFolderDropped = (folderName: string, items: FileItem[]) => {
    const formattedPath =
      folderName.startsWith('/') || folderName.startsWith('~')
        ? folderName
        : `~/Desktop/${folderName}`;

    setSelectedPreset({
      id: `dropped-${Date.now()}`,
      name: folderName,
      folderPath: formattedPath,
      description: `Folder dropped from OS (${items.length} items detected).`,
      files: items,
    });
    setCurrentFiles(items);
    setPreviousSnapshot(null);
    showToast(`Loaded ${items.length} files from folder "${folderName}". Ready to organize.`);
  };

  // Handle Batch Renaming of files before organization
  const handleBatchRenameFiles = (updatedFiles: FileItem[], renameCount: number) => {
    setCurrentFiles(updatedFiles);
    setSelectedPreset((prev) => ({
      ...prev,
      files: updatedFiles,
    }));
    showToast(`Renamed ${renameCount} file${renameCount === 1 ? '' : 's'} successfully.`);
  };

  // Handle Batch Categorization of files
  const handleBatchCategorizeFiles = (updatedFiles: FileItem[], count: number, targetCategory: string) => {
    setCurrentFiles(updatedFiles);
    setSelectedPreset((prev) => ({
      ...prev,
      files: updatedFiles,
    }));
    showToast(`Updated category to "${targetCategory}" for ${count} file${count === 1 ? '' : 's'}.`);
  };

  // Start Organization Workflow
  const handleDashboardOrganizeClick = () => {
    if (isDryRun) {
      setActiveScreen('preview');
    } else {
      startLiveOrganization();
    }
  };

  const startLiveOrganization = () => {
    setPreviousSnapshot([...currentFiles]);
    setActiveScreen('progress');

    // Initialize activity items
    const initialActivities = currentFiles.map((f, idx) => ({
      id: f.id,
      name: f.name,
      sub: idx === 0 ? 'Starting...' : 'Waiting',
      state: 'pending' as const,
      icon: getMaterialIconForFile(f),
    }));

    setActivityList(initialActivities);
    setCurrentIndex(0);
    isLoopRunningRef.current = true;

    runOrganizationLoop(currentFiles);
  };

  const runOrganizationLoop = async (filesToProcess: FileItem[]) => {
    let scanned = 0;
    let moved = 0;
    let skipped = 0;
    let errors = 0;

    const existingNamesByCategory: Record<string, Set<string>> = {
      Documents: new Set(),
      Images: new Set(),
      Videos: new Set(),
      Audio: new Set(),
      Archives: new Set(),
      Code: new Set(),
      Others: new Set(),
    };

    const updatedFiles: FileItem[] = [];
    const newRecentActivity = [...recentActivity];

    for (let i = 0; i < filesToProcess.length; i++) {
      if (!isLoopRunningRef.current) break;

      const item = filesToProcess[i];
      scanned += 1;
      setCurrentIndex(i + 1);
      setCurrentProcessingFile(item);

      // Check if folder or hidden
      if (item.isFolder || (skipHidden && (item.isHidden || item.isSystem))) {
        skipped += 1;
        setStats({ scanned, moved, skipped, errors });
        setTargetCategory('Preserved');

        setActivityList((prev) =>
          prev.map((act, idx) =>
            idx === i
              ? {
                  ...act,
                  state: 'skipped',
                  sub: item.isFolder ? 'Skipped — folder' : 'Skipped — hidden/system file',
                  icon: 'block',
                }
              : idx === i + 1
              ? { ...act, state: 'current', sub: 'In progress' }
              : act
          )
        );

        updatedFiles.push(item);
        await new Promise((r) => setTimeout(r, 60));
        continue;
      }

      // Determine category
      const category = determineCategory(item.name);
      setTargetCategory(category);

      let finalName = item.name;
      let isDuplicate = false;
      const catSet = existingNamesByCategory[category] || new Set();

      if (catSet.has(finalName)) {
        isDuplicate = true;
        if (duplicateBehavior === 'rename') {
          const dotIdx = item.name.lastIndexOf('.');
          const stem = dotIdx !== -1 ? item.name.substring(0, dotIdx) : item.name;
          const ext = dotIdx !== -1 ? item.name.substring(dotIdx) : '';
          let counter = 1;
          while (catSet.has(`${stem} (${counter})${ext}`)) {
            counter += 1;
          }
          finalName = `${stem} (${counter})${ext}`;
        } else {
          // Skip duplicate
          skipped += 1;
          setStats({ scanned, moved, skipped, errors });
          setActivityList((prev) =>
            prev.map((act, idx) =>
              idx === i
                ? { ...act, state: 'skipped', sub: 'Skipped — duplicate', icon: 'block' }
                : idx === i + 1
                ? { ...act, state: 'current', sub: 'In progress' }
                : act
            )
          );
          updatedFiles.push(item);
          await new Promise((r) => setTimeout(r, 60));
          continue;
        }
      }

      catSet.add(finalName);
      existingNamesByCategory[category] = catSet;

      moved += 1;
      setStats({ scanned, moved, skipped, errors });

      setActivityList((prev) =>
        prev.map((act, idx) =>
          idx === i
            ? {
                ...act,
                state: 'done',
                sub: isDuplicate ? `Moved to ${category} (renamed)` : `Moved to ${category}`,
                icon: 'check',
              }
            : idx === i + 1
            ? { ...act, state: 'current', sub: 'In progress' }
            : act
        )
      );

      updatedFiles.push({
        ...item,
        category,
        resolvedName: finalName,
        isDuplicate,
      });

      // Update recent activity with real items
      if (i < 4) {
        newRecentActivity.unshift({
          id: `new-act-${Date.now()}-${i}`,
          name: finalName,
          category,
          timeAgo: 'Just now',
          status: 'done',
          fileItem: item,
        });
      }

      await new Promise((r) => setTimeout(r, 70));
    }

    setRecentActivity(newRecentActivity.slice(0, 8));
    setCurrentFiles(updatedFiles);
    setCurrentProcessingFile(null);
    setTargetCategory('');
    isLoopRunningRef.current = false;

    // Transition to complete screen
    setActiveScreen('complete');
  };

  const handleSkipToComplete = () => {
    isLoopRunningRef.current = false;

    // Fast finish all remaining items
    let moved = 0;
    let skipped = 0;
    const updatedFiles: FileItem[] = currentFiles.map((item) => {
      if (item.isFolder || (skipHidden && (item.isHidden || item.isSystem))) {
        skipped += 1;
        return item;
      }
      const cat = determineCategory(item.name);
      moved += 1;
      return {
        ...item,
        category: cat,
        resolvedName: item.name,
      };
    });

    setCurrentFiles(updatedFiles);
    setStats({
      scanned: currentFiles.length,
      moved,
      skipped,
      errors: 0,
    });
    setActiveScreen('complete');
  };

  const handleUndo = () => {
    if (previousSnapshot) {
      setCurrentFiles([...previousSnapshot]);
      setPreviousSnapshot(null);
      showToast('Restored files to original location.');
      setActiveScreen('dashboard');
    }
  };

  // Global Keyboard Shortcuts (Ctrl+O: folder picker, Ctrl+Enter: start organize, Esc: close modals)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Esc: close active modals or return from preview/settings
      if (e.key === 'Escape') {
        triggerShortcutPulse('esc');
        if (isBrowseModalOpen || isCategoryModalOpen || isGuideModalOpen) {
          e.preventDefault();
          setIsBrowseModalOpen(false);
          setIsCategoryModalOpen(false);
          setIsGuideModalOpen(false);
          showToast('Closed active modal (Esc)');
          return;
        }

        if (activeScreen === 'preview' || activeScreen === 'settings') {
          e.preventDefault();
          setActiveScreen('dashboard');
          return;
        }
      }

      // 2. Ctrl+O / Cmd+O: Open folder picker
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        triggerShortcutPulse('ctrl-o');
        setIsCategoryModalOpen(false);
        setIsGuideModalOpen(false);
        setIsBrowseModalOpen(true);
        showToast('Opened folder picker (Ctrl+O)');
        return;
      }

      // 3. Ctrl+Enter / Cmd+Enter: Start organization
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        triggerShortcutPulse('ctrl-enter');
        if (isBrowseModalOpen || isCategoryModalOpen || isGuideModalOpen) {
          setIsBrowseModalOpen(false);
          setIsCategoryModalOpen(false);
          setIsGuideModalOpen(false);
        }

        if (activeScreen === 'dashboard') {
          handleDashboardOrganizeClick();
        } else if (activeScreen === 'preview') {
          startLiveOrganization();
        } else if (activeScreen === 'complete') {
          setActiveScreen('dashboard');
        }
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    activeScreen,
    isBrowseModalOpen,
    isCategoryModalOpen,
    isGuideModalOpen,
    isDryRun,
    currentFiles,
  ]);

  return (
    <div className="flex flex-col items-center w-full min-h-screen">
      {/* Gentle Floating Notification Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-[#171D1D] text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 border border-[#3F4948] animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <span className="material-symbols-rounded fill" style={{ color: 'var(--primary-container)' }}>
            check_circle
          </span>
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Main Production Application Shell */}
      <div className="window">
        {activeScreen === 'dashboard' && (
          <DashboardScreen
            folderPath={selectedPreset.folderPath}
            files={currentFiles}
            isDryRun={isDryRun}
            onToggleDryRun={setIsDryRun}
            includeSubfolders={includeSubfolders}
            onToggleIncludeSubfolders={setIncludeSubfolders}
            onChooseFolder={() => setIsBrowseModalOpen(true)}
            onOrganizeClick={handleDashboardOrganizeClick}
            onGoTo={setActiveScreen}
            stats={stats}
            recentActivity={recentActivity}
            onFilesDropped={handleFilesDropped}
            onFolderDropped={handleFolderDropped}
            onBatchRenameFiles={handleBatchRenameFiles}
            onBatchCategorizeFiles={handleBatchCategorizeFiles}
          />
        )}

        {activeScreen === 'preview' && (
          <PreviewScreen
            files={currentFiles}
            onBack={() => setActiveScreen('dashboard')}
            onConfirmOrganize={startLiveOrganization}
          />
        )}

        {activeScreen === 'progress' && (
          <ProgressScreen
            files={currentFiles}
            currentIndex={currentIndex}
            currentFile={currentProcessingFile}
            targetCategory={targetCategory}
            stats={stats}
            activityList={activityList}
            onSkipToComplete={handleSkipToComplete}
          />
        )}

        {activeScreen === 'complete' && (
          <CompleteScreen
            files={currentFiles}
            stats={stats}
            onOrganizeAnother={() => setActiveScreen('dashboard')}
            onViewActivity={() => setActiveScreen('progress')}
            onUndo={handleUndo}
            canUndo={!!previousSnapshot}
            onToast={showToast}
            folderName={selectedPreset.name}
            activityList={activityList}
          />
        )}

        {activeScreen === 'settings' && (
          <SettingsScreen
            onBack={() => setActiveScreen('dashboard')}
            defaultBehavior={isDryRun ? 'preview' : 'immediate'}
            onSetDefaultBehavior={(val) => setIsDryRun(val === 'preview')}
            includeSubfolders={includeSubfolders}
            onToggleIncludeSubfolders={setIncludeSubfolders}
            showConfirmation={showConfirmation}
            onToggleShowConfirmation={setShowConfirmation}
            duplicateBehavior={duplicateBehavior}
            onSetDuplicateBehavior={setDuplicateBehavior}
            unknownBehavior={unknownBehavior}
            onSetUnknownBehavior={setUnknownBehavior}
            skipHidden={skipHidden}
            onToggleSkipHidden={setSkipHidden}
            theme={theme}
            onSetTheme={setTheme}
            density={density}
            onSetDensity={setDensity}
            onOpenCategoryRules={() => setIsCategoryModalOpen(true)}
            onOpenSetupGuide={() => setIsGuideModalOpen(true)}
          />
        )}
      </div>

      {/* Global Keyboard Shortcuts Hint Bar */}
      <footer
        id="global-keyboard-shortcuts-bar"
        style={{
          marginTop: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '11px',
          color: 'var(--on-surface-variant)',
          background: 'var(--surface-container)',
          padding: '6px 14px',
          borderRadius: '100px',
          border: '1px solid var(--outline-variant)',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--on-surface)' }}>
          <span className="material-symbols-rounded" style={{ fontSize: '15px', color: 'var(--primary)' }}>
            keyboard
          </span>
          <span>Shortcuts:</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <kbd
            id="shortcut-kbd-ctrl-o"
            tabIndex={0}
            role="button"
            className={`kbd-shortcut ${pulsingShortcut === 'ctrl-o' ? 'kbd-pulsing' : ''}`}
            data-pulsing={pulsingShortcut === 'ctrl-o'}
            data-tooltip={`Open directory selector (${modifierKeyName}+O)`}
            title={`Open directory selector (${modifierKeyName}+O)`}
            aria-label={`${modifierKeyName}+O: Open directory selector`}
            onClick={() => {
              triggerShortcutPulse('ctrl-o');
              setIsBrowseModalOpen(true);
            }}
          >
            {isMac ? '⌘+O' : 'Ctrl+O'}
          </kbd>
          <span className="shortcut-os-legend" title={`Modifier key on ${isMac ? 'macOS' : 'Windows/Linux'}`}>
            {modifierKeyName}
          </span>
          <span>Folder Picker</span>
        </span>
        <span style={{ color: 'var(--outline-variant)' }}>•</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <kbd
            id="shortcut-kbd-ctrl-enter"
            tabIndex={0}
            role="button"
            className={`kbd-shortcut ${pulsingShortcut === 'ctrl-enter' ? 'kbd-pulsing' : ''}`}
            data-pulsing={pulsingShortcut === 'ctrl-enter'}
            data-tooltip={`Start organization workflow (${modifierKeyName}+Enter)`}
            title={`Start organization workflow (${modifierKeyName}+Enter)`}
            aria-label={`${modifierKeyName}+Enter: Start organization workflow`}
            onClick={() => {
              triggerShortcutPulse('ctrl-enter');
              if (activeScreen === 'dashboard') {
                handleDashboardOrganizeClick();
              } else if (activeScreen === 'preview') {
                startLiveOrganization();
              }
            }}
          >
            {isMac ? '⌘+↵' : 'Ctrl+↵'}
          </kbd>
          <span className="shortcut-os-legend" title={`Modifier key on ${isMac ? 'macOS' : 'Windows/Linux'}`}>
            {modifierKeyName}
          </span>
          <span>Organize Files</span>
        </span>
        <span style={{ color: 'var(--outline-variant)' }}>•</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <kbd
            id="shortcut-kbd-esc"
            tabIndex={0}
            role="button"
            className={`kbd-shortcut ${pulsingShortcut === 'esc' ? 'kbd-pulsing' : ''}`}
            data-pulsing={pulsingShortcut === 'esc'}
            data-tooltip="Close active modals or return to dashboard (Esc)"
            title="Close active modals or return to dashboard (Esc)"
            aria-label="Esc: Close active modals or return to dashboard"
            onClick={() => {
              triggerShortcutPulse('esc');
              if (isBrowseModalOpen || isCategoryModalOpen || isGuideModalOpen) {
                setIsBrowseModalOpen(false);
                setIsCategoryModalOpen(false);
                setIsGuideModalOpen(false);
              } else if (activeScreen === 'preview' || activeScreen === 'settings') {
                setActiveScreen('dashboard');
              }
            }}
          >
            Esc
          </kbd>
          <span className="shortcut-os-legend" title="Escape key">
            Escape
          </span>
          <span>Close Modals</span>
        </span>
      </footer>

      {/* Modals */}
      <BrowseFolderModal
        isOpen={isBrowseModalOpen}
        onClose={() => setIsBrowseModalOpen(false)}
        onSelectPreset={handleSelectPreset}
        currentPath={selectedPreset.folderPath}
        onFilesAdded={(newItems, name) => {
          setSelectedPreset({
            id: 'uploaded',
            name,
            folderPath: `/Users/jj/Downloads/${name}`,
            description: 'Uploaded directory.',
            files: newItems,
          });
          setCurrentFiles(newItems);
          setPreviousSnapshot(null);
        }}
      />

      <CategoryReferenceModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      <RunGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </div>
  );
}
