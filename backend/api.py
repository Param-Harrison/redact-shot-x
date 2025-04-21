import os
import json
import gc
import logging
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
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
    return {"status": "active", "service": "RedactShotX API"}


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
            temp_path = f"temp_{file.filename}"
            try:
                # Skip non-image files
                filename = file.filename.lower()
                if not (
                    filename.endswith(
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
                    )
                    or file.content_type.startswith("image/")
                ):
                    results.append(
                        {
                            "filename": file.filename,
                            "success": False,
                            "error": "Not a supported image format",
                        }
                    )
                    continue

                # Process the image
                with open(temp_path, "wb") as buffer:
                    buffer.write(await file.read())

                result = redactor.redact_image(temp_path, config)
                result_json = json.loads(result)

                # Add the filename to the result
                result_json["filename"] = file.filename

                # Extract and include the base64 image data for preview
                if "outputPath" in result_json and os.path.exists(
                    result_json["outputPath"]
                ):
                    with open(result_json["outputPath"], "rb") as img_file:
                        img_data = img_file.read()
                        img_ext = os.path.splitext(result_json["outputPath"])[1].lstrip(
                            "."
                        )
                        if not img_ext:
                            img_ext = "png"

                        # Convert to base64
                        import base64

                        b64_data = base64.b64encode(img_data).decode("utf-8")
                        result_json["redactedImage"] = (
                            f"data:image/{img_ext};base64,{b64_data}"
                        )

                results.append(result_json)

            except Exception as e:
                logger.exception(f"Error processing file {file.filename}")
                results.append(
                    {"filename": file.filename, "success": False, "error": str(e)}
                )
            finally:
                # Always try to clean up temp files, even if processing failed
                try:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                        logger.info(f"Removed temp file: {temp_path}")

                    # Also clean up any output files
                    output_path = None
                    for result in results:
                        if (
                            result.get("filename") == file.filename
                            and result.get("success")
                            and result.get("outputPath")
                        ):
                            output_path = result["outputPath"]
                            if os.path.exists(output_path):
                                os.remove(output_path)
                                logger.info(f"Removed output file: {output_path}")
                                break
                except Exception as cleanup_error:
                    logger.error(f"Error cleaning up files: {cleanup_error}")

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
