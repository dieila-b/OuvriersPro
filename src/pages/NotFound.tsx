import React, { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isNative = useMemo(() => {
    try {
      return Capacitor?.isNativePlatform?.() || (Capacitor as any)?.getPlatform?.() !== "web";
    } catch {
      return false;
    }
  }, []);

  const debug = useMemo(() => {
    const w = typeof window !== "undefined" ? window : (null as any);
    const d = typeof document !== "undefined" ? document : (null as any);

    return {
      isNative,
      href: w?.location?.href ?? null,
      origin: w?.location?.origin ?? null,
      protocol: w?.location?.protocol ?? null,
      host: w?.location?.host ?? null,
      pathname: w?.location?.pathname ?? null,
      search: w?.location?.search ?? null,
      hash: w?.location?.hash ?? null,
      baseURI: d?.baseURI ?? null,
      location_pathname: location.pathname,
      location_search: location.search,
      location_hash: location.hash,
    };
  }, [isNative, location.pathname, location.search, location.hash]);

  useEffect(() => {
    console.error("[404] route not found", debug);

    // ✅ AUTO-REPAIR : en natif, si on arrive en "path mode" (sans #/),
    // on convertit en hash et on renvoie vers la route.
    if (!isNative) return;

    try {
      const href = window.location.href;
      const u = new URL(href);
      const hasHashRoute = (u.hash || "").startsWith("#/");

      // Exemple: capacitor://localhost/forfaits  -> on veut #/forfaits
      if (!hasHashRoute) {
        const path = (u.pathname || "/").replace(/\/+$/, "") || "/";
        if (path !== "/") {
          u.hash = `#${path}`;
          u.pathname = "/";
          window.history.replaceState({}, "", u.toString());

          // Synchronise React Router
          navigate(path, { replace: true });
        } else {
          // si c'est "/" mais route inconnue côté router, on force home
          navigate("/", { replace: true });
        }
      }
    } catch {
      // fallback simple
      navigate("/", { replace: true });
    }
  }, [debug, isNative, navigate]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // no toast ici pour ne pas dépendre d’autres composants
      alert("Copié ✅");
    } catch {
      // fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        alert("Copié ✅");
      } catch {}
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-5xl font-bold mb-3">404</h1>
        <p className="text-base text-gray-600 mb-5">
          Oops! Page not found
        </p>

        <div className="rounded-xl border bg-white p-4 text-left shadow-sm">
          <div className="text-sm font-semibold text-gray-800 mb-2">
            Debug téléphone (copie/partage-moi ça)
          </div>
          <pre className="text-[11px] leading-4 whitespace-pre-wrap break-words text-gray-700">
{JSON.stringify(debug, null, 2)}
          </pre>

          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => copy(JSON.stringify(debug, null, 2))}
              className="w-full sm:w-auto px-4 py-2 rounded-lg border text-sm"
            >
              Copier le debug
            </button>

            <button
              type="button"
              onClick={() => navigate("/", { replace: true })}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
            >
              Retour à l’accueil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
