"""
main.py - Desktop File Organizer Application with Tkinter GUI.

Features:
1. Folder selection button and path display
2. Dry Run checkbox (preview mode without moving files)
3. Organize button with background worker thread (non-blocking GUI)
4. Real-time scrolling progress and status log with colored badges
5. Comprehensive metrics summary (Files scanned, moved, skipped, errors)
6. Clear status button
7. Quick sample folder generator for rapid testing
8. CLI fallback mode for headless environments or terminal workflows
"""

import os
import sys
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional

from organizer import OrganizationSummary, organize_folder, undo_organization

# Check if GUI (tkinter) is available
HAS_TKINTER = False
try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
    from tkinter.scrolledtext import ScrolledText
    # Verify display connection if on Unix
    if sys.platform != "win32" and not os.environ.get("DISPLAY"):
        HAS_TKINTER = False
    else:
        HAS_TKINTER = True
except Exception:
    HAS_TKINTER = False


class FileOrganizerGUI:
    """Tkinter Desktop Graphical User Interface for File Organizer."""

    def __init__(self, root: "tk.Tk"):
        self.root = root
        self.root.title("Sortly — Organize your files automatically.")
        self.root.geometry("820x680")
        self.root.minsize(700, 560)

        # Variables
        self.folder_path_var = tk.StringVar(value="")
        self.dry_run_var = tk.BooleanVar(value=True)  # Safe default to Dry Run
        self.status_var = tk.StringVar(value="Ready. Select a folder to begin.")
        self.is_running = False

        # Summary metric tracking variables
        self.metric_scanned_var = tk.StringVar(value="0")
        self.metric_moved_var = tk.StringVar(value="0")
        self.metric_skipped_var = tk.StringVar(value="0")
        self.metric_errors_var = tk.StringVar(value="0")

        self._configure_styles()
        self._build_ui()

    def _configure_styles(self):
        style = ttk.Style()
        # Use clean modern theme if available
        available_themes = style.theme_names()
        if "clam" in available_themes:
            style.theme_use("clam")

        # Custom button and frame stylings
        style.configure("TButton", padding=6, font=("Segoe UI", 10))
        style.configure("Primary.TButton", font=("Segoe UI", 10, "bold"))
        style.configure("Header.TLabel", font=("Segoe UI", 14, "bold"))
        style.configure("Subheader.TLabel", font=("Segoe UI", 9), foreground="#555555")
        style.configure("MetricNum.TLabel", font=("Segoe UI", 16, "bold"))
        style.configure("MetricLabel.TLabel", font=("Segoe UI", 9), foreground="#666666")

    def _build_ui(self):
        main_container = ttk.Frame(self.root, padding="16 16 16 16")
        main_container.pack(fill=tk.BOTH, expand=True)

        # -----------------------------------------------------------------
        # 1. Header & App Description
        # -----------------------------------------------------------------
        header_frame = ttk.Frame(main_container)
        header_frame.pack(fill=tk.X, pady=(0, 12))

        title_label = ttk.Label(header_frame, text="Sortly", style="Header.TLabel")
        title_label.pack(anchor=tk.W)

        sub_label = ttk.Label(
            header_frame,
            text="Organize your files automatically.",
            style="Subheader.TLabel"
        )
        sub_label.pack(anchor=tk.W, pady=(2, 0))

        # -----------------------------------------------------------------
        # 2. Folder Selection Section
        # -----------------------------------------------------------------
        folder_group = ttk.LabelFrame(main_container, text=" Target Folder ", padding="12 10 12 12")
        folder_group.pack(fill=tk.X, pady=(0, 12))

        folder_row = ttk.Frame(folder_group)
        folder_row.pack(fill=tk.X)

        self.path_entry = ttk.Entry(
            folder_row,
            textvariable=self.folder_path_var,
            font=("Consolas", 10)
        )
        self.path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8))

        self.browse_btn = ttk.Button(
            folder_row,
            text="Browse Folder...",
            command=self._on_browse_folder
        )
        self.browse_btn.pack(side=tk.RIGHT)

        # -----------------------------------------------------------------
        # 3. Execution Options & Controls
        # -----------------------------------------------------------------
        control_frame = ttk.Frame(main_container)
        control_frame.pack(fill=tk.X, pady=(0, 12))

        # Left: Dry Run Checkbox
        self.dry_run_check = ttk.Checkbutton(
            control_frame,
            text="Dry Run (Preview only - no files will be moved)",
            variable=self.dry_run_var
        )
        self.dry_run_check.pack(side=tk.LEFT, padx=(4, 0))

        # Right: Action Buttons
        button_box = ttk.Frame(control_frame)
        button_box.pack(side=tk.RIGHT)

        self.clear_btn = ttk.Button(
            button_box,
            text="Clear Status",
            command=self._on_clear_status
        )
        self.clear_btn.pack(side=tk.LEFT, padx=(0, 8))

        self.undo_btn = ttk.Button(
            button_box,
            text="Undo Last Clean",
            command=self._on_undo_organize
        )
        self.undo_btn.pack(side=tk.LEFT, padx=(0, 8))

        self.organize_btn = ttk.Button(
            button_box,
            text="Organize Files",
            style="Primary.TButton",
            command=self._on_start_organize
        )
        self.organize_btn.pack(side=tk.LEFT)

        # -----------------------------------------------------------------
        # 4. Summary Metrics Cards
        # -----------------------------------------------------------------
        summary_frame = ttk.LabelFrame(main_container, text=" Summary Metrics ", padding="10 8 10 8")
        summary_frame.pack(fill=tk.X, pady=(0, 12))

        for col_idx in range(4):
            summary_frame.columnconfigure(col_idx, weight=1)

        # Metric 1: Scanned
        m1 = ttk.Frame(summary_frame)
        m1.grid(row=0, column=0, padx=6, pady=4, sticky="nsew")
        ttk.Label(m1, textvariable=self.metric_scanned_var, style="MetricNum.TLabel").pack()
        ttk.Label(m1, text="Files Scanned", style="MetricLabel.TLabel").pack()

        # Metric 2: Moved
        m2 = ttk.Frame(summary_frame)
        m2.grid(row=0, column=1, padx=6, pady=4, sticky="nsew")
        self.moved_label = ttk.Label(m2, textvariable=self.metric_moved_var, style="MetricNum.TLabel", foreground="#0d6efd")
        self.moved_label.pack()
        ttk.Label(m2, text="Files Moved / Staged", style="MetricLabel.TLabel").pack()

        # Metric 3: Skipped
        m3 = ttk.Frame(summary_frame)
        m3.grid(row=0, column=2, padx=6, pady=4, sticky="nsew")
        ttk.Label(m3, textvariable=self.metric_skipped_var, style="MetricNum.TLabel", foreground="#6c757d").pack()
        ttk.Label(m3, text="Files Skipped", style="MetricLabel.TLabel").pack()

        # Metric 4: Errors
        m4 = ttk.Frame(summary_frame)
        m4.grid(row=0, column=3, padx=6, pady=4, sticky="nsew")
        ttk.Label(m4, textvariable=self.metric_errors_var, style="MetricNum.TLabel", foreground="#dc3545").pack()
        ttk.Label(m4, text="Errors Encountered", style="MetricLabel.TLabel").pack()

        # -----------------------------------------------------------------
        # 5. Activity Log & Progress Display
        # -----------------------------------------------------------------
        log_group = ttk.LabelFrame(main_container, text=" Activity Log & Status ", padding="8 8 8 8")
        log_group.pack(fill=tk.BOTH, expand=True, pady=(0, 8))

        self.log_text = ScrolledText(
            log_group,
            wrap=tk.WORD,
            font=("Consolas", 9),
            bg="#f8f9fa",
            fg="#212529",
            borderwidth=1,
            relief="solid"
        )
        self.log_text.pack(fill=tk.BOTH, expand=True)

        # Configure color tags for log message levels
        self.log_text.tag_configure("info", foreground="#1f2937")
        self.log_text.tag_configure("success", foreground="#15803d", font=("Consolas", 9, "bold"))
        self.log_text.tag_configure("dry_run", foreground="#0369a1")
        self.log_text.tag_configure("skipped", foreground="#6b7280")
        self.log_text.tag_configure("warning", foreground="#b45309")
        self.log_text.tag_configure("error", foreground="#b91c1c", font=("Consolas", 9, "bold"))

        # -----------------------------------------------------------------
        # 6. Bottom Status Bar
        # -----------------------------------------------------------------
        status_bar = ttk.Frame(main_container)
        status_bar.pack(fill=tk.X)

        self.status_label = ttk.Label(status_bar, textvariable=self.status_var, font=("Segoe UI", 9))
        self.status_label.pack(side=tk.LEFT)

        self.initial_log()

    def initial_log(self):
        self.log_message("Desktop File Organizer initialized.", "info")
        self.log_message("Categories configured: Documents, Images, Videos, Audio, Archives, Code, Others.", "info")
        self.log_message("Tip: Keep 'Dry Run' checked first to preview changes safely.", "dry_run")

    def log_message(self, message: str, level: str = "info"):
        """Appends a timestamped line to the activity log in a thread-safe way."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        formatted = f"[{timestamp}] {message}\n"

        def _append():
            self.log_text.insert(tk.END, formatted, level)
            self.log_text.see(tk.END)

        if threading.current_thread() is threading.main_thread():
            _append()
        else:
            self.root.after(0, _append)

    def _on_browse_folder(self):
        chosen = filedialog.askdirectory(
            title="Select Folder to Organize",
            initialdir=self.folder_path_var.get() or str(Path.home())
        )
        if chosen:
            self.folder_path_var.set(chosen)
            self.status_var.set(f"Selected folder: {chosen}")
            self.log_message(f"Selected target directory: {chosen}", "info")

    def _on_clear_status(self):
        self.log_text.delete("1.0", tk.END)
        self.metric_scanned_var.set("0")
        self.metric_moved_var.set("0")
        self.metric_skipped_var.set("0")
        self.metric_errors_var.set("0")
        self.status_var.set("Status and metrics cleared.")
        self.log_message("Status cleared. Ready for next operation.", "info")

    def _set_ui_state(self, running: bool):
        self.is_running = running
        state = tk.DISABLED if running else tk.NORMAL
        self.organize_btn.config(state=state)
        self.browse_btn.config(state=state)
        self.clear_btn.config(state=state)
        self.undo_btn.config(state=state)
        self.dry_run_check.config(state=state)
        self.path_entry.config(state=state)

    def _on_undo_organize(self):
        folder_str = self.folder_path_var.get().strip()
        if not folder_str:
            messagebox.showwarning("No Folder Selected", "Please select or specify a target folder path.")
            return

        folder_path = Path(folder_str)
        if not folder_path.exists() or not folder_path.is_dir():
            messagebox.showerror("Invalid Path", f"The directory is not accessible:\n{folder_path}")
            return

        confirmed = messagebox.askyesno(
            "Confirm Undo",
            f"Are you sure you want to revert the last file organization in:\n{folder_path}?\n\n"
            f"All moved files will be restored safely back to their original root locations."
        )
        if not confirmed:
            return

        self._set_ui_state(True)
        self.status_var.set("Reverting last organization...")
        worker = threading.Thread(
            target=self._run_undo_thread,
            args=(folder_path,),
            daemon=True
        )
        worker.start()

    def _run_undo_thread(self, folder_path: Path):
        try:
            reverted_count, errors = undo_organization(folder_path, progress_callback=self.log_message)
            self.root.after(0, lambda: self._on_undo_finished(reverted_count, errors))
        except Exception as e:
            self.root.after(0, lambda: self._on_organize_crashed(str(e)))

    def _on_undo_finished(self, reverted_count: int, errors: int):
        self._set_ui_state(False)
        if reverted_count > 0:
            self.status_var.set(f"Undo completed. Restored {reverted_count} files.")
            messagebox.showinfo(
                "Undo Finished",
                f"Successfully restored {reverted_count} files back to root directory.\n"
                f"Errors: {errors}\n\nEmpty category folders have been cleaned up."
            )
        else:
            self.status_var.set("No undo journal found.")
            messagebox.showinfo("Undo Status", "No previous organization journal found to revert.")

    def _on_start_organize(self):
        folder_str = self.folder_path_var.get().strip()
        if not folder_str:
            messagebox.showwarning("No Folder Selected", "Please select a folder to organize first.")
            return

        folder_path = Path(folder_str)
        if not folder_path.exists():
            messagebox.showerror("Invalid Path", f"The directory does not exist:\n{folder_path}")
            return
        if not folder_path.is_dir():
            messagebox.showerror("Invalid Path", f"The selected path is not a folder:\n{folder_path}")
            return

        is_dry_run = self.dry_run_var.get()

        if not is_dry_run:
            confirmed = messagebox.askyesno(
                "Confirm Organization",
                f"You are about to organize files in:\n{folder_path}\n\n"
                f"Files will be moved into categorized subfolders.\n"
                f"Are you sure you want to proceed?"
            )
            if not confirmed:
                return

        self._set_ui_state(True)
        mode_text = "Simulating organization (Dry Run)..." if is_dry_run else "Organizing files..."
        self.status_var.set(mode_text)

        # Run organization on background thread to keep Tkinter responsive
        worker = threading.Thread(
            target=self._run_organize_thread,
            args=(folder_path, is_dry_run),
            daemon=True
        )
        worker.start()

    def _run_organize_thread(self, folder_path: Path, is_dry_run: bool):
        try:
            summary = organize_folder(
                folder_path=folder_path,
                dry_run=is_dry_run,
                progress_callback=self.log_message
            )
            # Update UI on main thread
            self.root.after(0, lambda: self._on_organize_finished(summary))
        except Exception as e:
            self.root.after(0, lambda: self._on_organize_crashed(str(e)))

    def _on_organize_finished(self, summary: OrganizationSummary):
        self._set_ui_state(False)
        self.metric_scanned_var.set(str(summary.scanned_count))
        self.metric_moved_var.set(str(summary.moved_count))
        self.metric_skipped_var.set(str(summary.skipped_count))
        self.metric_errors_var.set(str(summary.error_count))

        if summary.is_dry_run:
            self.status_var.set(f"Dry run complete. {summary.moved_count} files would be moved.")
            messagebox.showinfo(
                "Dry Run Completed",
                f"Dry run preview completed successfully!\n\n"
                f"Files scanned: {summary.scanned_count}\n"
                f"Files to move: {summary.moved_count}\n"
                f"Files skipped: {summary.skipped_count}\n"
                f"Errors: {summary.error_count}\n\n"
                f"Uncheck 'Dry Run' and click 'Organize Files' to perform the real moves."
            )
        else:
            self.status_var.set(f"Done! Successfully moved {summary.moved_count} files.")
            messagebox.showinfo(
                "Organization Finished",
                f"Folder organized successfully!\n\n"
                f"Files scanned: {summary.scanned_count}\n"
                f"Files moved: {summary.moved_count}\n"
                f"Files skipped: {summary.skipped_count}\n"
                f"Errors: {summary.error_count}"
            )

    def _on_organize_crashed(self, error_msg: str):
        self._set_ui_state(False)
        self.status_var.set(f"Error: {error_msg}")
        self.log_message(f"Fatal operation error: {error_msg}", "error")
        messagebox.showerror("Operation Failed", f"An unexpected error occurred:\n{error_msg}")


def run_cli(folder_path: str, dry_run: bool):
    """Fallback CLI mode for terminal usage or headless environments."""
    print("=" * 60)
    print("  Sortly — Organize your files automatically.")
    print("=" * 60)
    path = Path(folder_path)

    def cli_logger(msg: str, level: str):
        print(f"[{level.upper():7s}] {msg}")

    summary = organize_folder(path, dry_run=dry_run, progress_callback=cli_logger)
    print("-" * 60)
    print("Summary:")
    print(f"  Mode:          {'DRY RUN (Preview)' if summary.is_dry_run else 'REAL MOVE'}")
    print(f"  Files Scanned: {summary.scanned_count}")
    print(f"  Files Moved:   {summary.moved_count}")
    print(f"  Files Skipped: {summary.skipped_count}")
    print(f"  Errors:        {summary.error_count}")
    print("=" * 60)


def run_cli_undo(folder_path: str):
    """CLI handler for reverting previous file organization."""
    print("=" * 60)
    print("  Sortly (Undo Mode)")
    print("=" * 60)
    path = Path(folder_path)

    def cli_logger(msg: str, level: str):
        print(f"[{level.upper():7s}] {msg}")

    reverted, errors = undo_organization(path, progress_callback=cli_logger)
    print("-" * 60)
    print(f"Undo Result: Restored {reverted} files to root. Errors: {errors}.")
    print("=" * 60)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Sortly: Organize your files automatically.")
    parser.add_argument("folder", nargs="?", default=None, help="Target folder path to organize")
    parser.add_argument("--dry-run", action="store_true", help="Preview mode without moving files")
    parser.add_argument("--undo", action="store_true", help="Revert previous file moves using the undo journal")
    parser.add_argument("--cli", action="store_true", help="Force command-line interface")

    args = parser.parse_args()

    # If --undo requested via CLI
    if args.undo:
        if not args.folder:
            print("Error: Please provide a folder path to undo (e.g. python3 main.py <folder> --undo).")
            sys.exit(1)
        run_cli_undo(args.folder)
        return

    # If folder passed directly on command line or --cli is set or tkinter is unavailable, run CLI mode
    if args.cli or (args.folder is not None and not HAS_TKINTER):
        if not args.folder:
            print("Error: Please provide a folder path when using --cli.")
            sys.exit(1)
        run_cli(args.folder, dry_run=args.dry_run)
        return

    if not HAS_TKINTER:
        print("[Sortly]")
        print("Organize your files automatically.")
        print("Note: Graphical interface (tkinter/X11 display) is not active in this environment.")
        print("You can run Sortly via CLI:")
        print("    python3 main.py <folder_path> [--dry-run] [--undo]")
        print()
        if args.folder:
            run_cli(args.folder, dry_run=args.dry_run)
        else:
            print("To test right away, create a test directory or run:")
            print("    python3 -m unittest test_organizer.py")
        return

    # Start Tkinter GUI
    root = tk.Tk()
    app = FileOrganizerGUI(root)
    if args.folder:
        app.folder_path_var.set(str(Path(args.folder).resolve()))
        if args.dry_run:
            app.dry_run_var.set(True)
    root.mainloop()


if __name__ == "__main__":
    main()
