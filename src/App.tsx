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
  const [viewportHeight, setViewportHeight] = useState<number>(window.innerHeight);
  const [allowList, setAllowList] = useState<string>("");
  const [useContextEnhancement, setUseContextEnhancement] = useState<boolean>(true);
  const [selectedTab, setSelectedTab] = useState<"redaction" | "advanced">("redaction");
  const [isDicomImage, setIsDicomImage] = useState<boolean>(false);
  
  // Updated PII types based on Microsoft Presidio's supported entities
  const [enabledTypes, setEnabledTypes] = useState({
    // Common PII types
    PERSON: true,
    EMAIL_ADDRESS: true,
    PHONE_NUMBER: true,
    CREDIT_CARD: true,
    US_SSN: true,
    
    // Location entities
    LOCATION: true,
    ADDRESS: true,
    
    // Financial
    IBAN_CODE: true,
    US_BANK_NUMBER: true,
    
    // Identification
    US_DRIVER_LICENSE: true,
    US_PASSPORT: true,
    US_ITIN: true,

    // Date & Time
    DATE_TIME: true,
    
    // Advanced (disabled by default)
    IP_ADDRESS: false,
    DOMAIN_NAME: false,
    URL: false,
    NRP: false, // National Provider Identifier
    MEDICAL_LICENSE: false,
    
    // Custom
    CUSTOM_REGEX: false,
    DENY_LIST: false,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const allowListRef = useRef<HTMLTextAreaElement>(null);
  const [customRegex, setCustomRegex] = useState<string>("");
  const [denyList, setDenyList] = useState<string>("");

  // Handle viewport size changes
  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    if (!file.type.match('image.*') && !file.name.endsWith('.dcm')) {
      // Show error for non-image files
      return;
    }

    // Check if it's a DICOM image
    setIsDicomImage(file.name.endsWith('.dcm'));

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        setImage(e.target.result);
        processImage(e.target.result);
        
        // Ensure content is scrolled to top when new image is loaded
        window.scrollTo(0, 0);
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
      //   enabledTypes,
      //   allowList: allowList.split('\n').filter(item => item.trim() !== ''),
      //   useContextEnhancement,
      //   isDicomImage,
      //   customRegex: customRegex.trim() !== '' ? customRegex : undefined,
      //   denyList: denyList.split('\n').filter(item => item.trim() !== '')
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
      link.download = isDicomImage ? 'redacted-image.dcm' : 'redacted-image.png';
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

  // Handle reset to upload new image
  const handleNewImage = () => {
    setImage(null);
    setRedactedImage(null);
    setRedactionCount(0);
    setIsDicomImage(false);
    // Reset scroll position
    window.scrollTo(0, 0);
  };

  // Group PII types for better UI organization
  const commonPiiTypes = ['PERSON', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'CREDIT_CARD', 'US_SSN'];
  const locationPiiTypes = ['LOCATION', 'ADDRESS'];
  const financialPiiTypes = ['IBAN_CODE', 'US_BANK_NUMBER'];
  const idPiiTypes = ['US_DRIVER_LICENSE', 'US_PASSPORT', 'US_ITIN'];
  const advancedPiiTypes = ['IP_ADDRESS', 'DOMAIN_NAME', 'URL', 'NRP', 'MEDICAL_LICENSE', 'DATE_TIME'];
  const customPiiTypes = ['CUSTOM_REGEX', 'DENY_LIST'];

  // Format PII type name for display
  const formatPiiType = (type: string): string => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <main className="app-container" style={{ minHeight: `${viewportHeight}px` }}>
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
            <p className="small">Supports PNG, JPG, JPEG, WebP, TIFF, and DICOM (.dcm) formats</p>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleInputChange} 
            accept="image/*,.dcm" 
            style={{ display: 'none' }} 
          />
        </div>
      ) : (
        <div className="content-area" ref={contentRef}>
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
            <div className="settings-tabs">
              <button 
                className={selectedTab === "redaction" ? "tab-active" : ""}
                onClick={() => setSelectedTab("redaction")}
              >
                Redaction
              </button>
              <button 
                className={selectedTab === "advanced" ? "tab-active" : ""}
                onClick={() => setSelectedTab("advanced")}
              >
                Advanced
              </button>
      </div>
            
            <div className="settings-panel">
              {selectedTab === "redaction" && (
                <>
                  <div className="setting-group">
                    <label>Redaction Method</label>
                    <div className="toggle-buttons">
                      <button 
                        className={redactionMethod === "blur" ? "active" : ""}
                        onClick={() => setRedactionMethod("blur")}
                        aria-pressed={redactionMethod === "blur"}
                      >
                        Blur
                      </button>
                      <button 
                        className={redactionMethod === "box" ? "active" : ""}
                        onClick={() => setRedactionMethod("box")}
                        aria-pressed={redactionMethod === "box"}
                      >
                        Black Box
                      </button>
                    </div>
                  </div>

                  <div className="setting-group">
                    <label className="toggle-option">
                      <input 
                        type="checkbox" 
                        checked={showRedactionCount}
                        onChange={() => setShowRedactionCount(!showRedactionCount)}
                        aria-label="Toggle redaction count display"
                      />
                      <span>Show redaction count</span>
                    </label>
                  </div>

                  <div className="setting-group">
                    <label>Common PII Detection</label>
                    <div className="toggle-options">
                      {commonPiiTypes.map((type) => (
                        <label key={type} className="toggle-option">
                          <input 
                            type="checkbox" 
                            checked={enabledTypes[type as keyof typeof enabledTypes]}
                            onChange={() => toggleRedactionType(type as keyof typeof enabledTypes)}
                            aria-label={`Toggle ${type} detection`}
                          />
                          <span>{formatPiiType(type)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="setting-group">
                    <label>Location Information</label>
                    <div className="toggle-options">
                      {locationPiiTypes.map((type) => (
                        <label key={type} className="toggle-option">
                          <input 
                            type="checkbox" 
                            checked={enabledTypes[type as keyof typeof enabledTypes]}
                            onChange={() => toggleRedactionType(type as keyof typeof enabledTypes)}
                            aria-label={`Toggle ${type} detection`}
                          />
                          <span>{formatPiiType(type)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="setting-group">
                    <label>Financial Information</label>
                    <div className="toggle-options">
                      {financialPiiTypes.map((type) => (
                        <label key={type} className="toggle-option">
                          <input 
                            type="checkbox" 
                            checked={enabledTypes[type as keyof typeof enabledTypes]}
                            onChange={() => toggleRedactionType(type as keyof typeof enabledTypes)}
                            aria-label={`Toggle ${type} detection`}
                          />
                          <span>{formatPiiType(type)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="setting-group">
                    <label>Identification Documents</label>
                    <div className="toggle-options">
                      {idPiiTypes.map((type) => (
                        <label key={type} className="toggle-option">
                          <input 
                            type="checkbox" 
                            checked={enabledTypes[type as keyof typeof enabledTypes]}
                            onChange={() => toggleRedactionType(type as keyof typeof enabledTypes)}
                            aria-label={`Toggle ${type} detection`}
                          />
                          <span>{formatPiiType(type)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedTab === "advanced" && (
                <>
                  <div className="setting-group">
                    <label>Allow List (Exempted Terms)</label>
                    <textarea
                      ref={allowListRef}
                      value={allowList}
                      onChange={(e) => setAllowList(e.target.value)}
                      placeholder="Enter terms to exempt from redaction (one per line)"
                      className="text-input"
                      rows={4}
                    />
                    <p className="input-hint">Terms in this list will not be redacted even if they match PII patterns</p>
                  </div>

                  <div className="setting-group">
                    <label className="toggle-option">
                      <input 
                        type="checkbox" 
                        checked={useContextEnhancement}
                        onChange={() => setUseContextEnhancement(!useContextEnhancement)}
                        aria-label="Toggle context enhancement"
                      />
                      <span>Use context for better detection</span>
                    </label>
                    <p className="input-hint">Uses surrounding text to improve PII detection accuracy</p>
                  </div>

                  <div className="setting-group">
                    <label>Advanced PII Types</label>
                    <div className="toggle-options">
                      {advancedPiiTypes.map((type) => (
                        <label key={type} className="toggle-option">
                          <input 
                            type="checkbox" 
                            checked={enabledTypes[type as keyof typeof enabledTypes]}
                            onChange={() => toggleRedactionType(type as keyof typeof enabledTypes)}
                            aria-label={`Toggle ${type} detection`}
                          />
                          <span>{formatPiiType(type)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="setting-group">
                    <label>Custom PII Detection</label>
                    <div className="toggle-options">
                      {customPiiTypes.map((type) => (
                        <label key={type} className="toggle-option">
        <input
                            type="checkbox" 
                            checked={enabledTypes[type as keyof typeof enabledTypes]}
                            onChange={() => toggleRedactionType(type as keyof typeof enabledTypes)}
                            aria-label={`Toggle ${type} detection`}
                          />
                          <span>{formatPiiType(type)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {enabledTypes.CUSTOM_REGEX && (
                    <div className="setting-group">
                      <label>Custom Regex Pattern</label>
                      <textarea
                        value={customRegex}
                        onChange={(e) => setCustomRegex(e.target.value)}
                        placeholder="e.g., Project-\d{4}-\d{2}"
                        className="text-input"
                        rows={2}
                      />
                      <p className="input-hint">Use standard regex patterns to detect custom PII</p>
                    </div>
                  )}

                  {enabledTypes.DENY_LIST && (
                    <div className="setting-group">
                      <label>Deny List (Custom Terms)</label>
                      <textarea
                        value={denyList}
                        onChange={(e) => setDenyList(e.target.value)}
                        placeholder="Enter terms to always redact (one per line)"
                        className="text-input"
                        rows={4}
                      />
                      <p className="input-hint">Terms in this list will always be redacted</p>
                    </div>
                  )}

                  {isDicomImage && (
                    <div className="setting-group alert-box">
                      <h4>DICOM Image Detected</h4>
                      <p>Only pixel data will be redacted. DICOM metadata should be processed separately for complete de-identification.</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="action-buttons">
              <button 
                className="secondary-button" 
                onClick={handleNewImage}
                aria-label="Upload a new image"
              >
                New Image
              </button>
              <button 
                className="primary-button"
                onClick={exportImage}
                disabled={!redactedImage || isProcessing}
                aria-label="Export redacted image"
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
