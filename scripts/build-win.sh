#!/bin/bash
set -e

echo "🪟 Building RedactShotX for Windows using Wine..."

# You must have wine + PyInstaller with Windows bootloader set up
# Make sure you’ve bootstrapped PyInstaller bootloader for Windows beforehand

mkdir -p dist-win

pyinstaller main.py \
  --onefile \
  --windowed \
  --icon=assets/icon.ico \
  --add-data "en_core_web_trf;en_core_web_trf" \
  --add-data "dist-web;dist-web" \
  --name "RedactShotX" \
  --clean \
  --noconfirm \
  --distpath dist-win \
  --hidden-import=presidio_analyzer \
  --hidden-import=presidio_image_redactor \
  --hidden-import=spacy \
  --hidden-import=en_core_web_trf \
  --collect-all=presidio_analyzer \
  --collect-all=presidio_image_redactor \
  --collect-all=spacy \
  --collect-all=en_core_web_trf
