"""
config.py - Configuration management for Sortly.

Handles user preferences, recent folders, custom categories, and application settings.
Stores configuration in a JSON file in the user's home directory.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class UserPreferences:
    """User preferences and application settings."""
    default_dry_run: bool = True
    skip_large_files: bool = False
    max_file_size_mb: int = 100
    show_file_sizes: bool = True
    theme: str = "light"
    recent_folders: List[str] = field(default_factory=list)
    max_recent_folders: int = 10
    
    # Custom category extensions (extensions added by user)
    custom_categories: Dict[str, List[str]] = field(default_factory=dict)


class ConfigManager:
    """Manages loading and saving user configuration."""
    
    CONFIG_DIR = Path.home() / ".sortly"
    CONFIG_FILE = CONFIG_DIR / "config.json"
    
    def __init__(self):
        self._ensure_config_dir()
        self.preferences = self._load_config()
    
    def _ensure_config_dir(self) -> None:
        """Create the configuration directory if it doesn't exist."""
        self.CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    
    def _load_config(self) -> UserPreferences:
        """Load configuration from file or return defaults."""
        if not self.CONFIG_FILE.exists():
            return UserPreferences()
        
        try:
            with open(self.CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            return UserPreferences(**data)
        except (json.JSONDecodeError, TypeError, KeyError) as e:
            # If config is corrupted, return defaults
            return UserPreferences()
    
    def save_config(self) -> bool:
        """Save current preferences to configuration file."""
        try:
            with open(self.CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(asdict(self.preferences), f, indent=2)
            return True
        except Exception:
            return False
    
    def add_recent_folder(self, folder_path: str) -> None:
        """Add a folder to recent folders list, maintaining max size."""
        folder_path = str(Path(folder_path).resolve())
        
        # Remove if already exists (to move to top)
        if folder_path in self.preferences.recent_folders:
            self.preferences.recent_folders.remove(folder_path)
        
        # Add to front
        self.preferences.recent_folders.insert(0, folder_path)
        
        # Trim to max size
        if len(self.preferences.recent_folders) > self.preferences.max_recent_folders:
            self.preferences.recent_folders = self.preferences.recent_folders[:self.preferences.max_recent_folders]
        
        self.save_config()
    
    def get_recent_folders(self) -> List[str]:
        """Get list of recent folders."""
        return self.preferences.recent_folders.copy()
    
    def clear_recent_folders(self) -> None:
        """Clear the recent folders list."""
        self.preferences.recent_folders = []
        self.save_config()
    
    def add_custom_category(self, category: str, extensions: List[str]) -> None:
        """Add or update a custom category with extensions."""
        self.preferences.custom_categories[category] = [ext.lower().lstrip('.') for ext in extensions]
        self.save_config()
    
    def remove_custom_category(self, category: str) -> None:
        """Remove a custom category."""
        if category in self.preferences.custom_categories:
            del self.preferences.custom_categories[category]
            self.save_config()
    
    def get_custom_categories(self) -> Dict[str, List[str]]:
        """Get all custom categories."""
        return self.preferences.custom_categories.copy()


# Global config instance
_config_instance: Optional[ConfigManager] = None


def get_config() -> ConfigManager:
    """Get the global configuration manager instance."""
    global _config_instance
    if _config_instance is None:
        _config_instance = ConfigManager()
    return _config_instance
