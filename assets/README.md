# Application Icons for RedactShotX

This directory contains the application icons for RedactShotX in various formats for different platforms.

## Icon Files

- `icon.svg` - Source vector icon
- `icon.ico` - Windows icon (used in `.exe` files and Windows taskbar)
- `icon.icns` - macOS icon (used in `.app` bundles and macOS dock)
- `png/` - Directory containing PNG icons of various sizes
- `linux/` - Directory containing Linux icons organized by size for desktop environments

## Generating Icons

The icons were generated using the `generate_icons.py` script in the project root. This script requires ImageMagick to be installed. To regenerate all icons from the SVG source, run:

```bash
python3 generate_icons.py
```

## Icon Usage

The build script (`build.py`) automatically includes the appropriate icons for each platform:

- On Windows, `icon.ico` is used for the executable
- On macOS, `icon.icns` is used for the application bundle
- On Linux, the PNG icons in the `linux/` directory can be used for desktop integration

## Customizing Icons

To customize the application icon:

1. Replace the `icon.svg` file with your own SVG design
2. Run the `generate_icons.py` script to regenerate all platform-specific icons
3. Build the application using `npm run build:all` or `python3 build.py`

## Icon Specifications

- Windows icons (ICO): Contains 16x16, 24x24, 32x32, 48x48, 64x64, 128x128, and 256x256 pixel versions
- macOS icons (ICNS): Contains 16x16, 32x32, 64x64, 128x128, 256x256, 512x512, and 1024x1024 pixel versions
- Linux icons: Organized in the FreeDesktop standard layout (hicolor icon theme)
