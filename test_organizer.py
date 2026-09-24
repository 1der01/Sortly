"""
test_organizer.py - Comprehensive automated tests for Desktop File Organizer.

Validates:
1. Extension categorization (Documents, Images, Videos, Audio, Archives, Code, Others)
2. Safe duplicate handling without overwriting
3. Skipping hidden and system files
4. Skipping existing subdirectories
5. Dry-run mode integrity (verifying no files are moved or altered)
6. Real file organization execution
7. Error handling on non-existent or invalid directory paths
"""

import shutil
import tempfile
import unittest
from pathlib import Path

from categories import get_all_categories, get_category_for_extension
from organizer import (
    get_unique_destination_path,
    is_hidden_or_system_file,
    organize_folder,
    scan_directory,
    undo_organization,
)


class TestFileOrganizer(unittest.TestCase):

    def setUp(self):
        # Create an isolated temporary directory for test isolation
        self.test_dir = Path(tempfile.mkdtemp(prefix="test_file_organizer_"))

    def tearDown(self):
        # Clean up temporary test directory
        if self.test_dir.exists():
            shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_category_mappings(self):
        """Verify extension categorization matching."""
        self.assertEqual(get_category_for_extension(".pdf"), "Documents")
        self.assertEqual(get_category_for_extension("docx"), "Documents")
        self.assertEqual(get_category_for_extension("PNG"), "Images")
        self.assertEqual(get_category_for_extension(".mp4"), "Videos")
        self.assertEqual(get_category_for_extension("mp3"), "Audio")
        self.assertEqual(get_category_for_extension("zip"), "Archives")
        self.assertEqual(get_category_for_extension(".py"), "Code")
        self.assertEqual(get_category_for_extension("js"), "Code")
        # Unknown extensions should map to Others
        self.assertEqual(get_category_for_extension("xyz123"), "Others")
        self.assertEqual(get_category_for_extension(""), "Others")
        self.assertEqual(get_category_for_extension(None), "Others")

    def test_hidden_and_system_files(self):
        """Verify hidden and system files are detected for skipping."""
        self.assertTrue(is_hidden_or_system_file(Path(".gitconfig")))
        self.assertTrue(is_hidden_or_system_file(Path(".DS_Store")))
        self.assertTrue(is_hidden_or_system_file(Path("Thumbs.db")))
        self.assertTrue(is_hidden_or_system_file(Path("desktop.ini")))
        self.assertTrue(is_hidden_or_system_file(Path("~$WordDoc.docx")))
        self.assertFalse(is_hidden_or_system_file(Path("normal_doc.pdf")))
        self.assertFalse(is_hidden_or_system_file(Path("photo.jpg")))

    def test_duplicate_renaming_safe(self):
        """Ensure duplicate files are renamed with (1), (2) instead of overwritten."""
        docs_dir = self.test_dir / "Documents"
        docs_dir.mkdir()
        existing_file = docs_dir / "report.pdf"
        existing_file.write_text("existing content", encoding="utf-8")

        target_path, is_renamed = get_unique_destination_path(docs_dir, "report.pdf")
        self.assertTrue(is_renamed)
        self.assertEqual(target_path.name, "report (1).pdf")

        # Now simulate report (1).pdf already existing too
        (docs_dir / "report (1).pdf").write_text("another report", encoding="utf-8")
        target_path_2, is_renamed_2 = get_unique_destination_path(docs_dir, "report.pdf")
        self.assertTrue(is_renamed_2)
        self.assertEqual(target_path_2.name, "report (2).pdf")

    def test_dry_run_does_not_modify_filesystem(self):
        """Verify that dry-run mode leaves all files exactly where they were."""
        f1 = self.test_dir / "invoice.pdf"
        f2 = self.test_dir / "picture.jpg"
        f1.write_text("invoice content", encoding="utf-8")
        f2.write_text("photo data", encoding="utf-8")

        summary = organize_folder(self.test_dir, dry_run=True)

        self.assertTrue(summary.is_dry_run)
        self.assertEqual(summary.scanned_count, 2)
        self.assertEqual(summary.moved_count, 2)  # Staged moves
        self.assertEqual(summary.error_count, 0)

        # Ensure files were NOT moved
        self.assertTrue(f1.exists())
        self.assertTrue(f2.exists())
        # Ensure category folders were NOT created
        self.assertFalse((self.test_dir / "Documents").exists())
        self.assertFalse((self.test_dir / "Images").exists())

    def test_real_organization_execution(self):
        """Test complete real file organization on sample files."""
        # Create a set of diverse files
        (self.test_dir / "resume.pdf").write_text("PDF content", encoding="utf-8")
        (self.test_dir / "notes.txt").write_text("Notes", encoding="utf-8")
        (self.test_dir / "avatar.png").write_text("PNG image", encoding="utf-8")
        (self.test_dir / "song.mp3").write_text("Audio", encoding="utf-8")
        (self.test_dir / "backup.zip").write_text("Zip file", encoding="utf-8")
        (self.test_dir / "script.py").write_text("print('hello')", encoding="utf-8")
        (self.test_dir / "unknown.xyz").write_text("Unknown data", encoding="utf-8")
        (self.test_dir / ".hidden_file").write_text("Hidden", encoding="utf-8")

        # Create an existing subfolder that should be skipped
        sub_dir = self.test_dir / "ExistingSubFolder"
        sub_dir.mkdir()
        (sub_dir / "sub_file.txt").write_text("inside subfolder", encoding="utf-8")

        # Run organizer
        summary = organize_folder(self.test_dir, dry_run=False)

        # Validations
        self.assertEqual(summary.error_count, 0)
        self.assertEqual(summary.moved_count, 7)  # 7 top-level files moved
        self.assertEqual(summary.skipped_count, 2)  # 1 hidden file + 1 subfolder skipped

        # Verify files were moved into proper categories
        self.assertTrue((self.test_dir / "Documents" / "resume.pdf").exists())
        self.assertTrue((self.test_dir / "Documents" / "notes.txt").exists())
        self.assertTrue((self.test_dir / "Images" / "avatar.png").exists())
        self.assertTrue((self.test_dir / "Audio" / "song.mp3").exists())
        self.assertTrue((self.test_dir / "Archives" / "backup.zip").exists())
        self.assertTrue((self.test_dir / "Code" / "script.py").exists())
        self.assertTrue((self.test_dir / "Others" / "unknown.xyz").exists())

        # Verify skipped items remained untouched
        self.assertTrue((self.test_dir / ".hidden_file").exists())
        self.assertTrue((self.test_dir / "ExistingSubFolder" / "sub_file.txt").exists())

        # Verify originals no longer sit in root
        self.assertFalse((self.test_dir / "resume.pdf").exists())
        self.assertFalse((self.test_dir / "avatar.png").exists())

    def test_duplicate_file_during_real_move(self):
        """Ensure moving a duplicate file renames it safely without error."""
        # Create category folder with existing file
        docs = self.test_dir / "Documents"
        docs.mkdir()
        (docs / "contract.docx").write_text("Original contract v1", encoding="utf-8")

        # Create incoming file with identical name in root
        (self.test_dir / "contract.docx").write_text("New contract v2", encoding="utf-8")

        summary = organize_folder(self.test_dir, dry_run=False)

        self.assertEqual(summary.error_count, 0)
        self.assertEqual(summary.moved_count, 1)

        # Both versions must be preserved!
        original_doc = docs / "contract.docx"
        duplicate_doc = docs / "contract (1).docx"
        self.assertTrue(original_doc.exists())
        self.assertTrue(duplicate_doc.exists())
        self.assertEqual(original_doc.read_text(encoding="utf-8"), "Original contract v1")
        self.assertEqual(duplicate_doc.read_text(encoding="utf-8"), "New contract v2")

    def test_invalid_path_handling(self):
        """Test error handling when folder does not exist or is a file."""
        non_existent = self.test_dir / "does_not_exist_xyz"
        summary = organize_folder(non_existent, dry_run=False)
        self.assertEqual(summary.error_count, 1)
        self.assertEqual(summary.moved_count, 0)

    def test_undo_organization(self):
        """Verify that undo safely restores all files to original positions and cleans empty dirs."""
        (self.test_dir / "report.pdf").write_text("Report content", encoding="utf-8")
        (self.test_dir / "song.mp3").write_text("Song content", encoding="utf-8")

        # Organize
        summary = organize_folder(self.test_dir, dry_run=False)
        self.assertEqual(summary.moved_count, 2)
        self.assertTrue((self.test_dir / "Documents" / "report.pdf").exists())
        self.assertTrue((self.test_dir / "Audio" / "song.mp3").exists())

        # Perform Undo
        reverted, errors = undo_organization(self.test_dir)
        self.assertEqual(reverted, 2)
        self.assertEqual(errors, 0)

        # Files should be back in root
        self.assertTrue((self.test_dir / "report.pdf").exists())
        self.assertTrue((self.test_dir / "song.mp3").exists())

        # Empty category directories should be cleaned up
        self.assertFalse((self.test_dir / "Documents").exists())
        self.assertFalse((self.test_dir / "Audio").exists())


if __name__ == "__main__":
    unittest.main()
