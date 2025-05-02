#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

cleanup() {
  echo -e "\n${YELLOW}🧹 Cleaning up processes...${NC}"
  
  # Kill any Python processes started by this script
  if [ -n "$PID" ]; then
    echo -e "${YELLOW}Stopping process (PID: $PID)${NC}"
    kill -TERM "$PID" 2>/dev/null || true
  fi
  
  # Kill Vite process if it exists
  if [ -n "$VITE_PID" ]; then
    echo -e "${YELLOW}Stopping Vite (PID: $VITE_PID)${NC}"
    kill -TERM "$VITE_PID" 2>/dev/null || true
  fi
  
  echo -e "${GREEN}✅ Cleanup complete${NC}"
  exit 0
}

trap cleanup INT TERM EXIT

echo -e "${GREEN}🚀 Starting RedactShotX Development Environment${NC}"

# Check for Node
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js is not installed. Please install it.${NC}"
  exit 1
fi

# Detect a suitable Python version (3.8+)
PYTHON_CMD=""
for cmd in python3.11 python3.10 python3.9 python3.8 python3; do
  if command -v $cmd &> /dev/null; then
    version=$($cmd -c 'import sys; print(sys.version_info.major * 100 + sys.version_info.minor)')
    if [ "$version" -ge 308 ]; then
      PYTHON_CMD=$cmd
      break
    fi
  fi
done

if [ -z "$PYTHON_CMD" ]; then
  echo -e "${RED}❌ Python 3.8+ is required but not found.${NC}"
  exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD -c "import platform; print(platform.python_version())")
echo -e "${GREEN}✔ Using Python: $PYTHON_CMD ($PYTHON_VERSION)${NC}"

# Create or repair virtual environment
if [ ! -d "venv" ]; then
  echo -e "${YELLOW}📦 Creating new virtual environment...${NC}"
  $PYTHON_CMD -m venv venv
else
  VENV_PYTHON_VERSION=$(venv/bin/python -c "import platform; print(platform.python_version())" 2>/dev/null || echo "0")
  if [[ "$VENV_PYTHON_VERSION" != "$PYTHON_VERSION" ]]; then
    echo -e "${YELLOW}⚠ venv mismatch: $VENV_PYTHON_VERSION ≠ $PYTHON_VERSION. Recreating...${NC}"
    rm -rf venv
    $PYTHON_CMD -m venv venv
  fi
fi

# Check for required assets
if [ ! -d "assets" ]; then
  echo -e "${YELLOW}⚠ assets directory not found. Creating...${NC}"
  mkdir -p assets
fi

# Check for icon files
if [ ! -f "assets/icon.svg" ] && [ ! -f "assets/icon.icns" ] && [ ! -f "assets/icon.ico" ]; then
  echo -e "${YELLOW}⚠ No icon files found in assets directory. The app will run without a tray icon.${NC}"
  echo -e "${YELLOW}  You can generate icons by running: python generate_icons.py${NC}"
fi

# Helper to check if pnpm is available
has_pnpm() {
  command -v pnpm >/dev/null 2>&1
}

if [[ "$1" == "--build" ]]; then
  echo "[run-dev.sh] Building frontend..."
  cd frontend
  if has_pnpm; then
    pnpm install
    pnpm run build
  else
    npm install
    npm run build
  fi
  cd ..
  echo "[run-dev.sh] Launching app in production mode (dist-web)..."
  python3 main.py
else
  echo "[run-dev.sh] Starting Vite dev server..."
  cd frontend
  if has_pnpm; then
    pnpm install
    pnpm run dev &
  else
    npm install
    npm run dev &
  fi
  VITE_PID=$!
  cd ..
  echo "[run-dev.sh] Launching app in debug mode (localhost:3000)..."
  DEBUG=1 python3 main.py
  # Optionally kill Vite dev server on exit
  kill $VITE_PID || true
fi

# Make sure we exit cleanly
cleanup 