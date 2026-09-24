import { FileItem, OrganizationStats } from '../types';
import { determineCategory } from '../data/categoriesData';

export interface ReportItem {
  id: string;
  fileName: string;
  status: 'Moved' | 'Skipped' | 'Error';
  category: string;
  originalSize: string;
  extension: string;
  sourceLocation: string;
  destinationPath: string;
  details: string;
  dateModified?: string;
}

export interface OrganizationReportData {
  metadata: {
    tool: string;
    version: string;
    folderName: string;
    generatedAt: string;
  };
  summary: {
    totalScanned: number;
    totalMoved: number;
    totalSkipped: number;
    totalErrors: number;
    categoryCounts: Record<string, number>;
  };
  results: ReportItem[];
}

export function buildOrganizationReport(
  files: FileItem[],
  stats: OrganizationStats,
  folderName: string,
  activityList?: Array<{
    id: string;
    name: string;
    sub: string;
    state: 'done' | 'skipped' | 'current' | 'pending';
    icon: string;
  }>
): OrganizationReportData {
  const categoryCounts: Record<string, number> = {};

  // Build a map of activity items if available
  const activityMap = new Map<string, { sub: string; state: string }>();
  if (activityList) {
    activityList.forEach((act) => {
      activityMap.set(act.name, { sub: act.sub, state: act.state });
    });
  }

  const results: ReportItem[] = files.map((file, index) => {
    const act = activityMap.get(file.name);
    const isFolder = !!file.isFolder;
    const isHidden = !!file.isHidden;
    const isSystem = !!file.isSystem;

    let status: 'Moved' | 'Skipped' | 'Error' = 'Moved';
    let details = '';
    let category = file.category || determineCategory(file.name);
    let destinationPath = `${category}/${file.resolvedName || file.name}`;

    if (act?.state === 'skipped' || isFolder || isHidden || isSystem) {
      status = 'Skipped';
      if (isFolder) {
        details = 'Skipped — Subdirectory preserved at root';
        category = 'Folder';
        destinationPath = 'Root (Preserved)';
      } else if (isHidden || isSystem) {
        details = act?.sub || 'Skipped — Hidden/system file preserved';
        category = 'Hidden/System';
        destinationPath = 'Root (Preserved)';
      } else {
        details = act?.sub || 'Skipped — Duplicate or rule restriction';
        destinationPath = 'Root (Preserved)';
      }
    } else if (act?.state === 'done') {
      status = 'Moved';
      if (file.isDuplicate && file.resolvedName && file.resolvedName !== file.name) {
        details = `Moved to ${category} and renamed to ${file.resolvedName} to prevent duplicate overwrite`;
      } else {
        details = act.sub || `Moved to ${category}`;
      }
    } else {
      // Default classification based on item properties
      if (file.isDuplicate && file.resolvedName && file.resolvedName !== file.name) {
        details = `Moved to ${category} and renamed to ${file.resolvedName}`;
      } else {
        details = file.humanReason || `Organized into ${category}/`;
      }
    }

    if (status === 'Moved') {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }

    return {
      id: file.id || `rep-${index}`,
      fileName: file.name,
      status,
      category,
      originalSize: file.size || '0 B',
      extension: file.extension || (file.name.includes('.') ? file.name.split('.').pop() || '' : ''),
      sourceLocation: folderName,
      destinationPath,
      details,
      dateModified: file.dateModified || new Date().toLocaleDateString(),
    };
  });

  return {
    metadata: {
      tool: 'Sortly File Organizer',
      version: '1.0.0',
      folderName,
      generatedAt: new Date().toISOString(),
    },
    summary: {
      totalScanned: stats.scanned,
      totalMoved: stats.moved,
      totalSkipped: stats.skipped,
      totalErrors: stats.errors,
      categoryCounts,
    },
    results,
  };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReportAsCsv(report: OrganizationReportData, customFilename?: string): void {
  const safeFolderName = report.metadata.folderName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `Sortly_${safeFolderName}_Report_${dateStr}.csv`;

  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const headers = [
    'File Name',
    'Status',
    'Category',
    'Destination Path',
    'File Size',
    'Extension',
    'Date Modified',
    'Action Details',
  ];

  const rows = report.results.map((item) => [
    escapeCsv(item.fileName),
    escapeCsv(item.status),
    escapeCsv(item.category),
    escapeCsv(item.destinationPath),
    escapeCsv(item.originalSize),
    escapeCsv(item.extension ? `.${item.extension}` : ''),
    escapeCsv(item.dateModified || ''),
    escapeCsv(item.details),
  ]);

  // Prepend summary rows
  const summaryHeader = [
    escapeCsv(`# Sortly Organization Report - ${report.metadata.folderName}`),
    escapeCsv(`Generated: ${report.metadata.generatedAt}`),
    escapeCsv(`Total Scanned: ${report.summary.totalScanned}`),
    escapeCsv(`Total Moved: ${report.summary.totalMoved}`),
    escapeCsv(`Total Skipped: ${report.summary.totalSkipped}`),
    escapeCsv(`Total Errors: ${report.summary.totalErrors}`),
  ];

  const csvContent = [
    summaryHeader.join(','),
    '', // Empty line
    headers.map(escapeCsv).join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\r\n');

  // \uFEFF BOM for Excel compatibility with UTF-8
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

export function exportReportAsJson(report: OrganizationReportData, customFilename?: string): void {
  const safeFolderName = report.metadata.folderName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `Sortly_${safeFolderName}_Report_${dateStr}.json`;

  const jsonContent = JSON.stringify(report, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  triggerDownload(blob, filename);
}
