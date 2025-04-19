from fastapi import FastAPI
import logging
from fastapi.middleware.cors import CORSMiddleware

# Create FastAPI instance
app = FastAPI(title="RedactShotX API", version="0.1.0")

# Constants
PORT_API = 8004
HOST_API = "0.0.0.0"

# Configure CORS settings
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")


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

    os.kill(os.getpid(), signal.SIGTERM)
    return {"status": "ok", "message": "Shutdown initiated"}


if __name__ == "__main__":
    import uvicorn

    print(f"🚀 Starting RedactShotX API at {HOST_API}:{PORT_API}")
    uvicorn.run(app, host=HOST_API, port=PORT_API)
