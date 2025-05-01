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
import base64
from multiprocessing import Process
from pathlib import Path
from PIL import Image
from pystray import Icon, Menu, MenuItem

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

# Keep track of API process and window
api_process = None
window = None
tray_icon = None
tray_thread = None


# JS API class for file operations
class FileAPI:
    def save_file(self, data):
        """
        Save a file using the system's native save dialog

        Args:
            data (dict): Dictionary containing:
                - filename: Suggested filename
                - data: Base64 encoded file data
                - mimeType: MIME type of the file

        Returns:
            dict: Result of the save operation
        """
        try:
            logger.info(f"Saving file: {data.get('filename')}")

            # Get the main window
            window = webview.windows[0]

            # Show save dialog
            file_path = window.create_file_dialog(
                webview.SAVE_DIALOG,
                directory="~",
                save_filename=data.get("filename", "redacted-image.png"),
            )

            if not file_path:
                # User cancelled the dialog
                logger.info("Save cancelled by user")
                return {"success": False, "message": "Operation cancelled by user"}

            # Convert base64 to binary
            binary_data = base64.b64decode(data.get("data", ""))

            # Write to file
            with open(file_path, "wb") as f:
                f.write(binary_data)

            logger.info(f"File saved successfully to: {file_path}")
            return {"success": True, "path": file_path}

        except Exception as e:
            logger.error(f"Error saving file: {str(e)}")
            return {"success": False, "error": str(e)}

    def save_files(self, files):
        """
        Save multiple files using a directory selection dialog

        Args:
            files (list): List of dictionaries, each containing:
                - filename: Suggested filename
                - data: Base64 encoded file data
                - mimeType: MIME type of the file

        Returns:
            dict: Result of the save operation
        """
        try:
            logger.info(f"Saving {len(files)} files")

            # Get the main window
            window = webview.windows[0]

            # Show directory selection dialog
            dir_path = window.create_file_dialog(webview.FOLDER_DIALOG, directory="~")

            if not dir_path:
                # User cancelled the dialog
                logger.info("Directory selection cancelled by user")
                return {"success": False, "message": "Operation cancelled by user"}

            # Make sure we have a string, not a tuple
            if isinstance(dir_path, tuple) and len(dir_path) > 0:
                dir_path = dir_path[0]

            saved_count = 0
            errors = []

            # Save each file
            for file_data in files:
                try:
                    filename = file_data.get(
                        "filename", f"redacted-image-{saved_count + 1}.png"
                    )
                    file_path = os.path.join(dir_path, filename)

                    # Convert base64 to binary
                    binary_data = base64.b64decode(file_data.get("data", ""))

                    # Write to file
                    with open(file_path, "wb") as f:
                        f.write(binary_data)

                    saved_count += 1

                except Exception as e:
                    logger.error(
                        f"Error saving file {file_data.get('filename')}: {str(e)}"
                    )
                    errors.append(
                        {"filename": file_data.get("filename"), "error": str(e)}
                    )

            logger.info(f"Saved {saved_count} of {len(files)} files to: {dir_path}")
            return {
                "success": True,
                "path": dir_path,
                "count": saved_count,
                "total": len(files),
                "errors": errors if errors else None,
            }

        except Exception as e:
            logger.error(f"Error in save_files: {str(e)}")
            return {"success": False, "error": str(e)}


def run_api_server():
    """Run the FastAPI server in a separate process"""
    try:
        logger.info(f"Starting API server at {API_HOST}:{API_PORT}")
        config = uvicorn.Config(api_app, host=API_HOST, port=API_PORT, log_level="info")
        server = uvicorn.Server(config)
        server.run()
    except Exception as e:
        logger.error(f"API server error: {str(e)}")


def wait_for_api():
    """Wait for the API server to be ready"""
    import requests
    import socket

    max_retries = 30
    retry_interval = 0.1

    # First check if port is available
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind((API_HOST, API_PORT))
        sock.close()
    except socket.error:
        logger.error(f"Port {API_PORT} is already in use")
        return False

    for i in range(max_retries):
        try:
            response = requests.get(f"http://{API_HOST}:{API_PORT}/health", timeout=1)
            if response.status_code == 200:
                logger.info("API server is ready!")
                return True
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
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
    if getattr(sys, "frozen", False):
        # Running in a PyInstaller bundle - use the API server
        return f"http://{API_HOST}:{API_PORT}/app/index.html"
    else:
        # In development, always use Vite
        return "http://localhost:3000"


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
    if getattr(sys, "frozen", False):
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


def on_tray_open(icon, item):
    """Handle tray icon open action"""
    global window
    logger.info("Opening window from tray icon")
    if window and not window.visible:
        window.show()
    elif not window:
        create_window()


def on_tray_exit(icon, item):
    """Handle tray icon exit action"""
    logger.info("Exiting application from tray icon")
    cleanup()
    icon.stop()
    sys.exit(0)


def create_window():
    """Create and show the main window"""
    global window
    if not window:
        # Get the HTML path
        html_path = get_html_path()
        logger.info(f"Using HTML path: {html_path}")

        # Get the icon path
        icon_path = get_icon_path()
        if icon_path:
            logger.info(f"Using application icon: {icon_path}")
        else:
            logger.warning("No application icon found, using default")

        # Create file API instance
        file_api = FileAPI()

        # Set webview settings to allow downloads
        webview.settings["ALLOW_DOWNLOADS"] = True

        # Create the window
        logger.info("Starting pywebview window")
        window = webview.create_window(
            title=WINDOW_TITLE,
            url=html_path,
            width=WINDOW_WIDTH,
            height=WINDOW_HEIGHT,
            min_size=(800, 600),
            text_select=True,
            confirm_close=True,
            js_api=file_api,
        )
    else:
        window.show()


def run_tray_icon():
    """Run the tray icon in the current thread"""
    global tray_icon
    try:
        icon_path = get_icon_path()
        if icon_path and os.path.exists(icon_path):
            logger.info(f"Creating tray icon from: {icon_path}")
            # Convert icon to PIL Image
            icon_image = Image.open(icon_path)

            # Create menu
            menu = Menu(MenuItem("Open", on_tray_open), MenuItem("Exit", on_tray_exit))

            # Create tray icon
            tray_icon = Icon("RedactShotX", icon_image, menu=menu)
            logger.info("Starting tray icon")
            tray_icon.run()
        else:
            logger.warning("Could not create tray icon: icon file not found")
    except Exception as e:
        logger.error(f"Error running tray icon: {str(e)}")


def main():
    """Main entry point for the application"""
    global api_process, tray_thread

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

        # Create the window
        create_window()

        # Start tray icon in a separate thread (cross-platform)
        logger.info("Starting tray icon thread")
        tray_thread = threading.Thread(target=run_tray_icon, daemon=True)
        tray_thread.start()

        # Start the webview
        webview.start(debug=True if "--debug" in sys.argv else False)

    except Exception as e:
        logger.error(f"Error starting application: {str(e)}")
    finally:
        # Clean up when window closes
        cleanup()


if __name__ == "__main__":
    main()
