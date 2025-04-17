#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Checking sidecar binary status${NC}"

# Check if bin directory exists
if [ ! -d "src-tauri/bin" ]; then
  echo -e "${RED}src-tauri/bin directory doesn't exist!${NC}"
  exit 1
fi

echo -e "${YELLOW}Contents of src-tauri/bin:${NC}"
ls -la src-tauri/bin

# Check if api binary exists
if [ -f "src-tauri/bin/api" ]; then
  echo -e "${GREEN}✅ Found api binary${NC}"
  
  # Check permissions
  echo -e "${YELLOW}File permissions:${NC}"
  ls -l src-tauri/bin/api
  
  # Check file type
  echo -e "${YELLOW}File type:${NC}"
  file src-tauri/bin/api
else
  echo -e "${RED}❌ api binary not found!${NC}"
fi

# Check if api.exe binary exists (for Windows)
if [ -f "src-tauri/bin/api.exe" ]; then
  echo -e "${GREEN}✅ Found api.exe binary${NC}"
else
  echo -e "${YELLOW}api.exe binary not found (normal for non-Windows)${NC}"
fi

echo -e "${GREEN}Done checking sidecar binary status${NC}" 