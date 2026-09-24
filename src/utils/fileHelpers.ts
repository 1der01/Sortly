import { FileItem } from '../types';
import { determineCategory } from '../data/categoriesData';

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function createFileItemFromNativeFile(file: File, index: number): FileItem {
  const parts = file.name.split('.');
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  const isHidden = file.name.startsWith('.');
  const isSystem = file.name === 'desktop.ini' || file.name === 'Thumbs.db' || file.name === '.DS_Store';
  const category = determineCategory(file.name);

  return {
    id: `real-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    name: file.name,
    extension: ext,
    size: formatBytes(file.size),
    category,
    isFolder: false,
    isHidden,
    isSystem,
    dateModified: file.lastModified ? new Date(file.lastModified).toLocaleDateString() : new Date().toLocaleDateString(),
    humanReason: `Classified by .${ext || 'unknown'} extension into ${category}/`,
    realFile: file,
  };
}

export function getMaterialIconForFile(file: FileItem): string {
  if (file.isFolder) return 'folder';
  if (file.isHidden || file.isSystem) return 'visibility_off';
  const ext = file.extension ? file.extension.toLowerCase().replace('.', '') : '';
  if (ext === 'pdf') return 'picture_as_pdf';
  if (['csv', 'xlsx', 'xls'].includes(ext)) return 'table_chart';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'bmp', 'ico'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'mkv', 'avi', 'webm', 'wmv'].includes(ext)) return 'movie';
  if (['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'].includes(ext)) return 'music_note';
  if (['zip', 'rar', 'tar', 'gz', '7z', 'bz2', 'iso'].includes(ext)) return 'folder_zip';
  if (['py', 'js', 'ts', 'html', 'css', 'json', 'sh', 'sql', 'cpp', 'c', 'java', 'php'].includes(ext)) return 'code';
  return 'description';
}
