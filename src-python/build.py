#!/usr/bin/env python3
"""
Build script for RedactShotX Python backend.
Creates executable versions of the redactor and API server.
"""

import os
import sys
import shutil
import subprocess
import platform
from pathlib import Path


def ensure_pyinstaller():
    """Make sure PyInstaller is installed."""
    try:
        import PyInstaller

        print("PyInstaller already installed.")
    except ImportError:
        print("Installing PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])


def install_requirements():
    """Install required Python packages."""
    print("Installing requirements...")
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"]
    )


def build_executables():
    """Build executable versions of redactor.py and api.py."""
    # Create dist directory if it doesn't exist
    os.makedirs("dist", exist_ok=True)

    # Get current OS
    current_os = platform.system().lower()
    print(f"Building for OS: {current_os}")

    # Build redactor executable
    print("Building redactor executable...")
    subprocess.check_call(["pyinstaller", "--onefile", "--clean", "redactor.spec"])

    # Build API server executable
    print("Building API server executable...")
    subprocess.check_call(["pyinstaller", "--onefile", "--clean", "api.spec"])

    # Copy executables to appropriate directory for Tauri to access
    output_dir = Path("../src-tauri/bin") / current_os
    os.makedirs(output_dir, exist_ok=True)

    # Copy and rename based on platform
    if current_os == "windows":
        shutil.copy2("dist/redactor.exe", output_dir / "redactor.exe")
        shutil.copy2("dist/redactshot-api.exe", output_dir / "redactshot-api.exe")
    else:
        shutil.copy2("dist/redactor", output_dir / "redactor")
        shutil.copy2("dist/redactshot-api", output_dir / "redactshot-api")

        # Make executables executable on Unix platforms
        os.chmod(output_dir / "redactor", 0o755)
        os.chmod(output_dir / "redactshot-api", 0o755)

    print(f"Executables copied to {output_dir}")


def main():
    """Main build function."""
    print("Starting build process for RedactShotX Python backend...")

    # Make sure we're in the right directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    # Install dependencies
    ensure_pyinstaller()
    install_requirements()

    # Build executables
    build_executables()

    print("Build completed successfully!")


if __name__ == "__main__":
    main()
