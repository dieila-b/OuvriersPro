// src/contexts/UiModeContext.tsx
import React, { createContext, useContext, ReactNode } from "react";
import { useUiMode, UiDebug, UiMode } from "@/hooks/useUiMode";

// ✅ Détection native locale (évite import circulaire avec App.tsx)
const isNativeRuntime = () => {
  try {
    // window.Capacitor est très fiable en natif
    const wCap = (window as any)?.Capacitor;
    if (wCap?.isNativePlatform?.()) return true;
  } catch {}

  try {
    const p = window.location?.protocol ?? "";
    if (p === "capacitor:" || p === "file:") return true;
  } catch {}

  // ✅ Capacitor Android utilise souvent http://localhost
  try {
    const wCap = (window as any)?.Capacitor;
    const { protocol, hostname } = window.location;
    if (wCap && protocol === "http:" && hostname === "localhost") return true;
  } catch {}

  return false;
};

type UiModeContextValue = {
  mode: UiMode;
  isMobileUI: boolean;
  isDesktopUI: boolean;
  debug: UiDebug | null;
};

const UiModeContext = createContext<UiModeContextValue | null>(null);

export function UiModeProvider({ children }: { children: ReactNode }) {
  const native = isNativeRuntime();

  /**
   * ✅ IMPORTANT :
   * - En natif (émulateur/téléphone) => NE JAMAIS forcer le desktop.
   * - Sinon, le wrapper desktop/scale peut “manger” les taps sur WebView.
   */
  const ui = useUiMode({
    forceDesktopInApp: false,      // ✅ FIX CRITIQUE
    desktopMinWidth: native ? 0 : 1024,
  });

  return <UiModeContext.Provider value={ui}>{children}</UiModeContext.Provider>;
}

export function useUiModeCtx() {
  const ctx = useContext(UiModeContext);
  if (!ctx) throw new Error("useUiModeCtx must be used within UiModeProvider");
  return ctx;
}
