import { API_URL, isTauri, log } from '../constants';

// Initialize invoke as null
let invoke: any = null;
// Track the number of retries for API operations
let apiRetries = 0;
const MAX_API_RETRIES = 3;

// In web mode, we skip the Tauri imports completely
if (typeof window !== 'undefined' && isTauri) {
  log('Running in Tauri mode, will attempt to use Tauri API');
} else {
  log('Running in web mode, using fetch API');
}

/**
 * This is a safe dynamic import that won't cause build errors
 * if the module is not found. We use Function constructor to prevent
 * static analysis tools from trying to resolve the import at build time.
 */
const safeDynamicImport = async (modulePath: string) => {
  try {
    // This uses the Function constructor to create a dynamic import
    // that won't be analyzed at build time
    return await new Function(`return import("${modulePath}")`)();
  } catch (e) {
    log(`Failed to import ${modulePath}:`, e);
    return null;
  }
};

// Initialize Tauri API if in Tauri environment
const initTauriApi = async () => {
  if (isTauri && invoke === null) {
    try {
      // Load Tauri API at runtime using our safe import method
      const tauri = await safeDynamicImport('@tauri-apps/api/tauri');
      if (tauri) {
        invoke = tauri.invoke;
        log('Successfully loaded Tauri API');
        return true;
      }
    } catch (e) {
      log('Could not load Tauri API, falling back to web mode');
    }
  }
  return Boolean(isTauri && invoke);
};

/**
 * Check if the API server is running
 */
export const checkApiStatus = async (): Promise<boolean> => {
  try {
    // If we're in Tauri mode, use Tauri's check_api_status function
    if (await initTauriApi()) {
      return await invoke('check_api_status');
    }
    
    // In web mode, try to ping the API directly
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    try {
      const response = await fetch(`${API_URL}/health`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      clearTimeout(timeoutId);
      return false;
    }
  } catch (error) {
    log('Error checking API status:', error);
    return false;
  }
};

/**
 * Ensure API server is running
 */
export const ensureApiRunning = async (): Promise<boolean> => {
  // Check if API is already running
  if (await checkApiStatus()) {
    log('API server is already running');
    apiRetries = 0;
    return true;
  }
  
  // If we're in Tauri mode, try to start the API server
  if (await initTauriApi()) {
    if (apiRetries >= MAX_API_RETRIES) {
      log('Exceeded maximum API server start retries');
      return false;
    }
    
    apiRetries++;
    log(`Attempting to start API server (attempt ${apiRetries})`);
    
    try {
      await invoke('start_api_server');
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return await checkApiStatus();
    } catch (error) {
      log('Error starting API server:', error);
      return false;
    }
  }
  
  // In web mode, we can't start the API server
  return false;
};

/**
 * Process image with redaction
 * @param imageData Base64 encoded image
 * @param config Redaction configuration
 * @returns Processed result with redacted image
 */
export const processImage = async (imageData: string, config: any) => {
  try {
    // Log the size of the image data for debugging
    const dataSizeKB = Math.round(imageData.length / 1024);
    log(`Processing image of size: ${dataSizeKB}KB`);
    
    // Check if we're in Tauri environment
    const hasTauriApi = await initTauriApi();
    
    // Make sure API is running, especially in Tauri mode
    if (hasTauriApi && !(await ensureApiRunning())) {
      throw new Error('Failed to start or connect to API server');
    }
    
    // Create a local copy of the configuration to avoid reference issues
    const configCopy = JSON.parse(JSON.stringify(config));
    
    // If we have invoke available from Tauri, use it
    if (hasTauriApi) {
      // Tauri implementation
      log('Using Tauri backend for image processing');
      
      try {
        // Call Tauri command to process the image
        const result = await invoke('redact_base64_image', {
          imageData,
          config: JSON.stringify(configCopy)
        });
        
        // Clear config copy to help garbage collection
        Object.keys(configCopy).forEach(key => {
          delete configCopy[key];
        });
        
        // Parse result if needed
        return typeof result === 'string' ? JSON.parse(result) : result;
      } catch (error) {
        log('Error in Tauri redact_base64_image:', error);
        throw error;
      }
    } else {
      // Web implementation
      log('Using web fetch API for image processing');
      
      try {
        // Create request body once to avoid duplicating the large string
        const requestBody = JSON.stringify({
          imageData: imageData,
          config: configCopy
        });
        
        // Call Python API server directly
        const response = await fetch(`${API_URL}/redact/base64`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody
        });
        
        // Clear request body reference to help garbage collection
        // requestBody is a string so we can't delete properties,
        // but we can set it to empty to help JS garbage collector
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to process image');
        }
        
        // Clear config copy to help garbage collection
        Object.keys(configCopy).forEach(key => {
          delete configCopy[key];
        });
        
        return await response.json();
      } catch (error) {
        log('Error in web fetch API processing:', error);
        throw error;
      }
    }
  } catch (error) {
    log('Error in processImage:', error);
    throw error;
  } finally {
    // Help free memory by removing references to large data
    imageData = ''; // Allow GC to collect this large string
    
    // Suggest garbage collection when the browser is idle
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      // @ts-ignore - TypeScript might not know requestIdleCallback
      window.requestIdleCallback(() => {
        log('Suggested cleanup after image processing');
      });
    }
  }
};

/**
 * Clean up and stop API server when app is closing
 */
export const cleanupApiServer = async () => {
  try {
    // Check if we're in Tauri environment
    const hasTauriApi = await initTauriApi();
    
    if (hasTauriApi) {
      log('Stopping API server...');
      await invoke('stop_api_server');
      log('API server stopped successfully');
    }
  } catch (error) {
    log('Error stopping API server:', error);
  }
};

// Register window close event listener to clean up
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', async () => {
    await cleanupApiServer();
  });
} 