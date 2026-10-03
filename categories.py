"""
categories.py - File category definitions and extension mapping.

This module defines the mapping between file extensions and their target categories.
Unsupported or unrecognized extensions are automatically assigned to the "Others" category.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Supported categories with their associated lowercase file extensions (without leading dot).
DEFAULT_CATEGORY_MAPPINGS: Dict[str, List[str]] = {
    "Documents": [
        "pdf", "doc", "docx", "txt", "xlsx", "xls", "ppt", "pptx",
        "csv", "rtf", "odt", "ods", "odp", "tex", "epub", "md"
    ],
    "Images": [
        "jpg", "jpeg", "png", "gif", "webp", "svg",
        "bmp", "tiff", "tif", "ico", "heic", "raw", "psd", "ai"
    ],
    "Videos": [
        "mp4", "mkv", "avi", "mov", "webm",
        "wmv", "flv", "m4v", "mpg", "mpeg", "3gp", "ts"
    ],
    "Audio": [
        "mp3", "wav", "flac", "m4a",
        "aac", "ogg", "wma", "aiff", "alac", "opus", "mid", "midi"
    ],
    "Archives": [
        "zip", "rar", "7z", "tar", "gz",
        "bz2", "xz", "iso", "tgz", "tbz2", "cab"
    ],
    "Code": [
        "py", "js", "html", "css", "php", "java", "c", "cpp",
        "h", "hpp", "cs", "go", "rs", "rb", "ts", "tsx", "jsx",
        "json", "xml", "yaml", "yml", "sql", "sh", "bash", "swift", "kt"
    ],
}

DEFAULT_CATEGORY = "Others"

# Maintain backwards compatibility
CATEGORY_MAPPINGS = DEFAULT_CATEGORY_MAPPINGS


class SortlyConfig:
    """Manages custom category mappings and file filtering preferences."""

    def __init__(self, mappings: Optional[Dict[str, List[str]]] = None, ignored_extensions: Optional[List[str]] = None, date_format: str = "%Y-%m"):
        self.mappings: Dict[str, List[str]] = {}
        for cat, exts in DEFAULT_CATEGORY_MAPPINGS.items():
            self.mappings[cat] = list(exts)

        if mappings:
            for cat, exts in mappings.items():
                if cat in self.mappings:
                    # Merge extensions without duplicates
                    existing = set(self.mappings[cat])
                    for e in exts:
                        clean_e = e.strip().lstrip(".").lower()
                        if clean_e and clean_e not in existing:
                            self.mappings[cat].append(clean_e)
                            existing.add(clean_e)
                else:
                    self.mappings[cat] = [e.strip().lstrip(".").lower() for e in exts if e.strip()]

        self.ignored_extensions: set[str] = set()
        if ignored_extensions:
            for ext in ignored_extensions:
                clean = ext.strip().lstrip(".").lower()
                if clean:
                    self.ignored_extensions.add(clean)

        self.date_format = date_format
        self._lookup: Dict[str, str] = {}
        self._rebuild_lookup()

    def _rebuild_lookup(self):
        self._lookup.clear()
        for category, extensions in self.mappings.items():
            for ext in extensions:
                self._lookup[ext.lower()] = category

    def get_category(self, extension: Optional[str]) -> str:
        if not extension:
            return DEFAULT_CATEGORY
        cleaned = extension.strip().lstrip(".").lower()
        if not cleaned:
            return DEFAULT_CATEGORY
        return self._lookup.get(cleaned, DEFAULT_CATEGORY)

    def is_ignored_extension(self, extension: Optional[str]) -> bool:
        if not extension:
            return False
        cleaned = extension.strip().lstrip(".").lower()
        return cleaned in self.ignored_extensions

    def get_all_categories(self) -> List[str]:
        cats = list(self.mappings.keys())
        if DEFAULT_CATEGORY not in cats:
            cats.append(DEFAULT_CATEGORY)
        return cats


# Global default configuration instance
_GLOBAL_CONFIG = SortlyConfig()


def load_sortly_config(custom_path: Optional[Path] = None, search_folder: Optional[Path] = None) -> Tuple[SortlyConfig, Optional[Path]]:
    """
    Attempts to load a sortly_config.json configuration file.
    Search order:
    1. custom_path (if specified by caller/CLI)
    2. search_folder / sortly_config.json
    3. current working directory / sortly_config.json
    4. user home directory / .sortly_config.json
    """
    candidates = []
    if custom_path:
        candidates.append(Path(custom_path))
    if search_folder:
        candidates.append(search_folder / "sortly_config.json")
    candidates.append(Path.cwd() / "sortly_config.json")
    candidates.append(Path.home() / ".sortly_config.json")

    for path in candidates:
        if path and path.exists() and path.is_file():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                custom_mappings = data.get("categories", {})
                ignored = data.get("ignored_extensions", [])
                date_fmt = data.get("date_format", "%Y-%m")
                cfg = SortlyConfig(mappings=custom_mappings, ignored_extensions=ignored, date_format=date_fmt)
                return cfg, path
            except Exception:
                continue

    return SortlyConfig(), None


def get_category_for_extension(extension: Optional[str], config: Optional[SortlyConfig] = None) -> str:
    """
    Returns the category name for a given file extension.
    """
    cfg = config or _GLOBAL_CONFIG
    return cfg.get_category(extension)


def get_all_categories(config: Optional[SortlyConfig] = None) -> List[str]:
    """
    Returns a list of all configured category names including 'Others'.
    """
    cfg = config or _GLOBAL_CONFIG
    return cfg.get_all_categories()


def get_extensions_for_category(category: str, config: Optional[SortlyConfig] = None) -> List[str]:
    """
    Returns the list of extensions associated with a category.
    """
    cfg = config or _GLOBAL_CONFIG
    return cfg.mappings.get(category, [])

