"""
organizer.py - Core file scanning, categorization, and safe moving operations.

Technical Highlights:
- Uses pathlib.Path for all file path operations.
- Uses shutil.move for safe atomic file relocation.
- Safeguards against overwriting existing files via unique suffix generation.
- Respects dry-run mode (simulating all steps without filesystem mutation).
- Skips directories, hidden files, and system files.
- Provides comprehensive tracking of scanned, moved, skipped, and errored files.
"""

from __future__ import annotations

import json
import shutil
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable, List, Optional, Tuple

from categories import DEFAULT_CATEGORY, get_all_categories, get_category_for_extension

# Known system files that should be ignored during organization
SYSTEM_FILES = {
    "thumbs.db",
    "desktop.ini",
    ".ds_store",
    "ehthumbs.db",
    "icon\r",  # macOS custom folder icon file is literally named "Icon" + CR
    "$recycle.bin",
}


@dataclass
class OrganizationAction:
    """Represents an individual file operation (dry-run or real move)."""
    source: Path
    destination: Path
    category: str
    status: str  # 'moved', 'dry_run', 'skipped', 'error'
    message: str
    is_duplicate_renamed: bool = False


@dataclass
class OrganizationSummary:
    """Holds aggregated metrics and logs of the organization process."""
    folder_path: Path
    is_dry_run: bool
    scanned_count: int = 0
    moved_count: int = 0
    skipped_count: int = 0
    error_count: int = 0
    actions: List[OrganizationAction] = field(default_factory=list)
    errors: List[Tuple[str, str]] = field(default_factory=list)  # (filename, reason)


def is_hidden_or_system_file(path: Path) -> bool:
    """
    Determines if a file is hidden or a known system file.

    Rules:
    - Names starting with '.' (UNIX/macOS hidden files, e.g. .git, .env)
    - Files starting with '~$' (Office temporary lock files)
    - Well-known system filenames (Thumbs.db, desktop.ini, .DS_Store)
    - Files inside already created category folders are not scanned since we only
      scan top-level items in the chosen folder.
    """
    name = path.name.lower()

    if name.startswith(".") or name.startswith("~$"):
        return True

    if name in SYSTEM_FILES:
        return True

    return False


def get_unique_destination_path(destination_dir: Path, original_filename: str) -> Tuple[Path, bool]:
    """
    Calculates a non-colliding destination path in destination_dir.

    If destination_dir / original_filename does not exist, returns it as-is.
    If it exists, appends ' (1)', ' (2)', etc., before the file suffix.
    Guarantees no file will ever be silently overwritten.

    Returns:
        Tuple of (unique_destination_path, is_renamed_flag)
    """
    target = destination_dir / original_filename
    if not target.exists():
        return target, False

    source_path = Path(original_filename)
    stem = source_path.stem
    suffix = source_path.suffix

    counter = 1
    while True:
        candidate_name = f"{stem} ({counter}){suffix}"
        candidate_path = destination_dir / candidate_name
        if not candidate_path.exists():
            return candidate_path, True
        counter += 1


def scan_directory(folder_path: Path) -> Tuple[List[Path], List[Path]]:
    """
    Scans the given folder for top-level entries.

    Returns:
        Tuple of (valid_files, skipped_entries)
    """
    valid_files: List[Path] = []
    skipped_entries: List[Path] = []

    for entry in folder_path.iterdir():
        # Skip subdirectories (we do not organize subfolders into categories)
        if entry.is_dir():
            skipped_entries.append(entry)
            continue

        # Skip hidden files and special system files
        if is_hidden_or_system_file(entry):
            skipped_entries.append(entry)
            continue

        if entry.is_file():
            valid_files.append(entry)
        else:
            # Special devices, pipes, sockets, etc.
            skipped_entries.append(entry)

    # Sort files alphabetically for deterministic processing
    valid_files.sort(key=lambda p: p.name.lower())
    return valid_files, skipped_entries


def organize_folder(
    folder_path: Path,
    dry_run: bool = False,
    progress_callback: Optional[Callable[[str, str], None]] = None
) -> OrganizationSummary:
    """
    Scans and organizes all files in folder_path into categorized subdirectories.

    Args:
        folder_path: Path to the target directory.
        dry_run: If True, simulates moves without touching the filesystem.
        progress_callback: Optional callback receiving (message, level) for live GUI updates.

    Returns:
        OrganizationSummary containing counts, action logs, and errors.
    """
    summary = OrganizationSummary(folder_path=folder_path, is_dry_run=dry_run)

    def log(message: str, level: str = "info"):
        if progress_callback:
            progress_callback(message, level)

    # Path validation
    if not folder_path.exists():
        err_msg = f"The path does not exist: {folder_path}"
        summary.error_count += 1
        summary.errors.append((str(folder_path), err_msg))
        log(f"ERROR: {err_msg}", "error")
        return summary

    if not folder_path.is_dir():
        err_msg = f"The selected path is not a directory: {folder_path}"
        summary.error_count += 1
        summary.errors.append((str(folder_path), err_msg))
        log(f"ERROR: {err_msg}", "error")
        return summary

    mode_label = "[DRY RUN] " if dry_run else ""
    log(f"{mode_label}Starting file scan in: {folder_path}", "info")

    try:
        files_to_process, skipped_items = scan_directory(folder_path)
    except PermissionError as pe:
        err_msg = f"Permission denied while reading directory: {pe}"
        summary.error_count += 1
        summary.errors.append((str(folder_path), err_msg))
        log(f"ERROR: {err_msg}", "error")
        return summary
    except Exception as e:
        err_msg = f"Unexpected error scanning directory: {e}"
        summary.error_count += 1
        summary.errors.append((str(folder_path), err_msg))
        log(f"ERROR: {err_msg}", "error")
        return summary

    summary.scanned_count = len(files_to_process) + len(skipped_items)
    summary.skipped_count = len(skipped_items)

    for item in skipped_items:
        reason = "Subdirectory" if item.is_dir() else "Hidden/System file"
        summary.actions.append(
            OrganizationAction(
                source=item,
                destination=item,
                category="N/A",
                status="skipped",
                message=f"Skipped {reason}: {item.name}"
            )
        )
        log(f"Skipped {reason.lower()}: {item.name}", "skipped")

    if not files_to_process:
        log(f"{mode_label}No eligible files found to organize.", "warning")
        return summary

    log(f"{mode_label}Found {len(files_to_process)} files to organize.", "info")

    # Track simulated targets in dry run to ensure duplicate detection works
    # even when moving multiple files with the same name during a single dry run
    simulated_existing: set[Path] = set()

    for file_path in files_to_process:
        try:
            # 1. Determine category based on extension
            extension = file_path.suffix
            category = get_category_for_extension(extension)
            target_dir = folder_path / category

            # 2. Check duplicate / non-colliding destination path
            if dry_run:
                # In dry run, check both real filesystem and simulated targets
                target_path, is_renamed = _resolve_dry_run_path(target_dir, file_path.name, simulated_existing)
                simulated_existing.add(target_path)
            else:
                # In real run, create category directory if needed
                target_dir.mkdir(parents=True, exist_ok=True)
                target_path, is_renamed = get_unique_destination_path(target_dir, file_path.name)

            # Check if file is already in its destination (edge case where target == source)
            if target_path.resolve() == file_path.resolve():
                summary.skipped_count += 1
                action = OrganizationAction(
                    source=file_path,
                    destination=target_path,
                    category=category,
                    status="skipped",
                    message=f"Already in {category}: {file_path.name}"
                )
                summary.actions.append(action)
                log(f"Already in correct location: {file_path.name}", "skipped")
                continue

            # 3. Perform move or log dry run
            if dry_run:
                rename_notice = f" (renamed to '{target_path.name}' to avoid duplicate)" if is_renamed else ""
                log(f"[Dry Run] Would move '{file_path.name}' -> '{category}/{target_path.name}'{rename_notice}", "dry_run")
                summary.moved_count += 1
                action = OrganizationAction(
                    source=file_path,
                    destination=target_path,
                    category=category,
                    status="dry_run",
                    message=f"Would move to {category}/{target_path.name}{rename_notice}",
                    is_duplicate_renamed=is_renamed
                )
                summary.actions.append(action)
            else:
                # Safe move using shutil
                shutil.move(str(file_path), str(target_path))
                rename_notice = f" (renamed to '{target_path.name}' to prevent overwrite)" if is_renamed else ""
                log(f"Moved '{file_path.name}' -> '{category}/{target_path.name}'{rename_notice}", "success")
                summary.moved_count += 1
                action = OrganizationAction(
                    source=file_path,
                    destination=target_path,
                    category=category,
                    status="moved",
                    message=f"Moved to {category}/{target_path.name}{rename_notice}",
                    is_duplicate_renamed=is_renamed
                )
                summary.actions.append(action)

        except PermissionError as pe:
            err_msg = f"Permission denied for '{file_path.name}': {pe}"
            summary.error_count += 1
            summary.errors.append((file_path.name, err_msg))
            log(f"ERROR: {err_msg}", "error")
        except shutil.Error as se:
            err_msg = f"Move error for '{file_path.name}': {se}"
            summary.error_count += 1
            summary.errors.append((file_path.name, err_msg))
            log(f"ERROR: {err_msg}", "error")
        except Exception as e:
            err_msg = f"Failed to organize '{file_path.name}': {e}"
            summary.error_count += 1
            summary.errors.append((file_path.name, err_msg))
            log(f"ERROR: {err_msg}", "error")

    # If real moves took place, save an undo journal to give users complete peace of mind
    if not dry_run and summary.moved_count > 0:
        save_undo_journal(summary)

    log(
        f"{mode_label}Finished! Scanned: {summary.scanned_count}, "
        f"Moved: {summary.moved_count}, Skipped: {summary.skipped_count}, "
        f"Errors: {summary.error_count}",
        "success" if summary.error_count == 0 else "warning"
    )

    return summary


def get_undo_journal_path(folder_path: Path) -> Path:
    """Returns the hidden undo journal file path for a directory."""
    return folder_path / ".organizer_undo.json"


def save_undo_journal(summary: OrganizationSummary) -> Optional[Path]:
    """
    Saves an undo journal recording the original source and destination
    for all relocated files, providing human peace of mind and 1-click rollback.
    """
    try:
        journal_path = get_undo_journal_path(summary.folder_path)
        records = [
            {
                "source": str(a.source.resolve()),
                "destination": str(a.destination.resolve()),
                "category": a.category,
                "is_duplicate_renamed": a.is_duplicate_renamed,
            }
            for a in summary.actions
            if a.status == "moved"
        ]
        with open(journal_path, "w", encoding="utf-8") as f:
            json.dump(
                {"timestamp": datetime.now().isoformat(timespec="seconds"), "moves": records},
                f,
                indent=2,
            )
        return journal_path
    except Exception:
        return None


def undo_organization(
    folder_path: Path,
    progress_callback: Optional[Callable[[str, str], None]] = None
) -> Tuple[int, int]:
    """
    Reverses the last organization run, moving all categorized files
    back to their original locations and removing empty category folders.

    Returns:
        Tuple of (reverted_count, error_count)
    """
    def log(msg: str, level: str = "info"):
        if progress_callback:
            progress_callback(msg, level)

    journal_path = get_undo_journal_path(folder_path)
    if not journal_path.exists():
        log("No previous organization journal found to undo in this directory.", "warning")
        return 0, 0

    log("Starting Undo: Restoring your files to original locations...", "info")
    try:
        with open(journal_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        log(f"Failed to read undo journal: {e}", "error")
        return 0, 1

    moves = data.get("moves", [])
    reverted = 0
    errors = 0
    categories_touched = set()

    for item in reversed(moves):
        src_orig = Path(item["source"])
        dest_curr = Path(item["destination"])
        category = item.get("category", "")
        if category:
            categories_touched.add(folder_path / category)

        if not dest_curr.exists():
            log(f"Cannot revert '{dest_curr.name}': file not found in category folder.", "warning")
            errors += 1
            continue

        try:
            # Move back to the original path without ever overwriting a file
            # that may have been recreated there since the organization ran.
            restore_target, was_renamed = get_unique_destination_path(src_orig.parent, src_orig.name)
            shutil.move(str(dest_curr), str(restore_target))
            if was_renamed:
                log(
                    f"Restored '{dest_curr.name}' as '{restore_target.name}' "
                    f"(original name already in use; renamed to avoid overwrite).",
                    "warning",
                )
            else:
                log(f"Restored '{src_orig.name}' back to root folder.", "success")
            reverted += 1
        except Exception as e:
            log(f"Error restoring '{dest_curr.name}': {e}", "error")
            errors += 1

    # Clean up empty category folders if left unoccupied
    for cat_dir in categories_touched:
        if cat_dir.exists() and cat_dir.is_dir():
            remaining = [p for p in cat_dir.iterdir() if not is_hidden_or_system_file(p)]
            if not remaining:
                try:
                    cat_dir.rmdir()
                    log(f"Removed empty category folder: {cat_dir.name}/", "info")
                except Exception:
                    pass

    # Remove the journal after undoing
    try:
        journal_path.unlink()
    except Exception:
        pass

    log(f"Undo complete! Restored {reverted} files safely with {errors} errors.", "success" if errors == 0 else "warning")
    return reverted, errors


def _resolve_dry_run_path(target_dir: Path, filename: str, simulated_existing: set[Path]) -> Tuple[Path, bool]:
    """Resolves duplicate paths during dry run without writing to disk."""
    candidate = target_dir / filename
    if not candidate.exists() and candidate not in simulated_existing:
        return candidate, False

    source_path = Path(filename)
    stem = source_path.stem
    suffix = source_path.suffix

    counter = 1
    while True:
        candidate_name = f"{stem} ({counter}){suffix}"
        candidate_path = target_dir / candidate_name
        if not candidate_path.exists() and candidate_path not in simulated_existing:
            return candidate_path, True
        counter += 1
