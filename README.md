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

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- Python 3.8+
- npm or yarn

### Running Locally

1. Clone the repository:

```bash
git clone https://github.com/Param-Harrison/redact-shot-x.git
cd redact-shot-x
```

2. Run the development environment:

```bash
./run-dev.sh
```

This will:

- Set up a Python virtual environment
- Install all dependencies
- Start the development server
- Launch the application

### Building for Production

#### macOS

```bash
python3 build.py --target mac
```

#### Windows

```bash
./scripts/build-win.sh
```

#### Linux

```bash
./scripts/build-linux.sh
```

The built binaries will be available in:

- macOS: `dist/RedactShotX.app`
- Windows: `dist-win/RedactShotX.exe`
- Linux: `dist-linux/RedactShotX`

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript
- **Desktop Wrapper**: Tauri (Rust)
- **Backend API**: Python, FastAPI
- **Redaction Engine**: Microsoft Presidio
- **OCR**: Tesseract (via Presidio)
- **Python Packaging**: PyInstaller for creating standalone executables

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Proprietary
