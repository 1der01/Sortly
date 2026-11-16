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

        self.date_format = date_format
        self._lookup: Dict[str, str] = {}

        if mappings:
            self.apply_mappings(mappings)

        self.ignored_extensions: set[str] = set()
        self.set_ignored_extensions(ignored_extensions or [])
        self._rebuild_lookup()

    @staticmethod
    def _normalize_extensions(values: Optional[List[str]]) -> List[str]:
        if not values:
            return []
        normalized = []
        seen = set()
        for value in values:
            if value is None:
                continue
            clean = str(value).strip().lstrip(".").lower()
            if clean and clean not in seen:
                normalized.append(clean)
                seen.add(clean)
        return normalized

    def apply_mappings(self, mappings: Dict[str, List[str]]) -> None:
        """Merge custom mappings into the config, allowing custom categories to override defaults."""
        if not mappings:
            return
        for cat, exts in mappings.items():
            clean_name = str(cat).strip()
            if not clean_name:
                continue
            merged = self._normalize_extensions(exts)
            if clean_name in self.mappings:
                # Merge with existing category, preserving its default entries and appending new ones.
                existing = self.mappings[clean_name]
                self.mappings[clean_name] = existing + [e for e in merged if e not in existing]
            else:
                self.mappings[clean_name] = merged
        self._rebuild_lookup()

    def add_category(self, category: str, extensions: Optional[List[str]], overwrite: bool = False) -> List[str]:
        """Add or update a category and return its normalized extension list."""
        clean_name = str(category).strip()
        if not clean_name:
            raise ValueError("Category name cannot be empty.")

        normalized = self._normalize_extensions(extensions)
        if clean_name in self.mappings and not overwrite:
            merged = self.mappings[clean_name] + [e for e in normalized if e not in self.mappings[clean_name]]
            self.mappings[clean_name] = merged
        else:
            self.mappings[clean_name] = normalized

        self._rebuild_lookup()
        return list(self.mappings[clean_name])

    def remove_category(self, category: str) -> bool:
        """Remove a custom category if it is not one of the built-in defaults."""
        clean_name = str(category).strip()
        if not clean_name or clean_name in DEFAULT_CATEGORY_MAPPINGS:
            return False
        if clean_name in self.mappings:
            del self.mappings[clean_name]
            self._rebuild_lookup()
            return True
        return False

    def set_ignored_extensions(self, ignored_extensions: Optional[List[str]]) -> None:
        self.ignored_extensions = set()
        for ext in self._normalize_extensions(ignored_extensions):
            self.ignored_extensions.add(ext)

    def add_ignored_extension(self, extension: str) -> bool:
        """Add an ignored extension if it is not already tracked."""
        cleaned = self._normalize_extensions([extension])
        if not cleaned:
            return False
        ext = cleaned[0]
        if ext in self.ignored_extensions:
            return False
        self.ignored_extensions.add(ext)
        return True

    def remove_ignored_extension(self, extension: str) -> bool:
        """Remove an ignored extension, returning True if it existed."""
        cleaned = self._normalize_extensions([extension])
        if not cleaned:
            return False
        ext = cleaned[0]
        if ext not in self.ignored_extensions:
            return False
        self.ignored_extensions.remove(ext)
        return True

    def get_ignored_extensions(self) -> List[str]:
        return sorted(self.ignored_extensions)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "categories": {cat: list(exts) for cat, exts in self.mappings.items() if cat != DEFAULT_CATEGORY},
            "ignored_extensions": sorted(self.ignored_extensions),
            "date_format": self.date_format,
        }

    def save_to_file(self, path: Path) -> Path:
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        with open(target, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2)
        return target

    @classmethod
    def from_file(cls, path: Path) -> "SortlyConfig":
        target = Path(path)
        if not target.exists():
            return cls()
        with open(target, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls(
            mappings=data.get("categories", {}),
            ignored_extensions=data.get("ignored_extensions", []),
            date_format=data.get("date_format", "%Y-%m"),
        )

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


def save_sortly_config(config: SortlyConfig, path: Optional[Path] = None) -> Path:
    """Persist a SortlyConfig instance to a sortly_config.json file."""
    target = Path(path) if path else Path.cwd() / "sortly_config.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    with open(target, "w", encoding="utf-8") as f:
        json.dump(config.to_dict(), f, indent=2)
    return target


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

