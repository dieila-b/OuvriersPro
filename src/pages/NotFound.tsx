import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

const isNativeRuntime = () => {
  try {
    if (Capacitor?.isNativePlatform?.()) return true;
  } catch {
    // ignore
  }

  try {
    const gp = (Capacitor as any)?.getPlatform?.();
    if (gp && gp !== "web") return true;
  } catch {
    // ignore
  }

  try {
    const protocol = window.location?.protocol ?? "";
    return protocol === "capacitor:" || protocol === "file:";
  } catch {
    return false;
  }
};

const NotFound = () => {
  const navigate = useNavigate();
  const isNative = useMemo(() => isNativeRuntime(), []);

  useEffect(() => {
    if (!isNative) return;

    try {
      const url = new URL(window.location.href);
      const hasHashRoute = (url.hash || "").startsWith("#/");
      if (hasHashRoute) return;

      const path = (url.pathname || "/").replace(/\/+$/, "") || "/";
      const normalizedPath = path === "/index" || path === "/index.html" ? "/" : path;

      if (normalizedPath !== "/") {
        url.hash = `#${normalizedPath}`;
        url.pathname = "/";
        window.history.replaceState({}, "", url.toString());
        navigate(normalizedPath, { replace: true });
        return;
      }

      navigate("/", { replace: true });
    } catch {
      navigate("/", { replace: true });
    }
  }, [isNative, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-5xl font-bold mb-3 text-foreground">404</h1>
        <p className="text-base text-muted-foreground mb-5">Oops! Page not found</p>

        <div className="rounded-xl border border-border bg-card p-4 text-left shadow-sm">
          <p className="text-sm text-muted-foreground mb-3">
            Cette page n’existe pas ou le lien est invalide.
          </p>
          <button
            type="button"
            onClick={() => navigate("/", { replace: true })}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
          >
            Retour à l’accueil
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
