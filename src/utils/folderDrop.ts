import { FileItem } from '../types';
import { createFileItemFromNativeFile } from './fileHelpers';

export interface DroppedFolderResult {
  folderName: string;
  files: FileItem[];
  itemCount: number;
}

/**
 * Reads all entries from a FileSystemDirectoryReader in batches.
 * Browsers return at most 100 entries per readEntries call.
 */
async function readAllEntriesFromReader(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const entries: FileSystemEntry[] = [];
  while (true) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(
        (results) => resolve(results || []),
        (err) => reject(err)
      );
    });
    if (!batch || batch.length === 0) {
      break;
    }
    entries.push(...batch);
  }
  return entries;
}

/**
 * Recursively traverses a FileSystemDirectoryEntry to extract all files and subdirectories.
 */
async function traverseDirectoryEntry(
  dirEntry: FileSystemDirectoryEntry,
  parentRelativePath: string = ''
): Promise<FileItem[]> {
  const reader = dirEntry.createReader();
  const fileItems: FileItem[] = [];

  try {
    const entries = await readAllEntriesFromReader(reader);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const relativePath = parentRelativePath ? `${parentRelativePath}/${entry.name}` : entry.name;

      if (entry.isFile) {
        try {
          const file = await new Promise<File>((resolve, reject) => {
            (entry as FileSystemFileEntry).file(resolve, reject);
          });
          const item = createFileItemFromNativeFile(file, fileItems.length);
          item.sourcePath = relativePath;
          fileItems.push(item);
        } catch (fileErr) {
          console.warn(`Could not read file ${entry.name}`, fileErr);
        }
      } else if (entry.isDirectory) {
        // Record subfolder as an item so users can see folders in the current view
        fileItems.push({
          id: `folder-${Date.now()}-${fileItems.length}-${Math.random().toString(36).slice(2, 6)}`,
          name: entry.name,
          extension: '',
          size: 'Directory',
          category: 'N/A',
          isFolder: true,
          dateModified: new Date().toLocaleDateString(),
          humanReason: 'Subdirectory preserved untouched',
          sourcePath: relativePath,
        });

        // Recursively read contents of the subdirectory
        try {
          const subDirContents = await traverseDirectoryEntry(entry as FileSystemDirectoryEntry, relativePath);
          fileItems.push(...subDirContents);
        } catch (subErr) {
          console.warn(`Could not traverse subdirectory ${entry.name}`, subErr);
        }
      }
    }
  } catch (err) {
    console.warn(`Failed reading folder entries for ${dirEntry.name}:`, err);
  }

  return fileItems;
}

/**
 * Processes a DataTransfer from a drag-and-drop event.
 * Detects if a directory or collection of files was dropped and extracts them.
 */
export async function processDroppedItems(dataTransfer: DataTransfer): Promise<DroppedFolderResult> {
  const items = dataTransfer.items;

  // Modern browser File System Entry API
  if (items && items.length > 0 && typeof items[0].webkitGetAsEntry === 'function') {
    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) entries.push(entry);
    }

    if (entries.length > 0) {
      // Check if there is at least one directory among dropped entries
      const primaryDir = entries.find((e) => e.isDirectory) as FileSystemDirectoryEntry | undefined;

      if (primaryDir) {
        const folderName = primaryDir.name;
        const allItems: FileItem[] = [];

        for (const entry of entries) {
          if (entry.isDirectory) {
            const dirFiles = await traverseDirectoryEntry(entry as FileSystemDirectoryEntry);
            allItems.push(...dirFiles);
          } else if (entry.isFile) {
            try {
              const file = await new Promise<File>((resolve, reject) => {
                (entry as FileSystemFileEntry).file(resolve, reject);
              });
              allItems.push(createFileItemFromNativeFile(file, allItems.length));
            } catch (err) {
              console.warn(`Error reading file ${entry.name}`, err);
            }
          }
        }

        return {
          folderName,
          files: allItems,
          itemCount: allItems.length,
        };
      }

      // If only standalone files were dropped via Entry API
      const fileItems: FileItem[] = [];
      for (const entry of entries) {
        if (entry.isFile) {
          try {
            const file = await new Promise<File>((resolve, reject) => {
              (entry as FileSystemFileEntry).file(resolve, reject);
            });
            fileItems.push(createFileItemFromNativeFile(file, fileItems.length));
          } catch (err) {
            console.warn(`Error reading file ${entry.name}`, err);
          }
        }
      }

      const folderName = fileItems.length === 1 ? fileItems[0].name : `Dropped Files (${fileItems.length})`;
      return {
        folderName,
        files: fileItems,
        itemCount: fileItems.length,
      };
    }
  }

  // Fallback to dataTransfer.files
  const filesList = Array.from(dataTransfer.files || []);
  if (filesList.length > 0) {
    let folderName = `Dropped Files (${filesList.length})`;
    const firstRel = (filesList[0] as unknown as { webkitRelativePath?: string }).webkitRelativePath;
    if (firstRel && firstRel.includes('/')) {
      folderName = firstRel.split('/')[0];
    }

    const items = filesList.map((f, i) => createFileItemFromNativeFile(f, i));
    return {
      folderName,
      files: items,
      itemCount: items.length,
    };
  }

  return {
    folderName: 'Empty Folder',
    files: [],
    itemCount: 0,
  };
}

/**
 * Processes files selected through a native HTML folder picker (`webkitdirectory`).
 */
export function processNativeFolderFileList(fileList: FileList | File[]): DroppedFolderResult {
  const files = Array.from(fileList);
  if (files.length === 0) {
    return { folderName: 'Empty Folder', files: [], itemCount: 0 };
  }

  let folderName = `Selected Folder (${files.length} items)`;
  const firstRel = (files[0] as unknown as { webkitRelativePath?: string }).webkitRelativePath;
  if (firstRel && firstRel.includes('/')) {
    folderName = firstRel.split('/')[0];
  }

  const items: FileItem[] = files.map((file, i) => {
    const item = createFileItemFromNativeFile(file, i);
    const relPath = (file as unknown as { webkitRelativePath?: string }).webkitRelativePath;
    if (relPath) {
      item.sourcePath = relPath;
    }
    return item;
  });

  return {
    folderName,
    files: items,
    itemCount: items.length,
  };
}
