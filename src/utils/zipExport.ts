import JSZip from 'jszip';
import { FileItem } from '../types';

/**
 * Exports organized files into a structured ZIP file with folders for each category.
 * If real File blobs exist, their actual binary contents are preserved.
 * If simulated items (presets) are used, creates clean text files with metadata so the
 * folder structure can be inspected on the user's real desktop.
 */
export async function downloadOrganizedZip(
  files: FileItem[],
  zipFilename: string = 'Sortly_Organized_Files.zip'
): Promise<void> {
  const zip = new JSZip();

  for (const item of files) {
    // Determine the destination path inside the zip
    const categoryFolder = item.category || 'Others';
    const finalFilename = item.resolvedName || item.name;

    if (item.isFolder) {
      // Subdirectories are kept as-is or skipped
      continue;
    }

    const folder = zip.folder(categoryFolder);
    if (!folder) continue;

    if (item.realFile) {
      // Real user-uploaded file
      folder.file(finalFilename, item.realFile);
    } else {
      // Simulated sample preset file: create a placeholder file with descriptive content
      const content = `[Sortly File Organizer]
Original Name: ${item.name}
Organized Name: ${finalFilename}
Category: ${item.category}
Original Size: ${item.size}
Date: ${item.dateModified || new Date().toLocaleDateString()}
Reason: Sorted automatically by extension (.${item.extension || 'none'}) into ${categoryFolder}/.
`;
      folder.file(finalFilename, content);
    }
  }

  // Generate the zip blob and trigger instant download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = zipFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
