import { log } from '../constants';

// Get the pywebview API instance
declare const window: any;
const api = window.pywebview.api;

// Helper function to check if API is available
const checkApiAvailability = () => {
  if (!window.pywebview || !window.pywebview.api) {
    throw new Error('Pywebview API is not available. Please ensure the application is running properly.');
  }
  return true;
};

/**
 * Check API status
 */
export const checkApiStatus = async () => {
  try {
    checkApiAvailability();
    return { 
      ok: true,
      status: 200 
    };
  } catch (error) {
    log('API status check failed:', error);
    return { 
      ok: false, 
      status: 0,
      error: error.message 
    };
  }
};

/**
 * Process image with redaction
 */
export const processImage = async (imageData: string, config: any) => {
  try {
    checkApiAvailability();
    
    // Log the size of the image data for debugging
    const dataSizeKB = Math.round(imageData.length / 1024);
    log(`Processing image of size: ${dataSizeKB}KB`);
    
    // Use integrated API for processing
    const result = await api.redact_image(imageData, config);
    log('Image processing result:', result);
    return result;
  } catch (error) {
    log('Error in processImage:', error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
};

/**
 * Process multiple images in bulk
 */
export const processBulkImages = async (files: File[], config: any) => {
  try {
    checkApiAvailability();
    log(`Processing ${files.length} images in bulk`);
    
    // Convert files to base64 and prepare for API
    const filesData = await Promise.all(files.map(async (file) => {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      return {
        filename: file.name,
        data: base64.split(',')[1], // Remove data URL prefix
      };
    }));
    
    // Use integrated API for bulk processing
    const result = await api.redact_bulk_upload(filesData, config);
    log('Bulk processing result:', result);
    return result;
  } catch (error) {
    log('Error in processBulkImages:', error);
    throw new Error(`Failed to process bulk images: ${error.message}`);
  }
};

/**
 * Save a single file
 */
export const saveFile = async (filename: string, data: string) => {
  try {
    checkApiAvailability();
    const result = await api.save_file({
      filename,
      data
    });
    log('File save result:', result);
    return result;
  } catch (error) {
    log('Error in saveFile:', error);
    throw new Error(`Failed to save file: ${error.message}`);
  }
};

/**
 * Save multiple files
 */
export const saveFiles = async (files: Array<{filename: string, data: string}>) => {
  try {
    checkApiAvailability();
    const result = await api.save_files(files);
    log('Files save result:', result);
    return result;
  } catch (error) {
    log('Error in saveFiles:', error);
    throw new Error(`Failed to save files: ${error.message}`);
  }
};