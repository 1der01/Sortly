"""
build_exe.py - Builds a standalone Sortly executable using PyInstaller.

Usage:
    python build_exe.py             # windowed app build (recommended)
    python build_exe.py --console   # console build (useful for debugging)

Produces:
    dist/Sortly.exe   on Windows
    dist/Sortly       on macOS / Linux

Requirements:
    pip install ".[dev]"    (or: pip install pyinstaller)
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
ASSETS_DIR = PROJECT_ROOT / "assets"
ICON_FILE = ASSETS_DIR / "sortly.ico"
PNG_FILE = ASSETS_DIR / "sortly-icon.png"


def ensure_assets():
    """Generate icon assets on demand if they are missing."""
    if not ICON_FILE.exists():
        print("Icon assets not found - generating them with make_icon.py ...")
        subprocess.run([sys.executable, str(PROJECT_ROOT / "make_icon.py")], cwd=PROJECT_ROOT, check=False)


def main() -> int:
    try:
        import PyInstaller  # noqa: F401
    except ImportError:
        print('PyInstaller is not installed. Run: pip install ".[dev]"  (or: pip install pyinstaller)')
        return 1

    ensure_assets()

    console = "--console" in sys.argv[1:]

    args = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--name", "Sortly",
        "--console" if console else "--windowed",
    ]

    bundled = False
    for asset in (ICON_FILE, PNG_FILE):
        if asset.exists():
            args += ["--add-data", f"{asset}{os.pathsep}assets"]
            bundled = True
    if ICON_FILE.exists():
        args += ["--icon", str(ICON_FILE)]
    if not bundled:
        print("Note: no icon assets found - building without a custom icon.")

    args.append(str(PROJECT_ROOT / "main.py"))

    print("Building standalone executable...")
    print("  " + " ".join(args))
    result = subprocess.run(args, cwd=PROJECT_ROOT)

    if result.returncode != 0:
        print("Build failed.")
        return result.returncode

    exe_name = "Sortly.exe" if sys.platform == "win32" else "Sortly"
    print(f"Build complete: {PROJECT_ROOT / 'dist' / exe_name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
