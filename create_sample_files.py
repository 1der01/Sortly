"""
create_sample_files.py - Helper script to generate a sample messy directory for testing.

Usage:
    python3 create_sample_files.py [target_directory]
"""

import sys
from pathlib import Path

SAMPLE_FILES = [
    ("Q3_Financial_Report.pdf", "PDF file data for quarterly report"),
    ("Meeting_Notes.docx", "Word document notes from design sync"),
    ("Budget_2026.xlsx", "Excel spreadsheet data"),
    ("todo_checklist.txt", "1. Organize files\n2. Run tests"),
    ("Project_Presentation.pptx", "PowerPoint presentation slides"),
    ("profile_avatar.png", "PNG image binary simulator"),
    ("sunset_vacation.jpg", "JPEG photo data"),
    ("company_logo.svg", "<svg><circle cx='50' cy='50' r='40'/></svg>"),
    ("animation_demo.gif", "GIF animated frame simulator"),
    ("screencast_demo.mp4", "MP4 video stream simulator"),
    ("quick_clip.mov", "Apple QuickTime video stream"),
    ("podcast_ep42.mp3", "MP3 audio track"),
    ("sound_effect.wav", "WAV audio sample"),
    ("voice_memo.flac", "FLAC lossless audio"),
    ("data_archive_2025.zip", "ZIP compressed container"),
    ("legacy_backup.tar.gz", "GZ tarball archive"),
    ("compress_bundle.7z", "7-Zip compressed file"),
    ("data_processor.py", "import sys\nprint('Processing data')"),
    ("app_script.js", "console.log('App ready');"),
    ("styles_main.css", "body { margin: 0; background: #fafafa; }"),
    ("index_template.html", "<!doctype html><html><body><h1>Hello</h1></body></html>"),
    ("api_query.sql", "SELECT * FROM users WHERE active = 1;"),
    ("custom_firmware.bin", "Binary file format with unknown extension"),
    ("proprietary_cache.dat", "Raw data file for custom engine"),
    (".env_secret", "API_KEY=test12345 (hidden file, must be skipped)"),
    (".DS_Store", "System macOS desktop store file (must be skipped)"),
]


def generate_sample_folder(target_dir: Path) -> Path:
    target_dir.mkdir(parents=True, exist_ok=True)
    print(f"Populating sample directory: {target_dir}")

    for filename, content in SAMPLE_FILES:
        file_path = target_dir / filename
        file_path.write_text(content, encoding="utf-8")
        print(f"  + Created {filename}")

    # Create an existing subfolder to verify folder skipping
    subfolder = target_dir / "ExistingProjectsFolder"
    subfolder.mkdir(exist_ok=True)
    (subfolder / "nested_project_file.txt").write_text("Nested content", encoding="utf-8")
    print(f"  + Created subfolder {subfolder.name}/ (with nested file)")

    # Create a duplicate file to test conflict resolution
    # By creating Documents/Q3_Financial_Report.pdf beforehand,
    # moving root's Q3_Financial_Report.pdf will trigger rename to 'Q3_Financial_Report (1).pdf'
    docs_dir = target_dir / "Documents"
    docs_dir.mkdir(exist_ok=True)
    (docs_dir / "Q3_Financial_Report.pdf").write_text("Pre-existing report v1", encoding="utf-8")
    print("  + Created existing Documents/Q3_Financial_Report.pdf (to test duplicate rename)")

    print("\nSample folder successfully populated!")
    return target_dir


if __name__ == "__main__":
    folder = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("sample_messy_folder")
    generate_sample_folder(folder)
