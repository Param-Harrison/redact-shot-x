@echo off
setlocal

echo Starting RedactShotX Python API Server

REM Check for Python
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python is not installed or not in PATH
    exit /b 1
)

REM Change to the src-python directory
cd src-python

REM Install dependencies if needed
python -c "import presidio_analyzer" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing Python dependencies...
    pip install -r requirements.txt
    
    REM Install spaCy model if needed
    python -c "import spacy; spacy.load('en_core_web_lg')" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo Downloading spaCy language model...
        python -m spacy download en_core_web_lg
    )
)

REM Start the API server
echo Starting API server on http://localhost:8000
echo Press Ctrl+C to stop the server

python api.py

endlocal 