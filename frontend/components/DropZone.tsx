import React from 'react';

interface DropZoneProps {
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileSelect: () => void;
  acceptedFileTypes?: string;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const DropZone: React.FC<DropZoneProps> = ({ 
  isDragging, 
  setIsDragging, 
  handleDrop, 
  handleFileSelect,
  acceptedFileTypes = "image/*,.dcm",
  showToast
}) => {
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      if (isFileTypeAccepted(file)) {
        handleDrop(e);
      } else {
        e.stopPropagation();
        if (showToast) {
          showToast('Only image files are supported', 'error');
        } else {
          // Fallback to alert if no toast function is provided
          alert('Only image files are supported');
        }
      }
    }
  };
  
  const isFileTypeAccepted = (file: File): boolean => {
    if (!acceptedFileTypes) return true;
    
    if (file.type && acceptedFileTypes.includes(file.type)) {
      return true;
    }
    
    if (acceptedFileTypes.includes(",.dcm")) {
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (fileExt === '.dcm') return true;
    }
    
    if (acceptedFileTypes.includes("image/*") && file.type.startsWith('image/')) {
      return true;
    }
    
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.tiff', '.tif', '.bmp', '.svg'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (imageExtensions.includes(fileExt)) {
      return true;
    }
    
    return false;
  };

  return (
    <div 
      className={`drop-area ${isDragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={handleFileSelect}
      data-accepted-files={acceptedFileTypes}
    >
      <div className="drop-content">
        <div className="drop-icon">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 6V18M12 6L7 11M12 6L17 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 15V16C3 17.6569 4.34315 19 6 19H18C19.6569 19 21 17.6569 21 16V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h3>Drag & drop image here</h3>
        <p>or click anywhere to browse files</p>
        <button 
          className="primary-button upload-button" 
          onClick={(e) => {
            e.stopPropagation();
            handleFileSelect();
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 16.5L3 17.25C3 18.9069 4.34315 20.25 6 20.25L18 20.25C19.6569 20.25 21 18.9069 21 17.25L21 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 3L12 15M12 15L16 11M12 15L8 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Browse Files
        </button>
        <p className="small">You can also paste images from clipboard (Ctrl+V)</p>
        <p className="small">Supports PNG, JPG, JPEG, WebP, TIFF, and DICOM (.dcm) formats</p>
      </div>
    </div>
  );
};

export default DropZone; 