import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Use a different port than Tauri
    strictPort: true,
    cors: true
  },
  // Use a different build output directory to avoid conflicts
  build: {
    outDir: 'dist-web'
  }
}); 