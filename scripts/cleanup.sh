#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Cleaning up API processes and port 1426...${NC}"

# 1. Check for processes using port 1426
echo -e "${YELLOW}Checking for processes using port 1426...${NC}"
PIDS_USING_PORT=$(lsof -t -i:1426 2>/dev/null)
if [ -n "$PIDS_USING_PORT" ]; then
  echo -e "${YELLOW}Found processes using port 1426: $PIDS_USING_PORT${NC}"
  for pid in $PIDS_USING_PORT; do
    echo -e "${YELLOW}Killing process: $pid${NC}"
    kill -9 $pid 2>/dev/null || true
  done
else
  echo -e "${GREEN}No processes found using port 1426${NC}"
fi

# 2. Check for any API processes
echo -e "${YELLOW}Checking for any API processes...${NC}"
API_PIDS=$(ps -ef | grep -v grep | grep -E "api|uvicorn|watchfiles" | awk '{print $2}')
if [ -n "$API_PIDS" ]; then
  echo -e "${YELLOW}Found potential API processes: $API_PIDS${NC}"
  for pid in $API_PIDS; do
    CMD=$(ps -p $pid -o comm= 2>/dev/null || echo "")
    if [[ "$CMD" == *"api"* || "$CMD" == *"python"* || "$CMD" == *"uvicorn"* || "$CMD" == *"watchfiles"* ]]; then
      echo -e "${YELLOW}Killing API process: $pid ($CMD)${NC}"
      kill -9 $pid 2>/dev/null || true
    fi
  done
else
  echo -e "${GREEN}No API processes found${NC}"
fi

# 3. Double-check port 1426 is free
if lsof -i:1426 &>/dev/null; then
  echo -e "${RED}⚠ Port 1426 is still in use! Trying one more time...${NC}"
  lsof -ti:1426 | xargs kill -9 2>/dev/null || true
  sleep 0.5
  
  # Final check
  if lsof -i:1426 &>/dev/null; then
    echo -e "${RED}⚠ Failed to free port 1426${NC}"
    exit 1
  else
    echo -e "${GREEN}✅ Port 1426 is now free${NC}"
  fi
else
  echo -e "${GREEN}✅ Port 1426 is free${NC}"
fi

echo -e "${GREEN}✅ Cleanup completed successfully${NC}"
exit 0 