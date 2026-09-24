import React, { useState, useMemo } from 'react';
import { FileItem, OrganizationStats } from '../types';

interface ActivityItem {
  id: string;
  name: string;
  sub: string;
  state: 'done' | 'skipped' | 'current' | 'pending';
  icon: string;
}

interface ProgressScreenProps {
  files: FileItem[];
  currentIndex: number;
  currentFile: FileItem | null;
  targetCategory: string;
  stats: OrganizationStats;
  activityList: ActivityItem[];
  onSkipToComplete: () => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  files,
  currentIndex,
  currentFile,
  targetCategory,
  stats,
  activityList,
  onSkipToComplete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'done' | 'current' | 'pending' | 'skipped'>('all');

  const total = Math.max(files.length, 1);
  const processed = Math.min(currentIndex, total);
  const pct = Math.round((processed / total) * 100);

  // Circumference of r=48 circle is 2 * PI * 48 = 301.59
  const circumference = 301.6;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  // Compute status counts for filter chips
  const statusCounts = useMemo(() => {
    let done = 0;
    let current = 0;
    let pending = 0;
    let skipped = 0;

    activityList.forEach((item) => {
      if (item.state === 'done') done++;
      else if (item.state === 'current') current++;
      else if (item.state === 'skipped') skipped++;
      else if (item.state === 'pending') pending++;
    });

    return { all: activityList.length, done, current, pending, skipped };
  }, [activityList]);

  // Filter activities based on search query and status filter
  const filteredActivities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const cleanExt = query.startsWith('.') ? query.slice(1) : query;

    return activityList.filter((item) => {
      if (statusFilter !== 'all' && item.state !== statusFilter) {
        return false;
      }

      if (!query) return true;

      const nameMatch = item.name.toLowerCase().includes(query);
      const subMatch = item.sub.toLowerCase().includes(query);
      const stateMatch = item.state.toLowerCase().includes(query);
      const extMatch =
        item.name.includes('.') &&
        item.name.split('.').pop()?.toLowerCase().includes(cleanExt);

      return nameMatch || subMatch || stateMatch || extMatch;
    });
  }, [activityList, searchQuery, statusFilter]);

  return (
    <section className="screen" data-screen="progress" data-shown="true">
      {/* Tall App Bar */}
      <header className="appbar tall">
        <div className="title lg">Organizing files</div>
        <div className="sub-line">Sortly is organizing your selected folder.</div>
      </header>

      {/* Main Scroll */}
      <main className="main-scroll">
        {/* Progress Card */}
        <section className="progress-card">
          <div className="ring-wrap">
            <svg width="112" height="112" viewBox="0 0 112 112">
              <circle className="ring-track" cx="56" cy="56" r="48" />
              <circle
                className="ring-progress"
                cx="56"
                cy="56"
                r="48"
                style={{ strokeDashoffset }}
              />
            </svg>
            <div className="ring-center">
              <span className="pct">{pct}%</span>
              <span className="lbl">complete</span>
            </div>
          </div>

          <div className="progress-body">
            <div className="progress-count">
              {processed} of {files.length} files organized
            </div>
            <div className="linear-track">
              <div className="linear-fill" style={{ width: `${pct}%` }}></div>
            </div>
            <div className="current-file">
              <div className="spinner"></div>
              <div className="current-file-text">
                <div className="name">{currentFile ? currentFile.name : 'Completing...'}</div>
                <div className="dest">
                  <span className="material-symbols-rounded">arrow_forward</span>
                  {targetCategory ? `Moving to ${targetCategory}` : 'Analyzing items...'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
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

        {/* Live Activity Section Header & Search */}
        <div style={{ marginTop: 'var(--s3)' }}>
          <div className="section-head" style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--primary)', fontSize: '20px' }}>
                sync_alt
              </span>
              <h3 style={{ margin: 0, fontSize: '15px' }}>Activity & File Status</h3>
            </div>
            <span className="count">
              {processed} of {files.length} processed
            </span>
          </div>

          {/* Search Input */}
          <div className="dashboard-search" style={{ marginBottom: '8px' }}>
            <span className="material-symbols-rounded dashboard-search-icon">search</span>
            <input
              id="progress-file-search-input"
              type="text"
              className="dashboard-search-input"
              placeholder="Search file by name, extension, destination, or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchQuery('');
              }}
              aria-label="Search processing files"
            />
            {searchQuery && (
              <button
                id="progress-clear-search-btn"
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

          {/* Status Quick Filter Chips */}
          <div className="filter-chips" style={{ marginBottom: '10px' }}>
            <button
              id="progress-filter-all"
              type="button"
              className="filter-chip"
              data-active={statusFilter === 'all' ? 'true' : 'false'}
              onClick={() => setStatusFilter('all')}
            >
              <span>All</span>
              <span style={{ fontSize: '10px', opacity: 0.8 }}>({statusCounts.all})</span>
            </button>
            {statusCounts.current > 0 && (
              <button
                id="progress-filter-current"
                type="button"
                className="filter-chip"
                data-active={statusFilter === 'current' ? 'true' : 'false'}
                onClick={() => setStatusFilter('current')}
              >
                <span
                  className="material-symbols-rounded"
                  style={{ fontSize: '14px', color: 'var(--primary)' }}
                >
                  autorenew
                </span>
                <span>In Progress</span>
                <span style={{ fontSize: '10px', opacity: 0.8 }}>({statusCounts.current})</span>
              </button>
            )}
            <button
              id="progress-filter-done"
              type="button"
              className="filter-chip"
              data-active={statusFilter === 'done' ? 'true' : 'false'}
              onClick={() => setStatusFilter('done')}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '14px', color: '#16a34a' }}>
                check_circle
              </span>
              <span>Done</span>
              <span style={{ fontSize: '10px', opacity: 0.8 }}>({statusCounts.done})</span>
            </button>
            <button
              id="progress-filter-pending"
              type="button"
              className="filter-chip"
              data-active={statusFilter === 'pending' ? 'true' : 'false'}
              onClick={() => setStatusFilter('pending')}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>
                schedule
              </span>
              <span>Waiting</span>
              <span style={{ fontSize: '10px', opacity: 0.8 }}>({statusCounts.pending})</span>
            </button>
            {statusCounts.skipped > 0 && (
              <button
                id="progress-filter-skipped"
                type="button"
                className="filter-chip"
                data-active={statusFilter === 'skipped' ? 'true' : 'false'}
                onClick={() => setStatusFilter('skipped')}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
                  block
                </span>
                <span>Skipped</span>
                <span style={{ fontSize: '10px', opacity: 0.8 }}>({statusCounts.skipped})</span>
              </button>
            )}
          </div>

          {/* Active Filter Counter / Reset Bar */}
          {(searchQuery || statusFilter !== 'all') && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: 'var(--on-surface-variant)',
                marginBottom: '8px',
                padding: '0 4px',
              }}
            >
              <span>
                Found <strong>{filteredActivities.length}</strong> of <strong>{activityList.length}</strong> files
                {searchQuery && (
                  <>
                    {' '}matching &ldquo;<strong>{searchQuery}</strong>&rdquo;
                  </>
                )}
              </span>
              <button
                type="button"
                className="btn-text"
                style={{ height: '24px', padding: '0 6px', fontSize: '11px', color: 'var(--primary)' }}
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Reset filters
              </button>
            </div>
          )}

          {/* Activity List Container */}
          {filteredActivities.length === 0 ? (
            <div
              style={{
                padding: '28px 16px',
                textAlign: 'center',
                background: 'var(--surface-container-low)',
                border: '1px dashed var(--outline-variant)',
                borderRadius: '12px',
                color: 'var(--on-surface-variant)',
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '32px', opacity: 0.6 }}>
                search_off
              </span>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)', marginTop: '6px' }}>
                No matching files
              </div>
              <p style={{ fontSize: '12px', margin: '4px 0 12px' }}>
                No items match &ldquo;{searchQuery}&rdquo;
                {statusFilter !== 'all' ? ` in the "${statusFilter}" state` : ''}.
              </p>
              <button
                type="button"
                className="btn btn-tonal"
                style={{ height: '32px', padding: '0 14px', fontSize: '12px' }}
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                Clear search
              </button>
            </div>
          ) : (
            <div
              className="list"
              id="progress-activity-list"
              style={{
                maxHeight: '340px',
                overflowY: 'auto',
                border: '1px solid var(--outline-variant)',
                borderRadius: '12px',
                background: 'var(--surface-container-lowest)',
              }}
            >
              {filteredActivities.map((item) => {
                let itemClass = 'item';
                let stateLabel = 'Waiting';
                let stateBadgeStyle = {
                  bg: 'var(--surface-container-high)',
                  text: 'var(--on-surface-variant)',
                  border: 'transparent',
                };

                if (item.state === 'done') {
                  itemClass = 'item done';
                  stateLabel = 'Done';
                  stateBadgeStyle = { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
                } else if (item.state === 'skipped') {
                  itemClass = 'item done';
                  stateLabel = 'Skipped';
                  stateBadgeStyle = {
                    bg: 'var(--surface-container-high)',
                    text: 'var(--on-surface-variant)',
                    border: 'transparent',
                  };
                } else if (item.state === 'current') {
                  itemClass = 'item current';
                  stateLabel = 'In progress';
                  stateBadgeStyle = {
                    bg: 'var(--primary-container)',
                    text: 'var(--on-primary-container)',
                    border: 'var(--primary)',
                  };
                }

                const isCurrentItem = item.state === 'current';

                return (
                  <div
                    className={itemClass}
                    key={item.id}
                    id={`progress-activity-item-${item.id}`}
                    style={{
                      borderLeft: isCurrentItem ? '3px solid var(--primary)' : undefined,
                      background: isCurrentItem ? 'var(--surface-container-high)' : undefined,
                      padding: '10px 12px',
                    }}
                  >
                    <div className="item-icon">
                      {isCurrentItem ? (
                        <span
                          className="material-symbols-rounded"
                          style={{ color: 'var(--primary)', animation: 'spin 2s linear infinite' }}
                        >
                          autorenew
                        </span>
                      ) : (
                        <span className="material-symbols-rounded">{item.icon}</span>
                      )}
                    </div>
                    <div className="item-body">
                      <div className="item-title" title={item.name} style={{ fontSize: '13px', fontWeight: 500 }}>
                        {item.name}
                      </div>
                      <div className="item-sub" style={{ fontSize: '11px' }}>
                        {item.sub}
                      </div>
                    </div>
                    <span
                      className="item-state"
                      style={{
                        background: stateBadgeStyle.bg,
                        color: stateBadgeStyle.text,
                        border: `1px solid ${stateBadgeStyle.border}`,
                        padding: '2px 8px',
                        borderRadius: '100px',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      {item.state === 'done' && (
                        <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>
                          check
                        </span>
                      )}
                      {item.state === 'current' && (
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary)',
                            display: 'inline-block',
                          }}
                        />
                      )}
                      {stateLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Skip to completion */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--s3)' }}>
          <button className="btn btn-text" onClick={onSkipToComplete} type="button">
            Skip to completion <span className="material-symbols-rounded">arrow_forward</span>
          </button>
        </div>
      </main>
    </section>
  );
};
