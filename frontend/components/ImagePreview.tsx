import React, { useState, useEffect } from 'react';
import ImageTools from './ImageTools';

interface ImagePreviewProps {
  image: string | null;
  redactedImage: string | null;
  isProcessing: boolean;
  redactionCount: number;
  onApplyBlur?: (blurMask: string, brushSize: number) => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  image,
  redactedImage,
  isProcessing,
  redactionCount,
  onApplyBlur
}) => {
  const [showFullImage, setShowFullImage] = useState<boolean>(false);
  const [isToolActive, setIsToolActive] = useState<boolean>(false);
  
  return (
    <>
      <div className="image-preview">
        {isProcessing ? (
          <div className="processing-overlay">
            <div className="spinner"></div>
            <p>Processing image...</p>
          </div>
        ) : null}
        <img 
          src={redactedImage || image || ''} 
          alt="Preview" 
          className={isProcessing ? 'processing' : ''}
        />
        {!isProcessing && (redactedImage || image) && (
          <div 
            className="preview-overlay"
            onClick={() => setShowFullImage(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </div>
        )}
        {redactedImage && (
          <div className="redaction-badge">
            {redactionCount} {redactionCount === 1 ? 'redaction' : 'redactions'} applied
          </div>
        )}
      </div>
      
      {/* Image Preview Modal */}
      {showFullImage && (redactedImage || image) && (
        <div 
          className="image-preview-modal"
          onClick={(e) => {
            // Only close modal if directly clicking the backdrop, not when using tools
            if (e.target === e.currentTarget && !isToolActive) {
              setShowFullImage(false);
            }
          }}
          onKeyDown={(e) => e.key === 'Escape' && setShowFullImage(false)}
          tabIndex={0}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button 
              className="close-button"
              onClick={() => !isToolActive && setShowFullImage(false)}
              aria-label="Close preview"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            {/* Image in modal with relative positioning to support the blur brush */}
            <div className="modal-image-container">
              <img src={redactedImage || image || ''} alt="Preview" />
              
              {/* Image Tools in modal */}
              <ImageTools
                sourceImage={redactedImage || image}
                onApplyBlur={onApplyBlur}
                inModal={true}
                onToolActiveChange={setIsToolActive}
              />
            </div>
            
            {/* Instructions for the modal */}
            <div className="preview-instructions">
              {isToolActive ? 'Click tool again to exit' : 'Click anywhere outside or press ESC to close'}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImagePreview; 