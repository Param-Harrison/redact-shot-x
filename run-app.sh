#!/bin/bash
set -e

# ────────────────────────────────────────────────────────────────────────────────
# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

cleanup() {
  echo -e "\n${YELLOW}🧹 Cleaning up processes...${NC}"
  
  # First try graceful termination of known PID
  if [ -n "$PYTHON_PID" ]; then
    echo -e "${YELLOW}Stopping Python API (PID: $PYTHON_PID)${NC}"
    kill -TERM "$PYTHON_PID" 2>/dev/null || true
    sleep 1
  fi
  
  # Check for any processes still using port 8004
  PIDS_USING_PORT=$(lsof -t -i:8004 2>/dev/null)
  if [ -n "$PIDS_USING_PORT" ]; then
    echo -e "${YELLOW}Found processes on port 8004: $PIDS_USING_PORT${NC}"
    for pid in $PIDS_USING_PORT; do
      echo -e "${YELLOW}Terminating process $pid${NC}"
      kill -TERM "$pid" 2>/dev/null || true
    done
    sleep 1
    
    # Force kill if still running
    PIDS_STILL_USING_PORT=$(lsof -t -i:8004 2>/dev/null)
    if [ -n "$PIDS_STILL_USING_PORT" ]; then
      echo -e "${YELLOW}Force killing processes: $PIDS_STILL_USING_PORT${NC}"
      for pid in $PIDS_STILL_USING_PORT; do
        kill -9 "$pid" 2>/dev/null || true
      done
    fi
  fi
  
  echo -e "${GREEN}✅ Cleanup complete${NC}"
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

# ────────────────────────────────────────────────────────────────────────────────
# Build sidecar for development if requested
if [ "${1}" == "--build-sidecar" ] || [ -n "${BUILD_SIDECAR}" ]; then
  echo -e "${YELLOW}🔧 Building Python sidecar for development...${NC}"
  
  # Run in a subshell to contain venv activation
  (
    echo -e "${YELLOW}📦 Activating virtual environment...${NC}"
    source venv/bin/activate
    echo -e "${GREEN}✔ Python in venv: $(python --version) ($(which python))${NC}"
    
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
      pip install pyinstaller
    else
      echo -e "${RED}❌ pyproject.toml not found.${NC}"
      exit 1
    fi
    
    cd ..
    
    # Use our shell script to build the sidecar
    ./scripts/build-sidecar.sh
  )
  
  echo -e "${GREEN}✅ Sidecar build complete${NC}"
  
  # If only building sidecar, exit
  if [ "${1}" == "--build-sidecar" ]; then
    exit 0
  fi
fi

# ────────────────────────────────────────────────────────────────────────────────
# Run main app operations in a subshell to contain venv activation
(
  echo -e "${YELLOW}📦 Activating virtual environment...${NC}"
  source venv/bin/activate
  echo -e "${GREEN}✔ Python in venv: $(python --version) ($(which python))${NC}"
  
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
    pip install uvicorn fastapi

    # Install and copy spaCy model
    echo -e "${YELLOW}📦 Installing spaCy language model...${NC}"
    python -m spacy download en_core_web_trf

    echo -e "${YELLOW}📦 Copying en_core_web_trf into src-python/spacy for packaging...${NC}"
    mkdir -p spacy
    SPACY_MODEL_PATH=$(python -c "import en_core_web_trf; print(en_core_web_trf.__path__[0])")
    cp -R "$SPACY_MODEL_PATH" spacy/en_core_web_trf
  else
    echo -e "${RED}❌ pyproject.toml not found.${NC}"
    exit 1
  fi
  
  # ────────────────────────────────────────────────────────────────────────────────
  # Start FastAPI server directly (simpler approach)
  echo -e "${YELLOW}⚙ Starting FastAPI backend on port 8004...${NC}"
  python api.py &
  PYTHON_PID=$!
  
  # Wait until FastAPI is responsive
  echo -e "${YELLOW}⏳ Waiting for API to become responsive...${NC}"
  for i in {1..10}; do
    if curl -s http://0.0.0.0:8004/health | grep -q '"status":'; then
      echo -e "${GREEN}✅ API is up and running on port 8004!${NC}"
      break
    fi
    if [ $i -eq 10 ]; then
      echo -e "${RED}❌ API failed to start within timeout.${NC}"
      exit 1
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
  
  # Determine whether to start Tauri or web mode
  if [ "${1}" == "--tauri" ]; then
    echo -e "${GREEN}🚀 Starting app in Tauri mode...${NC}"
    
    # Before starting in Tauri mode, check for port conflicts
    if [ -n "$PYTHON_PID" ]; then
      echo -e "${YELLOW}Stopping Python API before starting Tauri...${NC}"
      kill -TERM $PYTHON_PID 2>/dev/null || true
      unset PYTHON_PID
      sleep 1
    fi
    
    # Start Tauri (which will handle its own sidecar)
    npm run tauri dev
  else
    echo -e "${GREEN}🌐 Starting React frontend with Vite...${NC}"
    echo -e "${GREEN}Frontend running at → http://localhost:1420${NC}"
    echo -e "${GREEN}API running at → http://localhost:8004${NC}"
    echo -e "${YELLOW}🛑 Press Ctrl+C to stop everything${NC}"
    npx vite --config vite.web.config.ts
  fi
  
  # Virtual environment will be automatically deactivated when this subshell exits
)

# Make sure we exit cleanly even if the subshell exits
cleanup
