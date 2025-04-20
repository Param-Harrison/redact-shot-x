// We'll use dynamic imports for the Tauri API
// This way, Vite doesn't try to resolve it during build time

import { invoke } from '@tauri-apps/api/core';

class RustApi {
  /**
   * Check if the API is ready and responsive
   */
  async ready(): Promise<boolean> {
    try {
      await invoke('health_check');
      return true;
    } catch (error) {
      console.error("Error checking API health:", error);
      return false;
    }
  }

  /**
   * Process image with redaction using base64 data
   */
  async processImage(imageData: string, config: any) {
    try {
      // Log the size of the image data for debugging
      const dataSizeKB = Math.round(imageData.length / 1024);
      console.log(`Processing image of size: ${dataSizeKB}KB`);
      
      return await invoke('redact_base64_image', {
        request: {
          imageData,
          config
        }
      });
    } catch (error) {
      console.error('Error in processImage:', error);
      throw error;
    }
  }

  /**
   * Process image file with redaction
   */
  async processImageFile(filePath: string, config: any) {
    try {
      const configJson = config ? JSON.stringify(config) : null;
      
      return await invoke('redact_image_file', {
        filePath,
        configJson
      });
    } catch (error) {
      console.error('Error in processImageFile:', error);
      throw error;
    }
  }
}

const rustApi = new RustApi();

export default rustApi; 