import React, { useState } from 'react';
import { 
  Folder, 
  File, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  Music, 
  Archive, 
  Code2, 
  HelpCircle, 
  Check, 
  Copy, 
  FolderMinus, 
  EyeOff, 
  ArrowRight,
  Columns,
  ListFilter,
  LayoutGrid,
  ShieldCheck,
  Info,
  ChevronDown,
  ChevronRight,
  Download,
  Search,
  X
} from 'lucide-react';
import { FileItem } from '../types';
import { CATEGORIES } from '../data/categoriesData';
import { FileDetailModal } from './FileDetailModal';
import { downloadOrganizedZip } from '../utils/zipExport';

interface FolderVisualizerProps {
  files: FileItem[];
  isOrganized: boolean;
  isDryRun: boolean;
  onUndoClick?: () => void;
  canUndo?: boolean;
  onToast?: (msg: string) => void;
}

export const FolderVisualizer: React.FC<FolderVisualizerProps> = ({
  files,
  isOrganized,
  isDryRun,
  onUndoClick,
  canUndo,
  onToast,
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'folders' | 'compare' | 'flat'>('folders');
  const [inspectedFile, setInspectedFile] = useState<FileItem | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const toggleFolderCollapse = (catName: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Documents':
        return <FileText className="w-4 h-4 text-blue-600 shrink-0" />;
      case 'Images':
        return <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />;
      case 'Videos':
        return <Video className="w-4 h-4 text-rose-600 shrink-0" />;
      case 'Audio':
        return <Music className="w-4 h-4 text-amber-600 shrink-0" />;
      case 'Archives':
        return <Archive className="w-4 h-4 text-emerald-600 shrink-0" />;
      case 'Code':
        return <Code2 className="w-4 h-4 text-cyan-600 shrink-0" />;
      default:
        return <File className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };

  // Group files by category
  const groupedFiles: Record<string, FileItem[]> = {};
  CATEGORIES.forEach((cat) => {
    groupedFiles[cat.name] = [];
  });
  groupedFiles['Skipped'] = [];

  files.forEach((file) => {
    if (file.isFolder || file.isHidden || file.isSystem) {
      groupedFiles['Skipped'].push(file);
    } else {
      const cat = file.category || 'Others';
      if (!groupedFiles[cat]) groupedFiles[cat] = [];
      groupedFiles[cat].push(file);
    }
  });

  const totalFilesToOrganize = files.filter((f) => !f.isFolder && !f.isHidden && !f.isSystem).length;
  const skippedCount = files.length - totalFilesToOrganize;

  const filteredFlatFiles = files.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategoryFilter === 'All' ||
      (selectedCategoryFilter === 'Skipped' && (f.isFolder || f.isHidden)) ||
      f.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleExportZip = async () => {
    try {
      await downloadOrganizedZip(files);
      if (onToast) onToast('Downloaded organized files as ZIP!');
    } catch {
      if (onToast) onToast('Could not generate ZIP.');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 flex flex-col h-full overflow-hidden transition-all">
      {/* Visualizer Header */}
      <div className="bg-white border-b border-slate-200/80 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                  <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2a2 2 0 0 1 1.4.6L11.5 7H18.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z" />
                  <path d="M12 11v5" />
                  <path d="m10 14 2 2 2-2" />
                </svg>
              </span>
              Directory Structure
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 ${
                isOrganized
                  ? isDryRun
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {isOrganized
                ? isDryRun
                  ? 'Preview Mode'
                  : 'Organized'
                : 'Unorganized'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isOrganized
              ? `${totalFilesToOrganize} files organized into category folders.`
              : `${totalFilesToOrganize} unorganized files in root directory.`}
          </p>
        </div>

        {/* View Mode Controls & Search (#2 Consistency & #7 Affordance) */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200" role="tablist">
            <button
              onClick={() => setViewMode('folders')}
              role="tab"
              aria-selected={viewMode === 'folders'}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                viewMode === 'folders'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Folders</span>
            </button>
            <button
              onClick={() => setViewMode('compare')}
              role="tab"
              aria-selected={viewMode === 'compare'}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                viewMode === 'compare'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Before & After</span>
            </button>
            <button
              onClick={() => setViewMode('flat')}
              role="tab"
              aria-selected={viewMode === 'flat'}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                viewMode === 'flat'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>All Files</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Filter files by name"
              className="pl-8 pr-7 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 w-36 sm:w-44"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Pills (#7 Affordance & #4 Accessibility) */}
      <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
        <button
          onClick={() => setSelectedCategoryFilter('All')}
          className={`px-3 py-1 rounded-full font-semibold transition whitespace-nowrap focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
            selectedCategoryFilter === 'All'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All Items ({files.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = groupedFiles[cat.name]?.length || 0;
          return (
            <button
              key={cat.name}
              onClick={() => setSelectedCategoryFilter(cat.name)}
              className={`px-3 py-1 rounded-full font-semibold transition flex items-center gap-1.5 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                selectedCategoryFilter === cat.name
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
              <span>{cat.name}</span>
              <span className="text-[11px] opacity-75 font-mono">({count})</span>
            </button>
          );
        })}
        <button
          onClick={() => setSelectedCategoryFilter('Skipped')}
          className={`px-3 py-1 rounded-full font-semibold transition flex items-center gap-1.5 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
            selectedCategoryFilter === 'Skipped'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span>Skipped</span>
          <span className="text-[11px] opacity-75 font-mono">({skippedCount})</span>
        </button>
      </div>

      {/* Main Visualizer Body */}
      <div className="p-5 flex-1 overflow-y-auto space-y-4">
        {/* VIEW 1: BEFORE & AFTER SPLIT COMPARISON (#5 Feedback) */}
        {viewMode === 'compare' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            {/* Left: Before (Cluttered Root) */}
            <div className="border border-rose-200 rounded-xl bg-rose-50/20 p-4 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-rose-200/80">
                <span className="text-xs font-bold text-rose-900 flex items-center gap-2">
                  <FolderMinus className="w-4 h-4 text-rose-600" />
                  Before: Cluttered Root Directory
                </span>
                <span className="text-xs bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-semibold">
                  {files.length} mixed items
                </span>
              </div>
              <div className="overflow-y-auto space-y-2 flex-1 pr-1 max-h-[440px]">
                {files.map((file) => (
                  <div
                    key={`compare-before-${file.id}`}
                    onClick={() => setInspectedFile(file)}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-rose-300 transition text-xs flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {getCategoryIcon(file.category)}
                      <span className="truncate text-slate-800 font-mono">{file.name}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono shrink-0 ml-2">{file.size}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: After (Organized Folders) */}
            <div className="border border-emerald-200 rounded-xl bg-emerald-50/20 p-4 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-200/80">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  After: Organized Folders
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">
                  Zero Overwrites
                </span>
              </div>
              <div className="overflow-y-auto space-y-3 flex-1 pr-1 max-h-[440px]">
                {CATEGORIES.map((cat) => {
                  const catFiles = groupedFiles[cat.name] || [];
                  if (catFiles.length === 0) return null;
                  return (
                    <div key={`compare-cat-${cat.name}`} className="bg-white rounded-xl border border-slate-200 overflow-hidden text-xs">
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-amber-500" />
                          <span>{cat.name}/</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">{catFiles.length} files</span>
                      </div>
                      <div className="divide-y divide-slate-100 px-3">
                        {catFiles.map((file) => (
                          <div
                            key={`compare-after-${file.id}`}
                            onClick={() => setInspectedFile(file)}
                            className="py-2 flex items-center justify-between hover:text-blue-600 cursor-pointer"
                          >
                            <span className="truncate text-slate-700 font-mono">{file.resolvedName || file.name}</span>
                            <span className="text-xs text-slate-400 font-mono ml-2 shrink-0">{file.size}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: ORGANIZED FOLDERS TREE (#7 Affordance & #4 Accessibility) */}
        {viewMode === 'folders' && (
          <div className="space-y-3.5">
            {CATEGORIES.map((cat) => {
              const catFiles = groupedFiles[cat.name] || [];
              if (selectedCategoryFilter !== 'All' && selectedCategoryFilter !== cat.name) return null;
              if (catFiles.length === 0 && selectedCategoryFilter === 'All') return null;

              const isCollapsed = !!collapsedFolders[cat.name];

              return (
                <div
                  key={cat.name}
                  className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white"
                >
                  <button
                    type="button"
                    onClick={() => toggleFolderCollapse(cat.name)}
                    aria-expanded={!isCollapsed}
                    className="w-full bg-slate-50/90 hover:bg-slate-100/90 px-4 py-3 flex items-center justify-between border-b border-slate-200 text-left transition focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                  >
                    <div className="flex items-center gap-3">
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                      <div className="p-1.5 rounded-lg bg-white shadow-2xs border border-slate-200/80">
                        <Folder className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{cat.name}/</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            {catFiles.length} {catFiles.length === 1 ? 'file' : 'files'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{cat.description}</p>
                      </div>
                    </div>

                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-500 hidden sm:inline">
                      {cat.extensions.slice(0, 4).join(', ')}
                    </span>
                  </button>

                  {!isCollapsed && (
                    catFiles.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No files currently classified into this folder.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {catFiles.map((file) => (
                          <div
                            key={file.id}
                            onClick={() => setInspectedFile(file)}
                            className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition text-xs cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 truncate">
                              {getCategoryIcon(cat.name)}
                              <span className="font-mono text-slate-800 group-hover:text-blue-600 transition truncate">
                                {file.resolvedName || file.name}
                              </span>
                              {file.isDuplicate && (
                                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                                  Duplicate Renamed (1)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0 ml-3">
                              <span className="hidden md:inline text-slate-400">{file.dateModified}</span>
                              <span className="font-mono text-slate-700 font-medium">{file.size}</span>
                              <Info className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              );
            })}

            {/* Skipped Items Group */}
            {(selectedCategoryFilter === 'All' || selectedCategoryFilter === 'Skipped') &&
              groupedFiles['Skipped'].length > 0 && (
                <div className="border border-amber-200 rounded-xl overflow-hidden bg-amber-50/30">
                  <div className="bg-amber-50 px-4 py-3 flex items-center justify-between border-b border-amber-200">
                    <div className="flex items-center gap-2.5">
                      <FolderMinus className="w-4 h-4 text-amber-700" />
                      <div>
                        <span className="text-xs font-bold text-amber-900">
                          Preserved Items (Untouched Root Files & Subdirectories)
                        </span>
                        <p className="text-xs text-amber-800 mt-0.5">
                          Safety guarantee: Existing subfolders and hidden system files are kept safe at root.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                      {groupedFiles['Skipped'].length} items
                    </span>
                  </div>

                  <div className="divide-y divide-amber-100 bg-white">
                    {groupedFiles['Skipped'].map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setInspectedFile(item)}
                        className="px-4 py-3 flex items-center justify-between hover:bg-amber-50/40 transition text-xs cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 truncate">
                          {item.isFolder ? (
                            <Folder className="w-4 h-4 text-slate-400" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="font-mono text-slate-700 group-hover:text-amber-900 truncate">
                            {item.name}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {item.isFolder ? 'Subdirectory' : 'Hidden / System'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">Kept Untouched</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* VIEW 3: ALL FILES LIST */}
        {viewMode === 'flat' && (
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
            {filteredFlatFiles.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No matching files found.
              </div>
            ) : (
              filteredFlatFiles.map((file) => {
                const isSkipped = file.isFolder || file.isHidden || file.isSystem;
                return (
                  <div
                    key={file.id}
                    onClick={() => setInspectedFile(file)}
                    className={`px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition text-xs cursor-pointer group ${
                      isSkipped ? 'bg-slate-50/40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      {isSkipped ? (
                        file.isFolder ? (
                          <Folder className="w-4 h-4 text-slate-400" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-slate-400" />
                        )
                      ) : (
                        getCategoryIcon(file.category)
                      )}
                      <span className="font-mono text-slate-800 group-hover:text-blue-600 truncate">
                        {file.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 ml-3">
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {isSkipped ? 'Protected' : file.category}
                      </span>
                      <span className="font-mono text-xs text-slate-600">{file.size}</span>
                      <Info className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Inspect Modal (#5 Feedback & #4 Accessibility) */}
      <FileDetailModal
        file={inspectedFile}
        onClose={() => setInspectedFile(null)}
        isOrganized={isOrganized}
      />
    </div>
  );
};
