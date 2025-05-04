import { applyBlurToRegion } from './blurUtils';

export const applyManualBlur = (imageData: string, maskData: string, maskSize: number): Promise<string> => {
  return new Promise((resolve) => {
    if (!imageData || !maskData) {
      resolve(imageData);
      return;
    }
    
    // Create new canvases for blending
    const canvas = document.createElement('canvas');
    const maskCanvas = document.createElement('canvas');
    const targetImg = new Image();
    const maskImg = new Image();
    
    // When target image is loaded
    targetImg.onload = () => {
      canvas.width = targetImg.width;
      canvas.height = targetImg.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        resolve(imageData);
        return;
      }
      
      // Draw the target image to the canvas
      ctx.drawImage(targetImg, 0, 0);
      
      // When mask image is loaded
      maskImg.onload = () => {
        // Set mask canvas dimensions
        maskCanvas.width = targetImg.width;
        maskCanvas.height = targetImg.height;
        const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        
        if (!maskCtx) {
          resolve(imageData);
          return;
        }
        
        // Draw the mask to its canvas and scale it to match the target image
        maskCtx.drawImage(maskImg, 0, 0, targetImg.width, targetImg.height);
        
        // Get mask data
        const maskImgData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const maskPixels = maskImgData.data;
        
        // Keep track of blurred regions
        const processedRegions = new Set<string>();
        
        // Apply blur to areas where mask has been drawn
        for (let y = 0; y < canvas.height; y += 5) { // Process every 5th pixel for efficiency
          for (let x = 0; x < canvas.width; x += 5) {
            // Check if this pixel has a mask (non-transparent)
            const maskIndex = (y * maskCanvas.width + x) * 4;
            const maskAlpha = maskPixels[maskIndex + 3];
            
            // If the mask has some opacity at this pixel - reduced threshold to 1 to detect lighter strokes
            if (maskAlpha > 1) {
              // Create a region id to avoid processing the same region multiple times
              const regionId = `${Math.floor(x/maskSize)},${Math.floor(y/maskSize)}`;
              
              if (!processedRegions.has(regionId)) {
                processedRegions.add(regionId);
                applyBlurToRegion(ctx, x, y, maskSize);
              }
            }
          }
        }
        
        // Get the blurred image data URL
        const blurredImageData = canvas.toDataURL('image/jpeg', 0.95);
        
        // Clean up
        canvas.width = 0;
        canvas.height = 0;
        maskCanvas.width = 0;
        maskCanvas.height = 0;
        
        resolve(blurredImageData);
      };
      
      maskImg.src = maskData;
    };
    
    targetImg.src = imageData;
  });
}; 