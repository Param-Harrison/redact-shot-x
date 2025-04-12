# RedactShotX Python Backend

This directory contains the Python backend for RedactShotX, which handles OCR and PII detection/redaction using Microsoft Presidio.

## Components

- **redactor.py**: Command-line tool for image redaction
- **api.py**: FastAPI server for web-based redaction services
- **build.py**: Script to build executables for all platforms

## Setting Up the Development Environment

1. Install Python 3.8+ and pip
2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Install SpaCy language model:
   ```
   python -m spacy download en_core_web_lg
   ```

## Usage

### Command-line Usage

```
python redactor.py --image <path_to_image> --config <json_config>
```

For base64-encoded images:

```
python redactor.py --image <path_to_base64_file> --config <json_config> --base64
```

### API Server Usage

```
python api.py --host 127.0.0.1 --port 8000
```

The API server exposes the following endpoints:

- `GET /`: Health check
- `POST /redact/upload`: Upload and redact an image file
- `POST /redact/base64`: Redact a base64-encoded image

## Building Executables

Run the build script to create standalone executables for all platforms:

```
python build.py
```

This will:

1. Install PyInstaller if not already installed
2. Install required dependencies
3. Build executables for redactor and API server
4. Copy executables to the appropriate platform-specific directories in `src-tauri/bin/`

## Configuration Options

The redaction engine accepts a JSON configuration with the following options:

```json
{
  "enabledTypes": {
    "PERSON": true,
    "EMAIL_ADDRESS": true,
    "PHONE_NUMBER": true,
    "CREDIT_CARD": true,
    "US_SSN": true,
    "LOCATION": true,
    "STREET_ADDRESS": true
  },
  "redactionMethod": "blur",
  "allowListTags": ["public", "safe"],
  "denyListTags": ["confidential", "secret"],
  "useContextEnhancement": true,
  "customRegex": "custom pattern"
}
```
