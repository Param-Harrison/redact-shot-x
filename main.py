#!/usr/bin/env python3
import os
import sys
import threading
import time
import signal
import webview
import logging
import uvicorn
import platform
from multiprocessing import Process
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("redactshotx")

# Import API after setting up logging
from backend.api import app as api_app

# Constants
API_PORT = 8004
API_HOST = "127.0.0.1"
WINDOW_TITLE = "RedactShotX"
WINDOW_WIDTH = 1000
WINDOW_HEIGHT = 800

# Keep track of API process
api_process = None

def run_api_server():
    """Run the FastAPI server in a separate process"""
    try:
        logger.info(f"Starting API server at {API_HOST}:{API_PORT}")
        uvicorn.run(api_app, host=API_HOST, port=API_PORT, log_level="info")
    except Exception as e:
        logger.error(f"API server error: {str(e)}")

def wait_for_api():
    """Wait for the API server to be ready"""
    import requests
    max_retries = 30
    retry_interval = 0.1
    
    for i in range(max_retries):
        try:
            response = requests.get(f"http://{API_HOST}:{API_PORT}/health")
            if response.status_code == 200:
                logger.info("API server is ready!")
                return True
        except requests.exceptions.ConnectionError:
            pass
        
        time.sleep(retry_interval)
    
    logger.error("Timeout waiting for API server")
    return False

def cleanup():
    """Clean up resources before exit"""
    global api_process
    
    logger.info("Cleaning up resources...")
    
    # Try to gracefully shutdown API
    try:
        import requests
        requests.get(f"http://{API_HOST}:{API_PORT}/shutdown")
    except:
        pass
    
    # Terminate API process if running
    if api_process and api_process.is_alive():
        logger.info("Terminating API process...")
        api_process.terminate()
        api_process.join(timeout=2)
        if api_process.is_alive():
            logger.info("Force killing API process...")
            api_process.kill()
    
    logger.info("Cleanup complete")

def shutdown_handler(signal, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signal}")
    cleanup()
    sys.exit(0)

def get_html_path():
    """Get the path to the HTML file based on whether we're in development or production"""
    if getattr(sys, 'frozen', False):
        # Running in a PyInstaller bundle
        base_path = os.path.dirname(sys.executable)
        html_path = os.path.join(base_path, 'web', 'index.html')
    else:
        # Running in development
        base_path = os.path.dirname(os.path.abspath(__file__))
        html_path = os.path.join(base_path, 'dist-web', 'index.html')
        
        # If not built yet, try to use Vite development server
        if not os.path.exists(html_path):
            return "http://localhost:3000"
    
    # Convert to URL for Windows compatibility
    return f"file://{html_path}" if os.path.exists(html_path) else "http://localhost:3000"

def get_icon_path():
    """Get the appropriate icon path for the current platform"""
    base_path = Path(os.path.dirname(os.path.abspath(__file__)))
    assets_path = base_path / "assets"

    # Default icon path is the SVG file
    icon_path = assets_path / "icon.svg"
    
    # Use platform-specific icons if available
    if platform.system() == "Windows":
        platform_icon = assets_path / "icon.ico"
        if platform_icon.exists():
            icon_path = platform_icon
    elif platform.system() == "Darwin":  # macOS
        platform_icon = assets_path / "icon.icns"
        if platform_icon.exists():
            icon_path = platform_icon
    else:  # Linux and other platforms
        # On Linux, look for PNG icons in various sizes
        for size in [256, 128, 64]:
            platform_icon = assets_path / "png" / f"icon_{size}x{size}.png"
            if platform_icon.exists():
                icon_path = platform_icon
                break
    
    # If running in a PyInstaller bundle, adjust the path
    if getattr(sys, 'frozen', False):
        # When frozen, the assets should be in the same directory as the executable
        base_path = Path(os.path.dirname(sys.executable))
        # Try to find the icon in the executable directory
        for icon_name in ["icon.svg", "icon.ico", "icon.icns"]:
            potential_icon = base_path / "assets" / icon_name
            if potential_icon.exists():
                icon_path = potential_icon
                break
    
    # Return None if the icon doesn't exist
    return str(icon_path) if icon_path.exists() else None

def main():
    """Main entry point for the application"""
    global api_process
    
    # Register signal handlers
    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)
    
    try:
        # Start API server in a separate process
        api_process = Process(target=run_api_server)
        api_process.daemon = True
        api_process.start()
        
        # Wait for API server to be ready
        if not wait_for_api():
            logger.error("Failed to start API server")
            return
        
        # Get the HTML path
        html_path = get_html_path()
        logger.info(f"Using HTML path: {html_path}")
        
        # Get the icon path
        icon_path = get_icon_path()
        if icon_path:
            logger.info(f"Using application icon: {icon_path}")
        else:
            logger.warning("No application icon found, using default")
        
        # Create and start the window
        logger.info("Starting pywebview window")
        webview.create_window(
            title=WINDOW_TITLE,
            url=html_path,
            width=WINDOW_WIDTH,
            height=WINDOW_HEIGHT,
            min_size=(800, 600),
            text_select=True,
            confirm_close=True,
            icon=icon_path
        )
        webview.start(debug=True if "--debug" in sys.argv else False)
        
    except Exception as e:
        logger.error(f"Error starting application: {str(e)}")
    finally:
        # Clean up when window closes
        cleanup()

if __name__ == "__main__":
    main() 