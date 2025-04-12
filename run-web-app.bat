@echo off
setlocal

echo Starting RedactShotX Web App

REM Check for required dependencies
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in PATH
    exit /b 1
)

python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Python is not installed or not in PATH
    exit /b 1
)

REM Check if the Python API server directory exists
if not exist "src-python\" (
    echo Error: src-python directory not found
    echo Please make sure you're running this script from the project root directory.
    exit /b 1
)

REM Start the Python backend in a separate window
echo Starting Python API Server...
start cmd /k "title RedactShotX Python API Server && start-api-server.bat"

REM Give the API server a moment to start
echo Waiting for API server to start...
timeout /t 2 >nul

REM Build the NPM dependencies if node_modules doesn't exist
if not exist "node_modules\" (
    echo Installing npm dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Error: Failed to install npm dependencies
        exit /b 1
    )
)

REM Use web-specific config
echo Starting React frontend...
echo Web app will be available at: http://localhost:3000
echo Press Ctrl+C in this window to stop the frontend (close the API window manually when done)

REM Run the web version using the web-specific config
npx vite --config vite.web.config.ts

echo Frontend server stopped. Remember to close the Python API Server window when done.

endlocal 