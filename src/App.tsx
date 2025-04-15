import { useState, useRef, useEffect } from "react";
import "./App.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import DropZone from "./components/DropZone";
import ImagePreview from "./components/ImagePreview";
import ActionButtons from "./components/ActionButtons";
import SettingsModal, { EnabledTypesRecord as SettingsEnabledTypesRecord } from "./components/SettingsModal";
import { processImage as processImageApi } from "./services/api";
import { API_URL } from "./constants";

// Define the type of enabledTypes for improved type safety
// This is adjusted to match SettingsModal's EnabledTypesRecord type
type EnabledTypesRecord = {
  CUSTOM_REGEX: boolean;
  DENY_LIST: boolean;
  ALLOW_LIST: boolean;
  [key: string]: boolean;
};

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [redactedImage, setRedactedImage] = useState<string | null>(null);
  const [redactionMethod, setRedactionMethod] = useState<"blur" | "box">("blur");
  const [redactionCount, setRedactionCount] = useState<number>(0);
  const [showRedactionCount, setShowRedactionCount] = useState<boolean>(true);
  const [viewportHeight, setViewportHeight] = useState<number>(window.innerHeight);
  const [allowListTags, setAllowListTags] = useState<string[]>([]);
  const [denyListTags, setDenyListTags] = useState<string[]>([]);
  const [allowListInput, setAllowListInput] = useState<string>("");
  const [denyListInput, setDenyListInput] = useState<string>("");
  const [regexPatternInput, setRegexPatternInput] = useState<string>("");
  const [customRegexes, setCustomRegexes] = useState<string[]>([]);
  const [isDicomImage, setIsDicomImage] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Check if user has a system preference for dark mode
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply dark mode class to body if system prefers dark
    if (prefersDarkMode) {
      document.body.classList.add('dark-mode');
    }
    
    return prefersDarkMode;
  });
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Keep only custom types
  const [enabledTypes, setEnabledTypes] = useState<EnabledTypesRecord>({
    // Custom
    CUSTOM_REGEX: false,
    DENY_LIST: false,
    ALLOW_LIST: false,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const allowListInputRef = useRef<HTMLInputElement>(null);
  const denyListInputRef = useRef<HTMLInputElement>(null);
  const regexPatternInputRef = useRef<HTMLInputElement>(null);

  // Enhanced viewport handling for orientation changes
  useEffect(() => {
    const handleResize = () => {
      setViewportHeight(window.innerHeight);
      
      // Set viewport meta tag for mobile devices
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        document.head.appendChild(meta);
      }
    };

    // Initial call
    handleResize();

    // Listen for resize and orientation change
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
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
    setApiError(null);
    
    try {
      // Create configuration object for Python backend
      const config = {
        enabledTypes,
        redactionMethod,
        allowListTags,
        denyListTags,
        customRegexes
      };
      
      // Call our unified API service that handles both web and Tauri environments
      const result = await processImageApi(imageData, config);
      
      if (result.success) {
        setRedactedImage(result.redactedImage);
        setRedactionCount(result.redactionCount);
      } else {
        console.error("Error processing image:", result.error);
        setApiError(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error("Error processing image:", error);
      setApiError(error instanceof Error ? error.message : 'Failed to connect to API server');
    } finally {
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
    if (redactedImage) {
      try {
        // For base64 images, convert to blob for download
        const base64Data = redactedImage.split(';base64,').pop() || '';
        const blob = await fetch(`data:image/png;base64,${base64Data}`).then(res => res.blob());
        
        // Create object URL for the blob
        const blobUrl = URL.createObjectURL(blob);
        
        // Create link and trigger download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = isDicomImage ? 'redacted-image.dcm' : 'redacted-image.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up object URL
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error("Error exporting image:", error);
        alert("Failed to export image. Please try again.");
      }
    }
  };

  // Toggle redaction type
  const toggleRedactionType = (type: keyof SettingsEnabledTypesRecord) => {
    setEnabledTypes(prev => ({
      ...prev,
      [type]: !prev[type as keyof EnabledTypesRecord]
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

  // Add tag to allow list
  const addAllowListTag = () => {
    if (allowListInput.trim() !== '') {
      setAllowListTags([...allowListTags, allowListInput.trim()]);
      setAllowListInput('');
      allowListInputRef.current?.focus();
    }
  };

  // Remove tag from allow list
  const removeAllowListTag = (tagToRemove: string) => {
    setAllowListTags(allowListTags.filter(tag => tag !== tagToRemove));
  };

  // Add tag to deny list
  const addDenyListTag = () => {
    if (denyListInput.trim() !== '') {
      setDenyListTags([...denyListTags, denyListInput.trim()]);
      setDenyListInput('');
      denyListInputRef.current?.focus();
    }
  };

  // Remove tag from deny list
  const removeDenyListTag = (tagToRemove: string) => {
    setDenyListTags(denyListTags.filter(tag => tag !== tagToRemove));
  };

  // Add custom regex pattern
  const addCustomRegex = () => {
    if (regexPatternInput.trim() !== '') {
      setCustomRegexes([...customRegexes, regexPatternInput.trim()]);
      setRegexPatternInput('');
      regexPatternInputRef.current?.focus();
    }
  };

  // Remove custom regex pattern
  const removeCustomRegex = (regexToRemove: string) => {
    setCustomRegexes(customRegexes.filter(regex => regex !== regexToRemove));
  };

  // Handle allow list input key press
  const handleAllowListKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addAllowListTag();
    }
  };

  // Handle deny list input key press
  const handleDenyListKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addDenyListTag();
    }
  };

  // Handle custom regex input key press
  const handleCustomRegexKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomRegex();
    }
  };

  // Open settings modal
  const openSettings = () => {
    setIsSettingsOpen(true);
  };

  // Close settings modal
  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(prevDarkMode => !prevDarkMode);
    // Apply dark mode class to body
    if (!darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  // Listen for system dark mode preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setDarkMode(e.matches);
      if (e.matches) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    };
    
    // Add listener for changes in system dark mode preference
    mediaQuery.addEventListener('change', handleChange);
    
    // Clean up
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return (
    <main className={`app-container ${darkMode ? 'dark-mode' : ''}`} style={{ minHeight: `${viewportHeight}px` }}>
      <Header openSettings={openSettings} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      {!image ? (
        <>
          <DropZone
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            handleDrop={handleDrop}
            handleFileSelect={handleFileSelect}
          />
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleInputChange} 
            accept="image/*,.dcm" 
            style={{ display: 'none' }} 
          />
        </>
      ) : (
        <div className="content-area" ref={contentRef}>
          {apiError && (
            <div className="api-error-message">
              <p>Error: {apiError}</p>
              <p>Make sure the Python API server is running at {API_URL}</p>
            </div>
          )}
          
          <ImagePreview
            image={image}
            redactedImage={redactedImage}
            isProcessing={isProcessing}
            redactionCount={redactionCount}
            showRedactionCount={showRedactionCount}
          />

          <div className="content-summary">
            {redactedImage && (
              <div className="redaction-summary">
                <div className="redaction-summary-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <p>Redaction complete with <span className="redaction-method">{redactionMethod === "blur" ? "Blur" : "Black Box"}</span> method</p>
                
                {redactionCount > 0 ? (
                  <div className="redaction-count">
                    <span className="redaction-count-value">{redactionCount}</span> 
                    {redactionCount === 1 ? 'item' : 'items'} redacted
                  </div>
                ) : (
                  <p className="redaction-count no-items-message">No items detected for redaction</p>
                )}
                
                <button 
                  className="link-button" 
                  onClick={openSettings}
                  aria-label="Customize settings"
                >
                  Customize settings
                </button>
              </div>
            )}
          </div>

          <ActionButtons
            handleNewImage={handleNewImage}
            exportImage={exportImage}
            redactedImage={redactedImage}
            isProcessing={isProcessing}
          />
        </div>
      )}

      <Footer />

      <SettingsModal
        isOpen={isSettingsOpen}
        closeSettings={closeSettings}
        redactionMethod={redactionMethod}
        setRedactionMethod={setRedactionMethod}
        enabledTypes={enabledTypes}
        toggleRedactionType={toggleRedactionType}
        allowListTags={allowListTags}
        denyListTags={denyListTags}
        allowListInput={allowListInput}
        denyListInput={denyListInput}
        regexPatternInput={regexPatternInput}
        setAllowListInput={setAllowListInput}
        setDenyListInput={setDenyListInput}
        setRegexPatternInput={setRegexPatternInput}
        addAllowListTag={addAllowListTag}
        addDenyListTag={addDenyListTag}
        removeAllowListTag={removeAllowListTag}
        removeDenyListTag={removeDenyListTag}
        handleAllowListKeyPress={handleAllowListKeyPress}
        handleDenyListKeyPress={handleDenyListKeyPress}
        allowListInputRef={allowListInputRef}
        denyListInputRef={denyListInputRef}
        regexPatternInputRef={regexPatternInputRef}
        customRegexes={customRegexes}
        addCustomRegex={addCustomRegex}
        removeCustomRegex={removeCustomRegex}
        handleCustomRegexKeyPress={handleCustomRegexKeyPress}
        setCustomRegexes={setCustomRegexes}
        darkMode={darkMode}
      />
    </main>
  );
}

export default App;
