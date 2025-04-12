#!/bin/bash
set -e

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building RedactShotX with hybrid Python/Tauri architecture${NC}"

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed or not in PATH${NC}"
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed or not in PATH${NC}"
    exit 1
fi

# Check for Rust toolchain
if ! command -v rustc &> /dev/null; then
    echo -e "${RED}Error: Rust is not installed or not in PATH${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing npm dependencies${NC}"
npm install

echo -e "${YELLOW}Step 2: Building Python components${NC}"
cd src-python

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Download SpaCy model if not already installed
if ! python -c "import spacy; spacy.load('en_core_web_lg')" &> /dev/null; then
    echo "Downloading SpaCy language model..."
    python -m spacy download en_core_web_lg
fi

# Build Python executables
echo "Building Python executables with PyInstaller..."
python build.py

cd ..

echo -e "${YELLOW}Step 3: Building Tauri application${NC}"
npm run tauri build

echo -e "${GREEN}Build complete! The application has been built successfully.${NC}"
echo -e "You can find the built application in the ${YELLOW}src-tauri/target/release/bundle${NC} directory." 