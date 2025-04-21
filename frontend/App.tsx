import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import DropZone from "./components/DropZone";
import ImagePreview from "./components/ImagePreview";
import ActionButtons from "./components/ActionButtons";
import SettingsModal, { EnabledTypesRecord as SettingsEnabledTypesRecord } from "./components/SettingsModal";
import { processImage as processImageApi, checkApiStatus } from "./services/api";
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
  const [viewportHeight, setViewportHeight] = useState<number>(window.innerHeight);
  const [allowListTags, setAllowListTags] = useState<string[]>([]);
  const [denyListTags, setDenyListTags] = useState<string[]>([]);
  const [allowListInput, setAllowListInput] = useState<string>("");
  const [denyListInput, setDenyListInput] = useState<string>("");
  const [regexPatternInput, setRegexPatternInput] = useState<string>("");
  const [customRegexes, setCustomRegexes] = useState<string[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'running' | 'error'>('unknown');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Check if user has a system preference for dark mode
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply dark mode class to body if system prefers dark
    if (prefersDarkMode) {
      document.body.classList.add('dark-mode');
    }
    
    return prefersDarkMode;
  });
  
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
  const [originalFileName, setOriginalFileName] = useState<string>("redacted-image");

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

  // Check API status periodically
  useEffect(() => {
    // Check API status on app load
    const checkApi = async () => {
      try {
        const isRunning = await checkApiStatus();
        if (isRunning) {
          setApiStatus('running');
          setApiError(null);
        } else {
          setApiStatus('error');
          setApiError('Could not connect to the API server');
        }
      } catch (error) {
        setApiStatus('error');
        setApiError('Error checking API status');
      }
    };
    
    // Run the initial check
    checkApi();
    
    // Set up periodic checks (every 10 seconds)
    const intervalId = setInterval(checkApi, 10000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any large data from memory
      cleanupImageData();
    };
  }, []);

  // Function to clean up image data and help GC
  const cleanupImageData = () => {
    try {
      // Clear image state
      if (image) {
        // Revoke any object URLs to prevent memory leaks
        if (image.startsWith('blob:')) {
          URL.revokeObjectURL(image);
        }
        setImage(null);
      }
      
      // Clear redacted image state
      if (redactedImage) {
        // Revoke any object URLs to prevent memory leaks
        if (redactedImage.startsWith('blob:')) {
          URL.revokeObjectURL(redactedImage);
        }
        setRedactedImage(null);
      }
      
      // Suggest garbage collection when browser is idle
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        // @ts-ignore - TypeScript might not know requestIdleCallback
        window.requestIdleCallback(() => {
          console.log("Cleaned up image data");
        });
      }
    } catch (error) {
      console.error("Error cleaning up images:", error);
    }
  };

  // Handle API retry
  const handleApiRetry = async () => {
    setApiStatus('unknown');
    setApiError('Connecting to service...');
    
    // Just check if the API is running - we no longer try to start it
    const isRunning = await checkApiStatus();
    if (isRunning) {
      setApiStatus('running');
      setApiError(null);
    } else {
      setApiStatus('error');
      setApiError('Connection to image processing service failed. Please try again.');
    }
  };

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    
    // Auto-hide toast after 4 seconds
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Clear any previous errors
    setApiError(null);
    
    // Clean up previous image data
    cleanupImageData();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      
      // Only allow image files by extension
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff', '.tif', '.bmp', '.svg', '.dcm'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!imageExtensions.includes(fileExt)) {
        showToast('Only image files are supported', 'error');
        return;
      }
      
      setOriginalFileName(file.name);
      handleImageFile(file);
    }
  };

  // Handle clipboard paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        // Clear any previous errors
        setApiError(null);
        
        const file = e.clipboardData.files[0];
        
        // Allow by MIME type or file extension
        if (file.type.startsWith('image/')) {
          cleanupImageData(); // Clean up previous image data
          handleImageFile(file);
        } else {
          // Check by extension for special formats like DICOM
          const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff', '.tif', '.bmp', '.svg', '.dcm'];
          const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
          if (imageExtensions.includes(fileExt)) {
            cleanupImageData();
            handleImageFile(file);
          } else {
            showToast('Only image files are supported', 'error');
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  // Process image file
  const handleImageFile = (file: File) => {
    // Check API status first
    if (apiStatus === 'error') {
      showToast('Image processing service is not available. Please try again later.', 'error');
      return;
    }

    if (!file.type.match('image.*') && !file.name.endsWith('.dcm')) {
      // Show error for non-image files
      showToast('Only image files are supported', 'error');
      return;
    }
    
    // Check file size - warn if over 5MB to prevent excessive memory usage
    const MAX_FILE_SIZE_MB = 5;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      console.warn(`Large file detected (${(file.size / (1024 * 1024)).toFixed(2)}MB). This may cause performance issues.`);
      showToast(`Large image (${(file.size / (1024 * 1024)).toFixed(1)}MB) may cause slower processing`, 'info');
      // We'll still process it, but warn the user in the console
    }

    // Save the original filename
    setOriginalFileName(file.name);
    
    // Use more memory-efficient approach for FileReader
    const reader = new FileReader();
    
    // Set up completion handler before starting read
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        // Process immediately and then set image state
        // to avoid keeping multiple copies of large strings
        const imageData = e.target.result;
        
        // Set image first so user sees something happening
        setImage(imageData);
        
        // Process the image (this copies the data again, but we need it for display too)
        processImage(imageData);
        
        // Ensure content is scrolled to top when new image is loaded
        window.scrollTo(0, 0);
        
        // Clear the FileReader result to help garbage collection
        reader.onload = null;
        reader.onerror = null;
      }
    };
    
    // Set up error handler
    reader.onerror = () => {
      console.error("FileReader error:", reader.error);
      showToast('Unable to read the selected file', 'error');
      reader.abort();
      reader.onload = null;
      reader.onerror = null;
    };
    
    // Start reading the file
    reader.readAsDataURL(file);
  };

  // Process image with redaction
  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    setApiError(null);
    
    try {
      // Check API status before processing
      if (apiStatus === 'error') {
        throw new Error('The image processing service is unavailable. Please try again later.');
      }
      
      // Create a local copy to avoid keeping reference to the original string
      // which might be referenced in the upper scope
      const imageDataCopy = imageData;
      
      // Log size of data for debugging
      console.log(`Processing image of size: ${(imageDataCopy.length / 1024).toFixed(2)}KB`);
      
      // Create configuration object for Python backend
      const config = {
        enabledTypes,
        redactionMethod,
        allowListTags,
        denyListTags,
        customRegexes
      };
      
      // Call our unified API service that handles both web and Tauri environments
      const result = await processImageApi(imageDataCopy, config);
      
      // Clear references to large data before React re-renders
      // This helps free memory immediately rather than waiting for GC
      const resultImageData = result.redactedImage;
      let resultRedactionCount = 0;
      
      if (result.success) {
        // Clear old redacted image if it exists
        if (redactedImage) {
          URL.revokeObjectURL(redactedImage.startsWith('blob:') ? redactedImage : '');
        }
        
        resultRedactionCount = result.redactionCount;
        
        // Update state with the result
        setRedactedImage(resultImageData);
        setRedactionCount(resultRedactionCount);
      } else {
        console.error("Error processing image:", result.error);
        setApiError(result.error || 'An error occurred while processing the image');
      }
    } catch (error) {
      console.error("Error processing image:", error);
      setApiError(error instanceof Error ? error.message : 'Unable to process the image');
      setApiStatus('error'); // Mark API as having an error if processing fails
    } finally {
      setIsProcessing(false);
      
      // Force garbage collection through reference removal
      // The imageData parameter will be cleaned up by the API service
      try {
        // In browser environments, we rely on JavaScript's garbage collection
        // We've already cleaned up references which is the best we can do
        
        // Allow a moment for React to finish rendering before
        // suggesting garbage collection to the browser
        setTimeout(() => {
          // This sets empty string to any dangling references
          // and suggests to browser it's a good time for GC
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            // @ts-ignore - TypeScript might not know requestIdleCallback
            window.requestIdleCallback(() => {
              console.log("Suggesting cleanup to browser");
            });
          }
        }, 100);
      } catch (e) {
        console.log("Error during cleanup:", e);
      }
    }
  };

  // Handle file selection via button
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      // Clear any previous errors
      setApiError(null);
      
      // Clean up previous image data
      cleanupImageData();
      
      const file = e.target.files[0];
      
      // Only allow image files by extension
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff', '.tif', '.bmp', '.svg', '.dcm'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!imageExtensions.includes(fileExt)) {
        showToast('Only image files are supported', 'error');
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      
      handleImageFile(file);
    }
  };

  // Export redacted image
  const exportImage = async () => {
    if (redactedImage) {
      try {
        // For base64 images, convert to blob for download
        const base64Data = redactedImage.split(';base64,').pop() || '';
        const mimeType = redactedImage.split(';')[0].split(':')[1];
        const blob = await fetch(`data:${mimeType};base64,${base64Data}`).then(res => res.blob());
        
        // Create object URL for the blob
        const blobUrl = URL.createObjectURL(blob);
        
        // Generate the output filename with "-redacted" suffix
        const generateRedactedFilename = (original: string) => {
          // Split filename by last period to separate name and extension
          const lastDotIndex = original.lastIndexOf('.');
          
          if (lastDotIndex === -1) {
            // No extension found
            return `${original}-redacted`;
          }
          
          const name = original.substring(0, lastDotIndex);
          const extension = original.substring(lastDotIndex + 1);
          
          // Don't append -redacted if it's already there
          if (name.endsWith('-redacted')) {
            return original;
          }
          
          return `${name}-redacted.${extension}`;
        };
        
        // Generate the filename
        const fileName = generateRedactedFilename(originalFileName);
        
        // Create link and trigger download
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast-notification ${toastType}`}>
          <div className="toast-content">
            {toastType === 'error' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            )}
            {toastType === 'success' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            )}
            {toastType === 'info' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            )}
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

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
          {apiStatus === 'error' && !toastMessage && (
            <div className="api-error-banner">
              <p>Image processing service is unavailable</p>
              <button onClick={handleApiRetry} className="retry-button">
                Retry Connection
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="content-area" ref={contentRef}>
          {apiError && (
            <div className="api-error-message">
              <p>Error: {apiError}</p>
              {apiStatus === 'error' && (
                <button onClick={handleApiRetry} className="retry-button">
                  Retry Connection
                </button>
              )}
            </div>
          )}
          
          <ImagePreview
            image={image}
            redactedImage={redactedImage}
            isProcessing={isProcessing}
            redactionCount={redactionCount}
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
                
                <p>Redaction complete using the <span className="redaction-method">{redactionMethod === "blur" ? "Blur" : "Black Box"}</span> method. Please verify the result, as not all sensitive data can be automatically detected.</p>

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
