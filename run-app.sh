#!/bin/bash
set -e

# ────────────────────────────────────────────────────────────────────────────────
# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

cleanup() {
  echo -e "\n${YELLOW}🧹 Cleaning up background processes...${NC}"
  if [ -n "$PYTHON_PID" ]; then
    echo -e "${YELLOW}Stopping Python backend (PID: $PYTHON_PID)${NC}"
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

# ────────────────────────────────────────────────────────────────────────────────
# Create or repair virtual environment
if [ ! -d "venv" ]; then
  echo -e "${YELLOW}📦 Creating new virtual environment...${NC}"
  $PYTHON_CMD -m venv venv
else
  VENV_PYTHON_VERSION=$(venv/bin/python -c "import platform; print(platform.python_version())" || echo "0")
  if [[ "$VENV_PYTHON_VERSION" != "$PYTHON_VERSION" ]]; then
    echo -e "${YELLOW}⚠ venv mismatch: $VENV_PYTHON_VERSION ≠ $PYTHON_VERSION. Recreating...${NC}"
    rm -rf venv
    $PYTHON_CMD -m venv venv
  fi
fi

echo -e "${YELLOW}📦 Activating virtual environment...${NC}"
source venv/bin/activate
echo -e "${GREEN}✔ Python in venv: $(python --version) ($(which python))${NC}"

# ────────────────────────────────────────────────────────────────────────────────
# Python backend
if [ ! -d "src-python" ]; then
  echo -e "${RED}❌ src-python directory missing.${NC}"
  exit 1
fi

cd src-python

if [ -f "pyproject.toml" ]; then
  echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
  pip install --upgrade pip setuptools wheel
  pip install .
  pip install watchfiles
else
  echo -e "${RED}❌ pyproject.toml not found.${NC}"
  exit 1
fi

# ────────────────────────────────────────────────────────────────────────────────
# Start FastAPI with watchfiles (auto-reload)
echo -e "${YELLOW}⚙ Starting FastAPI backend with watchfiles...${NC}"
watchfiles "uvicorn api:app --host 127.0.0.1 --port 8000" . &
PYTHON_PID=$!

# Wait until FastAPI is responsive
echo -e "${YELLOW}⏳ Waiting for API to become responsive...${NC}"
for i in {1..10}; do
  if curl -s http://127.0.0.1:8000/ | grep -q '"status":'; then
    echo -e "${GREEN}✅ API is up!${NC}"
    break
  fi
  sleep 1
done

cd ..

# ────────────────────────────────────────────────────────────────────────────────
# Frontend
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
  npm install
fi

echo -e "${GREEN}🌐 Starting React frontend with Vite...${NC}"
echo -e "${GREEN}Frontend running at → http://localhost:3000${NC}"
echo -e "${YELLOW}🛑 Press Ctrl+C to stop everything${NC}"

npx vite --config vite.web.config.ts
