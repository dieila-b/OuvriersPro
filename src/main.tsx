// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { HashRouter, BrowserRouter } from "react-router-dom";
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
if (!rootEl) {
  throw new Error("Root element #root not found");
}

const isNative = Capacitor.isNativePlatform();

// ✅ Natif (Android/iOS): HashRouter évite les soucis de deep-links/refresh
// ✅ Web: BrowserRouter (si ton hosting gère bien les routes) sinon remets HashRouter aussi
const Router: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return isNative ? <HashRouter>{children}</HashRouter> : <BrowserRouter>{children}</BrowserRouter>;
};

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>
);
