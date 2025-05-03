import React, { useRef, useState, useEffect } from 'react';

interface BlurBrushProps {
  sourceImage: string | null;
  onApplyBlur: (blurMask: string) => void;
  brushSize: number;
  active: boolean;
}

const BlurBrush: React.FC<BlurBrushProps> = ({ 
  sourceImage, 
  onApplyBlur, 
  brushSize = 28,
  active 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isInModal, setIsInModal] = useState(false);
  const [brushColor, setBrushColor] = useState('rgba(0, 123, 255, 0.8)'); // Default fallback color with opacity

  // Get primary color from CSS variables when component mounts
  useEffect(() => {
    const getPrimaryColor = () => {
      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
      if (primaryColor) {
        // Convert to rgba with opacity for the brush
        const rgbColor = hexToRgba(primaryColor, 0.8);
        setBrushColor(rgbColor);
      }
    };

    // Helper function to convert hex to rgba
    const hexToRgba = (hex: string, alpha: number) => {
      // If hex doesn't start with #, assume it's already an rgb/rgba value
      if (!hex.startsWith('#')) {
        // If it's rgb, convert to rgba
        if (hex.startsWith('rgb(')) {
          return hex.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
        }
        // If it's already rgba, return as is
        return hex;
      }

      // Remove # if present
      hex = hex.replace('#', '');
      
      // Parse the hex values
      let r, g, b;
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
      
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    getPrimaryColor();
  }, []);

  // Detect if we're in a modal by checking the parent elements
  useEffect(() => {
    if (containerRef.current) {
      // Check if any of our parent elements has the modal class
      let parent = containerRef.current.parentElement;
      while (parent) {
        if (parent.classList.contains('modal-image-container') || 
            parent.classList.contains('image-preview-modal')) {
          setIsInModal(true);
          break;
        }
        parent = parent.parentElement;
      }
    }
  }, []);

  // Initialize canvas and load image
  useEffect(() => {
    if (!sourceImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!context) return;
    
    setCtx(context);
    
    const img = new Image();
    img.onload = () => {
      // Set canvas dimensions to match the image
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Clear canvas and set brush properties
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.lineWidth = brushSize;
      context.strokeStyle = brushColor; // Use primary color
    };
    img.src = sourceImage;
  }, [sourceImage, brushColor]);

  // Update brush size when it changes
  useEffect(() => {
    if (ctx) {
      ctx.lineWidth = brushSize;
    }
  }, [brushSize, ctx]);

  // Show visual indicator when tool is activated
  useEffect(() => {
    if (containerRef.current) {
      if (active) {
        containerRef.current.style.border = `2px dashed ${brushColor}`;
      } else {
        containerRef.current.style.border = 'none';
      }
    }
  }, [active, brushColor]);

  const getMousePos = (canvas: HTMLCanvasElement, e: React.MouseEvent | React.Touch) => {
    const rect = canvas.getBoundingClientRect();
    
    // Calculate the scale between the actual image and how it's displayed
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Get the correct mouse position considering scaling
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!active || !ctx || !canvasRef.current) return;
    e.preventDefault();
    e.stopPropagation(); // Prevent closing modal when drawing
    
    setIsDrawing(true);
    const { x, y } = getMousePos(canvasRef.current, e);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = brushColor; // Use primary color
    ctx.stroke();
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !active || !ctx || !canvasRef.current) return;
    e.preventDefault();
    e.stopPropagation(); // Prevent closing modal when drawing
    
    const { x, y } = getMousePos(canvasRef.current, e);
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent closing modal when finishing drawing
    }
    
    if (!isDrawing || !ctx) return;
    
    setIsDrawing(false);
    ctx.closePath();
    
    // Only send the mask if we've actually drawn something
    if (canvasRef.current && hasDrawn) {
      const maskData = canvasRef.current.toDataURL('image/png');
      onApplyBlur(maskData);
      
      // Provide immediate visual feedback by making brush strokes more transparent
      if (ctx) {
        ctx.globalAlpha = 0.3;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.globalAlpha = 1.0;
      }
    }
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!active || !ctx || !canvasRef.current || e.touches.length !== 1) return;
    
    e.preventDefault(); // Prevent scrolling
    e.stopPropagation(); // Prevent closing modal
    
    setIsDrawing(true);
    const { x, y } = getMousePos(canvasRef.current, e.touches[0]);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = brushColor; // Use primary color
    ctx.stroke();
    setHasDrawn(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !active || !ctx || !canvasRef.current || e.touches.length !== 1) return;
    
    e.preventDefault(); // Prevent scrolling
    e.stopPropagation(); // Prevent closing modal
    
    const { x, y } = getMousePos(canvasRef.current, e.touches[0]);
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx) return;
    
    e.preventDefault();
    e.stopPropagation(); // Prevent closing modal
    
    setIsDrawing(false);
    ctx.closePath();
    
    // Only send the mask if we've actually drawn something
    if (canvasRef.current && hasDrawn) {
      const maskData = canvasRef.current.toDataURL('image/png');
      onApplyBlur(maskData);
      
      // Provide immediate visual feedback
      if (ctx) {
        ctx.globalAlpha = 0.3;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.globalAlpha = 1.0;
      }
    }
  };

  // Clear brush strokes
  const clearCanvas = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    if (!ctx || !canvasRef.current) return;
    
    // Fully clear the canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasDrawn(false);
    
    // Notify parent that the mask is cleared - make sure to pass empty string
    onApplyBlur('');
    
    // Reset the context to ensure no residual state
    ctx.beginPath();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = brushColor;
    
    // Force a re-render of the canvas
    canvasRef.current.width = canvasRef.current.width;
  };

  return (
    <div 
      className={`blur-brush-container ${isInModal ? 'in-modal' : ''}`}
      ref={containerRef}
      style={{ 
        display: active ? 'block' : 'none',
        cursor: active ? 'crosshair' : 'default'
      }}
    >
      <canvas
        ref={canvasRef}
        className="blur-brush-canvas"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      {active && hasDrawn && (
        <button 
          className="clear-brush-button"
          onClick={clearCanvas}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          Clear
        </button>
      )}
    </div>
  );
};

export default BlurBrush; 