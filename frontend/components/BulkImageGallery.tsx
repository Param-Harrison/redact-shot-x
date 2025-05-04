import React, { useState } from 'react';
import ImagePreviewModal from './ImagePreviewModal';
import { applyManualBlur } from '../utils/imageUtils';

interface BulkImage {
  file: File;
  processed: boolean;
  result?: {
    success: boolean;
    redactedImage?: string;
    originalRedactedImage?: string;
    error?: string;
    redactionCount?: number;
  };
}

interface BulkImageGalleryProps {
  bulkImages: BulkImage[];
  setBulkImages: React.Dispatch<React.SetStateAction<BulkImage[]>>;
  isProcessing: boolean;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onApplyBlur?: (imageData: string, maskData: string, maskSize: number) => void;
}

const BulkImageGallery: React.FC<BulkImageGalleryProps> = ({
  bulkImages,
  setBulkImages,
  isProcessing,
  showToast,
  onApplyBlur
}) => {
  if (!bulkImages.length) return null;
  
  const [selectedImage, setSelectedImage] = useState<BulkImage | null>(null);
  
  const downloadImage = async (img: BulkImage) => {
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
        try {
          // @ts-ignore - TypeScript doesn't know about pywebview
          const result = await window.pywebview.api.save_file(fileName, base64Data, mimeType);
          if (result && result.success) {
            showToast('Image downloaded successfully', 'success');
          } else {
            throw new Error('Failed to save file');
          }
        } catch (error) {
          console.error("Error calling pywebview API:", error);
          // Fall back to browser download method
          fallbackDownload();
        }
      } else {
        // Fall back to browser download method
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
      img.processed && img.result?.success && img.result?.redactedImage
    );
    
    if (successImages.length === 0) return;
    
    // Show toast with download progress
    showToast(`Downloading ${successImages.length} images...`, 'info');
    
    // Check if we're running in pywebview
    if (typeof window !== 'undefined' && 'pywebview' in window) {
      try {
        // Prepare the data for bulk download
        const files = successImages.map(img => {
          if (!img.result?.redactedImage) return null;
          
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
        }).filter((file): file is NonNullable<typeof file> => file !== null);
        
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
  
  const clearGallery = async () => {
    try {
      // Revoke object URLs to prevent memory leaks
      bulkImages.forEach(img => {
        if (img.result?.redactedImage?.startsWith('blob:')) {
          URL.revokeObjectURL(img.result.redactedImage);
        }
        if (img.result?.originalRedactedImage?.startsWith('blob:')) {
          URL.revokeObjectURL(img.result.originalRedactedImage);
        }
      });

      // Clear the state
      setBulkImages([]);
      
      // Clean up temp files
      if (typeof window !== 'undefined' && 'pywebview' in window) {
        try {
          // @ts-ignore - TypeScript doesn't know about pywebview
          await window.pywebview.api.cleanup_temp_files();
        } catch (error) {
          console.error('Error cleaning up temp files:', error);
        }
      }

      // Suggest garbage collection when browser is idle
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          if (typeof window !== 'undefined' && 'gc' in window) {
            // @ts-ignore - TypeScript doesn't know about gc
            window.gc();
          }
        });
      }
    } catch (error) {
      console.error('Error clearing gallery:', error);
    }
  };
  
  const removeImage = (index: number) => {
    setBulkImages(prevImages => prevImages.filter((_, i) => i !== index));
  };

  const handleApplyBlur = async (blurMask: string, size: number) => {
    if (!selectedImage || !selectedImage.result?.redactedImage) return;
    
    try {
      // If blurMask is empty string, it means we're clearing the blur
      if (blurMask === '') {
        // Reset to the original redacted image
        const originalRedactedImage = selectedImage.result.originalRedactedImage || selectedImage.result.redactedImage;
        
        // Update the image in the bulk images array
        setBulkImages(prevImages => 
          prevImages.map(img => {
            if (img === selectedImage) {
              return {
                ...img,
                result: {
                  ...img.result!,
                  redactedImage: originalRedactedImage
                }
              };
            }
            return img;
          })
        );
        
        // Update the selected image
        setSelectedImage(prev => {
          if (!prev) return null;
          return {
            ...prev,
            result: {
              ...prev.result!,
              redactedImage: originalRedactedImage
            }
          };
        });
        
        showToast('Manual blur cleared', 'success');
        return;
      }
      
      // Store the original redacted image if it's not already stored
      if (!selectedImage.result.originalRedactedImage) {
        setBulkImages(prevImages => 
          prevImages.map(img => {
            if (img === selectedImage) {
              return {
                ...img,
                result: {
                  ...img.result!,
                  originalRedactedImage: img.result!.redactedImage
                }
              };
            }
            return img;
          })
        );
        
        setSelectedImage(prev => {
          if (!prev) return null;
          return {
            ...prev,
            result: {
              ...prev.result!,
              originalRedactedImage: prev.result!.redactedImage
            }
          };
        });
      }
      
      const blurredImage = await applyManualBlur(selectedImage.result.redactedImage, blurMask, size);
      
      // Update the image in the bulk images array
      setBulkImages(prevImages => 
        prevImages.map(img => {
          if (img === selectedImage) {
            return {
              ...img,
              result: {
                ...img.result!,
                redactedImage: blurredImage
              }
            };
          }
          return img;
        })
      );
      
      // Update the selected image
      setSelectedImage(prev => {
        if (!prev) return null;
        return {
          ...prev,
          result: {
            ...prev.result!,
            redactedImage: blurredImage
          }
        };
      });
      
      showToast('Manual blur applied', 'success');
    } catch (error) {
      console.error('Error applying blur:', error);
      showToast('Failed to apply blur', 'error');
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
              <button 
                className="remove-button"
                onClick={() => removeImage(index)}
                title="Remove image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            {img.processed && img.result?.success && img.result.redactedImage && (
              <div 
                className="item-preview"
                onClick={() => setSelectedImage(img)}
              >
                <img 
                  src={img.result.redactedImage} 
                  alt={`Redacted ${img.file.name}`} 
                />
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
            
            <div className="item-footer">
              {img.processed && img.result?.success && (
                <span className="redactions-count">
                  {img.result.redactionCount || 0} redactions
                </span>
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
          </div>
        ))}
      </div>
      
      {isProcessing && (
        <div className="processing-status">
          <div className="spinner"></div>
          <p>Processing {bulkImages.filter(img => !img.processed).length} remaining images...</p>
        </div>
      )}

      {selectedImage && selectedImage.result?.redactedImage && (
        <ImagePreviewModal
          image={null}
          redactedImage={selectedImage.result.redactedImage}
          onClose={() => setSelectedImage(null)}
          onApplyBlur={handleApplyBlur}
        />
      )}
    </div>
  );
};

export default BulkImageGallery; 