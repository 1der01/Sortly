import React, { useState } from 'react';

interface SettingsScreenProps {
  onBack: () => void;
  defaultBehavior: 'preview' | 'immediate';
  onSetDefaultBehavior: (val: 'preview' | 'immediate') => void;
  includeSubfolders: boolean;
  onToggleIncludeSubfolders: (val: boolean) => void;
  showConfirmation: boolean;
  onToggleShowConfirmation: (val: boolean) => void;
  duplicateBehavior: 'rename' | 'skip';
  onSetDuplicateBehavior: (val: 'rename' | 'skip') => void;
  unknownBehavior: 'others' | 'leave';
  onSetUnknownBehavior: (val: 'others' | 'leave') => void;
  skipHidden: boolean;
  onToggleSkipHidden: (val: boolean) => void;
  theme: 'light' | 'dark' | 'system';
  onSetTheme: (theme: 'light' | 'dark' | 'system') => void;
  density: 'compact' | 'comfortable';
  onSetDensity: (density: 'compact' | 'comfortable') => void;
  onOpenCategoryRules: () => void;
  onOpenSetupGuide: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  defaultBehavior,
  onSetDefaultBehavior,
  includeSubfolders,
  onToggleIncludeSubfolders,
  showConfirmation,
  onToggleShowConfirmation,
  duplicateBehavior,
  onSetDuplicateBehavior,
  unknownBehavior,
  onSetUnknownBehavior,
  skipHidden,
  onToggleSkipHidden,
  theme,
  onSetTheme,
  density,
  onSetDensity,
  onOpenCategoryRules,
  onOpenSetupGuide,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleMenu = (menuId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenu((prev) => (prev === menuId ? null : menuId));
  };

  return (
    <section
      className="screen"
      data-screen="settings"
      data-shown="true"
      onClick={() => setOpenMenu(null)}
    >
      {/* App Bar */}
      <header className="appbar">
        <button className="icon-btn" aria-label="Back" onClick={onBack} type="button">
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <span className="title">Settings</span>
      </header>

      {/* Main Scroll */}
      <main className="main-scroll">
        <div className="content-box">
          {/* Section 1: General */}
          <section className="section-wrap">
            <div className="section-label">General</div>
            <div className="md3-card" style={{ padding: 0 }}>
              {/* Default organization behavior */}
              <div className="row">
                <div className="row-text">
                  <div className="t">Default organization behavior</div>
                  <div className="d">Choose what happens when you click "Organize files"</div>
                </div>
                <div className="select-wrap">
                  <button
                    className="select"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={openMenu === 'm1'}
                    onClick={(e) => toggleMenu('m1', e)}
                  >
                    <span>
                      {defaultBehavior === 'preview'
                        ? 'Preview first (dry run)'
                        : 'Organize immediately'}
                    </span>
                    <span className="material-symbols-rounded">expand_more</span>
                  </button>
                  <div className="menu" id="m1" data-open={openMenu === 'm1' ? 'true' : 'false'}>
                    <div
                      className="menu-item"
                      data-selected={defaultBehavior === 'preview' ? 'true' : 'false'}
                      onClick={() => onSetDefaultBehavior('preview')}
                    >
                      <span>Preview first (dry run)</span>
                      <span className="material-symbols-rounded">check</span>
                    </div>
                    <div
                      className="menu-item"
                      data-selected={defaultBehavior === 'immediate' ? 'true' : 'false'}
                      onClick={() => onSetDefaultBehavior('immediate')}
                    >
                      <span>Organize immediately</span>
                      <span className="material-symbols-rounded">check</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Include subfolders */}
              <div className="row">
                <div className="row-text">
                  <div className="t">Include subfolders</div>
                  <div className="d">Also scan and sort files inside nested folders</div>
                </div>
                <div
                  className="switch"
                  data-on={includeSubfolders ? 'true' : 'false'}
                  role="switch"
                  aria-checked={includeSubfolders}
                  tabIndex={0}
                  onClick={() => onToggleIncludeSubfolders(!includeSubfolders)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggleIncludeSubfolders(!includeSubfolders);
                    }
                  }}
                />
              </div>

              {/* Show confirmation */}
              <div className="row">
                <div className="row-text">
                  <div className="t">Show confirmation before organizing</div>
                  <div className="d">Ask before moving any files, even outside dry run</div>
                </div>
                <div
                  className="switch"
                  data-on={showConfirmation ? 'true' : 'false'}
                  role="switch"
                  aria-checked={showConfirmation}
                  tabIndex={0}
                  onClick={() => onToggleShowConfirmation(!showConfirmation)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggleShowConfirmation(!showConfirmation);
                    }
                  }}
                />
              </div>
            </div>
          </section>

          {/* Section 2: File handling */}
          <section className="section-wrap">
            <div className="section-label">File handling</div>
            <div className="md3-card" style={{ padding: 0 }}>
              {/* Duplicate behavior */}
              <div className="row">
                <div className="row-text">
                  <div className="t">Duplicate file behavior</div>
                  <div className="d">
                    What to do when a destination already has a file with the same name
                  </div>
                </div>
                <div className="select-wrap">
                  <button
                    className="select"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={openMenu === 'm2'}
                    onClick={(e) => toggleMenu('m2', e)}
                  >
                    <span>
                      {duplicateBehavior === 'rename'
                        ? 'Rename automatically'
                        : 'Skip the file'}
                    </span>
                    <span className="material-symbols-rounded">expand_more</span>
                  </button>
                  <div className="menu" id="m2" data-open={openMenu === 'm2' ? 'true' : 'false'}>
                    <div
                      className="menu-item"
                      data-selected={duplicateBehavior === 'rename' ? 'true' : 'false'}
                      onClick={() => onSetDuplicateBehavior('rename')}
                    >
                      <span>Rename automatically</span>
                      <span className="material-symbols-rounded">check</span>
                    </div>
                    <div
                      className="menu-item"
                      data-selected={duplicateBehavior === 'skip' ? 'true' : 'false'}
                      onClick={() => onSetDuplicateBehavior('skip')}
                    >
                      <span>Skip the file</span>
                      <span className="material-symbols-rounded">check</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Unknown file behavior */}
              <div className="row">
                <div className="row-text">
                  <div className="t">Unknown file behavior</div>
                  <div className="d">What to do with extensions that don't match a category</div>
                </div>
                <div className="select-wrap">
                  <button
                    className="select"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={openMenu === 'm3'}
                    onClick={(e) => toggleMenu('m3', e)}
                  >
                    <span>
                      {unknownBehavior === 'others' ? 'Move to "Others"' : 'Leave in place'}
                    </span>
                    <span className="material-symbols-rounded">expand_more</span>
                  </button>
                  <div className="menu" id="m3" data-open={openMenu === 'm3' ? 'true' : 'false'}>
                    <div
                      className="menu-item"
                      data-selected={unknownBehavior === 'others' ? 'true' : 'false'}
                      onClick={() => onSetUnknownBehavior('others')}
                    >
                      <span>Move to "Others"</span>
                      <span className="material-symbols-rounded">check</span>
                    </div>
                    <div
                      className="menu-item"
                      data-selected={unknownBehavior === 'leave' ? 'true' : 'false'}
                      onClick={() => onSetUnknownBehavior('leave')}
                    >
                      <span>Leave in place</span>
                      <span className="material-symbols-rounded">check</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skip hidden and system files */}
              <div className="row">
                <div className="row-text">
                  <div className="t">Skip hidden and system files</div>
                  <div className="d">
                    Files starting with a dot, and OS files like .DS_Store
                  </div>
                </div>
                <div
                  className="switch"
                  data-on={skipHidden ? 'true' : 'false'}
                  role="switch"
                  aria-checked={skipHidden}
                  tabIndex={0}
                  onClick={() => onToggleSkipHidden(!skipHidden)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggleSkipHidden(!skipHidden);
                    }
                  }}
                />
              </div>
            </div>
          </section>

          {/* Section 3: Appearance */}
          <section className="section-wrap">
            <div className="section-label">Appearance</div>
            <div className="md3-card" style={{ padding: 0 }}>
              {/* Theme */}
              <div className="row">
                <div className="row-text">
                  <div className="t">Theme</div>
                </div>
                <div className="segmented" role="radiogroup" aria-label="Theme">
                  <button
                    className="segment"
                    data-active={theme === 'light' ? 'true' : 'false'}
                    role="radio"
                    aria-checked={theme === 'light'}
                    onClick={() => onSetTheme('light')}
                    type="button"
                  >
                    <span className="material-symbols-rounded">light_mode</span>
                    Light
                  </button>
                  <button
                    className="segment"
                    data-active={theme === 'dark' ? 'true' : 'false'}
                    role="radio"
                    aria-checked={theme === 'dark'}
                    onClick={() => onSetTheme('dark')}
                    type="button"
                  >
                    <span className="material-symbols-rounded">dark_mode</span>
                    Dark
                  </button>
                  <button
                    className="segment"
                    data-active={theme === 'system' ? 'true' : 'false'}
                    role="radio"
                    aria-checked={theme === 'system'}
                    onClick={() => onSetTheme('system')}
                    type="button"
                  >
                    <span className="material-symbols-rounded">brightness_auto</span>
                    System
                  </button>
                </div>
              </div>

              {/* Density */}
              <div className="row">
                <div className="row-text">
                  <div className="t">Density</div>
                </div>
                <div className="segmented" role="radiogroup" aria-label="Density">
                  <button
                    className="segment"
                    data-active={density === 'compact' ? 'true' : 'false'}
                    role="radio"
                    aria-checked={density === 'compact'}
                    onClick={() => onSetDensity('compact')}
                    type="button"
                  >
                    <span className="material-symbols-rounded">density_small</span>
                    Compact
                  </button>
                  <button
                    className="segment"
                    data-active={density === 'comfortable' ? 'true' : 'false'}
                    role="radio"
                    aria-checked={density === 'comfortable'}
                    onClick={() => onSetDensity('comfortable')}
                    type="button"
                  >
                    <span className="material-symbols-rounded">density_medium</span>
                    Comfortable
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: About */}
          <section className="section-wrap">
            <div className="section-label">About</div>
            <div className="md3-card about-card">
              <div className="about-top">
                <div className="about-mark">
                  <span className="material-symbols-rounded">rule_folder</span>
                </div>
                <div>
                  <div className="about-name">Sortly</div>
                  <div className="about-version">Version 1.0.0</div>
                </div>
              </div>
              <p className="about-tagline">Organize your files automatically.</p>
              <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-outline"
                  onClick={onOpenCategoryRules}
                  type="button"
                >
                  <span className="material-symbols-rounded">category</span>
                  Category Rules
                </button>
                <button
                  className="btn btn-outline"
                  onClick={onOpenSetupGuide}
                  type="button"
                >
                  <span className="material-symbols-rounded">terminal</span>
                  CLI & Local Guide
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </section>
  );
};
