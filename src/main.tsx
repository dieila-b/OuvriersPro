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
if (!rootEl) throw new Error("Root element #root not found");

const isNative = (() => {
  try {
    return Capacitor?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
})();

/**
 * ✅ Fix #2 (HashRouter natif) — Normalisation anti-404 :
 * - Quand l’app reçoit /inscription-ouvrier (sans #), HashRouter ne matche pas et tu tombes sur NotFound.
 * - On convertit une URL "path" en URL hash "/#/path" SANS recharger (replaceState).
 * - Important: ne touche pas au web (BrowserRouter).
 */
const normalizeNativeHashRoute = () => {
  if (!isNative) return;

  // Ex: "/inscription-ouvrier?plan=FREE" => "/#/inscription-ouvrier?plan=FREE"
  const { pathname, search, hash } = window.location;

  // Si déjà en hash (ex: "#/inscription-ouvrier"), rien à faire
  if (hash && hash.startsWith("#/")) return;

  // Si on est à "/" ou vide, on force la home hash
  const targetPath = (pathname && pathname !== "/" ? pathname : "/") + (search || "");
  const nextUrl = `/#${targetPath.startsWith("/") ? targetPath : `/${targetPath}`}`;

  // Remplace l’URL sans reload
  window.history.replaceState(null, "", nextUrl);
};

// ✅ Doit s’exécuter AVANT le rendu du Router
normalizeNativeHashRoute();

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
