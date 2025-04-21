import os
import json
import gc
import logging
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from .redactor import ImageRedactor
import uvicorn

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

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")


# Models
class Base64Request(BaseModel):
    imageData: str
    config: Optional[Dict[str, Any]] = None


@app.get("/")
async def root():
    return {"status": "ok", "message": "RedactShotX API is running"}


@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "API is healthy"}


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
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())

        config = json.loads(config_json) if config_json else None
        redactor = ImageRedactor()
        result = redactor.redact_image(temp_path, config)

        os.remove(temp_path)
        gc.collect()

        return JSONResponse(content=json.loads(result))
    except Exception as e:
        logger.exception("Upload processing failed")
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