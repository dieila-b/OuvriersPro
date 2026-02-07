// src/pages/NotFound.tsx
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

const NotFound = () => {
  const location = useLocation();
  const isNative = (() => {
    try {
      return Capacitor?.isNativePlatform?.() ?? false;
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname, {
      href: typeof window !== "undefined" ? window.location.href : null,
      hash: typeof window !== "undefined" ? window.location.hash : null,
      isNative,
    });
  }, [location.pathname, isNative]);

  // ✅ Fix #2: en natif (HashRouter), la home doit être "/#/" (sinon 404)
  const homeHref = isNative ? "/#/" : "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>

        {/* ✅ Utiliser un <a> est le plus robuste en WebView */}
        <a href={homeHref} className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
