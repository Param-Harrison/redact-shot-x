#!/usr/bin/env python3
"""
Icon Generator for RedactShotX
Generates all required icon formats for different platforms from the SVG source
"""

import os
import sys
import subprocess
from pathlib import Path

# Check if ImageMagick is installed
try:
    subprocess.run(["convert", "--version"], capture_output=True, check=True)
except (subprocess.CalledProcessError, FileNotFoundError):
    print("Error: ImageMagick is not installed or not in PATH")
    print("Please install ImageMagick: https://imagemagick.org/script/download.php")
    sys.exit(1)

# Define paths
ROOT_DIR = Path(__file__).parent.absolute()
ASSETS_DIR = ROOT_DIR / "assets"
SVG_ICON = ASSETS_DIR / "icon.svg"

# Check if SVG icon exists
if not SVG_ICON.exists():
    print(f"Error: SVG icon not found at {SVG_ICON}")
    sys.exit(1)

# Create assets directory if it doesn't exist
os.makedirs(ASSETS_DIR, exist_ok=True)

# Icon sizes for various platforms
ICON_SIZES = {
    "windows": [16, 24, 32, 48, 64, 128, 256],
    "macos": [16, 32, 64, 128, 256, 512, 1024],
    "linux": [16, 22, 24, 32, 48, 64, 128, 256, 512]
}

def generate_png_icons():
    """Generate PNG icons in various sizes"""
    print("Generating PNG icons...")
    
    # Create directory for PNG icons if it doesn't exist
    png_dir = ASSETS_DIR / "png"
    os.makedirs(png_dir, exist_ok=True)
    
    # Generate PNG files of various sizes
    all_sizes = set()
    for platform_sizes in ICON_SIZES.values():
        all_sizes.update(platform_sizes)
    
    for size in sorted(all_sizes):
        output_file = png_dir / f"icon_{size}x{size}.png"
        print(f"  Creating {output_file.name}...")
        subprocess.run([
            "convert",
            "-background", "none",
            "-density", "1200",
            "-resize", f"{size}x{size}",
            str(SVG_ICON),
            str(output_file)
        ], check=True)

def generate_ico_file():
    """Generate Windows ICO file"""
    print("Generating Windows ICO file...")
    
    ico_file = ASSETS_DIR / "icon.ico"
    png_dir = ASSETS_DIR / "png"
    
    # Build command with all required PNG files
    cmd = ["convert"]
    for size in ICON_SIZES["windows"]:
        cmd.append(str(png_dir / f"icon_{size}x{size}.png"))
    cmd.append(str(ico_file))
    
    # Run the command
    subprocess.run(cmd, check=True)
    print(f"  Created {ico_file}")

def generate_icns_file():
    """Generate macOS ICNS file"""
    print("Generating macOS ICNS file...")
    
    icns_file = ASSETS_DIR / "icon.icns"
    png_dir = ASSETS_DIR / "png"
    iconset_dir = ASSETS_DIR / "icon.iconset"
    
    # Create iconset directory
    os.makedirs(iconset_dir, exist_ok=True)
    
    # Copy PNG files to iconset directory with correct names
    for size in ICON_SIZES["macos"]:
        if size <= 512:
            subprocess.run([
                "cp",
                str(png_dir / f"icon_{size}x{size}.png"),
                str(iconset_dir / f"icon_{size}x{size}.png")
            ], check=True)
            
            # Also create @2x versions for Retina displays
            if size * 2 in ICON_SIZES["macos"]:
                subprocess.run([
                    "cp",
                    str(png_dir / f"icon_{size*2}x{size*2}.png"),
                    str(iconset_dir / f"icon_{size}x{size}@2x.png")
                ], check=True)
    
    # Use iconutil to create ICNS file (macOS only)
    if sys.platform == "darwin":
        subprocess.run([
            "iconutil",
            "-c", "icns",
            str(iconset_dir),
            "-o", str(icns_file)
        ], check=True)
        print(f"  Created {icns_file}")
    else:
        print("  Warning: ICNS generation requires macOS. Skipping...")

def generate_linux_icons():
    """Generate Linux app icons in various directories"""
    print("Generating Linux app icons...")
    
    for size in ICON_SIZES["linux"]:
        target_dir = ASSETS_DIR / "linux" / f"{size}x{size}" / "apps"
        os.makedirs(target_dir, exist_ok=True)
        
        target_file = target_dir / "redactshotx.png"
        source_file = ASSETS_DIR / "png" / f"icon_{size}x{size}.png"
        
        subprocess.run([
            "cp",
            str(source_file),
            str(target_file)
        ], check=True)
        
        print(f"  Created {target_file}")

def main():
    """Main function"""
    try:
        generate_png_icons()
        generate_ico_file()
        generate_icns_file()
        generate_linux_icons()
        
        print("\nIcon generation complete!")
        print(f"All icons are available in the {ASSETS_DIR} directory")
        
    except subprocess.CalledProcessError as e:
        print(f"Error generating icons: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 