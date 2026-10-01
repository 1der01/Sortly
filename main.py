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

from __future__ import annotations

import os
import sys
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional

from organizer import OrganizationSummary, organize_folder, undo_organization
from config import get_config

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

# Application metadata
__version__ = "1.0.0"


class FileOrganizerGUI:
    """Tkinter Desktop Graphical User Interface for File Organizer."""

    def __init__(self, root: "tk.Tk"):
        self.root = root
        self.root.title("Sortly — Organize your files automatically.")
        self.root.geometry("820x750")
        self.root.minsize(700, 630)

        self._apply_window_icon()

        # Load configuration
        self.config = get_config()
        
        # Variables
        self.folder_path_var = tk.StringVar(value="")
        self.dry_run_var = tk.BooleanVar(value=self.config.preferences.default_dry_run)
        self.status_var = tk.StringVar(value="Ready. Select a folder to begin.")
        self.is_running = False
        self.show_file_sizes_var = tk.BooleanVar(value=self.config.preferences.show_file_sizes)

        # Summary metric tracking variables
        self.metric_scanned_var = tk.StringVar(value="0")
        self.metric_moved_var = tk.StringVar(value="0")
        self.metric_skipped_var = tk.StringVar(value="0")
        self.metric_errors_var = tk.StringVar(value="0")

        # Progress tracking
        self.total_files = 0
        self.processed_files = 0

        self._configure_styles()
        self._build_ui()
        self._setup_drag_drop()
        self._setup_keyboard_shortcuts()
        self._apply_theme()  # Apply theme after UI is built

    def _apply_window_icon(self) -> None:
        """Best-effort window/taskbar icon; silently ignored when unavailable."""
        try:
            base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
            png_path = base / "assets" / "sortly-icon.png"
            ico_path = base / "assets" / "sortly.ico"
            if png_path.exists():
                self._icon_image = tk.PhotoImage(file=str(png_path))
                self.root.iconphoto(True, self._icon_image)
            elif ico_path.exists():
                self.root.iconbitmap(str(ico_path))
        except Exception:
            pass

    def _configure_styles(self) -> None:
        style = ttk.Style()
        # Use clean modern theme if available
        available_themes = style.theme_names()
        if "clam" in available_themes:
            style.theme_use("clam")

        self._apply_theme()

    def _apply_theme(self) -> None:
        """Apply the current theme to the UI."""
        style = ttk.Style()
        theme = self.config.preferences.theme
        
        if theme == "dark":
            # Dark theme colors
            bg_color = "#2d2d2d"
            fg_color = "#ffffff"
            select_bg = "#3d3d3d"
            log_bg = "#1e1e1e"
            log_fg = "#e0e0e0"
        else:
            # Light theme colors
            bg_color = "#ffffff"
            fg_color = "#000000"
            select_bg = "#e0e0e0"
            log_bg = "#f8f9fa"
            log_fg = "#212529"

        # Configure base styles
        style.configure("TFrame", background=bg_color)
        style.configure("TLabel", background=bg_color, foreground=fg_color, font=("Segoe UI", 9))
        style.configure("TButton", padding=6, font=("Segoe UI", 10))
        style.configure("Primary.TButton", font=("Segoe UI", 10, "bold"))
        style.configure("Header.TLabel", font=("Segoe UI", 14, "bold"))
        style.configure("Subheader.TLabel", font=("Segoe UI", 9), foreground="#555555" if theme == "light" else "#888888")
        style.configure("MetricNum.TLabel", font=("Segoe UI", 16, "bold"))
        style.configure("MetricLabel.TLabel", font=("Segoe UI", 9), foreground="#666666" if theme == "light" else "#aaaaaa")
        
        # Configure the main window background
        self.root.configure(bg=bg_color)
        
        # Configure log text widget
        self.log_text.configure(bg=log_bg, fg=log_fg)
        
        # Configure status bar
        self.status_label.configure(bg=bg_color, foreground=fg_color)

    def _build_ui(self) -> None:
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

        # Path entry row
        folder_row = ttk.Frame(folder_group)
        folder_row.pack(fill=tk.X, pady=(0, 8))

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

        # Recent folders dropdown
        recent_row = ttk.Frame(folder_group)
        recent_row.pack(fill=tk.X)
        
        ttk.Label(recent_row, text="Recent Folders:", font=("Segoe UI", 9)).pack(side=tk.LEFT, padx=(0, 8))
        
        self.recent_folders_var = tk.StringVar()
        self.recent_folders_combo = ttk.Combobox(
            recent_row,
            textvariable=self.recent_folders_var,
            values=self.config.get_recent_folders(),
            state="readonly",
            font=("Consolas", 9),
            width=40
        )
        self.recent_folders_combo.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.recent_folders_combo.bind("<<ComboboxSelected>>", self._on_recent_folder_selected)

        # -----------------------------------------------------------------
        # 3. Execution Options & Controls
        # -----------------------------------------------------------------
        control_frame = ttk.Frame(main_container)
        control_frame.pack(fill=tk.X, pady=(0, 12))

        # Left: Options
        options_box = ttk.Frame(control_frame)
        options_box.pack(side=tk.LEFT, padx=(4, 0))
        
        self.dry_run_check = ttk.Checkbutton(
            options_box,
            text="Dry Run (Preview only - no files will be moved)",
            variable=self.dry_run_var
        )
        self.dry_run_check.pack(anchor=tk.W)
        
        self.show_sizes_check = ttk.Checkbutton(
            options_box,
            text="Show File Sizes",
            variable=self.show_file_sizes_var
        )
        self.show_sizes_check.pack(anchor=tk.W, pady=(4, 0))

        # Right: Action Buttons
        button_box = ttk.Frame(control_frame)
        button_box.pack(side=tk.RIGHT)

        self.settings_btn = ttk.Button(
            button_box,
            text="Settings",
            command=self._on_settings
        )
        self.settings_btn.pack(side=tk.LEFT, padx=(0, 8))

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
        # 4. Progress Bar
        # -----------------------------------------------------------------
        progress_frame = ttk.Frame(main_container)
        progress_frame.pack(fill=tk.X, pady=(0, 12))
        
        self.progress_var = tk.DoubleVar(value=0)
        self.progress_bar = ttk.Progressbar(
            progress_frame,
            variable=self.progress_var,
            maximum=100,
            mode="determinate"
        )
        self.progress_bar.pack(fill=tk.X)
        
        self.progress_label = ttk.Label(
            progress_frame,
            text="",
            font=("Segoe UI", 8),
            foreground="#666666"
        )
        self.progress_label.pack(anchor=tk.E, pady=(2, 0))

        # -----------------------------------------------------------------
        # 5. Summary Metrics Cards
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
        # 6. Activity Log & Progress Display
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
        # 7. Bottom Status Bar
        # -----------------------------------------------------------------
        status_bar = ttk.Frame(main_container)
        status_bar.pack(fill=tk.X)

        self.status_label = ttk.Label(status_bar, textvariable=self.status_var, font=("Segoe UI", 9))
        self.status_label.pack(side=tk.LEFT)

        self.initial_log()

    def initial_log(self) -> None:
        self.log_message("Desktop File Organizer initialized.", "info")
        self.log_message("Categories configured: Documents, Images, Videos, Audio, Archives, Code, Others.", "info")
        self.log_message("Tip: Keep 'Dry Run' checked first to preview changes safely.", "dry_run")
        self.log_message("Drag and drop folders onto the window for quick selection.", "info")

    def log_message(self, message: str, level: str = "info", file_size: int = 0) -> None:
        """Appends a timestamped line to the activity log in a thread-safe way."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        # Add file size to message if enabled and size is provided
        if self.show_file_sizes_var.get() and file_size > 0:
            size_str = self._format_file_size(file_size)
            formatted = f"[{timestamp}] {message} ({size_str})\n"
        else:
            formatted = f"[{timestamp}] {message}\n"

        def _append():
            self.log_text.insert(tk.END, formatted, level)
            self.log_text.see(tk.END)

        if threading.current_thread() is threading.main_thread():
            _append()
        else:
            self.root.after(0, _append)

    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size in human-readable format."""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"

    def _setup_keyboard_shortcuts(self) -> None:
        """Setup keyboard shortcuts for common actions."""
        self.root.bind('<Control-o>', lambda e: self._on_browse_folder())
        self.root.bind('<Control-O>', lambda e: self._on_browse_folder())
        self.root.bind('<Control-z>', lambda e: self._on_undo_organize())
        self.root.bind('<Control-Z>', lambda e: self._on_undo_organize())
        self.root.bind('<Control-s>', lambda e: self._on_settings())
        self.root.bind('<Control-S>', lambda e: self._on_settings())
        self.root.bind('<Control-l>', lambda e: self._on_clear_status())
        self.root.bind('<Control-L>', lambda e: self._on_clear_status())
        self.root.bind('<F5>', lambda e: self._on_start_organize())
        self.root.bind('<Escape>', lambda e: self.root.quit())

    def _on_browse_folder(self) -> None:
        chosen = filedialog.askdirectory(
            title="Select Folder to Organize",
            initialdir=self.folder_path_var.get() or str(Path.home())
        )
        if chosen:
            self._set_folder_path(chosen)

    def _on_recent_folder_selected(self, event) -> None:
        selected = self.recent_folders_var.get()
        if selected:
            self._set_folder_path(selected)

    def _set_folder_path(self, folder_path: str) -> None:
        """Set the folder path and update recent folders."""
        self.folder_path_var.set(folder_path)
        self.status_var.set(f"Selected folder: {folder_path}")
        self.log_message(f"Selected target directory: {folder_path}", "info")
        
        # Add to recent folders
        self.config.add_recent_folder(folder_path)
        self.recent_folders_combo['values'] = self.config.get_recent_folders()
        self.recent_folders_var.set("")  # Clear the selection

    def _on_clear_status(self) -> None:
        self.log_text.delete("1.0", tk.END)
        self.metric_scanned_var.set("0")
        self.metric_moved_var.set("0")
        self.metric_skipped_var.set("0")
        self.metric_errors_var.set("0")
        self.progress_var.set(0)
        self.progress_label.config(text="")
        self.status_var.set("Status and metrics cleared.")
        self.log_message("Status cleared. Ready for next operation.", "info")

    def _set_ui_state(self, running: bool) -> None:
        self.is_running = running
        state = tk.DISABLED if running else tk.NORMAL
        self.organize_btn.config(state=state)
        self.browse_btn.config(state=state)
        self.clear_btn.config(state=state)
        self.undo_btn.config(state=state)
        self.settings_btn.config(state=state)
        self.dry_run_check.config(state=state)
        self.show_sizes_check.config(state=state)
        self.path_entry.config(state=state)
        self.recent_folders_combo.config(state=state)

    def _on_undo_organize(self) -> None:
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

    def _run_undo_thread(self, folder_path: Path) -> None:
        try:
            reverted_count, errors = undo_organization(folder_path, progress_callback=self.log_message)
            self.root.after(0, lambda: self._on_undo_finished(reverted_count, errors))
        except Exception as e:
            self.root.after(0, lambda: self._on_organize_crashed(str(e)))

    def _on_undo_finished(self, reverted_count: int, errors: int) -> None:
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

    def _on_start_organize(self) -> None:
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
        
        # Reset progress tracking
        self.processed_files = 0
        self.progress_var.set(0)
        self.progress_label.config(text="Scanning files...")

        # Run organization on background thread to keep Tkinter responsive
        worker = threading.Thread(
            target=self._run_organize_thread,
            args=(folder_path, is_dry_run),
            daemon=True
        )
        worker.start()

    def _run_organize_thread(self, folder_path: Path, is_dry_run: bool) -> None:
        try:
            # Get custom categories from config
            custom_categories = self.config.get_custom_categories()
            
            # Get file size settings
            skip_large = self.config.preferences.skip_large_files
            max_size = self.config.preferences.max_file_size_mb
            
            # Create progress callback that updates progress bar
            def progress_with_ui(message: str, level: str, file_size: int = 0):
                self.log_message(message, level, file_size)
                # Update progress based on message content
                if "Found" in message and "files to organize" in message:
                    # Extract number from message like "Found 15 files to organize."
                    try:
                        import re
                        match = re.search(r'(\d+) files', message)
                        if match:
                            self.total_files = int(match.group(1))
                            self.root.after(0, lambda: self.progress_label.config(
                                text=f"Processing {self.total_files} files..."
                            ))
                    except Exception:
                        pass
                
                if "Moved" in message or "Would move" in message or "Skipped large file" in message:
                    self.processed_files += 1
                    if self.total_files > 0:
                        progress = (self.processed_files / self.total_files) * 100
                        self.root.after(0, lambda p=progress: self.progress_var.set(p))
                        self.root.after(0, lambda: self.progress_label.config(
                            text=f"{self.processed_files}/{self.total_files} files processed"
                        ))

            summary = organize_folder(
                folder_path=folder_path,
                dry_run=is_dry_run,
                progress_callback=progress_with_ui,
                custom_categories=custom_categories,
                skip_large_files=skip_large,
                max_file_size_mb=max_size
            )
            # Update UI on main thread
            self.root.after(0, lambda: self._on_organize_finished(summary))
        except Exception as e:
            self.root.after(0, lambda: self._on_organize_crashed(str(e)))

    def _on_organize_finished(self, summary: OrganizationSummary) -> None:
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

    def _on_organize_crashed(self, error_msg: str) -> None:
        self._set_ui_state(False)
        self.status_var.set(f"Error: {error_msg}")
        self.log_message(f"Fatal operation error: {error_msg}", "error")
        messagebox.showerror("Operation Failed", f"An unexpected error occurred:\n{error_msg}")

    def _setup_drag_drop(self) -> None:
        """Setup drag and drop functionality for folder selection."""
        try:
            # Try to use tkinterdnd2 if available
            try:
                from tkinterdnd2 import DND_FILES, TkinterDnD
                # Check if root supports drag and drop
                if hasattr(self.root, 'tk'):
                    try:
                        self.root.drop_target_register(DND_FILES)
                        self.root.dnd_bind('<<Drop>>', self._on_drop)
                    except Exception:
                        pass
            except ImportError:
                # Fallback: basic drag and drop using platform-specific methods
                pass
        except Exception:
            pass

    def _on_drop(self, event) -> None:
        """Handle drop event for folder selection."""
        try:
            # Parse the dropped path (tkinterdnd2 provides {} wrapped paths)
            dropped_path = event.data
            if dropped_path.startswith('{') and dropped_path.endswith('}'):
                dropped_path = dropped_path[1:-1]
            
            # Remove quotes if present
            dropped_path = dropped_path.strip('"').strip("'")
            
            path = Path(dropped_path)
            if path.exists() and path.is_dir():
                self._set_folder_path(str(path))
            else:
                self.log_message(f"Invalid folder dropped: {dropped_path}", "error")
        except Exception as e:
            self.log_message(f"Error handling drop: {e}", "error")

    def _on_settings(self) -> None:
        """Open settings dialog."""
        self._open_settings_dialog()

    def _open_settings_dialog(self) -> None:
        """Open a settings dialog for user preferences."""
        settings_window = tk.Toplevel(self.root)
        settings_window.title("Sortly Settings")
        settings_window.geometry("500x500")
        settings_window.transient(self.root)
        settings_window.grab_set()

        # Main container
        main_frame = ttk.Frame(settings_window, padding="16 16 16 16")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Theme settings
        theme_group = ttk.LabelFrame(main_frame, text=" Appearance ", padding="12 10 12 12")
        theme_group.pack(fill=tk.X, pady=(0, 12))

        theme_var = tk.StringVar(value=self.config.preferences.theme)
        ttk.Label(theme_group, text="Theme:").pack(anchor=tk.W)
        theme_frame = ttk.Frame(theme_group)
        theme_frame.pack(fill=tk.X, pady=(8, 0))
        
        ttk.Radiobutton(theme_frame, text="Light", variable=theme_var, value="light").pack(side=tk.LEFT, padx=(0, 16))
        ttk.Radiobutton(theme_frame, text="Dark", variable=theme_var, value="dark").pack(side=tk.LEFT)

        # Large file settings
        large_files_group = ttk.LabelFrame(main_frame, text=" Large File Handling ", padding="12 10 12 12")
        large_files_group.pack(fill=tk.X, pady=(0, 12))

        skip_large_var = tk.BooleanVar(value=self.config.preferences.skip_large_files)
        ttk.Checkbutton(
            large_files_group,
            text="Skip files larger than specified size",
            variable=skip_large_var
        ).pack(anchor=tk.W)

        size_frame = ttk.Frame(large_files_group)
        size_frame.pack(fill=tk.X, pady=(8, 0))
        
        ttk.Label(size_frame, text="Max file size (MB):").pack(side=tk.LEFT)
        max_size_var = tk.IntVar(value=self.config.preferences.max_file_size_mb)
        size_entry = ttk.Entry(size_frame, textvariable=max_size_var, width=10)
        size_entry.pack(side=tk.LEFT, padx=(8, 0))

        # Category management
        category_group = ttk.LabelFrame(main_frame, text=" Custom Categories ", padding="12 10 12 12")
        category_group.pack(fill=tk.BOTH, expand=True, pady=(0, 12))

        # Add new category
        add_frame = ttk.Frame(category_group)
        add_frame.pack(fill=tk.X, pady=(0, 8))
        
        ttk.Label(add_frame, text="Category Name:").pack(side=tk.LEFT)
        cat_name_var = tk.StringVar()
        cat_name_entry = ttk.Entry(add_frame, textvariable=cat_name_var, width=15)
        cat_name_entry.pack(side=tk.LEFT, padx=(8, 8))
        
        ttk.Label(add_frame, text="Extensions (comma separated):").pack(side=tk.LEFT)
        ext_var = tk.StringVar()
        ext_entry = ttk.Entry(add_frame, textvariable=ext_var, width=25)
        ext_entry.pack(side=tk.LEFT, padx=(8, 0))

        def add_category():
            name = cat_name_var.get().strip()
            extensions = [e.strip() for e in ext_var.get().split(',') if e.strip()]
            if name and extensions:
                self.config.add_custom_category(name, extensions)
                self._refresh_category_list(category_listbox)
                cat_name_var.set("")
                ext_var.set("")

        ttk.Button(add_frame, text="Add Category", command=add_category).pack(side=tk.LEFT, padx=(8, 0))

        # Category list
        list_frame = ttk.Frame(category_group)
        list_frame.pack(fill=tk.BOTH, expand=True)
        
        category_listbox = tk.Listbox(list_frame, height=6)
        category_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=category_listbox.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        category_listbox.config(yscrollcommand=scrollbar.set)

        def delete_category():
            selection = category_listbox.curselection()
            if selection:
                category_name = category_listbox.get(selection[0]).split(':')[0].strip()
                self.config.remove_custom_category(category_name)
                self._refresh_category_list(category_listbox)

        ttk.Button(category_group, text="Delete Selected", command=delete_category).pack(anchor=tk.E, pady=(8, 0))

        # Buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=(12, 0))

        def save_settings():
            self.config.preferences.skip_large_files = skip_large_var.get()
            self.config.preferences.theme = theme_var.get()
            try:
                self.config.preferences.max_file_size_mb = max_size_var.get()
            except ValueError:
                messagebox.showerror("Invalid Value", "Max file size must be a number.")
                return
            self.config.save_config()
            self._apply_theme()
            settings_window.destroy()
            self.log_message("Settings saved successfully.", "success")

        ttk.Button(button_frame, text="Save", command=save_settings).pack(side=tk.RIGHT, padx=(8, 0))
        ttk.Button(button_frame, text="Cancel", command=settings_window.destroy).pack(side=tk.RIGHT)

        # Initial population
        self._refresh_category_list(category_listbox)

    def _refresh_category_list(self, listbox) -> None:
        """Refresh the custom category listbox."""
        listbox.delete(0, tk.END)
        custom_cats = self.config.get_custom_categories()
        for category, extensions in custom_cats.items():
            listbox.insert(tk.END, f"{category}: {', '.join(extensions)}")


def run_cli(folder_path: str, dry_run: bool) -> None:
    """Fallback CLI mode for terminal usage or headless environments."""
    print("=" * 60)
    print("  Sortly — Organize your files automatically.")
    print("=" * 60)
    path = Path(folder_path)

    def cli_logger(msg: str, level: str, file_size: int = 0) -> None:
        size_str = f" ({_format_file_size(file_size)})" if file_size > 0 else ""
        print(f"[{level.upper():7s}] {msg}{size_str}")

    summary = organize_folder(path, dry_run=dry_run, progress_callback=cli_logger)
    print("-" * 60)
    print("Summary:")
    print(f"  Mode:          {'DRY RUN (Preview)' if summary.is_dry_run else 'REAL MOVE'}")
    print(f"  Files Scanned: {summary.scanned_count}")
    print(f"  Files Moved:   {summary.moved_count}")
    print(f"  Files Skipped: {summary.skipped_count}")
    print(f"  Errors:        {summary.error_count}")
    print("=" * 60)

def _format_file_size(size_bytes: int) -> str:
    """Format file size in human-readable format."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.1f} TB"


def run_cli_undo(folder_path: str) -> None:
    """CLI handler for reverting previous file organization."""
    print("=" * 60)
    print("  Sortly (Undo Mode)")
    print("=" * 60)
    path = Path(folder_path)

    def cli_logger(msg: str, level: str, file_size: int = 0) -> None:
        size_str = f" ({_format_file_size(file_size)})" if file_size > 0 else ""
        print(f"[{level.upper():7s}] {msg}{size_str}")

    reverted, errors = undo_organization(path, progress_callback=cli_logger)
    print("-" * 60)
    print(f"Undo Result: Restored {reverted} files to root. Errors: {errors}.")
    print("=" * 60)


def main() -> None:
    import argparse
    parser = argparse.ArgumentParser(description="Sortly: Organize your files automatically.")
    parser.add_argument("folder", nargs="?", default=None, help="Target folder path to organize")
    parser.add_argument("--dry-run", action="store_true", help="Preview mode without moving files")
    parser.add_argument("--undo", action="store_true", help="Revert previous file moves using the undo journal")
    parser.add_argument("--cli", action="store_true", help="Force command-line interface")
    parser.add_argument("--version", action="version", version=f"Sortly {__version__}")

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
