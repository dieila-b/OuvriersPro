// src/contexts/UiModeContext.tsx
import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { useUiMode, UiDebug, UiMode } from "@/hooks/useUiMode";

type UiModeContextValue = {
  mode: UiMode;
  isMobileUI: boolean;
  isDesktopUI: boolean;
  debug: UiDebug | null;
};

const UiModeContext = createContext<UiModeContextValue | null>(null);

/**
 * ✅ Détection native robuste (Capacitor / file / android webview)
 * Objectif: NE JAMAIS forcer le desktop dans l’app.
 */
function isNativeRuntime() {
  try {
    const p = window.location?.protocol ?? "";
    if (p === "capacitor:" || p === "file:") return true;
  } catch {}

  // Android WebView Capacitor expose souvent "wv" ou "Capacitor" dans UA
  try {
    const ua = navigator.userAgent || "";
    if (/Capacitor/i.test(ua)) return true;
  } catch {}

  return false;
}

export function UiModeProvider({ children }: { children: ReactNode }) {
  const native = useMemo(() => {
    try {
      return isNativeRuntime();
    } catch {
      return false;
    }
  }, []);

  /**
   * ✅ FIX IMPORTANT:
   * - en natif => PAS de desktop forcé (sinon wrapper/scale et taps perdus)
   * - sur web => tu peux garder ton comportement normal
   */
  const ui = useUiMode({
    forceDesktopInApp: false, // ✅ FIX: ne jamais forcer desktop dans Capacitor
    desktopMinWidth: 1024,
  });

  // Optionnel: si ton hook expose debug.native etc, ça reste OK.
  // Si tu veux, on peut enrichir `debug` plus tard, mais on évite de casser l’API.

  return <UiModeContext.Provider value={ui}>{children}</UiModeContext.Provider>;
}

export function useUiModeCtx() {
  const ctx = useContext(UiModeContext);
  if (!ctx) throw new Error("useUiModeCtx must be used within UiModeProvider");
  return ctx;
}
