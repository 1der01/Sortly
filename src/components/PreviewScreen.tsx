import React from 'react';
import { FileItem } from '../types';
import { getMaterialIconForFile } from '../utils/fileHelpers';
import { determineCategory } from '../data/categoriesData';

interface PreviewScreenProps {
  files: FileItem[];
  onBack: () => void;
  onConfirmOrganize: () => void;
}

export const PreviewScreen: React.FC<PreviewScreenProps> = ({
  files,
  onBack,
  onConfirmOrganize,
}) => {
  // Compute categorized movements and skipped items
  const plannedFiles = files.map((file) => {
    const isSkipped = !!(file.isFolder || file.isHidden || file.isSystem);
    const category = isSkipped ? (file.isFolder ? 'Folder' : 'Hidden file') : determineCategory(file.name);
    return {
      ...file,
      plannedCategory: category,
      isSkipped,
    };
  });

  const filesToOrganize = plannedFiles.filter((f) => !f.isSkipped);
  const filesSkipped = plannedFiles.filter((f) => f.isSkipped);
  const detectedCategories = new Set(filesToOrganize.map((f) => f.plannedCategory)).size;

  const getCategoryChipIcon = (category: string) => {
    switch (category) {
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
        return 'description';
    }
  };

  return (
    <section className="screen" data-screen="preview" data-shown="true">
      {/* App Bar */}
      <header className="appbar">
        <button className="icon-btn" aria-label="Back to dashboard" onClick={onBack} type="button">
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <div className="appbar-text">
          <div className="title">Preview changes</div>
          <div className="sub">Review the changes before organizing your files.</div>
        </div>
      </header>

      {/* Main Scroll */}
      <main className="main-scroll">
        {/* Banner */}
        <div className="banner">
          <span className="material-symbols-rounded">visibility</span>
          <div className="t">
            <b>Dry run is on.</b> Nothing below has happened yet — no files have been moved or changed.
          </div>
        </div>

        {/* Summary Card */}
        <section className="summary-card">
          <div className="summary-item">
            <div className="summary-icon" style={{ background: 'var(--primary-container)' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--on-primary-container)' }}>
                description
              </span>
            </div>
            <div>
              <div className="summary-v">{filesToOrganize.length}</div>
              <div className="summary-l">Files to organize</div>
            </div>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-item">
            <div className="summary-icon" style={{ background: 'var(--secondary-container)' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--on-secondary-container)' }}>
                category
              </span>
            </div>
            <div>
              <div className="summary-v">{detectedCategories}</div>
              <div className="summary-l">Categories detected</div>
            </div>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-item">
            <div className="summary-icon" style={{ background: 'var(--surface-container-high)' }}>
              <span className="material-symbols-rounded" style={{ color: 'var(--on-surface-variant)' }}>
                block
              </span>
            </div>
            <div>
              <div className="summary-v">{filesSkipped.length}</div>
              <div className="summary-l">Files will be skipped</div>
            </div>
          </div>
        </section>

        {/* File Movements List */}
        <div className="section-head">
          <h3>File movements</h3>
          <span className="count">{files.length} files</span>
        </div>

        <div className="list">
          {plannedFiles.map((item) => {
            if (item.isSkipped) {
              return (
                <div className="row skip" key={item.id}>
                  <div className="row-icon">
                    <span className="material-symbols-rounded">
                      {item.isFolder ? 'folder' : 'visibility_off'}
                    </span>
                  </div>
                  <div className="row-name" style={{ flex: 1 }}>
                    {item.name}
                  </div>
                  <span
                    className="category-chip"
                    style={{
                      background: 'var(--surface-container-high)',
                      color: 'var(--on-surface-variant)',
                    }}
                  >
                    <span className="label-text">{item.plannedCategory}</span>
                  </span>
                  <span className="move-flag">
                    <span className="material-symbols-rounded">remove</span>
                    Skip
                  </span>
                </div>
              );
            }

            return (
              <div className="row" key={item.id}>
                <div className="row-icon">
                  <span className="material-symbols-rounded">{getMaterialIconForFile(item)}</span>
                </div>
                <div className="row-name" style={{ flex: 1 }}>
                  {item.name}
                </div>
                <span className="category-chip">
                  <span className="material-symbols-rounded">
                    {getCategoryChipIcon(item.plannedCategory)}
                  </span>
                  <span className="label-text">{item.plannedCategory}</span>
                </span>
                <span className="move-flag">
                  <span className="material-symbols-rounded">arrow_forward</span>
                  Move
                </span>
              </div>
            );
          })}
        </div>
      </main>

      {/* Action Bar */}
      <footer className="action-bar">
        <button className="btn btn-text" onClick={onBack} type="button">
          Cancel
        </button>
        <div className="action-bar-spacer"></div>
        <button className="btn btn-outline" onClick={onBack} type="button">
          <span className="material-symbols-rounded">arrow_back</span>
          Back
        </button>
        <button
          id="preview-confirm-organize-btn"
          className="btn btn-filled"
          onClick={onConfirmOrganize}
          type="button"
          title="Confirm and organize files (Ctrl+Enter)"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <span className="material-symbols-rounded fill">bolt</span>
          <span>Organize files</span>
          <span
            className="kbd-shortcut"
            style={{
              background: 'rgba(255, 255, 255, 0.22)',
              color: 'inherit',
              borderColor: 'transparent',
              fontSize: '10px',
              padding: '2px 6px',
            }}
          >
            Ctrl+↵
          </span>
        </button>
      </footer>
    </section>
  );
};
