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
  if [ -n "$BACKEND_PID" ]; then
    echo -e "${YELLOW}Stopping backend (PID: $BACKEND_PID)${NC}"
    kill -TERM "$BACKEND_PID" 2>/dev/null || true
  fi
  
  # Kill Vite process if it exists
  if [ -n "$FRONTEND_PID" ]; then
    echo -e "${YELLOW}Stopping frontend (PID: $FRONTEND_PID)${NC}"
    kill -TERM "$FRONTEND_PID" 2>/dev/null || true
  fi
  
  echo -e "${GREEN}✅ Cleanup complete${NC}"
  exit 0
}

trap cleanup INT TERM EXIT

echo -e "${GREEN}🚀 Starting RedactShotX Web Environment${NC}"

# Check for Node
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js is not installed. Please install it.${NC}"
  exit 1
fi

# Check for Python
if ! command -v python3 &> /dev/null; then
  echo -e "${RED}❌ Python 3 is not installed. Please install it.${NC}"
  exit 1
fi

# Set PYTHONPATH to include the current directory
export PYTHONPATH=$PYTHONPATH:$(pwd)

# Start backend server
echo -e "${GREEN}Starting backend server...${NC}"
cd backend
python3 -m uvicorn api:app --host 127.0.0.1 --port 8004 &
BACKEND_PID=$!
cd ..

# Start frontend dev server
echo -e "${GREEN}Starting frontend dev server...${NC}"
cd frontend
if command -v pnpm &> /dev/null; then
  pnpm install
  pnpm run dev &
else
  npm install
  npm run dev &
fi
FRONTEND_PID=$!
cd ..

echo -e "${GREEN}✅ Services started${NC}"
echo -e "${YELLOW}Frontend: http://localhost:3000${NC}"
echo -e "${YELLOW}Backend: http://localhost:8004${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID 