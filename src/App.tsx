import { useState, useRef, useEffect } from "react";
import "./App.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import DropZone from "./components/DropZone";
import ImagePreview from "./components/ImagePreview";
import ActionButtons from "./components/ActionButtons";
import SettingsModal, { EnabledTypesRecord as SettingsEnabledTypesRecord } from "./components/SettingsModal";

// Define the type of enabledTypes for improved type safety
// This is adjusted to match SettingsModal's EnabledTypesRecord type
type EnabledTypesRecord = {
  PERSON: boolean;
  EMAIL_ADDRESS: boolean;
  PHONE_NUMBER: boolean;
  URL: boolean;
  US_SSN: boolean;
  US_ITIN: boolean;
  US_PASSPORT: boolean;
  CREDIT_CARD: boolean;
  IBAN_CODE: boolean;
  IP_ADDRESS: boolean;
  MAC_ADDRESS: boolean;
  US_BANK_ACCOUNT: boolean;
  US_BANK_ROUTING: boolean;
  STREET_ADDRESS: boolean;
  ZIPCODE: boolean;
  LOCATION: boolean;
  DATE: boolean;
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
  const [useContextEnhancement, setUseContextEnhancement] = useState<boolean>(true);
  const [selectedTab, setSelectedTab] = useState<"redaction" | "advanced">("redaction");
  const [isDicomImage, setIsDicomImage] = useState<boolean>(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  
  // Updated PII types based on Microsoft Presidio's supported entities
  const [enabledTypes, setEnabledTypes] = useState<EnabledTypesRecord>({
    // Common PII types
    PERSON: true,
    EMAIL_ADDRESS: true,
    PHONE_NUMBER: true,
    CREDIT_CARD: true,
    US_SSN: true,
    
    // Location entities
    LOCATION: true,
    STREET_ADDRESS: true, // Changed from ADDRESS to STREET_ADDRESS
    ZIPCODE: false,
    
    // Financial
    IBAN_CODE: true,
    US_BANK_ACCOUNT: true, // Changed from US_BANK_NUMBER
    US_BANK_ROUTING: false,
    
    // Identification
    US_DRIVER_LICENSE: true,
    US_PASSPORT: true,
    US_ITIN: true,

    // Date & Time
    DATE: true, // Changed from DATE_TIME
    
    // Advanced (disabled by default)
    IP_ADDRESS: false,
    MAC_ADDRESS: false,
    DOMAIN_NAME: false,
    URL: false,
    NRP: false, // National Provider Identifier
    MEDICAL_LICENSE: false,
    
    // Custom
    CUSTOM_REGEX: false,
    DENY_LIST: false,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const allowListInputRef = useRef<HTMLInputElement>(null);
  const denyListInputRef = useRef<HTMLInputElement>(null);
  const regexPatternInputRef = useRef<HTMLInputElement>(null);

  // Tooltip definitions
  const tooltips = {
    redactionMethod: "Choose how sensitive information will be hidden in the image",
    allowList: "Words in this list will never be redacted, even if they match a PII pattern",
    denyList: "Words in this list will always be redacted, regardless of whether they match a PII pattern",
    contextEnhancement: "Analyzes surrounding text to improve accuracy of PII detection",
    customRegex: "Create your own pattern to detect specific types of information",
    redactionCount: "Display the number of sensitive items redacted in the image",
    person: "Detects names of individuals",
    emailAddress: "Detects email addresses like name@example.com",
    phoneNumber: "Detects phone numbers in various formats",
    creditCard: "Detects credit card numbers",
    usSsn: "Detects US Social Security Numbers",
    location: "Detects location names like cities, states, countries",
    address: "Detects physical street addresses",
    financial: "Detects financial account numbers",
    identification: "Detects ID document numbers",
    dateTime: "Detects dates and times",
    advanced: "Less common PII types that are off by default",
  };

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

  // Show tooltip
  const showTooltip = (tooltipId: string) => {
    setActiveTooltip(tooltipId);
  };

  // Hide tooltip
  const hideTooltip = () => {
    setActiveTooltip(null);
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
                <p>Redaction complete with <strong>{redactionMethod}</strong> method</p>
                {redactionCount > 0 && (
                  <p className="redaction-count">
                    {redactionCount} {redactionCount === 1 ? 'item' : 'items'} redacted
                  </p>
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
        showRedactionCount={showRedactionCount}
        setShowRedactionCount={setShowRedactionCount}
        allowListTags={allowListTags}
        denyListTags={denyListTags}
        allowListInput={allowListInput}
        denyListInput={denyListInput}
        regexPatternInput={regexPatternInput}
        useContextEnhancement={useContextEnhancement}
        isDicomImage={isDicomImage}
        setAllowListInput={setAllowListInput}
        setDenyListInput={setDenyListInput}
        setRegexPatternInput={setRegexPatternInput}
        setUseContextEnhancement={setUseContextEnhancement}
        addAllowListTag={addAllowListTag}
        addDenyListTag={addDenyListTag}
        removeAllowListTag={removeAllowListTag}
        removeDenyListTag={removeDenyListTag}
        handleAllowListKeyPress={handleAllowListKeyPress}
        handleDenyListKeyPress={handleDenyListKeyPress}
        allowListInputRef={allowListInputRef}
        denyListInputRef={denyListInputRef}
        regexPatternInputRef={regexPatternInputRef}
        activeTooltip={activeTooltip}
        showTooltip={showTooltip}
        hideTooltip={hideTooltip}
        tooltips={tooltips}
        selectedTab={selectedTab}
        setSelectedTab={setSelectedTab}
        customRegexes={[]}
        setCustomRegexes={() => {}}
        darkMode={darkMode}
      />
    </main>
  );
}

export default App;
