import React, { useState } from 'react';

interface ImagePreviewProps {
  image: string | null;
  redactedImage: string | null;
  isProcessing: boolean;
  redactionCount: number;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  image,
  redactedImage,
  isProcessing,
  redactionCount
}) => {
  const [showFullImage, setShowFullImage] = useState<boolean>(false);
  
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
          onClick={() => setShowFullImage(false)}
          onKeyDown={(e) => e.key === 'Escape' && setShowFullImage(false)}
          tabIndex={0} // Make it focusable to receive keyboard events
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="close-button"
              onClick={() => setShowFullImage(false)}
              aria-label="Close preview"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <img src={redactedImage || image || ''} alt="Preview" />
            <div className="preview-instructions">Click anywhere outside or press ESC to close</div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImagePreview; 