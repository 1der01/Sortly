import React, { useState, useMemo } from 'react';
import { FileItem, OrganizationStats } from '../types';
import { downloadOrganizedZip } from '../utils/zipExport';
import { buildOrganizationReport, exportReportAsCsv, exportReportAsJson } from '../utils/reportExport';
import { getMaterialIconForFile } from '../utils/fileHelpers';

interface CompleteScreenProps {
  files: FileItem[];
  stats: OrganizationStats;
  onOrganizeAnother: () => void;
  onViewActivity: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  onToast: (msg: string) => void;
  folderName: string;
  activityList?: Array<{
    id: string;
    name: string;
    sub: string;
    state: 'done' | 'skipped' | 'current' | 'pending';
    icon: string;
  }>;
}

export const CompleteScreen: React.FC<CompleteScreenProps> = ({
  files,
  stats,
  onOrganizeAnother,
  onViewActivity,
  onUndo,
  canUndo,
  onToast,
  folderName,
  activityList,
}) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdownFilter, setBreakdownFilter] = useState<'all' | 'Moved' | 'Skipped' | 'Error'>('all');
  const [breakdownSearch, setBreakdownSearch] = useState('');

  // Generate structured report data
  const reportData = useMemo(() => {
    return buildOrganizationReport(files, stats, folderName, activityList);
  }, [files, stats, folderName, activityList]);

  // Count by category
  const categoryCounts: Record<string, number> = {};
  files.forEach((f) => {
    if (!f.isFolder && !f.isHidden && !f.isSystem) {
      const cat = f.category || 'Others';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  });

  const maxCount = Math.max(...Object.values(categoryCounts), 1);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Documents':
        return 'description';
      case 'Images':
        return 'image';
      case 'Videos':
        return 'movie';
      case 'Audio':
        return 'music_note';
      case 'Archives':
        return 'folder_zip';
      case 'Code':
        return 'code';
      default:
        return 'folder';
    }
  };

  const handleDownloadZip = async () => {
    try {
      await downloadOrganizedZip(files, `Sortly_${folderName.replace(/\s+/g, '_')}_Organized.zip`);
      onToast('Downloaded organized ZIP archive to your computer!');
    } catch {
      onToast('Failed to create ZIP export.');
    }
  };

  const handleExportCsv = () => {
    try {
      exportReportAsCsv(reportData);
      onToast('Exported organization results as CSV file!');
    } catch {
      onToast('Failed to generate CSV export.');
    }
  };

  const handleExportJson = () => {
    try {
      exportReportAsJson(reportData);
      onToast('Exported organization results as JSON file!');
    } catch {
      onToast('Failed to generate JSON export.');
    }
  };

  // Filter breakdown items
  const filteredBreakdownItems = useMemo(() => {
    const q = breakdownSearch.trim().toLowerCase();
    return reportData.results.filter((item) => {
      if (breakdownFilter !== 'all' && item.status !== breakdownFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.fileName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.destinationPath.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q)
      );
    });
  }, [reportData, breakdownFilter, breakdownSearch]);

  const movedCount = reportData.results.filter((r) => r.status === 'Moved').length;
  const skippedCount = reportData.results.filter((r) => r.status === 'Skipped').length;
  const errorCount = reportData.results.filter((r) => r.status === 'Error').length;

  return (
    <section className="screen" data-screen="complete" data-shown="true">
      <main className="main-scroll pad-lg" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="content-box">
          {/* Success Block */}
          <div className="success-block">
            <div className="success-icon">
              <span className="material-symbols-rounded fill">check_circle</span>
            </div>
            <h2 className="success-title">Organization complete</h2>
            <p className="success-sub">Your files have been organized successfully.</p>
          </div>

          {/* Stats Grid */}
          <div className="stats">
            <div className="stat center">
              <div className="v">{stats.scanned}</div>
              <div className="l">Files scanned</div>
            </div>
            <div className="stat center">
              <div className="v">{stats.moved}</div>
              <div className="l">Files moved</div>
            </div>
            <div className="stat center">
              <div className="v">{stats.skipped}</div>
              <div className="l">Skipped</div>
            </div>
            <div className="stat center">
              <div className="v">{stats.errors}</div>
              <div className="l">Error</div>
            </div>
          </div>

          {/* Category Breakdown Card */}
          <div className="md3-card">
            <div
              className="card-title"
              style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '.04em',
                color: 'var(--on-surface-variant)',
              }}
            >
              Category breakdown
            </div>

            {Object.keys(categoryCounts).length === 0 ? (
              <div style={{ padding: 'var(--s2) 0', color: 'var(--on-surface-variant)', fontSize: '13px' }}>
                All scanned items were subdirectories or hidden files preserved at root.
              </div>
            ) : (
              Object.entries(categoryCounts).map(([category, count]) => {
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <div className="cat-row" key={category}>
                    <div className="cat-icon">
                      <span className="material-symbols-rounded">{getCategoryIcon(category)}</span>
                    </div>
                    <div className="cat-name">{category}</div>
                    <div className="cat-bar-track">
                      <div className="cat-bar-fill" style={{ width: `${pct}%` }}></div>
                    </div>
                    <div className="cat-count">{count}</div>
                  </div>
                );
              })
            )}
          </div>

          {/* Export Results Report Card */}
          <div className="md3-card" id="export-results-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '20px' }}>
                  file_save
                </span>
                <span style={{ fontSize: '15px', fontWeight: 600 }}>Export Results Report</span>
              </div>
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
                {reportData.results.length} records
              </span>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--on-surface-variant)', margin: '0 0 var(--s3) 0', lineHeight: 1.4 }}>
              Download a comprehensive log of which files were moved, skipped, or had errors, including destination directories and collision resolutions.
            </p>

            {/* Export Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <button
                id="export-results-csv-btn"
                type="button"
                className="btn btn-tonal"
                style={{ height: '42px', justifyContent: 'center', fontSize: '13px' }}
                onClick={handleExportCsv}
                title="Download spreadsheet report as CSV"
              >
                <span className="material-symbols-rounded">table_chart</span>
                Export CSV
              </button>

              <button
                id="export-results-json-btn"
                type="button"
                className="btn btn-tonal"
                style={{ height: '42px', justifyContent: 'center', fontSize: '13px' }}
                onClick={handleExportJson}
                title="Download structured data report as JSON"
              >
                <span className="material-symbols-rounded">data_object</span>
                Export JSON
              </button>
            </div>

            {/* Interactive File Breakdown Toggle */}
            <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '10px' }}>
              <button
                id="toggle-breakdown-btn"
                type="button"
                className="btn-text"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 4px',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
                onClick={() => setShowBreakdown(!showBreakdown)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                    {showBreakdown ? 'expand_less' : 'expand_more'}
                  </span>
                  <span>{showBreakdown ? 'Hide file breakdown table' : 'Preview detailed breakdown'}</span>
                </span>
                <span style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                  {movedCount} moved • {skippedCount} skipped
                </span>
              </button>

              {/* Detailed Breakdown Panel */}
              {showBreakdown && (
                <div style={{ marginTop: '10px' }}>
                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <button
                      type="button"
                      className="filter-chip"
                      data-active={breakdownFilter === 'all' ? 'true' : 'false'}
                      onClick={() => setBreakdownFilter('all')}
                    >
                      All ({reportData.results.length})
                    </button>
                    <button
                      type="button"
                      className="filter-chip"
                      data-active={breakdownFilter === 'Moved' ? 'true' : 'false'}
                      onClick={() => setBreakdownFilter('Moved')}
                    >
                      Moved ({movedCount})
                    </button>
                    <button
                      type="button"
                      className="filter-chip"
                      data-active={breakdownFilter === 'Skipped' ? 'true' : 'false'}
                      onClick={() => setBreakdownFilter('Skipped')}
                    >
                      Skipped ({skippedCount})
                    </button>
                    {errorCount > 0 && (
                      <button
                        type="button"
                        className="filter-chip"
                        data-active={breakdownFilter === 'Error' ? 'true' : 'false'}
                        onClick={() => setBreakdownFilter('Error')}
                      >
                        Errors ({errorCount})
                      </button>
                    )}
                  </div>

                  {/* Filter Search Input if many items */}
                  {reportData.results.length > 5 && (
                    <div style={{ marginBottom: '10px' }}>
                      <input
                        type="text"
                        placeholder="Search breakdown by filename or path..."
                        value={breakdownSearch}
                        onChange={(e) => setBreakdownSearch(e.target.value)}
                        style={{
                          width: '100%',
                          height: '36px',
                          borderRadius: '8px',
                          border: '1px solid var(--outline-variant)',
                          background: 'var(--surface-container-high)',
                          padding: '0 12px',
                          fontSize: '12px',
                          color: 'var(--on-surface)',
                          outline: 'none',
                        }}
                      />
                    </div>
                  )}

                  {/* Results List */}
                  <div
                    style={{
                      maxHeight: '260px',
                      overflowY: 'auto',
                      borderRadius: '10px',
                      border: '1px solid var(--outline-variant)',
                      background: 'var(--surface-container-lowest)',
                    }}
                  >
                    {filteredBreakdownItems.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                        No files matching this filter.
                      </div>
                    ) : (
                      filteredBreakdownItems.map((item) => {
                        const fileMatch = files.find((f) => f.name === item.fileName);
                        return (
                          <div
                            key={item.id}
                            style={{
                              padding: '10px 12px',
                              borderBottom: '1px solid var(--outline-variant)',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '10px',
                            }}
                          >
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'var(--surface-container)',
                                color: 'var(--on-surface-variant)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                marginTop: '2px',
                              }}
                            >
                              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                                {fileMatch ? getMaterialIconForFile(fileMatch) : 'description'}
                              </span>
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 500,
                                  color: 'var(--on-surface)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={item.fileName}
                              >
                                {item.fileName}
                              </div>

                              <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '2px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span>{item.originalSize}</span>
                                <span>•</span>
                                <span style={{ fontFamily: 'monospace', color: item.status === 'Moved' ? 'var(--primary)' : 'var(--on-surface-variant)' }}>
                                  {item.destinationPath}
                                </span>
                              </div>

                              <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)', opacity: 0.85, marginTop: '2px' }}>
                                {item.details}
                              </div>
                            </div>

                            {/* Status Tag */}
                            <span className={`report-status-badge ${item.status.toLowerCase()}`}>
                              <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>
                                {item.status === 'Moved' ? 'check' : item.status === 'Skipped' ? 'block' : 'error'}
                              </span>
                              {item.status}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="actions-wrap">
            <button
              className="btn btn-filled full"
              onClick={handleDownloadZip}
              type="button"
              title="Download neat folders as a real ZIP archive"
            >
              <span className="material-symbols-rounded">folder_open</span>
              Download organized ZIP
            </button>

            <button
              className="btn btn-outline full"
              onClick={onOrganizeAnother}
              type="button"
            >
              <span className="material-symbols-rounded">refresh</span>
              Organize another folder
            </button>

            <div style={{ display: 'flex', gap: 'var(--s2)', alignItems: 'center' }}>
              <button className="btn btn-text" onClick={onViewActivity} type="button">
                View activity
              </button>
              {canUndo && onUndo && (
                <button
                  className="btn btn-text"
                  style={{ color: 'var(--error)' }}
                  onClick={onUndo}
                  type="button"
                >
                  <span className="material-symbols-rounded">undo</span>
                  Undo organization
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </section>
  );
};
