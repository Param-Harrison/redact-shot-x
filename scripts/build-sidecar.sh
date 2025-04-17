#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get platform from argument or detect automatically
PLATFORM=$1

if [ -z "$PLATFORM" ]; then
  # Auto-detect platform
  case "$(uname -s)" in
    Darwin*)    
      # Check for Apple Silicon vs Intel
      if [ "$(uname -m)" == "arm64" ]; then
        PLATFORM="mac-apple"
      else
        PLATFORM="mac-intel"
      fi
      ;;
    Linux*)     
      PLATFORM="linux"
      ;;
    CYGWIN*|MINGW*|MSYS*)
      PLATFORM="windows"
      ;;
    *)
      echo -e "${RED}Unknown platform, please specify: windows, mac-intel, mac-apple, or linux${NC}"
      exit 1
      ;;
  esac
fi

echo -e "${GREEN}Building Python sidecar for $PLATFORM...${NC}"

# Ensure directories exist
mkdir -p src-tauri/bin

# Ensure pyinstaller is installed
echo -e "${YELLOW}Checking for PyInstaller...${NC}"
if ! command -v pyinstaller &> /dev/null; then
  echo -e "${YELLOW}Installing PyInstaller...${NC}"
  pip install -U pyinstaller
fi

# Make sure Python dependencies are installed
if [ -d "src-python" ]; then
  echo -e "${YELLOW}Installing Python dependencies...${NC}"
  pip install -e src-python
else
  echo -e "${RED}src-python directory not found!${NC}"
  exit 1
fi

# Build based on platform
echo -e "${GREEN}Building for $PLATFORM...${NC}"
pyinstaller -c -F --clean --name api --collect-all spacy --collect-all presidio_analyzer --collect-all presidio_image_redactor --distpath src-tauri/bin src-python/api.py

# For Windows, rename the .exe file to match what Tauri expects
if [ "$PLATFORM" = "windows" ]; then
  # Rename api.exe to api so Tauri finds it
  mv src-tauri/bin/api.exe src-tauri/bin/api
  echo -e "${YELLOW}Renamed api.exe to api for Tauri compatibility${NC}"
else
  # For non-Windows platforms, ensure it's executable
  chmod +x src-tauri/bin/api
fi

echo -e "${GREEN}✅ Sidecar build complete for $PLATFORM!${NC}" 