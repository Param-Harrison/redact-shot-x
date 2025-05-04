export const applyBlurToRegion = (
  ctx: CanvasRenderingContext2D, 
  centerX: number, 
  centerY: number, 
  radius: number
) => {
  // Get the region to blur
  const startX = Math.max(0, centerX - radius);
  const startY = Math.max(0, centerY - radius);
  const endX = Math.min(ctx.canvas.width, centerX + radius);
  const endY = Math.min(ctx.canvas.height, centerY + radius);
  const width = endX - startX;
  const height = endY - startY;
  
  // Skip if dimensions are invalid
  if (width <= 0 || height <= 0) return;
  
  // Get image data for the region
  const imageData = ctx.getImageData(startX, startY, width, height);
  
  // Apply a box blur (simple and efficient)
  const iterations = 12;
  for (let iter = 0; iter < iterations; iter++) {
    const pixels = imageData.data;
    const tempPixels = new Uint8ClampedArray(pixels);
    
    // Skip the edges to simplify the algorithm
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Compute average of neighboring pixels (box blur kernel)
        for (let c = 0; c < 3; c++) { // RGB channels only
          pixels[idx + c] = Math.floor(
            (tempPixels[idx - width * 4 - 4 + c] +
             tempPixels[idx - width * 4 + c] +
             tempPixels[idx - width * 4 + 4 + c] +
             tempPixels[idx - 4 + c] +
             tempPixels[idx + c] +
             tempPixels[idx + 4 + c] +
             tempPixels[idx + width * 4 - 4 + c] +
             tempPixels[idx + width * 4 + c] +
             tempPixels[idx + width * 4 + 4 + c]) / 9
          );
        }
      }
    }
  }
  
  // Put the processed image data back
  ctx.putImageData(imageData, startX, startY);
}; 