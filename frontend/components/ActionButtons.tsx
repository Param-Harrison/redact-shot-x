import React from 'react';

interface ActionButtonsProps {
  handleNewImage: () => void;
  exportImage: () => void;
  redactedImage: string | null;
  isProcessing: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  handleNewImage,
  exportImage,
  redactedImage,
  isProcessing
}) => {
  return (
    <div className="action-buttons">
      <button 
        className="secondary-button" 
        onClick={handleNewImage}
        aria-label="Upload a new image"
      >
        New Image
      </button>
      <button 
        className="primary-button"
        onClick={exportImage}
        disabled={!redactedImage || isProcessing}
        aria-label="Export redacted image"
      >
        Export Redacted Image
      </button>
    </div>
  );
};

export default ActionButtons; 