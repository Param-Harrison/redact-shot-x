/**
 * Application constants and environment-specific settings
 */

// Determine if we're running in Tauri or web environment
export const isTauri = window.navigator.userAgent.includes('Tauri');

// Feature flags
export const FEATURES = {
  ENABLE_LOGS: true,
  DEVELOPMENT_MODE: import.meta.env.DEV,
};

// Log messages in development mode only
export const log = (...args: any[]) => {
  if (FEATURES.ENABLE_LOGS && FEATURES.DEVELOPMENT_MODE) {
    console.log(...args);
  }
}; 