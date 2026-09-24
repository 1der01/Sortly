# Sortly

> **Organize your files automatically.**

Sortly is a lightweight, reliable desktop application built with Python and Tkinter that automatically scans and organizes files in any cluttered directory (such as your Downloads or Desktop folder) into structured, categorized subfolders based on file extensions.

---

## Brand Identity

- **Name**: Sortly
- **Tagline**: *"Organize your files automatically."*
- **Brand Personality**: Simple, Reliable, Practical, Clean, Efficient
- **Logo**: A clean folder combined with a sorting arrow.

---

## 1. Project Purpose

Every day, files accumulate rapidly in default download and desktop folders: invoices, receipts, screenshots, camera photos, setup installers, source code files, and archives. Sorting these manually is tedious and error-prone.

The **Desktop File Organizer** provides a safe, one-click solution. It scans a chosen directory, determines each file's category according to its file extension, and moves it to its designated category subfolder (e.g., `Documents/`, `Images/`, `Videos/`, `Archives/`, `Code/`, `Others/`). 

Crucially, **reliability and file safety are prioritized**:
- Existing files are **never overwritten** (duplicate names receive automatic ` (1)`, ` (2)` numbering).
- Files are **never deleted**.
- File contents are **never modified**.
- A **Dry Run mode** allows you to preview all planned actions before any files are touched.

---

## 2. Features

- **Folder Selection**: Easily browse and select any directory on your system.
- **Categorization Engine**: Automatically classifies files into 7 well-defined categories:
  - **Documents**: `PDF`, `DOC`, `DOCX`, `TXT`, `XLSX`, `XLS`, `PPT`, `PPTX`, `CSV`, `RTF`, `ODT`, `MD`
  - **Images**: `JPG`, `JPEG`, `PNG`, `GIF`, `WEBP`, `SVG`, `BMP`, `ICO`, `TIFF`, `HEIC`
  - **Videos**: `MP4`, `MKV`, `AVI`, `MOV`, `WEBM`, `WMV`, `FLV`, `M4V`
  - **Audio**: `MP3`, `WAV`, `FLAC`, `M4A`, `AAC`, `OGG`, `WMA`, `OPUS`
  - **Archives**: `ZIP`, `RAR`, `7Z`, `TAR`, `GZ`, `BZ2`, `XZ`, `ISO`
  - **Code**: `PY`, `JS`, `HTML`, `CSS`, `PHP`, `JAVA`, `C`, `CPP`, `TS`, `JSON`, `SQL`, `SH`
  - **Others**: Any unknown extension or files without extensions.
- **Safe Duplicate Handling**: If a file named `Invoice.pdf` already exists in `Documents/`, an incoming file of the same name is safely renamed to `Invoice (1).pdf`.
- **Dry Run / Preview Mode**: Inspect all moves, category placements, and duplicate renames before committing.
- **Safety Filters**:
  - Automatically skips existing subdirectories (prevents recursive or nested loop moves).
  - Automatically ignores hidden files (`.git`, `.env`, `.DS_Store`) and temporary lock files (`~$doc.docx`).
- **Real-Time Activity Log & Visual Badges**: Watch each move as it happens with clear color indicators.
- **Detailed Summary**: Live counter cards showing Files Scanned, Files Moved, Files Skipped, and Errors.
- **Non-Blocking Threading**: File operations execute in a background thread so the user interface remains responsive even on large folders.
- **CLI & Headless Compatibility**: Also works from command-line terminals or headless servers via `python3 main.py <folder> [--dry-run]`.

---

## 3. Technologies Used

- **Python 3.8+**: Clean, modern Python implementation.
- **`pathlib`**: Object-oriented filesystem path operations and cross-platform compatibility.
- **`shutil`**: Atomic, safe file relocation (`shutil.move`).
- **`tkinter` & `ttk`**: Standard Python graphical user interface with modern ttk styling.
- **`threading`**: Asynchronous worker execution keeping GUI animations smooth.
- **`dataclasses`**: Structured result objects and metric tracking.

*Zero external third-party dependencies are required.*

---

## 4. How the Organizer Works

```
                     +---------------------------+
                     | User Selects Folder Path  |
                     +-------------+-------------+
                                   |
                                   v
                     +---------------------------+
                     | Scan Directory (iterdir)  |
                     +-------------+-------------+
                                   |
           +-----------------------+-----------------------+
           |                                               |
           v (is_dir or is_hidden or system file)          v (regular file)
     [ Skip Item ]                               +--------------------+
                                                 | Extract Extension  |
                                                 +---------+----------+
                                                           |
                                                           v
                                                 +--------------------+
                                                 | Look Up Category   |
                                                 | (categories.py)    |
                                                 +---------+----------+
                                                           |
                                                           v
                                                 +--------------------+
                                                 | Check Collision    |
                                                 | in Target Folder   |
                                                 +---------+----------+
                                                           |
                                   +-----------------------+-----------------------+
                                   |                                               |
                                   v (target exists)                               v (no collision)
                      [ Generate `file (1).ext` ]                            [ Keep filename ]
                                   |                                               |
                                   +-----------------------+-----------------------+
                                                           |
                                                           v
                                                Is Dry Run Checked?
                                            /                         \
                                      YES  /                           \  NO
                                          v                             v
                           [ Log Planned Move Action ]      [ Make Directory if Needed ]
                           [ Increment Staged Counter]      [ Move File with shutil.move ]
                                          \                             v
                                           \                [ Log Success & Increment Moved ]
                                            \                         /
                                             +-----------+-----------+
                                                         |
                                                         v
                                              +---------------------+
                                              | Output Summary View |
                                              +---------------------+
```

---

## 5. Project Structure

```
file-organizer/
├── main.py            # Tkinter GUI, event handlers, background threading, and CLI entry
├── organizer.py       # Scanning engine, duplicate resolver, safety filters, and file moves
├── categories.py      # Extension-to-category dictionary and mapping helpers
├── test_organizer.py  # Automated unit test suite validating all scenarios
├── requirements.txt   # Standard library dependency documentation
└── README.md          # Complete user guide and technical documentation
```

---

## 6. Installation Instructions

### Prerequisites
Make sure you have **Python 3.8** or newer installed.

Check your Python version:
```bash
python3 --version
```

### Linux (Ubuntu / Debian)
On some minimal Linux installations, `tkinter` is packaged separately:
```bash
sudo apt-get update
sudo apt-get install python3-tk
```

### Windows & macOS
Python installers from [python.org](https://www.python.org/downloads/) automatically bundle Tkinter. No extra installation is required!

---

## 7. How to Run It

### Graphical User Interface (GUI)
Simply run `main.py`:
```bash
python3 main.py
```

### Command-Line Interface (CLI / Headless)
You can also run the organizer directly from the terminal:

**Dry Run Preview (Recommended first):**
```bash
python3 main.py /path/to/your/folder --dry-run
```

**Perform Actual Organization:**
```bash
python3 main.py /path/to/your/folder
```

### Run Automated Tests
```bash
python3 -m unittest test_organizer.py
```

---

## 8. Example of Before and After Folder Structure

### Before Organization:
```
Downloads/
├── Q3_Financial_Report.pdf
├── project_mockup.png
├── holiday_beach.jpg
├── vacation_clip.mp4
├── acoustic_track.mp3
├── dataset_backup.zip
├── scraper_script.py
├── style_theme.css
├── random_firmware.bin
├── .gitconfig                 <-- (Hidden, will be skipped)
└── Receipts_2025/             <-- (Subfolder, will be skipped)
```

### After Organization:
```
Downloads/
├── Documents/
│   └── Q3_Financial_Report.pdf
├── Images/
│   ├── project_mockup.png
│   └── holiday_beach.jpg
├── Videos/
│   └── vacation_clip.mp4
├── Audio/
│   └── acoustic_track.mp3
├── Archives/
│   └── dataset_backup.zip
├── Code/
│   ├── scraper_script.py
│   └── style_theme.css
├── Others/
│   └── random_firmware.bin
├── .gitconfig                 <-- (Untouched)
└── Receipts_2025/             <-- (Untouched)
```

---

## 9. Screenshots Section

### Application Window Overview

```
+---------------------------------------------------------------------------------+
| Desktop File Organizer                                                [ - ][ X ]|
+---------------------------------------------------------------------------------+
| Organize cluttered directories into categorized subfolders safely by file type. |
|                                                                                 |
| Target Folder:                                                                  |
| [ /home/user/Downloads                                      ] [ Browse Folder ]|
|                                                                                 |
| [X] Dry Run (Preview only - no files will be moved)   [ Clear Status ] [ Organize ]
|                                                                                 |
| Summary Metrics:                                                                |
| +--------------+  +--------------+  +--------------+  +--------------+          |
| |      14      |  |      12      |  |      2       |  |      0       |          |
| | Files Scanned|  | Files Moved  |  | Files Skipped|  |    Errors    |          |
| +--------------+  +--------------+  +--------------+  +--------------+          |
|                                                                                 |
| Activity Log & Status:                                                          |
| +-----------------------------------------------------------------------------+ |
| | [14:20:01] Starting file scan in: /home/user/Downloads                      | |
| | [14:20:01] Skipped subdirectory: Receipts_2025                              | |
| | [14:20:01] Skipped hidden file: .gitconfig                                  | |
| | [14:20:01] Moved 'Q3_Financial_Report.pdf' -> 'Documents/Q3_Financial_...   | |
| | [14:20:01] Moved 'project_mockup.png' -> 'Images/project_mockup.png'        | |
| | [14:20:01] Moved 'invoice.pdf' -> 'Documents/invoice (1).pdf' [Duplicate]   | |
| | [14:20:02] Finished! Scanned: 14, Moved: 12, Skipped: 2, Errors: 0         | |
| +-----------------------------------------------------------------------------+ |
| Ready. Selected folder: /home/user/Downloads                                    |
+---------------------------------------------------------------------------------+
```

---

## 10. Limitations

1. **Top-Level Organization Only**: By design, the organizer only processes files sitting directly in the selected folder. It does not recursively flatten or destroy nested user subdirectories.
2. **Extension-Based Identification**: Classification relies on file extensions rather than deep binary MIME sniffing. If an image is misnamed `photo.txt`, it will be sorted into Documents.
3. **Open / Locked Files**: On Windows, files currently open with write locks in other applications (such as active Word documents) may throw OS sharing violations and will be logged under Errors without stopping other file moves.

---

## 11. Future Improvements

- **Custom Category Editor**: Allow users to add custom categories or modify existing extension associations via a GUI settings dialog.
- **Date-Based Sorting**: Sub-categorize files by Year/Month (e.g., `Images/2026/03/`).
- **Undo Operation**: Maintain a transactional journal file allowing one-click rollback of the last move operation.
- **MIME Type Magic Byte Detection**: Optionally inspect file header signatures (`python-magic`) to classify files with incorrect or missing extensions.
- **Desktop Shortcut & Drag-and-Drop**: Support dragging folders directly onto the application window.
