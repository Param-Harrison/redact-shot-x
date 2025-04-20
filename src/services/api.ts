import { log } from '../constants';
import rustApi from '../rust_api';

/**
 * Check if the API is running
 */
export const checkApiStatus = async (): Promise<boolean> => {
  try {
    return await rustApi.ready();
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
    
    return await rustApi.processImage(imageData, config);
  } catch (error) {
    log('Error in processImage:', error);
    throw error;
  }
};

/**
 * Process image file with redaction
 */
export const processImageFile = async (filePath: string, config: any) => {
  try {
    return await rustApi.processImageFile(filePath, config);
  } catch (error) {
    log('Error in processImageFile:', error);
    throw error;
  }
};