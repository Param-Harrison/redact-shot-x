# api.py
import json
import os
import argparse
import logging
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from redactor import ImageRedactor
import uvicorn

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
    return {"status": "ok", "message": "RedactShotX API is running"}


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

        return JSONResponse(content=json.loads(result))
    except Exception as e:
        logger.exception("Error processing upload")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/redact/base64")
async def redact_base64_image(request: Base64Request):
    try:
        logger.info("Received base64 image redaction request")

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
        return JSONResponse(content=json.loads(result))
    except Exception as e:
        logger.exception("Error processing base64 image")
        raise HTTPException(status_code=500, detail=str(e))


def parse_arguments():
    parser = argparse.ArgumentParser(description="RedactShotX API Server")
    parser.add_argument("--host", type=str, default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    return parser.parse_args()


def main():
    args = parse_arguments()
    logger.info(f"🚀 Starting RedactShotX API at {args.host}:{args.port}")
    uvicorn.run("api:app", host=args.host, port=args.port, reload=False)


if __name__ == "__main__":
    main()
