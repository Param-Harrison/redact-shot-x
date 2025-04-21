import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Simple main file - pywebview handles the window lifecycle
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
