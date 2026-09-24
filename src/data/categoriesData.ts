import { CategoryDefinition } from '../types';

export const CATEGORIES: CategoryDefinition[] = [
  {
    name: 'Documents',
    extensions: ['pdf', 'doc', 'docx', 'txt', 'xlsx', 'xls', 'ppt', 'pptx', 'csv', 'rtf', 'odt', 'md'],
    color: '#2563eb',
    bgLight: '#eff6ff',
    iconName: 'FileText',
    description: 'PDFs, spreadsheets, text files, and office presentations.',
  },
  {
    name: 'Images',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'heic'],
    color: '#7c3aed',
    bgLight: '#f5f3ff',
    iconName: 'Image',
    description: 'Photos, vector graphics, icons, and raster assets.',
  },
  {
    name: 'Videos',
    extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv', 'flv', 'm4v'],
    color: '#e11d48',
    bgLight: '#fff1f2',
    iconName: 'Video',
    description: 'Movies, screen recordings, clips, and animated video streams.',
  },
  {
    name: 'Audio',
    extensions: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma', 'opus'],
    color: '#d97706',
    bgLight: '#fffbeb',
    iconName: 'Music',
    description: 'Music tracks, sound effects, podcasts, and voice recordings.',
  },
  {
    name: 'Archives',
    extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'],
    color: '#059669',
    bgLight: '#ecfdf5',
    iconName: 'Archive',
    description: 'Compressed bundles, zip packages, tarballs, and disk images.',
  },
  {
    name: 'Code',
    extensions: ['py', 'js', 'html', 'css', 'php', 'java', 'c', 'cpp', 'ts', 'json', 'sql', 'sh'],
    color: '#0891b2',
    bgLight: '#ecfeff',
    iconName: 'Code2',
    description: 'Source scripts, stylesheets, configuration files, and database queries.',
  },
  {
    name: 'Others',
    extensions: ['*'],
    color: '#4b5563',
    bgLight: '#f3f4f6',
    iconName: 'HelpCircle',
    description: 'Unsupported formats, proprietary binaries, or files without extensions.',
  },
];

export function determineCategory(filename: string): string {
  const parts = filename.split('.');
  if (parts.length < 2) return 'Others';
  const ext = parts[parts.length - 1].toLowerCase();

  for (const cat of CATEGORIES) {
    if (cat.extensions.includes(ext)) {
      return cat.name;
    }
  }
  return 'Others';
}
