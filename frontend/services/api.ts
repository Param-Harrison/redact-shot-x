import { log } from '../constants';

// Type declarations
declare global {
  interface Window {
    pywebview?: {
      api?: {
        redact_image: (imageData: string, config: any) => Promise<any>;
        redact_bulk_upload: (filesData: any[], config: any) => Promise<any>;
        save_file: (data: { filename: string, data: string }) => Promise<any>;
        save_files: (files: Array<{filename: string, data: string}>) => Promise<any>;
      };
    };
  }
}

// Environment detection
const isDesktop = () => {
  return typeof window !== 'undefined' && window.pywebview && window.pywebview.api;
};

// API interface
interface ApiInterface {
  redact_image: (imageData: string, config: any) => Promise<any>;
  redact_bulk_upload: (filesData: any[], config: any) => Promise<any>;
  save_file: (data: { filename: string, data: string }) => Promise<any>;
  save_files: (files: Array<{filename: string, data: string}>) => Promise<any>;
}

// Desktop API implementation
const desktopApi: ApiInterface = {
  redact_image: async (imageData: string, config: any) => {
    if (!window.pywebview?.api) throw new Error('Desktop API not available');
    return window.pywebview.api.redact_image(imageData, config);
  },
  redact_bulk_upload: async (filesData: any[], config: any) => {
    if (!window.pywebview?.api) throw new Error('Desktop API not available');
    return window.pywebview.api.redact_bulk_upload(filesData, config);
  },
  save_file: async (data: { filename: string, data: string }) => {
    if (!window.pywebview?.api) throw new Error('Desktop API not available');
    return window.pywebview.api.save_file(data);
  },
  save_files: async (files: Array<{filename: string, data: string}>) => {
    if (!window.pywebview?.api) throw new Error('Desktop API not available');
    return window.pywebview.api.save_files(files);
  }
};

// Web API implementation
const webApi: ApiInterface = {
  redact_image: async (imageData: string, config: any) => {
    const response = await fetch('http://localhost:8004/redact/base64', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageData, config })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },
  redact_bulk_upload: async (filesData: any[], config: any) => {
    const formData = new FormData();
    filesData.forEach((file, index) => {
      formData.append(`files`, new Blob([file.data], { type: 'application/octet-stream' }), file.filename);
    });
    if (config) {
      formData.append('config_json', JSON.stringify(config));
    }
    
    const response = await fetch('http://localhost:8004/redact/bulk-upload', {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },
  save_file: async (data: { filename: string, data: string }) => {
    // In web mode, we'll use the browser's download API
    const link = document.createElement('a');
    link.href = data.data;
    link.download = data.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true };
  },
  save_files: async (files: Array<{filename: string, data: string}>) => {
    // In web mode, we'll download files one by one
    const results: Array<{filename: string, success: boolean}> = [];
    for (const file of files) {
      const link = document.createElement('a');
      link.href = file.data;
      link.download = file.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      results.push({ filename: file.filename, success: true });
    }
    return { results };
  }
};

// Select the appropriate API implementation
const api: ApiInterface = isDesktop() ? desktopApi : webApi;

// Helper function to check if API is available
const checkApiAvailability = () => {
  if (isDesktop() && !window.pywebview?.api) {
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
    if (isDesktop()) {
      return { ok: true, status: 200 };
    } else {
      const response = await fetch('http://localhost:8004/health');
      return { 
        ok: response.ok,
        status: response.status 
      };
    }
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
    
    // Use appropriate API for processing
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
    
    // Use appropriate API for bulk processing
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