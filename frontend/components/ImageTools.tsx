import React, { useState, useEffect } from 'react';
import BlurBrush from './BlurBrush';
import './ImageTools.css';

interface ImageToolsProps {
  sourceImage: string | null;
  onApplyBlur?: (blurMask: string, brushSize: number) => void;
  inModal?: boolean;
  className?: string;
  onToolActiveChange?: (isActive: boolean) => void;
}

const ImageTools: React.FC<ImageToolsProps> = ({
  sourceImage,
  onApplyBlur,
  inModal = false,
  className = '',
  onToolActiveChange
}) => {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState<number>(28);
  const [toolIntroShown, setToolIntroShown] = useState<boolean>(false);
  
  // Show a visual intro for the tool on first render
  useEffect(() => {
    if (!toolIntroShown && sourceImage) {
      setToolIntroShown(true);
    }
  }, [sourceImage, toolIntroShown]);
  
  // Notify parent when tool active state changes
  useEffect(() => {
    if (onToolActiveChange) {
      onToolActiveChange(activeTool !== null);
    }
  }, [activeTool, onToolActiveChange]);
  
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
  
  return (
    <>
      {/* Tool controls */}
      <div className={`image-tools-controls ${inModal ? 'in-modal' : ''} ${className}`}>
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

        {/* Tool Helper Text */}
        {!activeTool && !toolIntroShown && (
          <div className="tool-intro">
            <div className="tool-intro-arrow">↙</div>
            Try the blur brush to manually redact areas
          </div>
        )}
      </div>

      {/* Blur Brush - positioned absolutely over the image */}
      {onApplyBlur && sourceImage && (
        <div className="image-tools-overlay">
          <BlurBrush
            sourceImage={sourceImage}
            onApplyBlur={handleMaskUpdate}
            brushSize={brushSize}
            active={activeTool === 'blur-brush'}
          />
        </div>
      )}
    </>
  );
};

export default ImageTools; 