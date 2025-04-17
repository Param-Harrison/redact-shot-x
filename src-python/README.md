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
   python -m spacy download en_core_web_trf
   ```
4. Install Tesseract OCR:

   ```
   # On macOS
   brew install tesseract

   # On Ubuntu/Debian
   sudo apt-get install tesseract-ocr

   # On Windows
   # Download and install from https://github.com/UB-Mannheim/tesseract/wiki
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
python api.py --host 127.0.0.1 --port 1426
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

## Comprehensive PII Detection

RedactShotX uses an enhanced version of Microsoft Presidio for advanced PII detection with custom recognizers for:

### Personal Information

- Names (with or without titles like Mr., Mrs., Dr., etc.)
- Email addresses
- Phone numbers
- Usernames and handles (e.g., @username formats)

### Identification Documents

- Passport numbers (various international formats)
- Driver's licenses
- ID cards
- Birth certificates
- Visa and immigration documents

### Financial Information

- Credit/debit card numbers (including masked formats)
- Bank account details
- Cryptocurrency addresses

### Authentication Data

- Passwords
- API keys and tokens
- Authorization headers
- Secret keys

### Web & Application Data

- URLs and domain names
- Specific web application names (Slack, Teams, GitHub, JIRA, etc.)
- Database connection strings

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
    "AUTHENTICATION": true,
    "PASSPORT": true,
    "DRIVER_LICENSE": true,
    "ID_CARD": true,
    "VISA_DOCUMENT": true,
    "BIRTH_CERTIFICATE": true,
    "API_KEY": true,
    "CONNECTION_STRING": true,
    "WEB_APP": true,
    "USERNAME": true,
    "STREET_ADDRESS": true
  },
  "redactionMethod": "blur",
  "allowListTags": ["public", "safe"],
  "denyListTags": ["confidential", "secret"],
  "useContextEnhancement": true
}
```

## Advanced Features

- **Context-aware detection**: Enhanced sensitivity to context clues around potential PII
- **Strong pattern matching**: Comprehensive regular expressions for various document formats
- **Boundary validation**: Ensures accurate redaction of detected regions
- **Detailed logging**: Records what types of entities were redacted for auditing
- **Error resilience**: Fallback mechanisms to ensure operation continues even if some features aren't available

## Dependencies

- presidio-analyzer
- presidio-image-redactor
- pytesseract (requires Tesseract OCR to be installed)
- spaCy with en_core_web_trf model for enhanced NLP capabilities
- Pillow for image processing

## Compatibility Notes

This implementation is compatible with presidio-analyzer 2.2.x and presidio-image-redactor 0.0.56+. The feature set may vary slightly based on the exact versions installed.
