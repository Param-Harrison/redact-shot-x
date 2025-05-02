#!/bin/bash
set -e

echo "🪟 Building RedactShotX for Windows using Wine..."

# Function to ensure spaCy model is downloaded and copied to project root
ensure_spacy_model() {
    echo "Checking for spaCy model..."
    if python -c "import spacy; nlp = spacy.load('en_core_web_trf'); print(nlp.path)" 2>/dev/null; then
        echo "✅ en_core_web_trf model found"
        # Get the model path from Python
        MODEL_PATH=$(python -c "import spacy; nlp = spacy.load('en_core_web_trf'); print(nlp.path)")
        
        # Copy to project root if not already there
        if [ ! -d "en_core_web_trf" ]; then
            echo "⚠️ Copying en_core_web_trf to project root..."
            cp -r "$MODEL_PATH" .
            echo "✅ en_core_web_trf copied to project root"
        fi
    else
        echo "⚠️ en_core_web_trf model not found. Downloading..."
        python -m spacy download en_core_web_trf
        echo "✅ en_core_web_trf model downloaded successfully"
        
        # Get the model path after download
        MODEL_PATH=$(python -c "import spacy; nlp = spacy.load('en_core_web_trf'); print(nlp.path)")
        
        # Copy to project root
        echo "⚠️ Copying en_core_web_trf to project root..."
        cp -r "$MODEL_PATH" .
        echo "✅ en_core_web_trf copied to project root"
    fi
}

# Ensure spaCy model is available
ensure_spacy_model

# Create runtime hook file
echo "Creating runtime hook..."
cat > runtime_hook.py << 'EOF'
import os
import sys
import signal
import atexit

def handle_exit():
    # Try to gracefully shutdown the API server
    try:
        import requests
        requests.get("http://127.0.0.1:8004/shutdown", timeout=1)
    except:
        pass

# Register exit handler
atexit.register(handle_exit)

# Handle signals
signal.signal(signal.SIGINT, lambda s, f: handle_exit())
signal.signal(signal.SIGTERM, lambda s, f: handle_exit())
EOF

# You must have wine + PyInstaller with Windows bootloader set up
# Make sure you've bootstrapped PyInstaller bootloader for Windows beforehand

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
  --hidden-import=pystray \
  --hidden-import=PIL \
  --hidden-import=uvicorn \
  --hidden-import=fastapi \
  --hidden-import=multiprocessing \
  --collect-all=presidio_analyzer \
  --collect-all=presidio_image_redactor \
  --collect-all=spacy \
  --collect-all=en_core_web_trf \
  --collect-all=pystray \
  --collect-all=PIL \
  --runtime-hook=runtime_hook.py
