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
  
  # First try graceful termination of known PID
  if [ -n "$PYTHON_PID" ]; then
    echo -e "${YELLOW}Stopping Python backend (PID: $PYTHON_PID)${NC}"
    # Send SIGTERM for graceful shutdown
    kill -TERM "$PYTHON_PID" 2>/dev/null || true
    # Give some time for graceful shutdown
    sleep 1
  fi
  
  # Then check for any processes using port 1426
  echo -e "${YELLOW}Checking for any processes still using port 1426...${NC}"
  PIDS_USING_PORT=$(lsof -t -i:1426 2>/dev/null)
  
  if [ -n "$PIDS_USING_PORT" ]; then
    echo -e "${YELLOW}Found processes still using port 1426: $PIDS_USING_PORT${NC}"
    
    # Try terminating them gracefully first
    echo -e "${YELLOW}Attempting graceful termination...${NC}"
    for pid in $PIDS_USING_PORT; do
      kill -TERM "$pid" 2>/dev/null || true
    done
    
    # Wait a moment
    sleep 1
    
    # Check if they're still running and force kill if needed
    PIDS_STILL_USING_PORT=$(lsof -t -i:1426 2>/dev/null)
    if [ -n "$PIDS_STILL_USING_PORT" ]; then
      echo -e "${YELLOW}Force killing processes: $PIDS_STILL_USING_PORT${NC}"
      for pid in $PIDS_STILL_USING_PORT; do
        kill -9 "$pid" 2>/dev/null || true
      done
    fi
  fi
  
  # Check for any watchfiles or uvicorn processes that might be lingering
  echo -e "${YELLOW}Checking for lingering watchfiles/uvicorn processes...${NC}"
  WATCHFILES_PIDS=$(ps -ef | grep -E 'watchfiles|uvicorn api:app|api.py|redactshotx' | grep -v grep | awk '{print $2}')
  
  if [ -n "$WATCHFILES_PIDS" ]; then
    echo -e "${YELLOW}Found lingering watchfiles/uvicorn processes: $WATCHFILES_PIDS${NC}"
    for pid in $WATCHFILES_PIDS; do
      echo -e "${YELLOW}Killing watchfiles/uvicorn process: $pid${NC}"
      kill -9 "$pid" 2>/dev/null || true
    done
  fi
  
  # Search for any processes with "api" in the name/command (for our sidecar)
  echo -e "${YELLOW}Checking for any remaining API processes...${NC}"
  API_PIDS=$(ps -ef | grep -v grep | grep -i "api" | grep -v $$ | awk '{print $2}')
  if [ -n "$API_PIDS" ]; then
    echo -e "${YELLOW}Found potential API processes: $API_PIDS${NC}"
    for pid in $API_PIDS; do
      # Get the command name to be more precise
      CMD=$(ps -p $pid -o comm= 2>/dev/null || echo "")
      if [[ "$CMD" == *"api"* || "$CMD" == *"python"* || "$CMD" == *"uvicorn"* ]]; then
        echo -e "${YELLOW}Killing API process: $pid ($CMD)${NC}"
        kill -9 $pid 2>/dev/null || true
      fi
    done
  fi
  
  # Final check to ensure port is released
  if lsof -i:1426 &>/dev/null; then
    echo -e "${RED}⚠ Port 1426 is still in use! Last attempt to force kill...${NC}"
    # One last brute force attempt
    FINAL_PIDS=$(lsof -t -i:1426 2>/dev/null)
    if [ -n "$FINAL_PIDS" ]; then
      for pid in $FINAL_PIDS; do
        echo -e "${RED}Force killing PID $pid${NC}"
        kill -9 $pid 2>/dev/null || true
      done
      
      # Give it a moment
      sleep 1
      
      # Check one more time
      if lsof -i:1426 &>/dev/null; then
        echo -e "${RED}⚠ Failed to free port 1426. Processes may need to be killed manually.${NC}"
      else
        echo -e "${GREEN}✅ All processes cleaned up, port 1426 is free${NC}"
      fi
    fi
  else
    echo -e "${GREEN}✅ All processes cleaned up, port 1426 is free${NC}"
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
      pip install watchfiles pyinstaller
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
    pip install watchfiles pyinstaller
  else
    echo -e "${RED}❌ pyproject.toml not found.${NC}"
    exit 1
  fi
  
  # ────────────────────────────────────────────────────────────────────────────────
  # Start FastAPI with watchfiles (auto-reload)
  echo -e "${YELLOW}⚙ Starting FastAPI backend with watchfiles...${NC}"
  # Use --workers 1 to reduce concurrency issues during shutdown and redirect stderr
  watchfiles "uvicorn api:app --host 127.0.0.1 --port 1426 --workers 1" . 2>/dev/null &
  PYTHON_PID=$!
  
  # Wait until FastAPI is responsive
  echo -e "${YELLOW}⏳ Waiting for API to become responsive...${NC}"
  for i in {1..10}; do
    if curl -s http://127.0.0.1:1426/ | grep -q '"status":'; then
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
  
  # Determine whether to start Tauri or web mode
  if [ "${1}" == "--tauri" ]; then
    echo -e "${GREEN}🚀 Starting app in Tauri mode...${NC}"
    
    # Before starting in Tauri mode, clean up any existing API processes
    echo -e "${YELLOW}Cleaning up any existing API processes before starting Tauri...${NC}"
    
    # Check for any processes using port 1426
    PIDS_USING_PORT=$(lsof -t -i:1426 2>/dev/null)
    if [ -n "$PIDS_USING_PORT" ]; then
      echo -e "${YELLOW}Found existing processes using port 1426: $PIDS_USING_PORT${NC}"
      for pid in $PIDS_USING_PORT; do
        echo -e "${YELLOW}Killing process: $pid${NC}"
        kill -9 "$pid" 2>/dev/null || true
      done
    fi
    
    # Check for any watchfiles or uvicorn processes
    WATCHFILES_PIDS=$(ps -ef | grep -E 'watchfiles|uvicorn api:app' | grep -v grep | awk '{print $2}')
    if [ -n "$WATCHFILES_PIDS" ]; then
      echo -e "${YELLOW}Found existing watchfiles/uvicorn processes: $WATCHFILES_PIDS${NC}"
      for pid in $WATCHFILES_PIDS; do
        echo -e "${YELLOW}Killing process: $pid${NC}"
        kill -9 "$pid" 2>/dev/null || true
      done
    fi
    
    # Start Tauri
    npm run tauri dev
  else
    echo -e "${GREEN}🌐 Starting React frontend with Vite...${NC}"
    echo -e "${GREEN}Frontend running at → http://localhost:3000${NC}"
    echo -e "${YELLOW}🛑 Press Ctrl+C to stop everything${NC}"
    
    npx vite --config vite.web.config.ts
  fi
  
  # Virtual environment will be automatically deactivated when this subshell exits
)

# Make sure we exit cleanly even if the subshell exits
cleanup
