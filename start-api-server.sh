#!/bin/bash
set -e

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting RedactShotX Python API Server${NC}"

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed or not in PATH${NC}"
    exit 1
fi

# Change to the src-python directory
cd src-python

# Install dependencies if needed
if ! python -c "import presidio_analyzer" &> /dev/null; then
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    pip install -r requirements.txt
    
    # Install spaCy model if needed
    if ! python -c "import spacy; spacy.load('en_core_web_lg')" &> /dev/null; then
        echo -e "${YELLOW}Downloading spaCy language model...${NC}"
        python -m spacy download en_core_web_lg
    fi
fi

# Start the API server
echo -e "${GREEN}Starting API server on http://localhost:8000${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"

python api.py 