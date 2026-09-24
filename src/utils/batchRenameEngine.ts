import { FileItem } from '../types';

export type RenameMode = 'regex' | 'date' | 'template';
export type DateFormat = 'YYYY-MM-DD' | 'YYYYMMDD' | 'YYYY_MM_DD' | 'DD-MM-YYYY' | 'YYYY-MM' | 'custom';
export type DatePosition = 'prefix' | 'suffix' | 'replace' | 'prefix_underscore';
export type CaseOption = 'none' | 'lowercase' | 'uppercase' | 'titlecase' | 'kebab' | 'snake';

export interface BatchRenameConfig {
  mode: RenameMode;
  // Regex options
  regexSearch: string;
  regexReplace: string;
  regexFlags: {
    caseInsensitive: boolean;
    global: boolean;
  };
  preserveExtension: boolean;

  // Date options
  dateFormat: DateFormat;
  customDateFormat: string;
  dateSource: 'modified' | 'today' | 'custom';
  customDateValue: string; // YYYY-MM-DD
  datePosition: DatePosition;
  dateSeparator: string;

  // Template options
  templateString: string;

  // Sequential numbering
  startIndex: number;
  indexStep: number;
  indexPadding: number; // e.g. 2 for 01, 3 for 001

  // Case transform
  caseTransform: CaseOption;
}

export interface RenamePreviewItem {
  file: FileItem;
  originalName: string;
  originalExtension: string;
  newName: string;
  newExtension: string;
  changed: boolean;
  hasMatch: boolean;
  error?: string;
}

export const DEFAULT_RENAME_CONFIG: BatchRenameConfig = {
  mode: 'date',
  regexSearch: '',
  regexReplace: '',
  regexFlags: {
    caseInsensitive: false,
    global: true,
  },
  preserveExtension: true,

  dateFormat: 'YYYY-MM-DD',
  customDateFormat: 'YYYY-MM-DD',
  dateSource: 'today',
  customDateValue: new Date().toISOString().split('T')[0],
  datePosition: 'prefix',
  dateSeparator: ' - ',

  templateString: '{date} - {name}',

  startIndex: 1,
  indexStep: 1,
  indexPadding: 2,

  caseTransform: 'none',
};

/**
 * Splits filename into base name and extension.
 */
export function splitFilename(filename: string): { base: string; ext: string } {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0) {
    return { base: filename, ext: '' };
  }
  return {
    base: filename.substring(0, lastDot),
    ext: filename.substring(lastDot + 1),
  };
}

/**
 * Parses any date format string or Date object safely.
 */
export function parseDate(rawDate?: string | Date): Date {
  if (!rawDate) return new Date();
  if (rawDate instanceof Date) return isNaN(rawDate.getTime()) ? new Date() : rawDate;

  const parsed = new Date(rawDate);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Handle common MM/DD/YYYY or DD/MM/YYYY
  const parts = String(rawDate).match(/(\d+)/g);
  if (parts && parts.length >= 3) {
    const year = parts[0].length === 4 ? Number(parts[0]) : Number(parts[2]);
    const month = parts[0].length === 4 ? Number(parts[1]) - 1 : Number(parts[0]) - 1;
    const day = parts[0].length === 4 ? Number(parts[2]) : Number(parts[1]);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date();
}

/**
 * Formats a Date object according to standard tokens (YYYY, MM, DD, etc.)
 */
export function formatDate(date: Date, format: DateFormat, customFormat?: string): string {
  const yyyy = String(date.getFullYear());
  const yy = yyyy.slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  if (format === 'custom' && customFormat) {
    return customFormat
      .replace(/YYYY/g, yyyy)
      .replace(/YY/g, yy)
      .replace(/MM/g, mm)
      .replace(/DD/g, dd)
      .replace(/HH/g, hh)
      .replace(/mm/g, min);
  }

  switch (format) {
    case 'YYYY-MM-DD':
      return `${yyyy}-${mm}-${dd}`;
    case 'YYYYMMDD':
      return `${yyyy}${mm}${dd}`;
    case 'YYYY_MM_DD':
      return `${yyyy}_${mm}_${dd}`;
    case 'DD-MM-YYYY':
      return `${dd}-${mm}-${yyyy}`;
    case 'YYYY-MM':
      return `${yyyy}-${mm}`;
    default:
      return `${yyyy}-${mm}-${dd}`;
  }
}

/**
 * Applies case transformations.
 */
export function applyCaseTransform(str: string, transform: CaseOption): string {
  switch (transform) {
    case 'lowercase':
      return str.toLowerCase();
    case 'uppercase':
      return str.toUpperCase();
    case 'titlecase':
      return str.replace(/\b\w/g, (char) => char.toUpperCase());
    case 'kebab':
      return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    case 'snake':
      return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    case 'none':
    default:
      return str;
  }
}

/**
 * Validates filename characters for Windows/macOS/Linux compatibility.
 */
export function validateFilename(name: string): string | undefined {
  if (!name.trim()) {
    return 'Filename cannot be empty';
  }
  // Disallowed characters in most file systems: / \ ? % * : | " < >
  if (/[/\\?%*:|"<>]/g.test(name)) {
    return 'Contains invalid characters: / \\ ? % * : | " < >';
  }
  return undefined;
}

/**
 * Generates batch rename previews for all selected files.
 */
export function generateBatchRenamePreview(
  files: FileItem[],
  config: BatchRenameConfig,
  allFolderFiles?: FileItem[]
): RenamePreviewItem[] {
  let regexObj: RegExp | null = null;
  let regexCompilationError: string | null = null;

  if (config.mode === 'regex') {
    if (config.regexSearch.trim()) {
      try {
        let flags = '';
        if (config.regexFlags.global) flags += 'g';
        if (config.regexFlags.caseInsensitive) flags += 'i';
        regexObj = new RegExp(config.regexSearch, flags);
      } catch (err) {
        regexCompilationError = (err as Error).message;
      }
    }
  }

  const seenNames = new Set<string>();
  const existingNamesInFolder = new Set<string>();

  if (allFolderFiles) {
    const selectedIds = new Set(files.map((f) => f.id));
    for (const f of allFolderFiles) {
      if (!selectedIds.has(f.id)) {
        existingNamesInFolder.add(f.name.toLowerCase());
      }
    }
  }

  return files.map((file, idx) => {
    const { base, ext } = splitFilename(file.name);
    let targetBase = base;
    let targetExt = ext;
    let hasMatch = false;

    // Determine Date value
    let fileDate: Date;
    if (config.dateSource === 'today') {
      fileDate = new Date();
    } else if (config.dateSource === 'custom' && config.customDateValue) {
      fileDate = parseDate(config.customDateValue);
    } else {
      fileDate = parseDate(file.dateModified);
    }

    const formattedDate = formatDate(fileDate, config.dateFormat, config.customDateFormat);
    const currentIndex = config.startIndex + idx * config.indexStep;
    const paddedIndex = String(currentIndex).padStart(config.indexPadding, '0');

    // Execute based on mode
    if (config.mode === 'regex') {
      if (regexCompilationError) {
        return {
          file,
          originalName: file.name,
          originalExtension: ext,
          newName: file.name,
          newExtension: ext,
          changed: false,
          hasMatch: false,
          error: `Regex syntax error: ${regexCompilationError}`,
        };
      }

      if (regexObj) {
        if (config.preserveExtension) {
          if (regexObj.test(base)) {
            hasMatch = true;
            // Reset regex lastIndex for global
            regexObj.lastIndex = 0;
            targetBase = base.replace(regexObj, config.regexReplace);
          }
        } else {
          if (regexObj.test(file.name)) {
            hasMatch = true;
            regexObj.lastIndex = 0;
            const fullReplaced = file.name.replace(regexObj, config.regexReplace);
            const resplit = splitFilename(fullReplaced);
            targetBase = resplit.base;
            targetExt = resplit.ext;
          }
        }
      }
    } else if (config.mode === 'date') {
      const sep = config.dateSeparator;
      switch (config.datePosition) {
        case 'prefix':
          targetBase = `${formattedDate}${sep}${base}`;
          break;
        case 'prefix_underscore':
          targetBase = `${formattedDate}_${base}`;
          break;
        case 'suffix':
          targetBase = `${base}${sep}${formattedDate}`;
          break;
        case 'replace':
          targetBase = `${formattedDate}_${paddedIndex}`;
          break;
      }
      hasMatch = true;
    } else if (config.mode === 'template') {
      let tpl = config.templateString || '{name}';
      tpl = tpl
        .replace(/{name}/g, base)
        .replace(/{ext}/g, ext)
        .replace(/{date}/g, formattedDate)
        .replace(/{category}/g, file.category || 'General')
        .replace(/{index}/g, String(currentIndex))
        .replace(/{index:\d+}/g, (m) => {
          const pad = parseInt(m.split(':')[1], 10) || 2;
          return String(currentIndex).padStart(pad, '0');
        })
        .replace(/{0n}/g, paddedIndex)
        .replace(/{n}/g, String(currentIndex));

      if (config.preserveExtension) {
        targetBase = tpl;
      } else {
        const resplit = splitFilename(tpl);
        targetBase = resplit.base;
        targetExt = resplit.ext;
      }
      hasMatch = true;
    }

    // Apply Case transformation
    if (config.caseTransform !== 'none') {
      targetBase = applyCaseTransform(targetBase, config.caseTransform);
    }

    // Construct final name
    const finalName = targetExt && config.preserveExtension ? `${targetBase}.${targetExt}` : targetBase;
    const changed = finalName !== file.name;

    // Validate characters
    let error = validateFilename(finalName);

    // Collision check
    const lowerFinal = finalName.toLowerCase();
    if (!error) {
      if (seenNames.has(lowerFinal)) {
        error = 'Duplicate name collision within batch';
      } else if (existingNamesInFolder.has(lowerFinal)) {
        error = 'Collides with another file in this folder';
      }
    }
    seenNames.add(lowerFinal);

    return {
      file,
      originalName: file.name,
      originalExtension: ext,
      newName: finalName,
      newExtension: targetExt,
      changed,
      hasMatch,
      error,
    };
  });
}
