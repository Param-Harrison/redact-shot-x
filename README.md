# 🧼 RedactShotX - Screenshot PII Scrubber

A beautifully minimal app to automatically detect and redact sensitive information from images (screenshots). The app uses OCR to extract text and then applies automatic redaction using blur or black boxes.

## 🎯 Target Audience

- QA testers
- HR & Legal teams
- Customer support teams
- Product managers
- Freelancers sharing annotated screenshots

## 🌟 Features

- Automatic detection of PII in images
- One-click redaction of emails, phone numbers, credit cards, etc.
- Drag-and-drop simplicity
- Instant export for sharing
- Gorgeous, minimal UI

## 🏗️ Architecture

RedactShotX is available in two flavors:

### 1. Tauri Desktop App

- **Frontend**: React.js for the user interface
- **Application Wrapper**: Tauri (Rust) for cross-platform desktop support
- **Redaction Engine**: Python with Microsoft Presidio for powerful PII detection and redaction
- **Python Sidecar**: The Python backend is packaged as a sidecar executable using PyInstaller

### 2. Web App Version

- **Frontend**: Same React.js components as the desktop version
- **Backend**: Python FastAPI server for the REST API
- **Redaction Engine**: Same Microsoft Presidio engine used in both versions

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- Python 3.8+
- npm or yarn
- For Tauri: Rust toolchain and platform-specific dependencies (see [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites))

### Running the Web Version

#### Option 1: Using convenience scripts (recommended)

These scripts start both the backend API server and frontend in one step:

```bash
# On Unix/macOS
./run-app.sh

# On Windows
# Use PowerShell or Command Prompt to run the Python backend and frontend separately
```

#### Option 2: Manual startup

1. Start the Python backend in a terminal:

   ```bash
   cd src-python
   pip install -e .
   uvicorn api:app --host 0.0.0.0 --port 8004
   ```

2. In a separate terminal, start the React frontend:

   ```bash
   npm run web
   ```

The web app will be available at http://localhost:3000.

### Running the Tauri Desktop App

#### Development Mode

1. Build the Python sidecar for your platform:

   ```bash
   # Build for your current platform
   ./run-app.sh --build-sidecar

   # Or use the specific npm scripts
   # For Windows
   npm run build:sidecar-win

   # For macOS (Intel)
   npm run build:sidecar-mac-intel

   # For macOS (Apple Silicon)
   npm run build:sidecar-mac-apple

   # For Linux
   npm run build:sidecar-linux
   ```

2. Start the Tauri app with the sidecar:

   ```bash
   # Using the convenience script
   ./run-app.sh --tauri

   # Or directly with npm
   npm run tauri dev
   ```

## 📦 Building for Production

### Web Version

```bash
# Install dependencies if needed
npm install

# Build the React app with web-specific config
npm run build:web
```

The built files will be in `dist-web/`.

### Tauri Desktop App

```bash
# Install dependencies
npm install

# Build the Python sidecar for all platforms (requires appropriate Python environment for each)
npm run build:sidecar-all

# Or build for a specific platform
npm run build:sidecar-win  # Windows
npm run build:sidecar-mac-intel  # macOS (Intel)
npm run build:sidecar-mac-apple  # macOS (Apple Silicon)
npm run build:sidecar-linux  # Linux

# Build the Tauri app (this will use the sidecar built in the previous step)
npm run tauri build

# Or use the combined command to build sidecar and Tauri app
npm run tauri:build
```

The built binaries will be in `src-tauri/target/release/bundle/`.

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript
- **Desktop Wrapper**: Tauri (Rust)
- **Backend API**: Python, FastAPI
- **Redaction Engine**: Microsoft Presidio
- **OCR**: Tesseract (via Presidio)
- **Python Packaging**: PyInstaller for creating standalone executables

## 📚 Documentation

- [Python Backend](src-python/README.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🌟 Unique Value Proposition

- Offline only, fully local (no cloud, no login)
- One-click redaction of emails, phone numbers, credit cards, etc.
- Drag-and-drop simplicity
- Instant export for sharing
- Gorgeous, minimal UI

---

# ✅ MVP Feature Set

## 1. Image Upload / Input

- Drag & drop area to load any common image format (PNG, JPG, JPEG, BMP, WebP, TIFF)
- Clickable input field to browse and upload files
- Support for dragging images directly from other tools (e.g., Snipping Tool, CleanShot)
- Paste support from clipboard for image-only content (text paste ignored)
- Instant preview of the image on drop or upload
- Clickable input field to browse and upload files
- Support for dragging images directly from other tools (e.g., Snipping Tool, CleanShot)
- Paste support from clipboard for image-only content (text paste ignored)
- Instant preview of the image on drop or upload

## 2. OCR + PII Detection

- Auto-extract visible text from the image using OCR (Tesseract or Presidio's OCR)
- Detect PII types (emails, phone numbers, credit cards, etc.) via Microsoft Presidio

## 3. Auto-Redaction Engine

- Default behavior: blur detected areas
- Optional toggle: black box instead of blur
- Optionally show number/type of redactions applied

## 4. Export

- Export redacted image (JPG or PNG)
- Save redacted image automatically in the same folder as the original file, appending `-redacted` to the filename (e.g., `invoice.png` → `invoice-redacted.png`)
- Option to "Save As" to a custom location
- Option to copy image to clipboard (v2)

## 5. Simple Settings Panel

- Toggle redaction method: Blur / Box
- Enable/disable redaction types (email, phone, etc.)

## ❌ Not in MVP

- Manual draw-to-blur
- Annotation tools
- Screenshot capture

---

# 🎨 UX/UI Guidelines

## Design Aesthetic

- Clean, focused, distraction-free
- Neutral colors: white background, black text, soft shadows
- Generous whitespace
- Rounded corners, soft blur on overlays

## Layout

A single-column minimal layout:

- **Top Section**: Drag-and-drop zone with a click-to-upload fallback
- **Middle Section**: Image preview area with live redaction overlays
- **Bottom Section**: Redaction method dropdown and export button grouped together

The layout should be responsive, spacious, and touch-friendly across desktop and mobile.

Avoid excessive visual framing — let the image and blur effect take center stage.

## Animations

- Fade in when blur is applied
- Hover glow on dropzone
- Toast/notification: "Redaction complete"

## Feedback States

- No image: show empty state
- On drop: animate in preview
- Error: show simple error state with reset button

---

# 🛠️ Tech Implementation

To maintain flexibility in platform support and tech stack choices, the implementation should focus on:

## Frontend

- Interface should be built using clean, minimal HTML and CSS
- File upload should support drag-and-drop, file selection, and paste
- Image preview with redaction overlays should be visually responsive and performant
- Any redaction effects (blur or box) should be applied clearly and aesthetically
- The rendering method (e.g., canvas, image overlays, or CSS masking) can be chosen based on platform capabilities

## Backend

- Image processing should happen locally
- OCR and PII detection should use a library like Microsoft Presidio (includes OCR + redaction in one tool)
- Output should be a redacted version of the input image

## Platform Considerations

- Architecture should support launching a local script or compiled backend (e.g., Python, Rust, etc.)
- The image file path and settings (e.g., blur vs box) should be passed to the backend
- Result should be returned as a modified image path for preview/export

The tech stack is intentionally left open to allow platform-specific optimizations while maintaining offline, local-first requirements.

1. User drops image into UI
2. Image sent to backend via `invoke`
3. Backend performs OCR → detects PII → applies redactions → saves `redacted.png`
4. Frontend updates canvas to show `redacted.png`
5. User clicks Export → saves redacted image

## Python Sidecar Implementation Notes

- The Python backend is packaged as a standalone executable using PyInstaller
- In development mode, you can use the Python code directly
- In production, the executable is bundled with the Tauri app
- The sidecar starts automatically when the app starts and shuts down when the app closes
- Communication between the frontend and sidecar happens via HTTP
