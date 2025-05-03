/**
 * Application constants and environment-specific settings
 */

// Feature flags
export const FEATURES = {
  ENABLE_LOGS: true,
  DEVELOPMENT_MODE: import.meta.env.DEV,
  ENABLE_BULK_UPLOAD: true, // Premium feature - bulk image uploads
};

// Log messages in development mode only
export const log = (...args: any[]) => {
  if (FEATURES.ENABLE_LOGS && FEATURES.DEVELOPMENT_MODE) {
    console.log(...args);
  }
}; 