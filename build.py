#!/usr/bin/env python3
"""
Build script for creating distributable packages of RedactShotX using PyInstaller
"""

import os
import sys
import shutil
import subprocess
import platform
import argparse
from pathlib import Path

# Define paths
ROOT_DIR = Path(__file__).parent.absolute()
DIST_DIR = ROOT_DIR / "dist"
BUILD_DIR = ROOT_DIR / "build"
SPEC_FILE = ROOT_DIR / "redactshotx.spec"
FRONTEND_DIR = ROOT_DIR / "dist-web"
ASSETS_DIR = ROOT_DIR / "assets"

def setup_venv():
    """Set up and activate virtual environment if it doesn't exist"""
    print("📦 Setting up virtual environment...")
    
    if not (ROOT_DIR / "venv").exists():
        subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)
    
    # Determine virtual environment Python path
    if platform.system() == "Windows":
        python_path = ROOT_DIR / "venv" / "Scripts" / "python.exe"
    else:
        python_path = ROOT_DIR / "venv" / "bin" / "python"
    
    if not python_path.exists():
        print(f"❌ Virtual environment Python not found at {python_path}")
        sys.exit(1)
    
    return str(python_path)

def install_dependencies(python_path):
    """Install required dependencies"""
    print("📦 Installing dependencies...")
    
    # Install development dependencies
    subprocess.run([
        python_path, "-m", "pip", "install", "--upgrade", 
        "pip", "setuptools", "wheel", "pyinstaller", "pywebview", "requests"
    ], check=True)
    
    # Install app dependencies from backend
    subprocess.run([
        python_path, "-m", "pip", "install", "-e", "./backend"
    ], check=True)
    
    # Install spaCy model if needed
    try:
        subprocess.run([
            python_path, "-c", "import spacy; spacy.load('en_core_web_trf')"
        ], check=True, capture_output=True)
    except subprocess.CalledProcessError:
        print("📦 Installing spaCy language model...")
        subprocess.run([
            python_path, "-m", "spacy", "download", "en_core_web_trf"
        ], check=True)

def build_frontend():
    """Build the React frontend"""
    print("🔨 Building frontend...")
    
    # Install Node.js dependencies if needed
    if not (ROOT_DIR / "node_modules").exists():
        subprocess.run(["npm", "install"], check=True)
    
    # Build the frontend
    subprocess.run(["npm", "run", "build"], check=True)
    
    if not FRONTEND_DIR.exists():
        print("❌ Frontend build failed: dist-web directory not found")
        sys.exit(1)

def ensure_icons_exist():
    """Make sure icon files exist for all platforms"""
    print("🔍 Checking for application icons...")
    
    # Check for SVG icon and generate platform-specific icons if needed
    svg_icon = ASSETS_DIR / "icon.svg"
    ico_icon = ASSETS_DIR / "icon.ico"
    icns_icon = ASSETS_DIR / "icon.icns"
    
    # Create assets directory if it doesn't exist
    if not ASSETS_DIR.exists():
        os.makedirs(ASSETS_DIR, exist_ok=True)
    
    # Check if we need to generate icons
    if (not svg_icon.exists() or 
        not ico_icon.exists() or 
        not icns_icon.exists()):
        
        if svg_icon.exists():
            print("📄 Generating platform-specific icons from SVG...")
            
            # Check if the icon generator script exists
            generator_script = ROOT_DIR / "generate_icons.py"
            if generator_script.exists():
                subprocess.run([str(generator_script)], check=True)
            else:
                print("⚠️ Icon generator script not found. Platform-specific icons may be missing.")
        else:
            print("⚠️ SVG icon not found. Application will use default icons.")
    else:
        print("✅ All platform icons found.")

def create_pyinstaller_spec(python_path):
    """Create or update PyInstaller spec file"""
    print("📝 Creating PyInstaller spec file...")
    
    # Remove existing spec file if it exists
    if SPEC_FILE.exists():
        SPEC_FILE.unlink()
    
    # Set icon paths based on platform
    ico_path = ASSETS_DIR / "icon.ico"
    icns_path = ASSETS_DIR / "icon.icns"
    
    ico_str = f"'{ico_path}'" if ico_path.exists() else "None"
    icns_str = f"'{icns_path}'" if icns_path.exists() else "None"
    
    # Create the spec file content
    spec_content = f"""# -*- mode: python ; coding: utf-8 -*-
import sys
import os
from pathlib import Path

block_cipher = None

# Add backend to path so PyInstaller can find the modules
sys.path.append(str(Path('{ROOT_DIR}').absolute()))

a = Analysis(
    ['{ROOT_DIR / "main.py"}'],
    pathex=['{ROOT_DIR}'],
    binaries=[],
    datas=[
        ('{FRONTEND_DIR}', 'web'),
    ],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.off',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.websockets_impl',
        'fastapi',
        'presidio_image_redactor',
        'presidio_analyzer',
        'spacy',
        'en_core_web_trf',
        'pytesseract',
    ],
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='RedactShotX',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon={ico_str},
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='RedactShotX',
)

# macOS specific
app = BUNDLE(
    coll,
    name='RedactShotX.app',
    icon={icns_str},
    bundle_identifier='com.redactshotx.app',
    info_plist={{
        'NSPrincipalClass': 'NSApplication',
        'NSAppleScriptEnabled': False,
        'CFBundleShortVersionString': '1.0.0',
        'CFBundleVersion': '1.0.0',
        'NSHighResolutionCapable': True,
        'LSApplicationCategoryType': 'public.app-category.utilities',
        'NSHighResolutionMagnifyAllowed': False,
        'NSRequiresAquaSystemAppearance': False,
    }},
)
"""
    
    # Write the spec file
    with open(SPEC_FILE, "w") as f:
        f.write(spec_content)
    
    return SPEC_FILE

def build_package(python_path, spec_file):
    """Build the package using PyInstaller"""
    print("🔨 Building package with PyInstaller...")
    
    # Clean up previous builds
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    
    # Build with PyInstaller
    subprocess.run([
        python_path, "-m", "PyInstaller", str(spec_file),
        "--clean", "--noconfirm"
    ], check=True)
    
    print(f"✅ Build complete! Package available in {DIST_DIR}")

def main():
    """Main build function"""
    parser = argparse.ArgumentParser(description="Build RedactShotX package")
    parser.add_argument("--skip-frontend", action="store_true", help="Skip building the frontend")
    args = parser.parse_args()
    
    try:
        # Setup environment
        python_path = setup_venv()
        install_dependencies(python_path)
        
        # Build frontend unless skipped
        if not args.skip_frontend:
            build_frontend()
        else:
            print("⚠️ Skipping frontend build as requested")
            if not FRONTEND_DIR.exists():
                print("❌ Frontend dist directory not found. Please build frontend first.")
                sys.exit(1)
        
        # Ensure icons exist
        ensure_icons_exist()
        
        # Create spec file and build package
        spec_file = create_pyinstaller_spec(python_path)
        build_package(python_path, spec_file)
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Build failed: {str(e)}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error during build: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 