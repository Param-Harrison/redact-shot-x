# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

# Packages to include fully
packages_to_collect = ['presidio_analyzer', 'presidio_image_redactor', 'PIL', 'pystray']
datas, binaries, hiddenimports = [], [], []

for pkg in packages_to_collect:
    collected = collect_all(pkg)
    datas += collected[0]
    binaries += collected[1]
    hiddenimports += collected[2]

# Extra hidden imports if needed
hiddenimports += [
    'spacy.lang.en',  # Required for spaCy English models
    'pywebview',
    'pywebview.platforms.cocoa',  # macOS specific
    'pywebview.platforms.qt',     # Linux/Windows fallback
    'pywebview.platforms.cef',
    'pywebview.js',
]

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=binaries,
    datas=datas + [('dist-web', 'dist-web')],
    hiddenimports=hiddenimports,
    hookspath=['.'],
    runtime_hooks=['hook-numpy.py'],
    excludes=['en_core_web_trf'],
    noarchive=False
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='RedactShotX',
    debug=False,
    bootloader_ignore_signals=False,
    strip=True,
    upx=True,
    console=False,
    icon=['assets/icon.icns']
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=True,
    upx=True,
    name='RedactShotX'
)

app = BUNDLE(
    coll,
    name='RedactShotX.app',
    icon='assets/icon.icns',
    bundle_identifier='com.example.redactshotx'
)
