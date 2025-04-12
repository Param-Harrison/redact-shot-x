import React from 'react';

interface ImagePreviewProps {
  image: string | null;
  redactedImage: string | null;
  isProcessing: boolean;
  redactionCount: number;
  showRedactionCount: boolean;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  image,
  redactedImage,
  isProcessing,
  redactionCount,
  showRedactionCount
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
      {redactedImage && showRedactionCount && (
        <div className="redaction-badge">
          {redactionCount} {redactionCount === 1 ? 'redaction' : 'redactions'} applied
        </div>
      )}
    </div>
  );
};

export default ImagePreview; 