import React, { useRef } from 'react';

interface DropZoneProps {
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileSelect: () => void;
}

const DropZone: React.FC<DropZoneProps> = ({ 
  isDragging, 
  setIsDragging, 
  handleDrop, 
  handleFileSelect 
}) => {
  return (
    <div 
      className={`drop-area ${isDragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={handleFileSelect}
    >
      <div className="drop-content">
        <div className="drop-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 6V18M12 6L7 11M12 6L17 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 15V16C3 17.6569 4.34315 19 6 19H18C19.6569 19 21 17.6569 21 16V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h3>Drag & drop image here</h3>
        <p>or click to browse files</p>
        <p className="small">You can also paste images from clipboard (Ctrl+V)</p>
        <p className="small">Supports PNG, JPG, JPEG, WebP, TIFF, and DICOM (.dcm) formats</p>
      </div>
    </div>
  );
};

export default DropZone; 