import React from 'react';

interface ImagePreviewBaseProps {
  image: string | null;
  redactedImage: string | null;
  isProcessing: boolean;
  redactionCount: number;
  onPreviewClick: () => void;
}

const ImagePreviewBase: React.FC<ImagePreviewBaseProps> = ({
  image,
  redactedImage,
  isProcessing,
  redactionCount,
  onPreviewClick
}) => {
  return (
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
          onClick={onPreviewClick}
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
  );
};

export default ImagePreviewBase; 