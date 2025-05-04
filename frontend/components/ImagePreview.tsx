import React, { useState } from 'react';
import ImagePreviewBase from './ImagePreviewBase';
import ImagePreviewModal from './ImagePreviewModal';

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
  
  return (
    <>
      <ImagePreviewBase
        image={image}
        redactedImage={redactedImage}
        isProcessing={isProcessing}
        redactionCount={redactionCount}
        onPreviewClick={() => setShowFullImage(true)}
      />
      
      {showFullImage && (redactedImage || image) && (
        <ImagePreviewModal
          image={image}
          redactedImage={redactedImage}
          onClose={() => setShowFullImage(false)}
          onApplyBlur={onApplyBlur}
        />
      )}
    </>
  );
};

export default ImagePreview; 