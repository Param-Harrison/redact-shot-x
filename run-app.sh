#!/bin/bash
set -e

# ────────────────────────────────────────────────────────────────────────────────
# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ────────────────────────────────────────────────────────────────────────────────
# Cleanup function to kill background process
cleanup() {
  echo -e "\n${YELLOW}🧹 Cleaning up background processes...${NC}"
  if [ -n "$PYTHON_PID" ]; then
    echo -e "${YELLOW}Stopping Python redactor sidecar (PID: $PYTHON_PID)${NC}"
    kill "$PYTHON_PID" 2>/dev/null || true
  fi
  exit 0
}

trap cleanup INT TERM EXIT

echo -e "${GREEN}🚀 Starting Screenshot PII Scrubber Dev Environment${NC}"

# ────────────────────────────────────────────────────────────────────────────────
# Check for Node
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js is not installed. Please install it.${NC}"
  exit 1
fi

# ────────────────────────────────────────────────────────────────────────────────
# Detect a suitable Python version (3.8+)
PYTHON_CMD=""
for cmd in python3.11 python3.10 python3.9 python3.8 python3; do
  if command -v $cmd &> /dev/null; then
    version=$($cmd -c 'import sys; print(sys.version_info.major * 100 + sys.version_info.minor)')
    if [ "$version" -ge 308 ]; then
      PYTHON_CMD=$cmd
      echo -e "${GREEN}✔ Using Python: $($PYTHON_CMD --version)${NC}"
      break
    fi
  fi
done

if [ -z "$PYTHON_CMD" ]; then
  echo -e "${RED}❌ Python 3.8+ is required but not found.${NC}"
  exit 1
fi

# ────────────────────────────────────────────────────────────────────────────────
# Prepare Python virtual environment
if [ ! -d "venv" ]; then
  echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
  $PYTHON_CMD -m venv venv
fi

echo -e "${YELLOW}📦 Activating virtual environment...${NC}"
source venv/bin/activate

# ────────────────────────────────────────────────────────────────────────────────
# Python backend (src-python)
if [ ! -d "src-python" ]; then
  echo -e "${RED}❌ src-python directory missing. Please check your project layout.${NC}"
  exit 1
fi

cd src-python

if [ -f "pyproject.toml" ]; then
  echo -e "${YELLOW}📦 Installing from pyproject.toml...${NC}"
  pip install --upgrade pip setuptools wheel
  pip install .
else
  echo -e "${RED}❌ pyproject.toml not found. Cannot continue.${NC}"
  exit 1
fi

# Launch CLI redactor in background as dummy (replace with FastAPI if needed)
echo -e "${YELLOW}⚙ Starting Python sidecar...${NC}"
python redactor.py --help || true &
PYTHON_PID=$!

cd ..

# ────────────────────────────────────────────────────────────────────────────────
# Frontend prep
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
  npm install
fi

# ────────────────────────────────────────────────────────────────────────────────
# Start frontend
echo -e "${GREEN}🌐 Starting React frontend with Vite...${NC}"
echo -e "${GREEN}Frontend running at → http://localhost:3000${NC}"
echo -e "${YELLOW}🛑 Press Ctrl+C to stop everything${NC}"

npx vite --config vite.web.config.ts
