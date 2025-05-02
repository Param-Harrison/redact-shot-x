import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Get dirname in ESM
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "frontend"),
  build: {
    outDir: path.resolve(__dirname, "dist-web")
  },
  server: {
    port: 3000,
    strictPort: true,
    cors: true,
  }
});
