import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { getCurrentWindow } from "@tauri-apps/api/window";
import pythonApi from "./python_api";

// Set up window close handler to shut down Python API
const setupWindowHandlers = async () => {
  try {
    const window = getCurrentWindow();
    await window.onCloseRequested(async (event) => {
      // Prevent default close and handle Python API shutdown first
      event.preventDefault();
      try {
        // Attempt to shut down the Python API
        await pythonApi.shutdown();
      } catch (error) {
        console.error("Error during Python API shutdown:", error);
      } finally {
        // Close the window regardless of shutdown success
        setTimeout(() => {
          window.close();
        }, 100);
      }
    });
  } catch (error) {
    console.error("Failed to set up window handlers:", error);
  }
};

// Set up window handlers in development and production
setupWindowHandlers();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
