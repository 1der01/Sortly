export interface FileItem {
  id: string;
  name: string;
  extension: string;
  size: string;
  category: string;
  isFolder?: boolean;
  isHidden?: boolean;
  isSystem?: boolean;
  resolvedName?: string;
  isDuplicate?: boolean;
  dateModified?: string;
  humanReason?: string;
  realFile?: File;
  sourcePath?: string;
}

export interface OrganizationStats {
  scanned: number;
  moved: number;
  skipped: number;
  errors: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  humanStory?: string;
  level: 'info' | 'success' | 'dry_run' | 'skipped' | 'warning' | 'error';
  iconType?: 'sparkle' | 'shield' | 'folder' | 'copy' | 'check' | 'alert';
}

export interface UndoStep {
  originalFiles: FileItem[];
  timestamp: string;
  folderPath: string;
  movedCount: number;
}

export interface CategoryDefinition {
  name: string;
  extensions: string[];
  color: string;
  bgLight: string;
  iconName: string;
  description: string;
}

export interface PythonSourceFile {
  filename: string;
  description: string;
  code: string;
}
