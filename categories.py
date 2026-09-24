"""
categories.py - File category definitions and extension mapping.

This module defines the mapping between file extensions and their target categories.
Unsupported or unrecognized extensions are automatically assigned to the "Others" category.
"""

from __future__ import annotations

from typing import Dict, List, Optional

# Supported categories with their associated lowercase file extensions (without leading dot).
CATEGORY_MAPPINGS: Dict[str, List[str]] = {
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

# Precompute a reverse lookup map for O(1) extension-to-category resolution
_EXTENSION_LOOKUP: Dict[str, str] = {}
for category, extensions in CATEGORY_MAPPINGS.items():
    for ext in extensions:
        _EXTENSION_LOOKUP[ext.lower()] = category


def get_category_for_extension(extension: Optional[str]) -> str:
    """
    Returns the category name for a given file extension.

    Args:
        extension: The file extension (with or without leading dot, case-insensitive).
                   Can be None or empty string.

    Returns:
        The matched category name, or "Others" if not recognized or extension is absent.

    Examples:
        >>> get_category_for_extension(".pdf")
        'Documents'
        >>> get_category_for_extension("PNG")
        'Images'
        >>> get_category_for_extension(".unknown")
        'Others'
        >>> get_category_for_extension("")
        'Others'
    """
    if not extension:
        return DEFAULT_CATEGORY

    # Clean the extension: remove whitespace, leading dot, and convert to lowercase
    cleaned_ext = extension.strip().lstrip(".").lower()

    if not cleaned_ext:
        return DEFAULT_CATEGORY

    return _EXTENSION_LOOKUP.get(cleaned_ext, DEFAULT_CATEGORY)


def get_all_categories() -> List[str]:
    """
    Returns a sorted list of all configured category names including 'Others'.
    """
    categories = list(CATEGORY_MAPPINGS.keys())
    if DEFAULT_CATEGORY not in categories:
        categories.append(DEFAULT_CATEGORY)
    return categories


def get_extensions_for_category(category: str) -> List[str]:
    """
    Returns the list of extensions associated with a category.
    """
    return CATEGORY_MAPPINGS.get(category, [])
