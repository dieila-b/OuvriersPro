// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
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

/**
 * ✅ WebView Android: améliore la fiabilité des taps
 * - empêche certaines sélections/gestures qui bloquent les click
 * - rend les boutons plus réactifs (sans casser desktop)
 */
try {
  const isAndroid = /Android/i.test(navigator.userAgent);
  if (isAndroid) {
    document.addEventListener(
      "touchstart",
      () => {
        // no-op: améliore la “clickability” sur certains WebView
      },
      { passive: true }
    );
  }
} catch {}

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

// ✅ Router is handled inside App.tsx via RouterSwitch
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
