# redactshotx.spec - PyInstaller specification file
import os
import sys
import spacy
from PyInstaller.utils.hooks import collect_all, collect_submodules

block_cipher = None

# Get spaCy model path
spacy_model_path = spacy.util.get_package_path('en_core_web_sm')

# Collect all necessary packages
presidio_analyzer_datas, presidio_analyzer_binaries, presidio_analyzer_hiddenimports = collect_all('presidio_analyzer')
presidio_image_datas, presidio_image_binaries, presidio_image_hiddenimports = collect_all('presidio_image_redactor')
spacy_datas, spacy_binaries, spacy_hiddenimports = collect_all('spacy')
pytesseract_datas, pytesseract_binaries, pytesseract_hiddenimports = collect_all('pytesseract')
pydantic_datas, pydantic_binaries, pydantic_hiddenimports = collect_all('pydantic')
fastapi_datas, fastapi_binaries, fastapi_hiddenimports = collect_all('fastapi')

# Collect additional hidden imports
additional_imports = [
    'numpy',
    'PIL',
    'regex',
    'tqdm',
    'uvicorn',
    'logging',
    'phonenumbers',
    'starlette',
    'typing',
    'python_multipart'
]

hidden_imports = []
hidden_imports.extend(presidio_analyzer_hiddenimports)
hidden_imports.extend(presidio_image_hiddenimports)
hidden_imports.extend(spacy_hiddenimports)
hidden_imports.extend(pytesseract_hiddenimports)
hidden_imports.extend(pydantic_hiddenimports)
hidden_imports.extend(fastapi_hiddenimports)
hidden_imports.extend(collect_submodules('spacy'))
hidden_imports.extend(collect_submodules('presidio_analyzer'))
hidden_imports.extend(collect_submodules('presidio_image_redactor'))
hidden_imports.extend(collect_submodules('uvicorn'))
hidden_imports.extend(additional_imports)

# Collect data files
datas = []
datas.extend(presidio_analyzer_datas)
datas.extend(presidio_image_datas)
datas.extend(spacy_datas)
datas.extend(pytesseract_datas)
datas.extend(pydantic_datas)
datas.extend(fastapi_datas)
datas.append((spacy_model_path, 'spacy/en_core_web_sm'))

# Add any library runtime DLLs that might be needed
binaries = []
binaries.extend(presidio_analyzer_binaries)
binaries.extend(presidio_image_binaries)
binaries.extend(spacy_binaries)
binaries.extend(pytesseract_binaries)
binaries.extend(pydantic_binaries)
binaries.extend(fastapi_binaries)

a = Analysis(
    ['api.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
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
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='api',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
) 