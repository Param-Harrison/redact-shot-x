import React, { useState, useEffect } from 'react';
import BlurBrush from './BlurBrush';

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
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState<number>(28);
  const [toolIntroShown, setToolIntroShown] = useState<boolean>(false);
  
  // Show a visual intro for the tool on first render
  useEffect(() => {
    if (!toolIntroShown && (image || redactedImage) && !isProcessing) {
      // Briefly highlight the tool button to draw attention
      setActiveTool('blur-brush');
      
      // Reset after a brief period
      const timer = setTimeout(() => {
        setActiveTool(null);
        setToolIntroShown(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [image, redactedImage, isProcessing, toolIntroShown]);
  
  const handleToolToggle = (toolName: string) => {
    setActiveTool(activeTool === toolName ? null : toolName);
  };
  
  const handleBrushSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrushSize(parseInt(e.target.value, 10));
  };
  
  const handleMaskUpdate = (maskData: string) => {
    if (onApplyBlur) {
      onApplyBlur(maskData, brushSize);
    }
  };
  
  // Render the image tools (used in both preview and modal)
  const renderImageTools = (inModal = false) => (
    <div className={`image-tools-container ${inModal ? 'in-modal' : ''}`}>
      <div className="image-tools">
        <button 
          className={`tool-button ${activeTool === 'blur-brush' ? 'active' : ''}`}
          onClick={() => handleToolToggle('blur-brush')}
          title="Blur Brush"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
            <path d="M2 2l7.586 7.586"></path>
            <circle cx="11" cy="11" r="2"></circle>
          </svg>
        </button>
        {/* Additional tool buttons can be added here in the future */}
      </div>
      
      {/* Tool settings panel - only appears when a tool is active */}
      {activeTool === 'blur-brush' && (
        <div className="tool-settings">
          <div className="brush-size-control">
            <label htmlFor={`brush-size${inModal ? '-modal' : ''}`}>Size:</label>
            <input
              id={`brush-size${inModal ? '-modal' : ''}`}
              type="range"
              min="5"
              max="50"
              value={brushSize}
              onChange={handleBrushSizeChange}
            />
            <span>{brushSize}px</span>
          </div>
          <div className="tool-instructions">
            Draw over areas to manually blur
          </div>
        </div>
      )}
    </div>
  );
  
  // Render the blur brush (used in both preview and modal)
  const renderBlurBrush = (inModal = false) => (
    onApplyBlur && (image || redactedImage) ? (
      <BlurBrush
        sourceImage={redactedImage || image}
        onApplyBlur={handleMaskUpdate}
        brushSize={brushSize}
        active={activeTool === 'blur-brush'}
      />
    ) : null
  );
  
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
          <>
            <div 
              className="preview-overlay"
              onClick={() => !activeTool && setShowFullImage(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </div>
            
            {/* Tool Helper Text */}
            {!activeTool && !toolIntroShown && (
              <div className="tool-intro">
                <div className="tool-intro-arrow">↙</div>
                Try the blur brush to manually redact areas
              </div>
            )}
          </>
        )}
        {redactedImage && (
          <div className="redaction-badge">
            {redactionCount} {redactionCount === 1 ? 'redaction' : 'redactions'} applied
          </div>
        )}
        
        {/* Blur Brush in main preview */}
        {renderBlurBrush()}
      </div>
      
      {/* Image Preview Modal */}
      {showFullImage && (redactedImage || image) && (
        <div 
          className="image-preview-modal"
          onClick={(e) => {
            // Only close modal if directly clicking the backdrop, not when using tools
            if (e.target === e.currentTarget && !activeTool) {
              setShowFullImage(false);
            }
          }}
          onKeyDown={(e) => e.key === 'Escape' && setShowFullImage(false)}
          tabIndex={0} // Make it focusable to receive keyboard events
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button 
              className="close-button"
              onClick={() => !activeTool && setShowFullImage(false)}
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
              
              {/* Render blur brush in modal */}
              {renderBlurBrush(true)}
            </div>
            
            {/* Render tools in modal */}
            {renderImageTools(true)}
            
            {/* Instructions for the modal */}
            <div className="preview-instructions">
              {activeTool ? 'Click tool again to exit' : 'Click anywhere outside or press ESC to close'}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImagePreview; 