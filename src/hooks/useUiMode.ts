// src/hooks/useUiMode.ts
import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";

export type UiMode = "desktop" | "mobile";

export type UiDebug = {
  native: boolean;
  effWidth: number;
  innerWidth: number;
  docWidth: number;
  vvWidth: number | null;
  dpr: number;
  forcedDesktopInApp: boolean;
};

function getEffectiveCssWidth(): number {
  if (typeof window === "undefined") return 9999;

  const w1 = window.innerWidth || Infinity;
  const w2 = document.documentElement?.clientWidth || Infinity;
  const w3 = window.visualViewport?.width || Infinity;
  const w4 = window.screen?.width || Infinity;

  return Math.floor(Math.min(w1, w2, w3, w4));
}

export function useUiMode(options?: {
  /** Force DESKTOP when running inside Capacitor native app */
  forceDesktopInApp?: boolean;
  /** breakpoint desktop threshold */
  desktopMinWidth?: number;

  /** width used for "desktop render" when forcing desktop on small screens */
  desktopRenderWidth?: number; // 👈 NEW
}) {
  const forceDesktopInApp = options?.forceDesktopInApp ?? true;
  const desktopMinWidth = options?.desktopMinWidth ?? 1024;
  const desktopRenderWidth = options?.desktopRenderWidth ?? 1200; // 👈 NEW

  const [mode, setMode] = useState<UiMode>(() => {
    const native = (() => {
      try {
        return Capacitor?.isNativePlatform?.() ?? false;
      } catch {
        return false;
      }
    })();

    if (native && forceDesktopInApp) return "desktop";
    const eff = getEffectiveCssWidth();
    return eff < desktopMinWidth ? "mobile" : "desktop";
  });

  const [debug, setDebug] = useState<UiDebug | null>(null);

  useEffect(() => {
    const compute = () => {
      const native = (() => {
        try {
          return Capacitor?.isNativePlatform?.() ?? false;
        } catch {
          return false;
        }
      })();

      const effWidth = getEffectiveCssWidth();
      const innerWidth = Math.floor(window.innerWidth || 0);
      const docWidth = Math.floor(document.documentElement?.clientWidth || 0);
      const vvWidth = window.visualViewport ? Math.floor(window.visualViewport.width) : null;
      const dpr = window.devicePixelRatio || 1;

      const nextMode: UiMode =
        native && forceDesktopInApp
          ? "desktop"
          : effWidth < desktopMinWidth
          ? "mobile"
          : "desktop";

      setMode(nextMode);
      setDebug({
        native,
        effWidth,
        innerWidth,
        docWidth,
        vvWidth,
        dpr,
        forcedDesktopInApp: forceDesktopInApp,
      });
    };

    compute();
    window.addEventListener("resize", compute);
    window.visualViewport?.addEventListener("resize", compute);

    return () => {
      window.removeEventListener("resize", compute);
      window.visualViewport?.removeEventListener("resize", compute);
    };
  }, [forceDesktopInApp, desktopMinWidth]);

  const isMobileUI = mode === "mobile";
  const isDesktopUI = mode === "desktop";

  // ✅ NEW: expose desktop variables to CSS (html dataset + CSS vars)
  useEffect(() => {
    if (typeof document === "undefined") return;

    const html = document.documentElement;
    html.setAttribute("data-ui-mode", mode);

    const eff = getEffectiveCssWidth();

    // scale only when in desktop mode AND screen is smaller than our render width
    const scale =
      mode === "desktop" ? Math.min(1, Math.max(0.35, eff / desktopRenderWidth)) : 1;

    html.style.setProperty("--ui-desktop-width", `${desktopRenderWidth}px`);
    html.style.setProperty("--ui-scale", String(scale));
  }, [mode, desktopRenderWidth]);

  return useMemo(
    () => ({
      mode,
      isMobileUI,
      isDesktopUI,
      debug,
    }),
    [mode, isMobileUI, isDesktopUI, debug]
  );
}
