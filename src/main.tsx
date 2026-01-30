// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Global error handler to prevent blank screens from unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  console.error("[Global] Unhandled promise rejection:", event.reason);
  event.preventDefault();
});

window.addEventListener("error", (event) => {
  console.error("[Global] Uncaught error:", event.error);
});

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
