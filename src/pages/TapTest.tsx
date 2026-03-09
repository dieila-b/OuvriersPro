// src/pages/TapTest.tsx
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const BUILD_TAG =
  // @ts-ignore
  (import.meta as any).env?.VITE_BUILD_TAG || "tap-test-2026-03-09";

function detectNative(): boolean {
  try {
    const sp = new URLSearchParams(window.location.search || "");
    if (sp.get("forceNative") === "1") return true;
  } catch {}

  try {
    const wCap = (window as any)?.Capacitor;
    if (wCap?.isNativePlatform?.()) return true;
  } catch {}

  try {
    const p = window.location?.protocol ?? "";
    if (p === "capacitor:" || p === "file:") return true;
  } catch {}

  // dernier recours: attribut UI mode (peut être posé après mount)
  try {
    return document.documentElement?.getAttribute("data-ui-native") === "true";
  } catch {
    return false;
  }
}

export default function TapTest() {
  const navigate = useNavigate();

  const isNative = useMemo(() => detectNative(), []);
  const nativeAttr =
    typeof document !== "undefined" ? document.documentElement?.getAttribute("data-ui-native") : null;

  const go = (to: string) => {
    try {
      console.log("[TapTest] click", {
        to,
        isNative,
        nativeAttr,
        href: window.location.href,
        hash: window.location.hash,
        build: BUILD_TAG,
      });
    } catch {}

    try {
      navigate(to);
    } catch (e) {
      try {
        console.warn("[TapTest] navigate() threw", e);
      } catch {}
    }

    // ✅ HashRouter native: forcer le hash immédiatement (zéro wrapper)
    if (isNative) {
      try {
        const want = `#${to.startsWith("/") ? to : `/${to}`}`;
        if (window.location.hash !== want) window.location.hash = want;
      } catch {}
    }
  };

  return (
    <div className="min-h-dvh w-full px-4 py-6">
      <h1 className="text-lg font-semibold text-foreground">Tap Test (Android/Capacitor)</h1>

      <div className="mt-3 rounded-lg border border-border bg-background p-3 text-sm text-foreground">
        <div className="font-semibold">Diagnostics</div>
        <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">
{JSON.stringify(
  {
    build: BUILD_TAG,
    isNative,
    nativeAttr,
    href: typeof window !== "undefined" ? window.location.href : null,
    hash: typeof window !== "undefined" ? window.location.hash : null,
  },
  null,
  2
)}
        </pre>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        <button
          type="button"
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          onClick={() => go("/login")}
        >
          Aller à /login
        </button>

        <button
          type="button"
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground"
          onClick={() => go("/inscription-ouvrier")}
        >
          Aller à /inscription-ouvrier
        </button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Astuce: en natif (HashRouter), l’URL attendue ressemble à <code>#/login</code>.
      </p>
    </div>
  );
}
