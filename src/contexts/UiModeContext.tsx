// src/contexts/UiModeContext.tsx
import React, { createContext, useContext, ReactNode } from "react";
import { useUiMode, UiDebug, UiMode } from "@/hooks/useUiMode";

type UiModeContextValue = {
  mode: UiMode;
  isMobileUI: boolean;
  isDesktopUI: boolean;
  debug: UiDebug | null;
};

const UiModeContext = createContext<UiModeContextValue | null>(null);

export function UiModeProvider({ children }: { children: ReactNode }) {
  // ✅ ICI : desktop forcé dans l’app Capacitor (émulateur)
  const ui = useUiMode({ forceDesktopInApp: true, desktopMinWidth: 1024 });

  return <UiModeContext.Provider value={ui}>{children}</UiModeContext.Provider>;
}

export function useUiModeCtx() {
  const ctx = useContext(UiModeContext);
  if (!ctx) {
    throw new Error("useUiModeCtx must be used within UiModeProvider");
  }
  return ctx;
}
