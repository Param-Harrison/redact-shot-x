#!/usr/bin/env python3
"""
RedactShotX - API Server
Provides a REST API for image redaction services.
"""

import os
import json
import logging
import argparse
import uvicorn
from typing import Dict, Any, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from redactor import ImageRedactor

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("api")

# Create FastAPI app
app = FastAPI(
    title="RedactShotX API",
    description="API for redacting PII from images",
    version="0.1.0",
)

# Add CORS middleware to allow local requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, this should be restricted
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Define request models
class RedactionConfig(BaseModel):
    enabledTypes: Dict[str, bool] = {}
    redactionMethod: str = "blur"
    allowListTags: list = []
    denyListTags: list = []


class Base64Request(BaseModel):
    imageData: str
    config: Optional[RedactionConfig] = None


# Global redactor instance
redactor = ImageRedactor()


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "service": "RedactShotX API"}


@app.post("/redact/upload")
async def redact_uploaded_image(
    file: UploadFile = File(...), config_json: str = Form(None)
):
    """
    Redact PII from an uploaded image file.

    Args:
        file: The image file to redact
        config_json: JSON string with redaction configuration

    Returns:
        JSON response with redacted image info
    """
    try:
        logger.info(f"Received file upload: {file.filename}")

        # Parse configuration
        config = json.loads(config_json) if config_json else {}

        # Save uploaded file temporarily
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())

        # Create redactor with config
        redactor_instance = ImageRedactor(config)

        # Process the image
        result_json = redactor_instance.redact_image(temp_path)
        result = json.loads(result_json)

        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

        return JSONResponse(content=result)

    except Exception as e:
        logger.error(f"Error processing upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/redact/base64")
async def redact_base64_image(request: Base64Request):
    """
    Redact PII from a base64-encoded image.

    Args:
        request: Contains base64 image data and config

    Returns:
        JSON response with redacted image data
    """
    try:
        logger.info("Received base64 image redaction request")

        # Get configuration from request
        config = request.config.dict() if request.config else {}

        # Create redactor with config
        redactor_instance = ImageRedactor(config)

        # Process the image
        result_json = redactor_instance.redact_image_base64(request.imageData)
        result = json.loads(result_json)

        return JSONResponse(content=result)

    except Exception as e:
        logger.error(f"Error processing base64 image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="RedactShotX API Server")
    parser.add_argument(
        "--host", type=str, default="127.0.0.1", help="Host to bind the server to"
    )
    parser.add_argument(
        "--port", type=int, default=8000, help="Port to bind the server to"
    )

    return parser.parse_args()


def main():
    """Main entry point for API server."""
    args = parse_arguments()

    logger.info(f"Starting RedactShotX API on {args.host}:{args.port}")
    uvicorn.run("api:app", host=args.host, port=args.port, reload=False)


if __name__ == "__main__":
    main()
