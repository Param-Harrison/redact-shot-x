import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import DropZone from "./components/DropZone";
import ImagePreview from "./components/ImagePreview";
import ActionButtons from "./components/ActionButtons";
import SettingsModal, { EnabledTypesRecord } from "./components/SettingsModal";
import { processImage as processImageApi, checkApiStatus, processBulkImages as processBulkImagesApi } from "./services/api";
import { API_URL, FEATURES } from "./constants";

// Define the type of enabledTypes for improved type safety
type ToastType = 'success' | 'error' | 'info' | 'warning';

// Existing interface for RedactedRegions
interface RedactedRegion {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [redactedImage, setRedactedImage] = useState<string | null>(null);
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
  const [toastType, setToastType] = useState<ToastType>('info');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Check if user has a system preference for dark mode
    const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply dark mode class to body if system prefers dark
    if (prefersDarkMode) {
      document.body.classList.add('dark-mode');
    }
    
    return prefersDarkMode;
  });
  const redactionMethod = "blur"; // For now, we only support blur redaction
  
  // Create state for redaction settings
  const [enabledTypes, setEnabledTypes] = useState<EnabledTypesRecord>({
    PHONE_NUMBER: true,
    EMAIL_ADDRESS: true,
    CREDIT_CARD: true,
    US_SSN: true,
    URL: true,
    LOCATION: true,
    PERSON: true,
    DATE_TIME: true,
    US_PASSPORT: true,
    IP_ADDRESS: true,
    BANK_ROUTING: true,
    US_DRIVER_LICENSE: true,
    CRYPTO_ADDRESS: true,
    
    // These are optional by default
    ORGANIZATION: false,
    US_ITIN: false,
    US_BANK_NUMBER: false,
    IBAN_CODE: false,
    
    // Custom settings that need additional input
    CUSTOM_REGEX: false,
    DENY_LIST: false,
    ALLOW_LIST: false,
    BULK_UPLOAD: FEATURES.ENABLE_BULK_UPLOAD, // Initialize from feature flag
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const allowListInputRef = useRef<HTMLInputElement>(null);
  const denyListInputRef = useRef<HTMLInputElement>(null);
  const regexPatternInputRef = useRef<HTMLInputElement>(null);
  const [originalFileName, setOriginalFileName] = useState<string>("redacted-image");
  const [bulkImages, setBulkImages] = useState<{file: File, processed: boolean, result?: any}[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState<boolean>(false);

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
  const showToast = (message: string, type: ToastType = 'info') => {
    setToastMessage(message);
    setToastType(type === 'warning' ? 'info' : type); // Handle warning as info for now
    
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
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Handle bulk upload
      if (FEATURES.ENABLE_BULK_UPLOAD && e.dataTransfer.files.length > 1) {
        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => {
          // Filter for image files by extension
          const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff', '.tif', '.bmp', '.svg', '.dcm'];
          const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
          return imageExtensions.includes(fileExt) || file.type.startsWith('image/');
        });
        
        if (imageFiles.length === 0) {
          showToast('No valid image files found', 'error');
          return;
        }
        
        handleBulkImages(imageFiles);
        return;
      }
      
      // Single file handling (existing logic)
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
    
    // Additional validation for common image formats
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff', 'image/bmp', 'image/svg+xml'];
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff', '.tif', '.bmp', '.svg', '.dcm'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    // Skip validation for DICOM files which often don't have a proper MIME type
    if (!fileExt.endsWith('.dcm') && !validImageTypes.includes(file.type) && !imageExtensions.includes(fileExt)) {
      showToast('This file may not be a supported image format', 'warning');
      // Continue anyway, but warn the user
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
    // If image data is null, show error
    if (!imageData) {
      showToast('No image data to process', 'error');
      return;
    }
    
    setIsProcessing(true);
    setApiError(null);
    setRedactedImage(null);

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
      
      // Call our unified API service that handles both web and Tauri environments
      const result = await processImageApi(imageDataCopy, {
        // Which PII types to detect and redact
        enabledTypes: enabledTypes,
        // Allow list (terms to preserve)
        allowListTags: enabledTypes.ALLOW_LIST ? allowListTags : [],
        // Deny list (terms to always redact)
        denyListTags: enabledTypes.DENY_LIST ? denyListTags : [],
        // Custom regex patterns
        customRegexes: enabledTypes.CUSTOM_REGEX ? customRegexes : [],
        // Add the partial matching setting
        partialMatch: true,
        // Redaction method
        redactionMethod: "blur"
      });
      
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
        
        // Handle specific error cases
        const errorMsg = result.error || '';
        if (errorMsg.includes("cannot identify image file")) {
          setApiError("This file appears to be an unsupported or corrupted image format. Please try a different image or convert it to a common format like PNG or JPG.");
          showToast("Unsupported or corrupted image format", "error");
        } else {
          setApiError(errorMsg || 'An error occurred while processing the image');
        }
      }
    } catch (error) {
      console.error("Error processing image:", error);
      
      // Handle specific error messages
      const errorMsg = error instanceof Error ? error.message : 'Unable to process the image';
      if (errorMsg.includes("cannot identify image file")) {
        setApiError("This file appears to be an unsupported or corrupted image format. Please try a different image or convert it to a common format like PNG or JPG.");
        showToast("Unsupported or corrupted image format", "error");
      } else {
        setApiError(errorMsg);
      }
      
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
    if (e.target.files && e.target.files.length > 0) {
      // Clear any previous errors
      setApiError(null);
      
      // Clean up previous image data
      cleanupImageData();
      
      // Handle bulk upload
      if (FEATURES.ENABLE_BULK_UPLOAD && e.target.files.length > 1) {
        const files = Array.from(e.target.files);
        const imageFiles = files.filter(file => {
          // Filter for image files by extension
          const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff', '.tif', '.bmp', '.svg', '.dcm'];
          const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
          return imageExtensions.includes(fileExt) || file.type.startsWith('image/');
        });
        
        if (imageFiles.length === 0) {
          showToast('No valid image files found', 'error');
          // Reset the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
        
        handleBulkImages(imageFiles);
        return;
      }
      
      // Single file handling (existing logic)
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
        
        // Check if we're running in pywebview
        if (typeof window !== 'undefined' && 'pywebview' in window) {
          // Using pywebview API to save file
          try {
            // @ts-ignore - TypeScript doesn't know about pywebview
            window.pywebview.api.save_file({
              filename: fileName,
              data: base64Data,
              mimeType: mimeType
            }).then((result: any) => {
              if (result && result.success) {
                showToast("File saved successfully", "success");
              } else {
                showToast("Failed to save file", "error");
              }
            }).catch((error: any) => {
              console.error("Error saving file via pywebview:", error);
              fallbackDownload();
            });
          } catch (error) {
            console.error("Error calling pywebview API:", error);
            fallbackDownload();
          }
        } else {
          // Standard browser download as fallback
          fallbackDownload();
        }
        
        // Fallback to browser download method
        function fallbackDownload() {
          // Convert base64 to blob without using Buffer
          const byteCharacters = atob(base64Data);
          const byteArrays: Uint8Array[] = [];
          
          for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }
          
          const blob = new Blob(byteArrays, { type: mimeType });
          const blobUrl = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          
          document.body.appendChild(link);
          setTimeout(() => {
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
              URL.revokeObjectURL(blobUrl);
            }, 100);
          }, 0);
        }
      } catch (error) {
        console.error("Error exporting image:", error);
        showToast("Failed to export image. Please try again.", "error");
      }
    }
  };

  // Toggle redaction type
  const toggleRedactionType = (type: keyof EnabledTypesRecord) => {
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

  // Handle bulk image processing
  const handleBulkImages = (files: File[]) => {
    // Check API status first
    if (apiStatus === 'error') {
      showToast('Image processing service is not available. Please try again later.', 'error');
      return;
    }
    
    setBulkImages(files.map(file => ({ file, processed: false })));
    setIsBulkProcessing(true);
    
    // Process images one by one or use the bulk API endpoint
    processBulkImages(files);
  };
  
  // Process multiple images using the bulk API
  const processBulkImages = async (files: File[]) => {
    try {
      setIsProcessing(true);
      
      // Create config object with available state variables
      const config = {
        redactionMethod: "blur",
        enabledTypes: enabledTypes,
        customRegexes: customRegexes,
        allowListTags: allowListTags,
        denyListTags: denyListTags,
        partialMatch: true
      };
      
      // Use the API service
      const result = await processBulkImagesApi(files, config);
      
      // Update state with results
      if (result.results) {
        setBulkImages(prevImages => 
          prevImages.map(img => {
            const resultItem = result.results.find((r: any) => r.filename === img.file.name);
            if (resultItem) {
              return { ...img, processed: true, result: resultItem };
            }
            return img;
          })
        );
        
        // Show summary toast
        const successCount = result.results.filter((r: any) => r.success).length;
        showToast(`Processed ${successCount} of ${files.length} images`, 'success');
      }
    } catch (error) {
      console.error("Error processing bulk images:", error);
      showToast('Failed to process images. Please try again.', 'error');
    } finally {
      setIsProcessing(false);
      setIsBulkProcessing(false);
    }
  };
  
  // Component for displaying bulk processed images
  const BulkImageGallery = () => {
    if (!bulkImages.length) return null;
    
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    
    const downloadImage = async (img: typeof bulkImages[0]) => {
      if (!img.processed || !img.result?.success || !img.result.redactedImage) return;
      
      try {
        // For base64 images, convert to blob for download
        const base64Data = img.result.redactedImage.split(';base64,').pop() || '';
        const mimeType = img.result.redactedImage.split(';')[0].split(':')[1];
        
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
        const fileName = generateRedactedFilename(img.file.name);
        
        // Check if we're running in pywebview
        if (typeof window !== 'undefined' && 'pywebview' in window) {
          // Using pywebview API to save file
          try {
            // @ts-ignore - TypeScript doesn't know about pywebview
            window.pywebview.api.save_file({
              filename: fileName,
              data: base64Data,
              mimeType: mimeType
            }).then((result: any) => {
              if (result && result.success) {
                showToast("File saved successfully", "success");
              } else {
                showToast("Failed to save file", "error");
              }
            }).catch((error: any) => {
              console.error("Error saving file via pywebview:", error);
              showToast("Error saving file", "error");
            });
          } catch (error) {
            console.error("Error calling pywebview API:", error);
            fallbackDownload();
          }
        } else {
          // Standard browser download as fallback
          fallbackDownload();
        }
        
        // Fallback to browser download method
        function fallbackDownload() {
          // Convert base64 to blob without using Buffer
          const byteCharacters = atob(base64Data);
          const byteArrays: Uint8Array[] = [];
          
          for (let offset = 0; offset < byteCharacters.length; offset += 512) {
            const slice = byteCharacters.slice(offset, offset + 512);
            
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
              byteNumbers[i] = slice.charCodeAt(i);
            }
            
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
          }
          
          const blob = new Blob(byteArrays, { type: mimeType });
          const blobUrl = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          
          document.body.appendChild(link);
          setTimeout(() => {
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
              URL.revokeObjectURL(blobUrl);
            }, 100);
          }, 0);
        }
      } catch (error) {
        console.error("Error exporting image:", error);
        showToast("Failed to export image. Please try again.", "error");
      }
    };
    
    const downloadAllImages = async () => {
      const successImages = bulkImages.filter(img => 
        img.processed && img.result?.success && img.result.redactedImage
      );
      
      if (successImages.length === 0) return;
      
      // Show toast with download progress
      showToast(`Downloading ${successImages.length} images...`, 'info');
      
      // Check if we're running in pywebview
      if (typeof window !== 'undefined' && 'pywebview' in window) {
        try {
          // Prepare the data for bulk download
          const files = successImages.map(img => {
            const base64Data = img.result.redactedImage.split(';base64,').pop() || '';
            const mimeType = img.result.redactedImage.split(';')[0].split(':')[1];
            
            // Generate filename
            const lastDotIndex = img.file.name.lastIndexOf('.');
            const name = lastDotIndex === -1 ? img.file.name : img.file.name.substring(0, lastDotIndex);
            const extension = lastDotIndex === -1 ? '' : img.file.name.substring(lastDotIndex + 1);
            const fileName = name.endsWith('-redacted') ? img.file.name : `${name}-redacted.${extension}`;
            
            return {
              filename: fileName,
              data: base64Data,
              mimeType: mimeType
            };
          });
          
          // @ts-ignore - TypeScript doesn't know about pywebview
          window.pywebview.api.save_files(files).then((result: any) => {
            if (result && result.success) {
              showToast(`Downloaded ${result.count || successImages.length} images successfully`, 'success');
            } else {
              showToast("Failed to save some files", "error");
            }
          }).catch((error: any) => {
            console.error("Error saving files via pywebview:", error);
            showToast("Error saving files", "error");
          });
        } catch (error) {
          console.error("Error calling pywebview API:", error);
          // Fall back to processing each image separately
          processImagesSequentially();
        }
      } else {
        // Standard browser download as fallback
        processImagesSequentially();
      }
      
      // Helper function to process images one by one
      async function processImagesSequentially() {
        // Process each image sequentially with a delay to avoid browser issues
        for (let i = 0; i < successImages.length; i++) {
          const img = successImages[i];
          await downloadImage(img);
          
          // Add a short delay between downloads for browser to process
          if (i < successImages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300)); 
          }
        }
        
        showToast(`Downloaded ${successImages.length} images successfully`, 'success');
      }
    };
    
    const clearGallery = () => {
      setBulkImages([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    
    return (
      <div className="bulk-image-gallery">
        <div className="gallery-header">
          <h2>Processed Images ({bulkImages.filter(img => img.processed && img.result?.success).length}/{bulkImages.length})</h2>
          <div className="gallery-actions">
            <button 
              className="secondary-button" 
              onClick={clearGallery}
            >
              Clear All
            </button>
            {bulkImages.some(img => img.processed && img.result?.success) && (
              <button 
                className="primary-button" 
                onClick={downloadAllImages}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download All
              </button>
            )}
          </div>
        </div>
        
        <div className="gallery-grid">
          {bulkImages.map((img, index) => (
            <div 
              key={index} 
              className={`gallery-item ${img.processed ? (img.result?.success ? 'success' : 'error') : 'processing'}`}
            >
              <div className="item-header">
                <span className="item-filename" title={img.file.name}>{img.file.name}</span>
                <span className="item-status">
                  {!img.processed ? 'Processing...' : 
                    (img.result?.success ? 
                      `${img.result.redactionCount || 0} redactions` : 
                      'Failed')}
                </span>
              </div>
              
              {img.processed && img.result?.success && img.result.redactedImage && (
                <div 
                  className="item-preview"
                  onClick={() => setSelectedImage(img.result.redactedImage)}
                >
                  <img 
                    src={img.result.redactedImage} 
                    alt={`Redacted ${img.file.name}`} 
                  />
                  <div className="preview-overlay">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      <line x1="11" y1="8" x2="11" y2="14"></line>
                      <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                  </div>
                </div>
              )}
              
              {img.processed && !img.result?.success && (
                <div className="item-error">
                  {img.result?.error || 'Processing failed'}
                </div>
              )}
              
              {!img.processed && (
                <div className="item-loading">
                  <div className="spinner"></div>
                </div>
              )}
              
              {img.processed && img.result?.success && (
                <div className="item-actions">
                  <button 
                    className="primary-button" 
                    onClick={() => downloadImage(img)}
                    disabled={!img.result.redactedImage}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {isProcessing && (
          <div className="processing-status">
            <div className="spinner"></div>
            <p>Processing {bulkImages.filter(img => !img.processed).length} remaining images...</p>
          </div>
        )}
        
        {/* Image Preview Modal */}
        {selectedImage && (
          <div 
            className="image-preview-modal"
            onClick={() => setSelectedImage(null)}
            onKeyDown={(e) => e.key === 'Escape' && setSelectedImage(null)}
            tabIndex={0} // Make it focusable to receive keyboard events
            role="dialog"
            aria-modal="true"
            aria-label="Image preview"
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button 
                className="close-button"
                onClick={() => setSelectedImage(null)}
                aria-label="Close preview"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <img src={selectedImage} alt="Preview" />
              <div className="preview-instructions">Click anywhere outside or press ESC to close</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Sync the bulk upload feature flag with enabledTypes state
  useEffect(() => {
    // Update the feature flag when enabledTypes.BULK_UPLOAD changes
    FEATURES.ENABLE_BULK_UPLOAD = enabledTypes.BULK_UPLOAD;
  }, [enabledTypes.BULK_UPLOAD]);

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

      <div className="app-content">
        {!image && bulkImages.length === 0 ? (
          <>
            <DropZone
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              handleDrop={handleDrop}
              handleFileSelect={handleFileSelect}
              acceptedFileTypes="image/*,.dcm"
              showToast={showToast}
              multiple={FEATURES.ENABLE_BULK_UPLOAD}
            />
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleInputChange} 
              accept="image/*,.dcm" 
              style={{ display: 'none' }}
              multiple={FEATURES.ENABLE_BULK_UPLOAD}
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
        ) : bulkImages.length > 0 ? (
          <BulkImageGallery />
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
      </div>

      <Footer />

      <SettingsModal 
        isOpen={isSettingsOpen}
        closeSettings={closeSettings}
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
        darkMode={darkMode}
      />
    </main>
  );
}

export default App;
