@echo off
setlocal

echo Building RedactShotX with hybrid Python/Tauri architecture

REM Check for Python
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python is not installed or not in PATH
    exit /b 1
)

REM Check for Node.js
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in PATH
    exit /b 1
)

REM Check for Rust toolchain
rustc --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Rust is not installed or not in PATH
    exit /b 1
)

echo Step 1: Installing npm dependencies
call npm install

echo Step 2: Building Python components
cd src-python

REM Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

REM Download SpaCy model if not already installed
python -c "import spacy; spacy.load('en_core_web_lg')" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Downloading SpaCy language model...
    python -m spacy download en_core_web_lg
)

REM Build Python executables
echo Building Python executables with PyInstaller...
python build.py

cd ..

echo Step 3: Building Tauri application
call npm run tauri build

echo Build complete! The application has been built successfully.
echo You can find the built application in the src-tauri\target\release\bundle directory.

endlocal 