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

# Run main operations
(
  echo -e "${YELLOW}📦 Activating virtual environment...${NC}"
  source venv/bin/activate
  echo -e "${GREEN}✔ Python in venv: $(python --version) ($(which python))${NC}"
  
  # Install Python dependencies
  echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
  pip install --upgrade pip setuptools wheel
  pip install -e ./backend
  pip install pywebview requests
  
  # Install spaCy model if needed
  if ! python -c "import spacy; spacy.load('en_core_web_trf')" 2>/dev/null; then
    echo -e "${YELLOW}📦 Installing spaCy language model...${NC}"
    python -m spacy download en_core_web_trf
  fi
  
  # Install frontend dependencies if needed
  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
    npm install
  fi
  
  # Start development processes
  if [ "$1" == "--frontend-only" ]; then
    # Start only the Vite frontend
    echo -e "${GREEN}🌐 Starting React frontend with Vite...${NC}"
    npm run dev
  elif [ "$1" == "--backend-only" ]; then
    # Start only the Python backend
    echo -e "${YELLOW}⚙ Starting Python backend...${NC}"
    python main.py --debug
  else
    # Start both the Vite dev server and the pywebview app
    echo -e "${GREEN}🌐 Starting Vite frontend server...${NC}"
    npm run dev &
    VITE_PID=$!
    
    # Wait for Vite to start
    echo -e "${YELLOW}⏳ Waiting for Vite to start...${NC}"
    sleep 3
    
    # Start the pywebview app
    echo -e "${GREEN}🚀 Starting pywebview app...${NC}"
    python main.py --debug
    PID=$!
    
    wait $PID
  fi
)

# Make sure we exit cleanly
cleanup 