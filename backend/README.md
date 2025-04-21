# RedactShotX Python Backend

Python backend for the RedactShotX application using:

- FastAPI for the API server
- Presidio for PII detection and redaction
- spaCy for natural language processing
- PyTesseract for OCR

## Installation

```bash
pip install -e .
```

## Requirements

- Python 3.8+
- Tesseract OCR (for OCR functionality)

## Development

This package is intended to be used as part of the RedactShotX application.
For development, run the API server directly:

```bash
python -m uvicorn api:app --host 127.0.0.1 --port 8004 --reload
```
