import { API_URL, log } from '../constants';
import pythonApi from '../python_api';

/**
 * Check if the API server is running
 */
export const checkApiStatus = async (): Promise<boolean> => {
  try {
    return await pythonApi.ready();
  } catch (error) {
    log('Error checking API status:', error);
    return false;
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