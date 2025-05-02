#!/usr/bin/env python3
import os
import sys
import threading
import time
import signal
import webview
import logging
import platform
import base64
import json
import gc
import traceback
from pathlib import Path
from PIL import Image
from pystray import Icon, Menu, MenuItem
from backend.redactor import ImageRedactor

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG for more detailed logs
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("redactshotx.log"), logging.StreamHandler()],
)
logger = logging.getLogger("redactshotx")

# Constants
WINDOW_TITLE = "RedactShotX"
WINDOW_WIDTH = 1000
WINDOW_HEIGHT = 800

# Keep track of window and tray icon
window = None
tray_icon = None


# JS API class for file operations and redaction
class RedactShotXAPI:
    def save_file(self, data):
        """Save a file using the system's native save dialog"""
        try:
            logger.info(f"Saving file: {data.get('filename')}")
            window = webview.windows[0]
            file_path = window.create_file_dialog(
                webview.SAVE_DIALOG,
                directory="~",
                save_filename=data.get("filename", "redacted-image.png"),
            )

            if not file_path:
                logger.info("Save cancelled by user")
                return {"success": False, "message": "Operation cancelled by user"}

            binary_data = base64.b64decode(data.get("data", ""))
            with open(file_path, "wb") as f:
                f.write(binary_data)

            logger.info(f"File saved successfully to: {file_path}")
            return {"success": True, "path": file_path}

        except Exception as e:
            logger.error(f"Error saving file: {str(e)}")
            logger.error(traceback.format_exc())
            return {"success": False, "error": str(e)}

    def save_files(self, files):
        """Save multiple files using a directory selection dialog"""
        try:
            logger.info(f"Saving {len(files)} files")
            window = webview.windows[0]
            dir_path = window.create_file_dialog(webview.FOLDER_DIALOG, directory="~")

            if not dir_path:
                logger.info("Directory selection cancelled by user")
                return {"success": False, "message": "Operation cancelled by user"}

            if isinstance(dir_path, tuple) and len(dir_path) > 0:
                dir_path = dir_path[0]

            saved_count = 0
            errors = []

            for file_data in files:
                try:
                    filename = file_data.get(
                        "filename", f"redacted-image-{saved_count + 1}.png"
                    )
                    file_path = os.path.join(dir_path, filename)
                    binary_data = base64.b64decode(file_data.get("data", ""))
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
            logger.error(traceback.format_exc())
            return {"success": False, "error": str(e)}

    def redact_image(self, image_data, config=None):
        """Redact an image using base64 data"""
        try:
            logger.info("Starting image redaction")
            logger.debug(f"Config: {config}")

            redactor = ImageRedactor()
            result = redactor.redact_image_base64(image_data, config)

            logger.info("Image redaction completed successfully")
            return json.loads(result)
        except Exception as e:
            logger.error(f"Error redacting image: {str(e)}")
            logger.error(traceback.format_exc())
            return {"success": False, "error": str(e)}

    def redact_uploaded_image(self, file_data, config=None):
        """Redact an uploaded image"""
        try:
            logger.info("Starting uploaded image redaction")
            logger.debug(f"File data: {file_data.get('filename')}")
            logger.debug(f"Config: {config}")

            # Save the uploaded file temporarily
            temp_path = f"temp_{file_data.get('filename', 'uploaded_image')}"
            binary_data = base64.b64decode(file_data.get("data", ""))
            with open(temp_path, "wb") as f:
                f.write(binary_data)

            # Process the image
            redactor = ImageRedactor()
            result = redactor.redact_image(temp_path, config)

            # Clean up
            if os.path.exists(temp_path):
                os.remove(temp_path)
            gc.collect()

            logger.info("Uploaded image redaction completed successfully")
            return json.loads(result)
        except Exception as e:
            logger.error(f"Error processing uploaded image: {str(e)}")
            logger.error(traceback.format_exc())
            return {"success": False, "error": str(e)}

    def redact_bulk_upload(self, files_data, config=None):
        """Redact multiple uploaded images"""
        try:
            logger.info(f"Starting bulk upload of {len(files_data)} files")
            logger.debug(f"Config: {config}")

            results = []
            redactor = ImageRedactor()

            for file_data in files_data:
                try:
                    # Skip non-image files
                    filename = file_data.get("filename", "").lower()
                    if not filename.endswith(
                        (
                            ".png",
                            ".jpg",
                            ".jpeg",
                            ".gif",
                            ".webp",
                            ".tiff",
                            ".tif",
                            ".bmp",
                            ".svg",
                            ".dcm",
                        )
                    ):
                        results.append(
                            {
                                "filename": file_data.get("filename"),
                                "success": False,
                                "error": "Not a supported image format",
                            }
                        )
                        continue

                    # Process the image
                    temp_path = f"temp_{file_data.get('filename')}"
                    binary_data = base64.b64decode(file_data.get("data", ""))
                    with open(temp_path, "wb") as f:
                        f.write(binary_data)

                    result = redactor.redact_image(temp_path, config)
                    result_json = json.loads(result)
                    result_json["filename"] = file_data.get("filename")

                    # Clean up temp file
                    if os.path.exists(temp_path):
                        os.remove(temp_path)

                    results.append(result_json)

                except Exception as e:
                    logger.error(
                        f"Error processing file {file_data.get('filename')}: {str(e)}"
                    )
                    logger.error(traceback.format_exc())
                    results.append(
                        {
                            "filename": file_data.get("filename"),
                            "success": False,
                            "error": str(e),
                        }
                    )

            gc.collect()
            logger.info("Bulk upload processing completed")
            return {"results": results}

        except Exception as e:
            logger.error(f"Error in bulk upload processing: {str(e)}")
            logger.error(traceback.format_exc())
            return {"success": False, "error": str(e)}


def get_html_path():
    """Get the path to the HTML file based on the environment."""
    if os.getenv("DEBUG"):
        return "http://localhost:3000"
    else:
        return os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "dist-web", "index.html"
        )


def cleanup():
    """Clean up resources before exit"""
    global window
    logger.info("Cleaning up resources...")

    if window:
        try:
            window.destroy()
        except:
            pass

    logger.info("Cleanup complete")


def shutdown_handler(signal, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signal}")
    cleanup()
    sys.exit(0)


def on_tray_open(icon, item):
    """Handle tray icon open action"""
    global window
    if window:
        window.show()
        window.restore()


def on_tray_exit(icon, item):
    """Handle tray icon exit action"""
    icon.stop()
    cleanup()
    sys.exit(0)


def create_window():
    """Create the main window"""
    global window
    html_path = get_html_path()

    # Enable debugging in webview
    webview.settings["ALLOW_DOWNLOADS"] = True

    # Create the API instance
    api = RedactShotXAPI()
    logger.info("Created RedactShotXAPI instance")

    window = webview.create_window(
        WINDOW_TITLE,
        html_path,
        width=WINDOW_WIDTH,
        height=WINDOW_HEIGHT,
        js_api=api,
        resizable=True,
        min_size=(800, 600),
    )

    # Add a small delay to ensure the window is ready
    time.sleep(0.5)

    # Verify API is exposed
    try:
        window.evaluate_js(
            """
            if (window.pywebview && window.pywebview.api) {
                console.log('API is available');
            } else {
                console.error('API is not available');
            }
        """
        )
    except Exception as e:
        logger.error(f"Error verifying API exposure: {str(e)}")
        logger.error(traceback.format_exc())

    logger.info("Window created with API exposed")


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


def run_tray_icon():
    """Run the system tray icon"""
    global tray_icon
    try:
        # Get the icon path
        icon_path = get_icon_path()
        if not icon_path:
            logger.warning("No icon file found, using default icon")
            return

        # Create the tray icon
        image = Image.open(icon_path)
        menu = Menu(
            MenuItem("Open", on_tray_open),
            MenuItem("Exit", on_tray_exit),
        )

        # On macOS, we need to run the tray icon on the main thread
        if platform.system() == "Darwin":

            def create_tray_icon():
                global tray_icon
                tray_icon = Icon("RedactShotX", image, "RedactShotX", menu)
                tray_icon.run()

            # Schedule the tray icon creation on the main thread
            webview.windows[0].evaluate_js(
                """
                setTimeout(() => {
                    window.pywebview.api._create_tray_icon();
                }, 1000);
            """
            )

            # Add the create_tray_icon method to the API
            def _create_tray_icon():
                create_tray_icon()

            # Add the method to the window's API
            webview.windows[0]._create_tray_icon = _create_tray_icon
        else:
            # For other platforms, run normally
            tray_icon = Icon("RedactShotX", image, "RedactShotX", menu)
            tray_icon.run()

    except Exception as e:
        logger.error(f"Error running tray icon: {str(e)}")
        logger.error(traceback.format_exc())
        # Don't exit the app if tray icon fails
        pass


def main():
    """Main entry point"""
    # Set up signal handlers
    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    # Create and start the window
    create_window()

    # Start the tray icon in a separate thread (except on macOS)
    if platform.system() != "Darwin":
        tray_thread = threading.Thread(target=run_tray_icon)
        tray_thread.daemon = True
        tray_thread.start()
    else:
        # On macOS, we'll create the tray icon after the window is shown
        run_tray_icon()

    # Start the webview event loop with debug mode only if DEBUG is set
    debug_mode = bool(os.getenv("DEBUG"))
    webview.start(debug=debug_mode)


if __name__ == "__main__":
    main()
