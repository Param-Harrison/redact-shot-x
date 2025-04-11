import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [redactedImage, setRedactedImage] = useState<string | null>(null);
  const [redactionMethod, setRedactionMethod] = useState<"blur" | "box">("blur");
  const [redactionCount, setRedactionCount] = useState<number>(0);
  const [showRedactionCount, setShowRedactionCount] = useState<boolean>(true);
  const [enabledTypes, setEnabledTypes] = useState({
    email: true,
    phone: true,
    creditCard: true,
    address: true,
    name: true,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleImageFile(file);
    }
  };

  // Handle clipboard paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          handleImageFile(file);
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  // Process image file
  const handleImageFile = (file: File) => {
    if (!file.type.match('image.*')) {
      // Show error for non-image files
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        setImage(e.target.result);
        processImage(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Process image with redaction
  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    
    try {
      // In a real implementation, this would call the Tauri backend for OCR and redaction
      // For now, we'll simulate processing with a timeout
      
      setTimeout(() => {
        // Simulate redacted image (in real app this would come from backend)
        setRedactedImage(imageData); // Using same image for demo
        setRedactionCount(Math.floor(Math.random() * 8) + 1); // Random count for demo
        setIsProcessing(false);
      }, 1500);
      
      // Real implementation would be:
      // const result = await invoke("process_image", { 
      //   imageData, 
      //   redactionMethod,
      //   enabledTypes
      // });
      // setRedactedImage(result.redactedImage);
      // setRedactionCount(result.redactionCount);
    } catch (error) {
      console.error("Error processing image:", error);
      setIsProcessing(false);
    }
  };

  // Handle file selection via button
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  };

  // Export redacted image
  const exportImage = async () => {
    // In real implementation, this would use Tauri to save the file
    // For demo purposes, we'll just download the image
    if (redactedImage) {
      const link = document.createElement('a');
      link.href = redactedImage;
      link.download = 'redacted-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Toggle redaction type
  const toggleRedactionType = (type: keyof typeof enabledTypes) => {
    setEnabledTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  return (
    <main className="app-container">
      <header className="app-header">
        <h1>RedactShotX</h1>
        <p className="tagline">Effortlessly redact sensitive information from images</p>
      </header>

      {!image ? (
        <div 
          ref={dropAreaRef}
          className={`drop-area ${isDragging ? 'dragging' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={handleFileSelect}
        >
          <div className="drop-content">
            <div className="drop-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 6V18M12 6L7 11M12 6L17 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 15V16C3 17.6569 4.34315 19 6 19H18C19.6569 19 21 17.6569 21 16V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>Drag & drop image here</h3>
            <p>or click to browse files</p>
            <p className="small">You can also paste images from clipboard (Ctrl+V)</p>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleInputChange} 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
        </div>
      ) : (
        <div className="content-area">
          <div className="image-preview">
            {isProcessing ? (
              <div className="processing-overlay">
                <div className="spinner"></div>
                <p>Processing image...</p>
              </div>
            ) : null}
            <img 
              src={redactedImage || image} 
              alt="Preview" 
              className={isProcessing ? 'processing' : ''}
            />
            {redactedImage && showRedactionCount && (
              <div className="redaction-badge">
                {redactionCount} {redactionCount === 1 ? 'redaction' : 'redactions'} applied
              </div>
            )}
          </div>

          <div className="controls">
            <div className="settings-panel">
              <div className="setting-group">
                <label>Redaction Method</label>
                <div className="toggle-buttons">
                  <button 
                    className={redactionMethod === "blur" ? "active" : ""}
                    onClick={() => setRedactionMethod("blur")}
                  >
                    Blur
                  </button>
                  <button 
                    className={redactionMethod === "box" ? "active" : ""}
                    onClick={() => setRedactionMethod("box")}
                  >
                    Black Box
                  </button>
                </div>
              </div>

              <div className="setting-group">
                <label>PII Detection</label>
                <div className="toggle-options">
                  {Object.entries(enabledTypes).map(([type, enabled]) => (
                    <label key={type} className="toggle-option">
                      <input 
                        type="checkbox" 
                        checked={enabled}
                        onChange={() => toggleRedactionType(type as keyof typeof enabledTypes)}
                      />
                      <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="setting-group">
                <label className="toggle-option">
                  <input 
                    type="checkbox" 
                    checked={showRedactionCount}
                    onChange={() => setShowRedactionCount(!showRedactionCount)}
                  />
                  <span>Show redaction count</span>
                </label>
              </div>
            </div>

            <div className="action-buttons">
              <button 
                className="secondary-button" 
                onClick={() => {
                  setImage(null);
                  setRedactedImage(null);
                }}
              >
                New Image
              </button>
              <button 
                className="primary-button"
                onClick={exportImage}
                disabled={!redactedImage || isProcessing}
              >
                Export Redacted Image
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">
        <div className="footer-content">
          <span className="footer-item">RedactShotX</span>
          <span className="footer-separator">•</span>
          <span className="footer-item">Local-only PII redaction</span>
          <span className="footer-separator">•</span>
          <span className="footer-item">No data leaves your device</span>
        </div>
      </footer>
    </main>
  );
}

export default App;
