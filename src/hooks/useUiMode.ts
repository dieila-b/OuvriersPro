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
  protocol: string;
  host: string;
};

function safeGetWindowCapacitor(): any | null {
  try {
    return (window as any)?.Capacitor ?? null;
  } catch {
    return null;
  }
}

/**
 * ✅ Détection native “réelle” (émulateur + téléphone)
 * - Capacitor.isNativePlatform()
 * - window.Capacitor.isNativePlatform()
 * - protocol capacitor:/file:
 * - cas Android WebView Capacitor: http://localhost
 */
function isNativeRuntime(): boolean {
  const wCap = safeGetWindowCapacitor();

  try {
    if (Capacitor?.isNativePlatform?.()) return true;
  } catch {}

  try {
    if (wCap?.isNativePlatform?.()) return true;
  } catch {}

  try {
    const p = window.location?.protocol ?? "";
    if (p === "capacitor:" || p === "file:") return true;
  } catch {}

  // ✅ Très fréquent en Capacitor Android : http://localhost (local server)
  try {
    const { protocol, hostname } = window.location;
    if (wCap && protocol === "http:" && hostname === "localhost") return true;
  } catch {}

  // fallback
  try {
    const gp = (Capacitor as any)?.getPlatform?.();
    if (gp && gp !== "web") return true;
  } catch {}

  return false;
}

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
  desktopRenderWidth?: number;
}) {
  const forceDesktopInApp = options?.forceDesktopInApp ?? false;
  const desktopMinWidth = options?.desktopMinWidth ?? 1024;
  const desktopRenderWidth = options?.desktopRenderWidth ?? 1200;

  const [mode, setMode] = useState<UiMode>(() => {
    const native = isNativeRuntime();
    if (native && forceDesktopInApp) return "desktop";
    const eff = getEffectiveCssWidth();
    return eff < desktopMinWidth ? "mobile" : "desktop";
  });

  const [debug, setDebug] = useState<UiDebug | null>(null);

  useEffect(() => {
    const compute = () => {
      const native = isNativeRuntime();

      const effWidth = getEffectiveCssWidth();
      const innerWidth = Math.floor(window.innerWidth || 0);
      const docWidth = Math.floor(document.documentElement?.clientWidth || 0);
      const vvWidth = window.visualViewport ? Math.floor(window.visualViewport.width) : null;
      const dpr = window.devicePixelRatio || 1;

      const nextMode: UiMode =
        native && forceDesktopInApp ? "desktop" : effWidth < desktopMinWidth ? "mobile" : "desktop";

      setMode(nextMode);

      const protocol = (() => {
        try {
          return window.location?.protocol ?? "";
        } catch {
          return "";
        }
      })();

      const host = (() => {
        try {
          return window.location?.host ?? "";
        } catch {
          return "";
        }
      })();

      setDebug({
        native,
        effWidth,
        innerWidth,
        docWidth,
        vvWidth,
        dpr,
        forcedDesktopInApp: forceDesktopInApp,
        protocol,
        host,
      });
    };

    compute();
    window.addEventListener("resize", compute, { passive: true });
    window.visualViewport?.addEventListener("resize", compute, { passive: true });

    return () => {
      window.removeEventListener("resize", compute as any);
      window.visualViewport?.removeEventListener("resize", compute as any);
    };
  }, [forceDesktopInApp, desktopMinWidth]);

  const isMobileUI = mode === "mobile";
  const isDesktopUI = mode === "desktop";

  /**
   * ✅ CRITIQUE POUR ANDROID WEBVIEW :
   * En natif => NE JAMAIS appliquer de scale CSS (source #1 des “clics ignorés”).
   * On garde seulement les variables informatives.
   */
  useEffect(() => {
    if (typeof document === "undefined") return;

    const html = document.documentElement;
    const native = isNativeRuntime();

    html.setAttribute("data-ui-mode", mode);
    html.setAttribute("data-ui-native", native ? "true" : "false");

    // On expose quand même la "desktop width" (utile pour layouts), mais sans scale en natif.
    html.style.setProperty("--ui-desktop-width", `${desktopRenderWidth}px`);

    if (native) {
      // ✅ Pas de zoom/scale en natif
      html.style.setProperty("--ui-scale", "1");
      return;
    }

    // Web uniquement : scale si on veut rendre un desktop dans un viewport plus petit
    const eff = getEffectiveCssWidth();
    const scale = mode === "desktop" ? Math.min(1, Math.max(0.35, eff / desktopRenderWidth)) : 1;
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
