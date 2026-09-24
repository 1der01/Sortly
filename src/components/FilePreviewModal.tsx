import React, { useEffect, useMemo, useState } from 'react';
import { FileItem } from '../types';
import { getMaterialIconForFile } from '../utils/fileHelpers';
import { determineCategory } from '../data/categoriesData';

interface FilePreviewModalProps {
  isOpen: boolean;
  file: FileItem | null;
  files?: FileItem[];
  onNavigateFile?: (file: FileItem) => void;
  onClose: () => void;
}

// Curated high quality previews for sample files
const SAMPLE_IMAGE_PREVIEWS: Record<string, string> = {
  'sunset_vacation.jpg': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
  'profile_avatar.png': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
  'company_logo.svg': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
  'animation_demo.gif': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
  'architecture_diagram.png': 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&auto=format&fit=crop&q=80',
  'Raw_Portrait.heic': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&auto=format&fit=crop&q=80',
  'Graded_Color.png': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
};

// Sample code snippets for demo files without real content
const SAMPLE_CODE_SNIPPETS: Record<string, string> = {
  'index.html': `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>App</title>\n</head>\n<body>\n  <div id="root"></div>\n</body>\n</html>`,
  'server.ts': `import express from 'express';\nconst app = express();\nconst port = process.env.PORT || 3000;\n\napp.get('/api/health', (req, res) => {\n  res.json({ status: 'ok' });\n});\n\napp.listen(port);`,
  'data_cleaner.py': `import pandas as pd\n\ndef clean_records(csv_path: str) -> pd.DataFrame:\n    df = pd.read_csv(csv_path)\n    df.dropna(inplace=True)\n    return df.reset_index(drop=True)`,
};

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  file,
  files = [],
  onNavigateFile,
  onClose,
}) => {
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // File navigation indexing
  const currentFileIndex = useMemo(() => {
    if (!file || files.length === 0) return -1;
    return files.findIndex((f) => f.id === file.id);
  }, [file, files]);

  const hasPrev = currentFileIndex > 0;
  const hasNext = currentFileIndex >= 0 && currentFileIndex < files.length - 1;

  const handlePrevFile = () => {
    if (hasPrev && onNavigateFile) {
      onNavigateFile(files[currentFileIndex - 1]);
    }
  };

  const handleNextFile = () => {
    if (hasNext && onNavigateFile) {
      onNavigateFile(files[currentFileIndex + 1]);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrev && onNavigateFile) {
        e.preventDefault();
        onNavigateFile(files[currentFileIndex - 1]);
      } else if (e.key === 'ArrowRight' && hasNext && onNavigateFile) {
        e.preventDefault();
        onNavigateFile(files[currentFileIndex + 1]);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext, currentFileIndex, files, onNavigateFile, onClose]);

  // Determine file formats
  const ext = useMemo(() => {
    if (!file || !file.extension) return '';
    return file.extension.toLowerCase().replace(/^\./, '');
  }, [file]);

  const isImage = useMemo(() => {
    if (!file || file.isFolder) return false;
    if (file.realFile && file.realFile.type.startsWith('image/')) return true;
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic', 'tiff'].includes(ext);
  }, [file, ext]);

  const isTextLike = useMemo(() => {
    if (!file || file.isFolder) return false;
    if (file.realFile && file.realFile.type.startsWith('text/')) return true;
    return ['txt', 'md', 'json', 'csv', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'xml', 'log', 'yaml', 'yml', 'py', 'sh', 'sql', 'toml', 'env'].includes(ext);
  }, [file, ext]);

  const isAudio = useMemo(() => {
    if (!file || file.isFolder) return false;
    if (file.realFile && file.realFile.type.startsWith('audio/')) return true;
    return ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'].includes(ext);
  }, [file, ext]);

  const isVideo = useMemo(() => {
    if (!file || file.isFolder) return false;
    if (file.realFile && file.realFile.type.startsWith('video/')) return true;
    return ['mp4', 'mkv', 'mov', 'avi', 'wmv', 'webm', 'flv'].includes(ext);
  }, [file, ext]);

  const isArchive = useMemo(() => {
    if (!file || file.isFolder) return false;
    return ['zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz'].includes(ext);
  }, [file, ext]);

  const isPdf = useMemo(() => {
    if (!file || file.isFolder) return false;
    return ext === 'pdf';
  }, [file, ext]);

  // Load real file text preview if text-based
  useEffect(() => {
    setImageDimensions(null);
    setTextContent(null);

    if (!file || file.isFolder) return;

    if (file.realFile && isTextLike) {
      setIsLoadingText(true);
      const reader = new FileReader();
      reader.onload = () => {
        const text = (reader.result as string) || '';
        setTextContent(text.slice(0, 1500));
        setIsLoadingText(false);
      };
      reader.onerror = () => {
        setIsLoadingText(false);
      };
      reader.readAsText(file.realFile.slice(0, 4096));
    } else if (SAMPLE_CODE_SNIPPETS[file.name]) {
      setTextContent(SAMPLE_CODE_SNIPPETS[file.name]);
    }
  }, [file, isTextLike]);

  // Image Thumbnail URL
  const imageThumbnailUrl = useMemo(() => {
    if (!file || !isImage) return null;
    if (file.realFile && file.realFile.type.startsWith('image/')) {
      return URL.createObjectURL(file.realFile);
    }
    if (SAMPLE_IMAGE_PREVIEWS[file.name]) {
      return SAMPLE_IMAGE_PREVIEWS[file.name];
    }
    // Generic high-res abstract fallback for any other named image
    return `https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80`;
  }, [file, isImage]);

  // Cleanup object URL if created
  useEffect(() => {
    return () => {
      if (imageThumbnailUrl && imageThumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageThumbnailUrl);
      }
    };
  }, [imageThumbnailUrl]);

  if (!isOpen || !file) return null;

  const category = file.isFolder ? 'Folder' : (file.category || determineCategory(file.name));
  const isSkipped = !!(file.isFolder || file.isHidden || file.isSystem);
  const targetDestination = isSkipped
    ? (file.isFolder ? 'Preserved at root (Folder)' : 'Preserved at root (System/Hidden)')
    : `${category}/${file.name}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-look-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        style={{
          background: 'var(--surface-container-high)',
          border: '1px solid var(--outline-variant)',
          boxShadow: 'var(--el4, 0 12px 36px rgba(0,0,0,0.28))',
          color: 'var(--on-surface)',
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--outline-variant)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-container)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--primary-container)',
                color: 'var(--on-primary-container)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                {isImage ? 'image' : getMaterialIconForFile(file)}
              </span>
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1px' }}>
                <span
                  id="quick-look-header-badge"
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--primary)',
                    background: 'var(--primary-container)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '11px' }}>
                    visibility
                  </span>
                  Quick Look
                </span>
                {files.length > 1 && currentFileIndex >= 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--on-surface-variant)',
                      fontFamily: 'monospace',
                    }}
                  >
                    ({currentFileIndex + 1}/{files.length})
                  </span>
                )}
              </div>
              <h3
                id="quick-look-modal-title"
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--on-surface)',
                }}
                title={file.name}
              >
                {file.name}
              </h3>
            </div>
          </div>

          {/* Navigation and Close Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {files.length > 1 && onNavigateFile && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--surface-container-high)',
                  borderRadius: '16px',
                  border: '1px solid var(--outline-variant)',
                  padding: '1px',
                  marginRight: '6px',
                }}
              >
                <button
                  id="quick-look-prev-btn"
                  type="button"
                  className="icon-btn"
                  disabled={!hasPrev}
                  onClick={handlePrevFile}
                  title="Previous file (Left Arrow)"
                  aria-label="Previous file"
                  style={{
                    width: '28px',
                    height: '28px',
                    opacity: hasPrev ? 1 : 0.4,
                    cursor: hasPrev ? 'pointer' : 'not-allowed',
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                    chevron_left
                  </span>
                </button>
                <button
                  id="quick-look-next-btn"
                  type="button"
                  className="icon-btn"
                  disabled={!hasNext}
                  onClick={handleNextFile}
                  title="Next file (Right Arrow)"
                  aria-label="Next file"
                  style={{
                    width: '28px',
                    height: '28px',
                    opacity: hasNext ? 1 : 0.4,
                    cursor: hasNext ? 'pointer' : 'not-allowed',
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>
                    chevron_right
                  </span>
                </button>
              </div>
            )}

            <button
              id="quick-look-close-btn"
              type="button"
              className="icon-btn"
              onClick={onClose}
              aria-label="Close Quick Look modal"
              title="Close (Esc)"
              style={{ width: '32px', height: '32px' }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: '20px' }}>
                close
              </span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
          {/* Thumbnail / Visual Preview Area */}
          <div style={{ marginBottom: '16px' }}>
            {/* 1. IMAGE PREVIEW */}
            {isImage && imageThumbnailUrl ? (
              <div
                id="quick-look-image-thumbnail-container"
                style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: 'var(--surface-container-lowest)',
                  border: '1px solid var(--outline-variant)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '170px',
                    maxHeight: '230px',
                    background:
                      'repeating-conic-gradient(var(--surface-container) 0% 25%, var(--surface-container-high) 0% 50%) 50% / 18px 18px',
                  }}
                >
                  <img
                    id="quick-look-thumbnail-image"
                    src={imageThumbnailUrl}
                    alt={file.name}
                    referrerPolicy="no-referrer"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                    }}
                    style={{
                      maxHeight: '200px',
                      maxWidth: '100%',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                    }}
                  />
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    display: 'flex',
                    gap: '6px',
                  }}
                >
                  {imageDimensions && (
                    <span
                      style={{
                        background: 'rgba(0,0,0,0.72)',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '100px',
                        backdropFilter: 'blur(4px)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {imageDimensions.width} × {imageDimensions.height} px
                    </span>
                  )}
                  <span
                    style={{
                      background: 'rgba(0,0,0,0.72)',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '100px',
                      backdropFilter: 'blur(4px)',
                      textTransform: 'uppercase',
                      fontFamily: 'monospace',
                    }}
                  >
                    {ext || 'IMG'}
                  </span>
                </div>
              </div>
            ) : isTextLike && (textContent || isLoadingText) ? (
              /* 2. TEXT / CODE PREVIEW */
              <div
                id="quick-look-code-preview-container"
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--outline-variant)',
                  background: 'var(--surface-container-lowest)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 12px',
                    background: 'var(--surface-container)',
                    borderBottom: '1px solid var(--outline-variant)',
                    fontSize: '11px',
                    color: 'var(--on-surface-variant)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: '14px' }}>
                      code
                    </span>
                    <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>
                      {ext ? `.${ext}` : 'Text'} Preview
                    </span>
                  </div>
                  <span style={{ fontFamily: 'monospace' }}>UTF-8</span>
                </div>
                <div
                  style={{
                    padding: '12px',
                    maxHeight: '180px',
                    overflowY: 'auto',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11.5px',
                    lineHeight: '1.5',
                    color: 'var(--on-surface)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    background: 'var(--surface-container-lowest)',
                  }}
                >
                  {isLoadingText ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--on-surface-variant)' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: '14px', animation: 'spin 1.2s linear infinite' }}>
                        autorenew
                      </span>
                      <span>Reading text preview...</span>
                    </div>
                  ) : (
                    textContent
                  )}
                </div>
              </div>
            ) : isAudio ? (
              /* 3. AUDIO PREVIEW */
              <div
                id="quick-look-audio-preview-container"
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--outline-variant)',
                  background: 'var(--surface-container-low)',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'var(--primary-container)',
                      color: 'var(--on-primary-container)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>
                      audiotrack
                    </span>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--on-surface-variant)' }}>
                      Audio track • {ext.toUpperCase()} format
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: 'var(--primary)',
                      background: 'var(--primary-container)',
                      padding: '2px 8px',
                      borderRadius: '100px',
                    }}
                  >
                    03:42
                  </span>
                </div>

                {/* Simulated Audio Waveform */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    height: '32px',
                    padding: '4px 8px',
                    background: 'var(--surface-container)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  {[35, 60, 80, 45, 90, 75, 50, 65, 85, 40, 70, 95, 55, 30, 65, 85, 45, 75, 90, 60, 40, 80, 50, 70, 40].map(
                    (height, idx) => (
                      <div
                        key={idx}
                        style={{
                          flex: 1,
                          height: `${height}%`,
                          background: idx < 12 ? 'var(--primary)' : 'var(--outline-variant)',
                          borderRadius: '2px',
                        }}
                      />
                    )
                  )}
                </div>
              </div>
            ) : isVideo ? (
              /* 4. VIDEO PREVIEW */
              <div
                id="quick-look-video-preview-container"
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--outline-variant)',
                  background: '#0f172a',
                  color: '#fff',
                  height: '160px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      background: 'rgba(255,255,255,0.2)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {ext || 'VIDEO'} • 1080p
                  </span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#94a3b8' }}>
                    00:00 / 04:15
                  </span>
                </div>

                {/* Center Play Icon */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.85)',
                      color: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    }}
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: '28px', marginLeft: '3px' }}>
                      play_arrow
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    height: '4px',
                    width: '100%',
                    background: 'rgba(255,255,255,0.25)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    zIndex: 2,
                  }}
                >
                  <div style={{ width: '25%', height: '100%', background: 'var(--primary, #38bdf8)' }} />
                </div>
              </div>
            ) : isPdf ? (
              /* 5. PDF PREVIEW */
              <div
                id="quick-look-pdf-preview-container"
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--outline-variant)',
                  background: 'var(--surface-container-low)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '64px',
                    borderRadius: '6px',
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    color: '#dc2626',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.15)',
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>
                    picture_as_pdf
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 800, marginTop: '2px' }}>PDF</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                    Adobe Acrobat PDF Document • 4 Pages
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '4px',
                      flexDirection: 'column',
                      marginTop: '8px',
                    }}
                  >
                    <div style={{ height: '4px', width: '85%', background: 'var(--outline-variant)', borderRadius: '2px' }} />
                    <div style={{ height: '4px', width: '60%', background: 'var(--outline-variant)', borderRadius: '2px' }} />
                  </div>
                </div>
              </div>
            ) : isArchive ? (
              /* 6. ARCHIVE PREVIEW */
              <div
                id="quick-look-archive-preview-container"
                style={{
                  borderRadius: '12px',
                  border: '1px solid var(--outline-variant)',
                  background: 'var(--surface-container-low)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '10px',
                    background: 'var(--surface-container-highest)',
                    color: 'var(--on-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '26px' }}>
                    folder_zip
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>
                    Compressed Archive ({ext.toUpperCase()})
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                    Contains multiple archived files and directory structures.
                  </div>
                </div>
              </div>
            ) : (
              /* 7. GENERIC / FOLDER PREVIEW */
              <div
                id="quick-look-generic-preview-container"
                style={{
                  borderRadius: '12px',
                  background: 'var(--surface-container-low)',
                  border: '1px solid var(--outline-variant)',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '10px',
                    background: 'var(--surface-container-highest)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '26px' }}>
                    {getMaterialIconForFile(file)}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--on-surface)' }}>
                    {file.isFolder ? 'Folder Item' : ext ? `.${ext.toUpperCase()} File` : 'System Object'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>
                    {file.isFolder ? 'Directory preserved at root' : `${category} category file`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Table */}
          <div
            id="quick-look-metadata-table"
            style={{
              background: 'var(--surface-container-lowest)',
              border: '1px solid var(--outline-variant)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            {/* File Name */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 14px',
                borderBottom: '1px solid var(--outline-variant)',
                fontSize: '12.5px',
              }}
            >
              <span style={{ color: 'var(--on-surface-variant)', flexShrink: 0 }}>File Name</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span
                  style={{
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '240px',
                  }}
                  title={file.name}
                >
                  {file.name}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => copyToClipboard(file.name, 'name')}
                  title="Copy filename"
                  style={{ width: '22px', height: '22px', padding: 0 }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>
                    {copiedField === 'name' ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>

            {/* Target Category */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 14px',
                borderBottom: '1px solid var(--outline-variant)',
                fontSize: '12.5px',
              }}
            >
              <span style={{ color: 'var(--on-surface-variant)' }}>Target Category</span>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '11.5px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'var(--primary-container)',
                  color: 'var(--on-primary-container)',
                }}
              >
                {category}
              </span>
            </div>

            {/* File Size */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 14px',
                borderBottom: '1px solid var(--outline-variant)',
                fontSize: '12.5px',
              }}
            >
              <span style={{ color: 'var(--on-surface-variant)' }}>Size</span>
              <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{file.size}</span>
            </div>

            {/* File Extension */}
            {ext && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 14px',
                  borderBottom: '1px solid var(--outline-variant)',
                  fontSize: '12.5px',
                }}
              >
                <span style={{ color: 'var(--on-surface-variant)' }}>Extension</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace', textTransform: 'uppercase' }}>
                  .{ext}
                </span>
              </div>
            )}

            {/* Planned Path */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '9px 14px',
                borderBottom: '1px solid var(--outline-variant)',
                fontSize: '12.5px',
              }}
            >
              <span style={{ color: 'var(--on-surface-variant)', flexShrink: 0 }}>Destination Path</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span
                  style={{
                    fontWeight: 500,
                    fontFamily: 'monospace',
                    fontSize: '11.5px',
                    color: isSkipped ? 'var(--on-surface-variant)' : 'var(--primary)',
                    maxWidth: '220px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={targetDestination}
                >
                  {targetDestination}
                </span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => copyToClipboard(targetDestination, 'path')}
                  title="Copy destination path"
                  style={{ width: '22px', height: '22px', padding: 0 }}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: '13px' }}>
                    {copiedField === 'path' ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
            </div>

            {/* Date Modified */}
            {file.dateModified && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 14px',
                  borderBottom: '1px solid var(--outline-variant)',
                  fontSize: '12.5px',
                }}
              >
                <span style={{ color: 'var(--on-surface-variant)' }}>Modified</span>
                <span style={{ fontWeight: 500 }}>{file.dateModified}</span>
              </div>
            )}

            {/* Sorting Logic */}
            <div
              style={{
                padding: '10px 14px',
                fontSize: '12px',
                color: 'var(--on-surface-variant)',
                background: 'var(--surface-container-low)',
              }}
            >
              <div style={{ fontWeight: 500, color: 'var(--on-surface)', marginBottom: '2px' }}>
                Sorting Rule:
              </div>
              <div>
                {file.humanReason ||
                  (isSkipped
                    ? 'Protected file/directory kept untouched at root'
                    : `Sorted by extension to ${category}/`)}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--outline-variant)',
            background: 'var(--surface-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '11.5px', color: 'var(--on-surface-variant)' }}>
            Tip: Press <kbd style={{ padding: '1px 5px', background: 'var(--surface-container-highest)', borderRadius: '4px', fontFamily: 'monospace' }}>←</kbd> or <kbd style={{ padding: '1px 5px', background: 'var(--surface-container-highest)', borderRadius: '4px', fontFamily: 'monospace' }}>→</kbd> to browse files
          </div>

          <button
            id="quick-look-done-btn"
            type="button"
            className="btn btn-filled"
            style={{ height: '34px', fontSize: '13px', padding: '0 18px', borderRadius: '17px' }}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
