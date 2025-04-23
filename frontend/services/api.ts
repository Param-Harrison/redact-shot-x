import { API_URL, log } from '../constants';

/**
 * Check API status
 */
export const checkApiStatus = async () => {
  try {
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
    });
    
    return { 
      ok: response.ok,
      status: response.status 
    };
  } catch (error) {
    log('API status check failed:', error);
    return { 
      ok: false, 
      status: 0,
      error 
    };
  }
};

/**
 * Process image with redaction
 */
export const processImage = async (imageData: string, config: any) => {
  try {
    // Log the size of the image data for debugging
    const dataSizeKB = Math.round(imageData.length / 1024);
    log(`Processing image of size: ${dataSizeKB}KB`);
    
    // Use Python API for processing
    const requestBody = JSON.stringify({
      imageData: imageData,
      config
    });
    
    const response = await fetch(`${API_URL}/redact/base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to process image');
    }
    
    return await response.json();
  } catch (error) {
    log('Error in processImage:', error);
    throw error;
  }
};

/**
 * Process multiple images in bulk
 */
export const processBulkImages = async (files: File[], config: any) => {
  try {
    log(`Processing ${files.length} images in bulk`);
    
    // Create form data with files and config
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    
    // Add redaction configuration
    formData.append('config_json', JSON.stringify(config));
    
    // Make API call
    const response = await fetch(`${API_URL}/redact/bulk-upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to process images');
    }
    
    return await response.json();
  } catch (error) {
    log('Error in processBulkImages:', error);
    throw error;
  }
};