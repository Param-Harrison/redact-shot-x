#!/bin/bash
set -e

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Cleanup function to kill the background process
cleanup() {
    echo -e "\n${YELLOW}Shutting down servers...${NC}"
    
    # Check if we have a PYTHON_PID to kill
    if [ -n "$PYTHON_PID" ]; then
        echo "Stopping Python API server (PID: $PYTHON_PID)"
        kill $PYTHON_PID 2>/dev/null || true
    fi
    
    exit 0
}

# Set up trap for cleanup when script exits
trap cleanup INT TERM EXIT

echo -e "${GREEN}Starting RedactShotX Web App${NC}"

# Check for required dependencies
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed or not in PATH${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${RED}Error: Python is not installed or not in PATH${NC}"
    exit 1
fi

# Check if the Python API server directory exists
if [ ! -d "src-python" ]; then
    echo -e "${RED}Error: src-python directory not found${NC}"
    echo -e "Please make sure you're running this script from the project root directory."
    exit 1
fi

# Start the Python backend in the background
echo -e "${YELLOW}Starting Python API Server...${NC}"
./start-api-server.sh &
PYTHON_PID=$!

# Give the API server a moment to start
echo -e "Waiting for API server to start..."
sleep 2

# Check if the Python server actually started
if ! ps -p $PYTHON_PID > /dev/null; then
    echo -e "${RED}Error: Python API server failed to start${NC}"
    echo -e "Check the output of ./start-api-server.sh for details"
    exit 1
fi

# Build the NPM dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing npm dependencies...${NC}"
    npm install
fi

# Use web-specific config
echo -e "${YELLOW}Starting React frontend...${NC}"
echo -e "${GREEN}Web app will be available at: http://localhost:3000${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"

# Run the web version using the web-specific config
npx vite --config vite.web.config.ts 