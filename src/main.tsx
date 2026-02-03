// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

/**
 * 🔥 Anti "ancienne UI" (PWA / Service Worker / cache WebView)
 * - Désinscrit tous les Service Workers
 * - Purge Cache Storage
 *
 * Safe: si SW/caches n'existent pas => no-op.
 * Utile: évite que l'émulateur garde une ancienne version des assets.
 */
async function purgeServiceWorkersAndCaches() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.warn("[CachePurge] Unable to purge SW/caches:", e);
  }
}

// Global error handler to prevent blank screens from unhandled promise rejections
window.addEventListener("unhandledrejection", (event) => {
  console.error("[Global] Unhandled promise rejection:", event.reason);
  event.preventDefault();
});

window.addEventListener("error", (event) => {
  console.error("[Global] Uncaught error:", (event as any).error || event);
});

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

// Purge SW/cache BEFORE rendering to avoid serving stale assets
purgeServiceWorkersAndCaches().finally(() => {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>
  );
});
