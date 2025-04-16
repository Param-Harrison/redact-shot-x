@echo off
setlocal

:: Get platform from argument or default to windows
set PLATFORM=%1
if "%PLATFORM%"=="" set PLATFORM=windows

echo Building Python sidecar for %PLATFORM%...

:: Ensure directories exist
if not exist src-tauri\bin\api mkdir src-tauri\bin\api

:: Ensure pyinstaller is installed
echo Checking for PyInstaller...
pip show pyinstaller >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Installing PyInstaller...
    pip install -U pyinstaller
)

:: Make sure Python dependencies are installed
if exist src-python (
    echo Installing Python dependencies...
    pip install -e src-python
) else (
    echo src-python directory not found!
    exit /b 1
)

:: Build based on platform
if "%PLATFORM%"=="windows" (
    echo Building for Windows...
    pyinstaller -c -F --clean --name api --collect-all spacy --collect-all presidio_analyzer --collect-all presidio_image_redactor --distpath src-tauri\bin\api src-python\api.py
) else if "%PLATFORM%"=="mac-intel" (
    echo Building for macOS (Intel)...
    echo Warning: Building for macOS on Windows is not recommended.
    pyinstaller -c -F --clean --name api_mac_intel --collect-all spacy --collect-all presidio_analyzer --collect-all presidio_image_redactor --distpath src-tauri\bin\api src-python\api.py
) else if "%PLATFORM%"=="mac-apple" (
    echo Building for macOS (Apple Silicon)...
    echo Warning: Building for macOS on Windows is not recommended.
    pyinstaller -c -F --clean --name api_mac_apple --collect-all spacy --collect-all presidio_analyzer --collect-all presidio_image_redactor --target-architecture universal2 --distpath src-tauri\bin\api src-python\api.py
) else if "%PLATFORM%"=="linux" (
    echo Building for Linux...
    echo Warning: Building for Linux on Windows is not recommended.
    pyinstaller -c -F --clean --name api_linux --collect-all spacy --collect-all presidio_analyzer --collect-all presidio_image_redactor --distpath src-tauri\bin\api src-python\api.py
) else (
    echo Unsupported platform: %PLATFORM%
    echo Please specify: windows, mac-intel, mac-apple, or linux
    exit /b 1
)

echo Sidecar build complete for %PLATFORM%!
exit /b 0 