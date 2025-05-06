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

    def cleanup_temp_files(self):
        """Clean up all temporary files created by the application"""
        try:
            # Find all temp_* files in the current directory
            temp_files = [f for f in os.listdir(".") if f.startswith("temp_")]
            for temp_file in temp_files:
                try:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                        logger.info(f"Removed temp file: {temp_file}")
                except Exception as e:
                    logger.error(f"Error removing temp file {temp_file}: {e}")
            return {"success": True}
        except Exception as e:
            logger.error(f"Error in cleanup_temp_files: {e}")
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

            # Validate file type
            if not ImageRedactor.is_valid_image_file(file_data.get("filename", "")):
                return {"success": False, "error": "Not a supported image format"}

            # Save the uploaded file temporarily
            temp_path = f"temp_{file_data.get('filename', 'uploaded_image')}"
            binary_data = base64.b64decode(file_data.get("data", ""))

            if not binary_data:
                return {"success": False, "error": "Empty file data"}

            # Create temporary file and verify it's a valid image
            with open(temp_path, "wb") as f:
                f.write(binary_data)

            try:
                # Verify the file is a valid image before processing
                with Image.open(temp_path) as img:
                    img.verify()  # Verify the file is a valid image
            except Exception as e:
                return {"success": False, "error": f"Invalid image file: {str(e)}"}

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
            temp_files = []  # Keep track of temp files to clean up

            for file_data in files_data:
                temp_path = None
                try:
                    # Skip non-image files
                    filename = file_data.get("filename", "").lower()
                    if not ImageRedactor.is_valid_image_file(filename):
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
                    temp_files.append(temp_path)  # Add to cleanup list
                    binary_data = base64.b64decode(file_data.get("data", ""))

                    if not binary_data:
                        results.append(
                            {
                                "filename": file_data.get("filename"),
                                "success": False,
                                "error": "Empty file data",
                            }
                        )
                        continue

                    # Create temporary file and verify it's a valid image
                    with open(temp_path, "wb") as f:
                        f.write(binary_data)

                    try:
                        # Verify the file is a valid image before processing
                        with Image.open(temp_path) as img:
                            img.verify()  # Verify the file is a valid image
                    except Exception as e:
                        results.append(
                            {
                                "filename": file_data.get("filename"),
                                "success": False,
                                "error": f"Invalid image file: {str(e)}",
                            }
                        )
                        continue

                    result = redactor.redact_image(temp_path, config)
                    result_json = json.loads(result)
                    result_json["filename"] = file_data.get("filename")

                    # Extract and include the base64 image data for preview
                    if "outputPath" in result_json and os.path.exists(
                        result_json["outputPath"]
                    ):
                        with open(result_json["outputPath"], "rb") as img_file:
                            img_data = img_file.read()
                            img_ext = os.path.splitext(result_json["outputPath"])[
                                1
                            ].lstrip(".")
                            if not img_ext:
                                img_ext = "png"

                            # Convert to base64
                            b64_data = base64.b64encode(img_data).decode("utf-8")
                            result_json["redactedImage"] = (
                                f"data:image/{img_ext};base64,{b64_data}"
                            )

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
                finally:
                    # Clean up temp file
                    if temp_path and os.path.exists(temp_path):
                        try:
                            os.remove(temp_path)
                        except Exception as e:
                            logger.error(f"Error removing temp file {temp_path}: {e}")

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

    # Clean up temporary files
    try:
        temp_files = [f for f in os.listdir(".") if f.startswith("temp_")]
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                    logger.info(f"Removed temp file: {temp_file}")
            except Exception as e:
                logger.error(f"Error removing temp file {temp_file}: {e}")
    except Exception as e:
        logger.error(f"Error cleaning up temp files: {e}")

    # Clean up window
    if window:
        try:
            window.destroy()
        except:
            pass

    # Force garbage collection
    gc.collect()
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

    # Add close handler to ensure cleanup
    def on_closed():
        logger.info("Window closed, cleaning up...")
        cleanup()
        sys.exit(0)

    window.events.closed += on_closed

    # Optionally, add a loaded event handler for logging
    def on_loaded():
        logger.info("Webview window loaded and ready.")

    window.events.loaded += on_loaded


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


def create_tray_icon():
    global tray_icon
    icon_path = get_icon_path()
    if not icon_path:
        logger.warning("No icon file found, using default icon")
        return
    image = Image.open(icon_path)
    menu = Menu(
        MenuItem("Open", on_tray_open),
        MenuItem("Exit", on_tray_exit),
    )
    tray_icon = Icon("RedactShotX", image, "RedactShotX", menu)
    tray_icon.run()


def run_tray_icon():
    """Run the system tray icon (for non-macOS platforms)"""
    global tray_icon
    try:
        icon_path = get_icon_path()
        if not icon_path:
            logger.warning("No icon file found, using default icon")
            return
        image = Image.open(icon_path)
        menu = Menu(
            MenuItem("Open", on_tray_open),
            MenuItem("Exit", on_tray_exit),
        )
        tray_icon = Icon("RedactShotX", image, "RedactShotX", menu)
        tray_icon.run()
    except Exception as e:
        logger.error(f"Error running tray icon: {str(e)}")
        logger.error(traceback.format_exc())
        pass


def main():
    """Main entry point"""
    # Register signal handlers
    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    create_window()
    debug_mode = bool(os.getenv("DEBUG"))
    if platform.system() == "Darwin":
        # Do NOT create a tray icon on macOS
        webview.start(debug=debug_mode)
    else:
        tray_thread = threading.Thread(target=run_tray_icon)
        tray_thread.daemon = True
        tray_thread.start()
        webview.start(debug=debug_mode)


if __name__ == "__main__":
    main()
