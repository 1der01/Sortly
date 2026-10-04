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
from typing import Any, Callable, Dict, List, Optional

from organizer import (
    OrganizationSummary,
    get_undo_journal_path,
    open_folder_in_explorer,
    organize_folder,
    undo_organization,
)
from categories import load_sortly_config

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


IS_MAC = sys.platform == "darwin"
MOD_KEY = "⌘" if IS_MAC else "Ctrl"

SHORTCUT_SPECS = {
    "browse": {
        "key": f"{MOD_KEY}+O",
        "title": "Browse Target Folder",
        "description": "Selects a folder to organize using the file dialog.",
    },
    "organize": {
        "key": f"{MOD_KEY}+↵",
        "title": "Organize Files",
        "description": "Scans and organizes files into categorized subdirectories.",
    },
    "dry_run": {
        "key": f"{MOD_KEY}+D",
        "title": "Toggle Dry Run Mode",
        "description": "Toggles between safe preview mode and real file moves.",
    },
    "group_date": {
        "key": f"{MOD_KEY}+G",
        "title": "Toggle Date Sub-grouping",
        "description": "Toggles nesting files into Year-Month subfolders under each category.",
    },
    "undo": {
        "key": f"{MOD_KEY}+Z",
        "title": "Undo Last Clean",
        "description": "Reverses the previous organization run using the local undo journal.",
    },
    "open_folder": {
        "key": f"{MOD_KEY}+E",
        "title": "Open in File Explorer",
        "description": "Opens the target directory in the operating system file manager.",
    },
    "clear": {
        "key": f"{MOD_KEY}+L",
        "title": "Clear Status & Metrics",
        "description": "Clears the activity log and resets all counter metrics to 0.",
    },
    "help": {
        "key": "F1",
        "title": "Shortcuts Guide",
        "description": "Opens the keyboard shortcuts and quick navigation reference.",
    },
}


def get_shortcut_context_explanation(
    action: str,
    folder_path: str = "",
    is_dry_run: bool = True,
    is_running: bool = False,
    group_by_date: bool = False,
    has_undo: bool = False,
) -> Dict[str, str]:
    """
    Returns real-time contextual information and an exact explanation
    of what a shortcut key does given the current application state.
    """
    spec = SHORTCUT_SPECS.get(
        action,
        {"key": "Key", "title": action.title(), "description": "Keyboard shortcut action."},
    )

    clean_folder = folder_path.strip()
    folder_name = Path(clean_folder).name if clean_folder else ""

    # 1. When an organization operation is actively running
    if is_running and action != "help":
        return {
            "action": action,
            "key": spec["key"],
            "title": spec["title"],
            "description": spec["description"],
            "context_status": "Locked (Operation Running)",
            "context_level": "warning",
            "context_explanation": "Sortly is currently organizing files. All execution actions are locked until the background worker finishes.",
        }

    # 2. Browse Folder
    if action == "browse":
        if clean_folder:
            return {
                "action": action,
                "key": spec["key"],
                "title": spec["title"],
                "description": spec["description"],
                "context_status": f"Active: {folder_name}",
                "context_level": "info",
                "context_explanation": f"Current target is '{folder_name}'. Pressing {spec['key']} will open the folder dialog to switch to another directory.",
            }
        return {
            "action": action,
            "key": spec["key"],
            "title": spec["title"],
            "description": spec["description"],
            "context_status": "Ready to Choose",
            "context_level": "info",
            "context_explanation": f"No folder selected yet. Pressing {spec['key']} opens the file browser so you can pick a target folder.",
        }

    # 3. Organize Files
    if action == "organize":
        if not clean_folder:
            return {
                "action": action,
                "key": spec["key"],
                "title": spec["title"],
                "description": spec["description"],
                "context_status": "Disabled (No Folder)",
                "context_level": "error",
                "context_explanation": f"No directory selected. Press {SHORTCUT_SPECS['browse']['key']} first to select a folder before organizing.",
            }
        date_note = " into Year-Month subfolders" if group_by_date else ""
        if is_dry_run:
            return {
                "action": action,
                "key": spec["key"],
                "title": spec["title"],
                "description": spec["description"],
                "context_status": "Preview Mode (Safe)",
                "context_level": "info",
                "context_explanation": f"Dry Run is ON. Pressing {spec['key']} will simulate categorizing '{folder_name}'{date_note} without touching or moving any files on disk.",
            }
        return {
            "action": action,
            "key": spec["key"],
            "title": spec["title"],
            "description": spec["description"],
            "context_status": "Live Move Mode",
            "context_level": "success",
            "context_explanation": f"Live Move is ON. Pressing {spec['key']} will relocate eligible files in '{folder_name}' into category folders{date_note}. An undo journal will be generated for 1-click rollback.",
        }

    # 4. Toggle Dry Run
    if action == "dry_run":
        if is_dry_run:
            return {
                "action": action,
                "key": spec["key"],
                "title": spec["title"],
                "description": spec["description"],
                "context_status": "Preview Mode (Active)",
                "context_level": "info",
                "context_explanation": f"Dry Run is currently ON (files will NOT be moved). Pressing {spec['key']} will switch to Live Move mode.",
            }
        return {
            "action": action,
            "key": spec["key"],
            "title": spec["title"],
            "description": spec["description"],
            "context_status": "Live Mode (Active)",
            "context_level": "warning",
            "context_explanation": f"Dry Run is currently OFF (files WILL be moved). Pressing {spec['key']} will switch to Safe Preview mode.",
        }

    # 5. Toggle Date Sub-grouping
    if action == "group_date":
        if group_by_date:
            return {
                "action": action,
                "key": spec["key"],
                "title": spec["title"],
                "description": spec["description"],
                "context_status": "Date Sub-grouping ON",
                "context_level": "info",
                "context_explanation": f"Date grouping is currently ON (e.g. Documents/2026-10/). Pressing {spec['key']} will switch back to flat category folders.",
            }
        return {
            "action": action,
            "key": spec["key"],
            "title": spec["title"],
            "description": spec["description"],
            "context_status": "Date Sub-grouping OFF",
            "context_level": "info",
            "context_explanation": f"Date grouping is currently OFF. Pressing {spec['key']} will enable automatic Year-Month subfolders under each category.",
        }

    # 6. Undo Last Organization
    if action == "undo":
        if not clean_folder:
            return {
                "action": action,
                "key": spec["key"],
                "title": spec["title"],
                "description": spec["description"],
                "context_status": "Disabled (No Folder)",
                "context_level": "error",
                "context_explanation": "Select a target folder first to inspect its undo history.",
            }
        if has_undo:
            return {
                "action": action,
                "key": spec["key"],
                "title": spec["title"],
                "description": spec["description"],
                "context_status": "Undo Available",
                "context_level": "success",
                "context_explanation": f"Undo journal found in '{folder_name}'. Pressing {spec['key']} will safely restore all relocated files back to root and clean empty category folders.",
            }
        return {
            "action": action,
            "key": spec["key"],
            "title": spec["title"],
            "description": spec["description"],
            "context_status": "No Undo Journal",
            "context_level": "warning",
            "context_explanation": f"No previous organization journal found in '{folder_name}'. Run an organization first to enable rollback.",
        }

    # 7. Open Folder in Explorer
    if action == "open_folder":
        if not clean_folder:
            return {
                "action": action,
                "key": spec["key"],
                "title": spec["title"],
                "description": spec["description"],
                "context_status": "Disabled (No Folder)",
                "context_level": "error",
                "context_explanation": "Select a target folder first to open it in your system file manager.",
            }
        return {
            "action": action,
            "key": spec["key"],
            "title": spec["title"],
            "description": spec["description"],
            "context_status": f"Ready: {folder_name}",
            "context_level": "info",
            "context_explanation": f"Pressing {spec['key']} will open '{folder_name}' directly in your native file manager (Explorer / Finder).",
        }

    # 8. Clear Status
    if action == "clear":
        return {
            "action": action,
            "key": spec["key"],
            "title": spec["title"],
            "description": spec["description"],
            "context_status": "Ready to Clear",
            "context_level": "info",
            "context_explanation": f"Pressing {spec['key']} will clear the activity log window and reset Scanned, Moved, Skipped, and Error counters to 0.",
        }

    # 9. Shortcuts Guide / Help
    return {
        "action": action,
        "key": spec["key"],
        "title": spec["title"],
        "description": spec["description"],
        "context_status": "Always Available",
        "context_level": "info",
        "context_explanation": f"Pressing {spec['key']} displays the complete Keyboard Shortcuts & Navigation reference dialog.",
    }


class ContextTooltip:
    """
    Modern floating popover attached to Tkinter widgets that displays
    real-time contextual shortcut explanations on hover.
    """
    def __init__(self, widget: Any, provider: Callable[[], Dict[str, str]], delay_ms: int = 150):
        self.widget = widget
        self.provider = provider
        self.delay_ms = delay_ms
        self.tip_window: Optional[Any] = None
        self._after_id: Optional[str] = None

        if hasattr(self.widget, "bind"):
            self.widget.bind("<Enter>", self._schedule_show, add="+")
            self.widget.bind("<Leave>", self._hide, add="+")
            self.widget.bind("<ButtonPress>", self._hide, add="+")

    def _schedule_show(self, event=None):
        self._cancel()
        if HAS_TKINTER and hasattr(self.widget, "after"):
            self._after_id = self.widget.after(self.delay_ms, self._show)

    def _cancel(self):
        if self._after_id and hasattr(self.widget, "after_cancel"):
            try:
                self.widget.after_cancel(self._after_id)
            except Exception:
                pass
            self._after_id = None

    def _hide(self, event=None):
        self._cancel()
        if self.tip_window:
            try:
                self.tip_window.destroy()
            except Exception:
                pass
            self.tip_window = None

    def _show(self):
        if not HAS_TKINTER or not hasattr(self.widget, "winfo_exists") or not self.widget.winfo_exists():
            return

        data = self.provider()
        if not data:
            return

        self._hide()

        try:
            tip = tk.Toplevel(self.widget)
            self.tip_window = tip
            tip.wm_overrideredirect(True)
            try:
                tip.attributes("-topmost", True)
            except Exception:
                pass

            # Outer card container
            card = tk.Frame(tip, bg="#0f172a", highlightthickness=1, highlightbackground="#334155", padx=10, pady=8)
            card.pack(fill="both", expand=True)

            # Header row: Key Badge + Title
            header_row = tk.Frame(card, bg="#0f172a")
            header_row.pack(fill="x", pady=(0, 4))

            key_badge = tk.Label(
                header_row,
                text=f" {data.get('key', '')} ",
                font=("Consolas", 9, "bold"),
                bg="#0284c7",
                fg="#ffffff",
                padx=4,
                pady=1
            )
            key_badge.pack(side="left", padx=(0, 6))

            title_lbl = tk.Label(
                header_row,
                text=data.get("title", ""),
                font=("Segoe UI", 9, "bold"),
                bg="#0f172a",
                fg="#f8fafc"
            )
            title_lbl.pack(side="left")

            # General description
            desc_lbl = tk.Label(
                card,
                text=data.get("description", ""),
                font=("Segoe UI", 8),
                bg="#0f172a",
                fg="#94a3b8",
                wraplength=310,
                justify="left"
            )
            desc_lbl.pack(anchor="w", pady=(0, 6))

            # Context Card
            level_colors = {
                "success": "#34d399",  # emerald-400
                "warning": "#fbbf24",  # amber-400
                "error": "#f87171",    # red-400
                "info": "#38bdf8",     # sky-400
            }
            level = data.get("context_level", "info")
            fg_status = level_colors.get(level, level_colors["info"])

            ctx_box = tk.Frame(card, bg="#1e293b", highlightthickness=1, highlightbackground="#334155", padx=8, pady=6)
            ctx_box.pack(fill="x")

            status_lbl = tk.Label(
                ctx_box,
                text=f"● Current Context: {data.get('context_status', '')}",
                font=("Segoe UI", 8, "bold"),
                bg="#1e293b",
                fg=fg_status
            )
            status_lbl.pack(anchor="w")

            expl_lbl = tk.Label(
                ctx_box,
                text=data.get("context_explanation", ""),
                font=("Segoe UI", 8),
                bg="#1e293b",
                fg="#e2e8f0",
                wraplength=290,
                justify="left"
            )
            expl_lbl.pack(anchor="w", pady=(2, 0))

            tip.update_idletasks()
            tip_w = tip.winfo_reqwidth()
            tip_h = tip.winfo_reqheight()

            wx = self.widget.winfo_rootx()
            wy = self.widget.winfo_rooty()
            wh = self.widget.winfo_height()
            ww = self.widget.winfo_width()

            # Center horizontally on the hovered widget
            x = wx + (ww // 2) - (tip_w // 2)
            y = wy + wh + 6

            screen_w = tip.winfo_screenwidth()
            screen_h = tip.winfo_screenheight()

            if x < 12:
                x = 12
            elif x + tip_w > screen_w - 12:
                x = screen_w - tip_w - 12

            if y + tip_h > screen_h - 12:
                y = wy - tip_h - 6

            tip.wm_geometry(f"+{x}+{y}")
        except Exception:
            self._hide()


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
        self.group_by_date_var = tk.BooleanVar(value=False)
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

        # Left: Options (Dry Run and Date Sub-grouping)
        options_box = ttk.Frame(control_frame)
        options_box.pack(side=tk.LEFT)

        self.dry_run_check = ttk.Checkbutton(
            options_box,
            text="Dry Run (Preview only)",
            variable=self.dry_run_var
        )
        self.dry_run_check.pack(side=tk.LEFT, padx=(4, 8))

        self.date_check = ttk.Checkbutton(
            options_box,
            text="Group by Date (YYYY-MM)",
            variable=self.group_by_date_var
        )
        self.date_check.pack(side=tk.LEFT, padx=(0, 8))

        # Right: Action Buttons
        button_box = ttk.Frame(control_frame)
        button_box.pack(side=tk.RIGHT)

        self.open_btn = ttk.Button(
            button_box,
            text="Open Folder",
            command=self._on_open_folder
        )
        self.open_btn.pack(side=tk.LEFT, padx=(0, 8))

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
        # 3b. Interactive Keyboard Shortcuts Bar (Hover for visual context popover)
        # -----------------------------------------------------------------
        shortcut_bar = ttk.LabelFrame(main_container, text=" Keyboard Shortcuts (Hover for Live Context) ", padding="8 6 8 6")
        shortcut_bar.pack(fill=tk.X, pady=(0, 10))

        bar_sub = ttk.Label(
            shortcut_bar,
            text="⌨ Shortcuts:",
            font=("Segoe UI", 8, "bold"),
            foreground="#64748b"
        )
        bar_sub.pack(side=tk.LEFT, padx=(2, 6))

        badges_container = ttk.Frame(shortcut_bar)
        badges_container.pack(side=tk.LEFT, fill=tk.X, expand=True)

        shortcut_actions = [
            ("browse", SHORTCUT_SPECS["browse"]["key"], "Browse", self._on_browse_folder),
            ("organize", SHORTCUT_SPECS["organize"]["key"], "Organize", self._on_start_organize),
            ("dry_run", SHORTCUT_SPECS["dry_run"]["key"], "Dry Run", self._toggle_dry_run),
            ("group_date", SHORTCUT_SPECS["group_date"]["key"], "Date", self._toggle_group_date),
            ("undo", SHORTCUT_SPECS["undo"]["key"], "Undo", self._on_undo_organize),
            ("open_folder", SHORTCUT_SPECS["open_folder"]["key"], "Open", self._on_open_folder),
            ("clear", SHORTCUT_SPECS["clear"]["key"], "Clear", self._on_clear_status),
            ("help", SHORTCUT_SPECS["help"]["key"], "Guide", self._show_shortcuts_dialog),
        ]

        self.shortcut_badges = {}
        for action_id, key_label, name_label, command_func in shortcut_actions:
            badge = tk.Label(
                badges_container,
                text=f"{key_label} {name_label}",
                font=("Consolas", 8),
                bg="#f1f5f9",
                fg="#334155",
                relief="solid",
                borderwidth=1,
                padx=6,
                pady=2,
                cursor="hand2"
            )
            badge.pack(side=tk.LEFT, padx=3)

            # Bind click to execute
            badge.bind("<Button-1>", lambda e, cmd=command_func: cmd())

            # Hover highlight styling
            def _bind_hover(b):
                b.bind("<Enter>", lambda e: b.config(bg="#e2e8f0", fg="#0f172a"), add="+")
                b.bind("<Leave>", lambda e: b.config(bg="#f1f5f9", fg="#334155"), add="+")
            _bind_hover(badge)

            # Attach visual contextual tooltip to shortcut badge
            ContextTooltip(badge, lambda aid=action_id: self._get_context(aid))
            self.shortcut_badges[action_id] = badge

        # Attach visual contextual tooltips to main control buttons as well
        ContextTooltip(self.browse_btn, lambda: self._get_context("browse"))
        ContextTooltip(self.organize_btn, lambda: self._get_context("organize"))
        ContextTooltip(self.dry_run_check, lambda: self._get_context("dry_run"))
        ContextTooltip(self.date_check, lambda: self._get_context("group_date"))
        ContextTooltip(self.undo_btn, lambda: self._get_context("undo"))
        ContextTooltip(self.open_btn, lambda: self._get_context("open_folder"))
        ContextTooltip(self.clear_btn, lambda: self._get_context("clear"))

        self._bind_keyboard_shortcuts()

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
        self.log_message(f"Tip: Hover over any shortcut key ({MOD_KEY}+O, {MOD_KEY}+↵, etc.) to view real-time context popovers.", "info")

    def _has_undo_journal(self) -> bool:
        folder_str = self.folder_path_var.get().strip()
        if not folder_str:
            return False
        try:
            return get_undo_journal_path(Path(folder_str)).exists()
        except Exception:
            return False

    def _get_context(self, action: str) -> Dict[str, str]:
        return get_shortcut_context_explanation(
            action=action,
            folder_path=self.folder_path_var.get(),
            is_dry_run=self.dry_run_var.get(),
            is_running=self.is_running,
            group_by_date=self.group_by_date_var.get(),
            has_undo=self._has_undo_journal(),
        )

    def _toggle_dry_run(self):
        if self.is_running:
            return
        new_val = not self.dry_run_var.get()
        self.dry_run_var.set(new_val)
        mode = "Preview only (Dry Run)" if new_val else "Live Move (Files will be relocated)"
        self.log_message(f"Shortcut {MOD_KEY}+D: Mode set to {mode}", "dry_run" if new_val else "warning")

    def _toggle_group_date(self):
        if self.is_running:
            return
        new_val = not self.group_by_date_var.get()
        self.group_by_date_var.set(new_val)
        status = "enabled (Year-Month subfolders)" if new_val else "disabled (Flat categories)"
        self.log_message(f"Shortcut {MOD_KEY}+G: Date sub-grouping {status}", "info")

    def _show_shortcuts_dialog(self):
        dlg = tk.Toplevel(self.root)
        dlg.title("Sortly — Keyboard Shortcuts & Context Guide")
        dlg.geometry("560x480")
        dlg.minsize(500, 420)
        dlg.transient(self.root)
        dlg.grab_set()

        container = ttk.Frame(dlg, padding="16 16 16 16")
        container.pack(fill=tk.BOTH, expand=True)

        header = ttk.Label(container, text="Keyboard Shortcuts Reference", font=("Segoe UI", 12, "bold"))
        header.pack(anchor=tk.W, pady=(0, 2))

        sub = ttk.Label(
            container,
            text="Hover over any shortcut badge in the main window for live context popovers.",
            font=("Segoe UI", 9),
            foreground="#64748b"
        )
        sub.pack(anchor=tk.W, pady=(0, 12))

        table_frame = ttk.Frame(container)
        table_frame.pack(fill=tk.BOTH, expand=True)

        for action_id, spec in SHORTCUT_SPECS.items():
            ctx = self._get_context(action_id)
            row = ttk.Frame(table_frame)
            row.pack(fill=tk.X, pady=4)

            k_lbl = tk.Label(
                row,
                text=f" {spec['key']} ",
                font=("Consolas", 9, "bold"),
                bg="#0284c7",
                fg="#ffffff",
                padx=4,
                pady=1,
                width=10,
                anchor="center"
            )
            k_lbl.pack(side=tk.LEFT, padx=(0, 8))

            info_box = ttk.Frame(row)
            info_box.pack(side=tk.LEFT, fill=tk.X, expand=True)

            t_lbl = ttk.Label(info_box, text=spec["title"], font=("Segoe UI", 9, "bold"))
            t_lbl.pack(anchor=tk.W)

            desc_lbl = ttk.Label(
                info_box,
                text=f"{spec['description']} • Context: {ctx['context_status']}",
                font=("Segoe UI", 8),
                foreground="#555555"
            )
            desc_lbl.pack(anchor=tk.W)

        btn_row = ttk.Frame(container)
        btn_row.pack(fill=tk.X, pady=(12, 0))
        ttk.Button(btn_row, text="Close", command=dlg.destroy).pack(side=tk.RIGHT)

    def _bind_keyboard_shortcuts(self):
        mod = "Command" if IS_MAC else "Control"

        # Browse folder: Ctrl+O
        self.root.bind(f"<{mod}-o>", lambda e: self._on_browse_folder())
        self.root.bind(f"<{mod}-O>", lambda e: self._on_browse_folder())

        # Organize: Ctrl+Enter
        self.root.bind(f"<{mod}-Return>", lambda e: self._on_start_organize())

        # Toggle dry-run: Ctrl+D
        self.root.bind(f"<{mod}-d>", lambda e: self._toggle_dry_run())
        self.root.bind(f"<{mod}-D>", lambda e: self._toggle_dry_run())

        # Toggle date group: Ctrl+G
        self.root.bind(f"<{mod}-g>", lambda e: self._toggle_group_date())
        self.root.bind(f"<{mod}-G>", lambda e: self._toggle_group_date())

        # Undo: Ctrl+Z
        self.root.bind(f"<{mod}-z>", lambda e: self._on_undo_organize())
        self.root.bind(f"<{mod}-Z>", lambda e: self._on_undo_organize())

        # Open in Explorer: Ctrl+E
        self.root.bind(f"<{mod}-e>", lambda e: self._on_open_folder())
        self.root.bind(f"<{mod}-E>", lambda e: self._on_open_folder())

        # Clear Status: Ctrl+L
        self.root.bind(f"<{mod}-l>", lambda e: self._on_clear_status())
        self.root.bind(f"<{mod}-L>", lambda e: self._on_clear_status())

        # Help guide: F1 or Ctrl+/
        self.root.bind("<F1>", lambda e: self._show_shortcuts_dialog())
        self.root.bind(f"<{mod}-slash>", lambda e: self._show_shortcuts_dialog())

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
        self.open_btn.config(state=state)
        self.dry_run_check.config(state=state)
        self.date_check.config(state=state)
        self.path_entry.config(state=state)

    def _on_open_folder(self):
        folder_str = self.folder_path_var.get().strip()
        if not folder_str:
            messagebox.showwarning("No Folder Selected", "Please select or browse for a target folder first.")
            return

        folder_path = Path(folder_str)
        if not folder_path.exists() or not folder_path.is_dir():
            messagebox.showerror("Invalid Path", f"The directory is not accessible:\n{folder_path}")
            return

        opened = open_folder_in_explorer(folder_path)
        if opened:
            self.log_message(f"Opened target directory in OS file manager: {folder_path.name}", "info")
        else:
            messagebox.showwarning("Explorer Launch", "Unable to automatically launch system file manager on this OS.")

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
                f"Errors: {errors}\n\nEmpty category and date subfolders have been cleaned up."
            )
        else:
            self.status_var.set("No undo journal found.")
            messagebox.showinfo("Undo Status", "No previous organization journal found to revert in this folder.")

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
        group_by_date = self.group_by_date_var.get()

        if not is_dry_run:
            subfolder_note = "\n(Files will also be grouped into Date subfolders)" if group_by_date else ""
            confirmed = messagebox.askyesno(
                "Confirm Organization",
                f"You are about to organize files in:\n{folder_path}{subfolder_note}\n\n"
                f"Files will be relocated safely into categorized folders.\n"
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
            args=(folder_path, is_dry_run, group_by_date),
            daemon=True
        )
        worker.start()

    def _run_organize_thread(self, folder_path: Path, is_dry_run: bool, group_by_date: bool):
        try:
            summary = organize_folder(
                folder_path=folder_path,
                dry_run=is_dry_run,
                group_by_date=group_by_date,
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
            self.status_var.set(f"Done! Successfully organized {summary.moved_count} files.")
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


def run_cli(
    folder_path: str,
    dry_run: bool,
    group_by_date: bool = False,
    config_path: Optional[str] = None,
    open_folder: bool = False
):
    """Fallback CLI mode for terminal usage or headless environments."""
    print("=" * 60)
    print("  Sortly — Organize your files automatically.")
    print("=" * 60)
    path = Path(folder_path)

    def cli_logger(msg: str, level: str):
        print(f"[{level.upper():7s}] {msg}")

    custom_cfg = Path(config_path) if config_path else None
    summary = organize_folder(
        path,
        dry_run=dry_run,
        group_by_date=group_by_date,
        config_path=custom_cfg,
        progress_callback=cli_logger
    )
    print("-" * 60)
    print("Summary:")
    print(f"  Mode:            {'DRY RUN (Preview)' if summary.is_dry_run else 'REAL MOVE'}")
    print(f"  Date Grouping:   {'ENABLED' if group_by_date else 'DISABLED'}")
    print(f"  Files Scanned:   {summary.scanned_count}")
    print(f"  Files Moved:     {summary.moved_count}")
    print(f"  Files Skipped:   {summary.skipped_count}")
    print(f"  Errors:          {summary.error_count}")
    print("=" * 60)

    if open_folder and not summary.is_dry_run:
        open_folder_in_explorer(path)


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
    parser.add_argument("--date", "--group-by-date", dest="group_by_date", action="store_true", help="Organize files into Date (Year-Month) subfolders")
    parser.add_argument("--config", default=None, help="Path to custom sortly_config.json file")
    parser.add_argument("--open", action="store_true", help="Open target folder in File Explorer / Finder upon completion")
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
        run_cli(
            args.folder,
            dry_run=args.dry_run,
            group_by_date=args.group_by_date,
            config_path=args.config,
            open_folder=args.open
        )
        return

    if not HAS_TKINTER:
        print("[Sortly]")
        print("Organize your files automatically.")
        print("Note: Graphical interface (tkinter/X11 display) is not active in this environment.")
        print("You can run Sortly via CLI:")
        print("    python3 main.py <folder_path> [--dry-run] [--date] [--config FILE] [--undo]")
        print()
        if args.folder:
            run_cli(
                args.folder,
                dry_run=args.dry_run,
                group_by_date=args.group_by_date,
                config_path=args.config,
                open_folder=args.open
            )
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
        if args.group_by_date:
            app.group_by_date_var.set(True)
    root.mainloop()


if __name__ == "__main__":
    main()
