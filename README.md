# 🧼 Product Requirements Document: RedactShotX

## 🧠 App Name

**RedactShotX** — Screenshot PII Scrubber (Image Redactor)

## 🚀 Goal

A beautifully minimal, local-only desktop and mobile app to automatically detect and redact sensitive information from images (screenshots). The app uses OCR to extract text and then applies automatic redaction using blur or black boxes.

## 🎯 Target Audience

- QA testers
- HR & Legal teams
- Customer support teams
- Product managers
- Freelancers sharing annotated screenshots

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

---

# 📦 Distribution

- macOS (DMG)
- Windows (EXE)
- Linux (AppImage, .deb/.rpm)
- Android (via Tauri Mobile build)
- iOS (TestFlight + App Store, subject to notarization)
