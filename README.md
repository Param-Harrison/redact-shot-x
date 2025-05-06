# 🧼 RedactShotX - Screenshot PII Scrubber

A desktop application that automatically detects and redacts sensitive information from images using OCR and AI-powered detection. Built with Python and React.

## 🎯 Use Cases

- QA testers sharing screenshots
- HR & Legal teams handling sensitive documents
- Customer support teams sharing customer interactions
- Product managers sharing UI mockups
- Freelancers sharing annotated screenshots

## 🌟 Features

- Automatic PII detection in images
- One-click redaction of sensitive data
- Drag-and-drop interface
- Bulk image processing
- System tray integration
- Cross-platform support (macOS, Windows, Linux)

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- Python 3.8+
- pnpm (recommended) or npm

### Development Setup

1. Clone the repository:

```bash
git clone https://github.com/Param-Harrison/redact-shot-x.git
cd redact-shot-x
```

2. Start the development environment:

```bash
./run-dev.sh
```

This script will:

- Set up Python virtual environment
- Install dependencies
- Start the development server
- Launch the application

### Web Development

To run the application in web mode (useful for development and testing):

```bash
./run-web.sh
```

This will:

- Start the backend server on http://localhost:8004
- Start the frontend development server on http://localhost:3000
- Automatically clean up processes when stopped

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript
- **Desktop**: Python + webview
- **Backend**: Python + FastAPI
- **PII Detection**: Microsoft Presidio
- **OCR**: Tesseract

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Proprietary
