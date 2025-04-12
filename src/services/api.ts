import { API_URL, isTauri, log } from '../constants';

// Initialize invoke as null
let invoke: any = null;

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

/**
 * Process image with redaction
 * @param imageData Base64 encoded image
 * @param config Redaction configuration
 * @returns Processed result with redacted image
 */
export const processImage = async (imageData: string, config: any) => {
  try {
    // Check if we're in Tauri environment AND we haven't already tried to load the API
    if (isTauri && invoke === null) {
      try {
        // Load Tauri API at runtime using our safe import method
        const tauri = await safeDynamicImport('@tauri-apps/api/tauri');
        if (tauri) {
          invoke = tauri.invoke;
          log('Successfully loaded Tauri API');
        }
      } catch (e) {
        log('Could not load Tauri API, falling back to web mode');
      }
    }

    // If we have invoke available from Tauri, use it
    if (isTauri && invoke) {
      // Tauri implementation
      log('Using Tauri backend for image processing');
      
      // Start API server if needed (this is Tauri-specific)
      try {
        await invoke('start_api_server');
      } catch (e) {
        log('API server start error (may already be running):', e);
      }
      
      // Call Tauri command to process the image
      const result = await invoke('redact_base64_image', {
        imageData,
        config: JSON.stringify(config)
      });
      
      // Parse result if needed
      return typeof result === 'string' ? JSON.parse(result) : result;
    } else {
      // Web implementation
      log('Using web fetch API for image processing');
      
      // Call Python API server directly
      const response = await fetch(`${API_URL}/redact/base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageData,
          config: config
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to process image');
      }
      
      return await response.json();
    }
  } catch (error) {
    log('Error in processImage:', error);
    throw error;
  }
}; 