// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { HashRouter } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

// Global error handler to prevent blank screens from unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  console.error("[Global] Unhandled promise rejection:", event.reason);
  event.preventDefault();
});

window.addEventListener("error", (event) => {
  console.error("[Global] Uncaught error:", event.error);
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

// ✅ Détection native plus robuste (Capacitor + protocole)
const isNative =
  (() => {
    try {
      return Capacitor?.isNativePlatform?.() ?? false;
    } catch {
      return false;
    }
  })() ||
  window.location.protocol === "capacitor:" ||
  window.location.protocol === "file:";

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    {/* ✅ HashRouter en natif (et ok aussi en web si jamais) */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
