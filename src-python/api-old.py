# api.py
import json
import os
import gc
import logging
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from redactor import ImageRedactor
import uvicorn

# Constants
PORT_API = 8004
HOST_API = "0.0.0.0"

app = FastAPI(title="RedactShotX API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

# global instance
redactor = ImageRedactor()


class Base64Request(BaseModel):
    imageData: str
    config: Optional[Dict[str, Any]] = None


@app.get("/")
async def root():
    """
    Root endpoint that returns a simple status response.
    Use this for basic connectivity testing.
    """
    return {"status": "ok", "message": "RedactShotX API is running"}


@app.get("/health")
async def health_check():
    """
    Simple health check endpoint to verify the API is operational.
    """
    return {"status": "ok", "message": "API is healthy"}


@app.get("/shutdown")
def app_shutdown():
    """
    Endpoint to gracefully shut down the API server.
    Used when the Tauri app is closing.
    """
    import os
    import signal

    logger.info("Shutdown request received, terminating process...")
    os.kill(os.getpid(), signal.SIGTERM)
    return {"status": "ok", "message": "Shutdown initiated"}


@app.post("/redact/upload")
async def redact_uploaded_image(
    file: UploadFile = File(...), config_json: str = Form(None)
):
    try:
        logger.info(f"📥 Received upload: {file.filename}")
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())

        # Parse configuration if provided
        config = None
        if config_json:
            try:
                config = json.loads(config_json)
                logger.info(
                    f"Parsed configuration from request: {list(config.keys()) if config else None}"
                )

                # Log detailed config for debugging
                if config:
                    if config.get("enabledTypes"):
                        logger.info(f"Enabled types: {config['enabledTypes']}")
                    if config.get("allowListTags"):
                        logger.info(f"Allow list: {config['allowListTags']}")
                    if config.get("denyListTags"):
                        logger.info(f"Deny list: {config['denyListTags']}")
                    if config.get("customRegexes"):
                        logger.info(f"Custom regexes: {config['customRegexes']}")
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse config JSON: {str(e)}")
                config = None

        # Pass the config to the redactor
        result = redactor.redact_image(temp_path, config)

        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

        # Force garbage collection to prevent memory buildup
        gc.collect()

        return JSONResponse(content=json.loads(result))
    except Exception as e:
        logger.exception("Error processing upload")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up references for garbage collection
        if "config" in locals():
            del config
        if "result" in locals():
            del result
        gc.collect()


@app.post("/redact/base64")
async def redact_base64_image(request: Base64Request):
    try:
        # Log image size to help with debugging
        image_data_len = len(request.imageData) if request.imageData else 0
        logger.info(
            f"Received base64 image redaction request, size: {image_data_len / 1024:.2f}KB"
        )

        # Log configuration details for debugging
        if request.config:
            logger.info(f"Configuration provided: {list(request.config.keys())}")

            # Log detailed configuration
            if request.config.get("enabledTypes"):
                logger.info(f"Enabled types: {request.config['enabledTypes']}")
            if request.config.get("allowListTags"):
                logger.info(f"Allow list: {request.config['allowListTags']}")
            if request.config.get("denyListTags"):
                logger.info(f"Deny list: {request.config['denyListTags']}")
            if request.config.get("customRegexes"):
                logger.info(f"Custom regexes: {request.config['customRegexes']}")

        # Process the image with configuration
        result = redactor.redact_image_base64(request.imageData, request.config)

        # Clear references to large data objects
        request_data = request.imageData
        request.imageData = ""  # Clear the reference to large string
        del request_data  # Explicitly delete the reference

        # Force garbage collection to prevent memory buildup
        gc.collect()

        return JSONResponse(content=json.loads(result))
    except Exception as e:
        logger.exception("Error processing base64 image")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up references for garbage collection
        if "request" in locals():
            request.imageData = ""  # Clear large string
        if "result" in locals():
            del result
        gc.collect()


if __name__ == "__main__":
    logger.info(f"🚀 Starting RedactShotX API at {HOST_API}:{PORT_API}")
    # Make sure we're accessible from the browser by enabling CORS
    uvicorn.run(app, host=HOST_API, port=PORT_API)
