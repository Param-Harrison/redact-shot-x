import React, { useState } from 'react';
import ImageTools from './ImageTools';

interface ImagePreviewModalProps {
  image: string | null;
  redactedImage: string | null;
  onClose: () => void;
  onApplyBlur?: (blurMask: string, brushSize: number) => void;
}

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  image,
  redactedImage,
  onClose,
  onApplyBlur
}) => {
  const [isToolActive, setIsToolActive] = useState<boolean>(false);

  return (
    <div 
      className="image-preview-modal"
      onClick={(e) => {
        // Only close modal if directly clicking the backdrop, not when using tools
        if (e.target === e.currentTarget && !isToolActive) {
          onClose();
        }
      }}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      tabIndex={0}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
      </div>
      {/* Instructions for the modal */}
      <div className="preview-instructions">
        {isToolActive ? 'Click tool again to exit' : 'Click anywhere outside or press ESC to close'}
      </div>
    </div>
  );
};

export default ImagePreviewModal; 