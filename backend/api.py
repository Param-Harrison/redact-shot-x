import os
import json
import gc
import logging
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from backend.redactor import ImageRedactor
import uvicorn
import sys
import base64
from PIL import Image

# Constants
PORT_API = 8004
HOST_API = "127.0.0.1"  # Use localhost for improved security

# App instance
app = FastAPI(title="RedactShotX API", version="0.1.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
if getattr(sys, "frozen", False):
    # Running in a PyInstaller bundle
    base_path = os.path.dirname(sys.executable)
    static_path = os.path.join(base_path, "dist-web")
else:
    # Running in development
    static_path = "dist-web"

if os.path.exists(static_path):
    app.mount("/app", StaticFiles(directory=static_path, html=True), name="static")

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")


# Models
class Base64Request(BaseModel):
    imageData: str
    config: Optional[Dict[str, Any]] = None


@app.get("/")
async def root():
    """Redirect root to the frontend app"""
    return RedirectResponse(url="/app/index.html")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/shutdown")
def app_shutdown():
    import signal

    logger.info("Shutting down API server...")
    os.kill(os.getpid(), signal.SIGTERM)
    return {"status": "ok", "message": "Shutdown initiated"}


@app.post("/redact/upload")
async def redact_uploaded_image(
    file: UploadFile = File(...),
    config_json: str = Form(None),
):
    try:
        logger.info(f"📥 Upload: {file.filename}")

        # Validate file type
        if not ImageRedactor.is_valid_image_file(file.filename, file.content_type):
            raise HTTPException(status_code=400, detail="Not a supported image format")

        # Process file
        file_data = await file.read()
        temp_path = ImageRedactor()._handle_temp_file(file_data, file.filename)

        # Process config
        config = json.loads(config_json) if config_json else None
        redactor = ImageRedactor()
        result = redactor.redact_image(temp_path, config)

        # Cleanup
        os.remove(temp_path)
        gc.collect()

        return JSONResponse(content=json.loads(result))
    except Exception as e:
        logger.exception("Upload processing failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/redact/bulk-upload")
async def redact_bulk_uploaded_images(
    files: List[UploadFile] = File(...),
    config_json: str = Form(None),
):
    try:
        logger.info(f"📥 Bulk Upload: {len(files)} files")
        results = []
        config = json.loads(config_json) if config_json else None
        redactor = ImageRedactor()

        for file in files:
            try:
                # Skip non-image files
                if not ImageRedactor.is_valid_image_file(
                    file.filename, file.content_type
                ):
                    results.append(
                        {
                            "filename": file.filename,
                            "success": False,
                            "error": "Not a supported image format",
                        }
                    )
                    continue

                # Read file data
                file_data = await file.read()

                # Convert to base64
                base64_data = base64.b64encode(file_data).decode("utf-8")

                # Process the image using base64 data
                result = redactor.redact_image_base64(base64_data, config)
                result_json = json.loads(result)

                # Add the filename to the result
                result_json["filename"] = file.filename

                results.append(result_json)

            except Exception as e:
                logger.error(f"Error processing file {file.filename}: {str(e)}")
                results.append(
                    {
                        "filename": file.filename,
                        "success": False,
                        "error": str(e),
                    }
                )

        gc.collect()
        return JSONResponse(content={"results": results})
    except Exception as e:
        logger.exception("Bulk upload processing failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/redact/base64")
async def redact_base64_image(request: Base64Request):
    try:
        redactor = ImageRedactor()
        result = redactor.redact_image_base64(request.imageData, request.config)

        # Help GC
        request.imageData = ""
        gc.collect()

        return JSONResponse(content=json.loads(result))
    except Exception as e:
        logger.exception("Base64 redaction failed")
        raise HTTPException(status_code=500, detail=str(e))


# Only run directly in development
if __name__ == "__main__":
    logger.info(f"🚀 RedactShotX API running at {HOST_API}:{PORT_API}")
    uvicorn.run(app, host=HOST_API, port=PORT_API)
