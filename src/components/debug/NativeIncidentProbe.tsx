// src/components/debug/NativeIncidentProbe.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { BUILD_STAMP } from "@/lib/buildStamp";

type LastEvt = {
  type: string;
  x: number;
  y: number;
  time: number;
  hit?: string;
  pe?: string;
  z?: string;
  pos?: string;
};

function isNativeRuntime(): boolean {
  try {
    const sp = new URLSearchParams(window.location.search || "");
    if (sp.get("forceNative") === "1") return true;
  } catch {}

  try {
    if (Capacitor?.isNativePlatform?.()) return true;
  } catch {}

  try {
    const wCap = (window as any)?.Capacitor;
    if (wCap?.isNativePlatform?.()) return true;
  } catch {}

  try {
    const p = window.location?.protocol ?? "";
    if (p === "capacitor:" || p === "file:") return true;
  } catch {}

  try {
    const gp = (Capacitor as any)?.getPlatform?.();
    if (gp && gp !== "web") return true;
  } catch {}

  return false;
}

function describeHit(el: Element | null) {
  if (!el) return null;
  const h = el as HTMLElement;
  const cs = window.getComputedStyle(h);
  const id = h.id ? `#${h.id}` : "";
  const cls = h.className ? String(h.className).trim().split(/\s+/).slice(0, 3).join(".") : "";
  return {
    s: `${h.tagName.toLowerCase()}${id}${cls ? `.${cls}` : ""}`,
    pe: cs.pointerEvents,
    z: cs.zIndex,
    pos: cs.position,
  };
}

export default function NativeIncidentProbe() {
  const navigate = useNavigate();
  const location = useLocation();

  const native = useMemo(() => isNativeRuntime(), []);

  // ✅ Incident mode: in real native (Capacitor), always show the probe (no query-string dependency)
  const enabled = useMemo(() => {
    if (native) return true;
    try {
      const sp = new URLSearchParams(window.location.search || "");
      return sp.get("incident") === "1" || sp.get("uiDebug") === "1";
    } catch {
      return false;
    }
  }, [native]);

  const [lastEvt, setLastEvt] = useState<LastEvt | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    try {
      console.log("[NativeIncidentProbe][boot]", {
        stamp: BUILD_STAMP,
        native,
        href: window.location.href,
        hash: window.location.hash,
      });
    } catch {}
  }, [enabled, native]);

  useEffect(() => {
    if (!enabled) return;


    const onAny = (type: string, x: number, y: number) => {
      const el = document.elementFromPoint(x, y);
      const hit = describeHit(el);
      setLastEvt({
        type,
        x: Math.round(x),
        y: Math.round(y),
        time: Date.now(),
        hit: hit?.s,
        pe: hit?.pe,
        z: hit?.z,
        pos: hit?.pos,
      });
    };

    const onTouch = (e: TouchEvent) => {
      const t = e.touches?.[0] || e.changedTouches?.[0];
      if (!t) return;
      onAny("touchstart", t.clientX, t.clientY);
    };
    const onPointer = (e: PointerEvent) => onAny("pointerdown", e.clientX, e.clientY);
    const onClick = (e: MouseEvent) => onAny("click", e.clientX, e.clientY);

    const opts: AddEventListenerOptions = { capture: true, passive: true };
    window.addEventListener("touchstart", onTouch, opts);
    window.addEventListener("pointerdown", onPointer, opts);
    window.addEventListener("click", onClick, { capture: true, passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouch as any, true);
      window.removeEventListener("pointerdown", onPointer as any, true);
      window.removeEventListener("click", onClick as any, true);
    };
  }, [enabled]);

  const hardGo = (to: string) => {
    setLastAction(`go(${to}) @ ${new Date().toISOString()}`);

    // 1) Router navigate
    try {
      navigate(to);
    } catch (e) {
      try {
        console.warn("[NativeIncidentProbe] navigate() threw", e);
      } catch {}
    }

    // 2) Native HashRouter: force hash immediately
    try {
      const wantHash = `#${to.startsWith("/") ? to : `/${to}`}`;
      if (native && window.location.hash !== wantHash) window.location.hash = wantHash;
    } catch {}

    // 3) Ultimate fallback: hard navigation (web only)
    window.setTimeout(() => {
      try {
        if (!native && window.location.pathname !== to) window.location.assign(to);
      } catch {}
    }, 0);
  };

  if (!enabled) return null;

  return (
    <div
      className="fixed inset-x-2 bottom-2 z-[2147483646] pointer-events-auto"
      style={{ transform: "translateZ(0)" }}
    >
      <div className="rounded-2xl bg-foreground/90 text-background shadow-lg ring-1 ring-background/15 px-3 py-3 text-xs leading-snug">
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-black tracking-wide">ANDROID INCIDENT PROBE</div>
          <div className="opacity-80">stamp: {BUILD_STAMP}</div>
        </div>

        <div className="mt-2 opacity-90 break-words">
          native={String(native)} | href={typeof window !== "undefined" ? window.location.href : "—"}
        </div>
        <div className="mt-1 opacity-90 break-words">
          path={location.pathname} | hash={typeof window !== "undefined" ? window.location.hash : "—"}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => hardGo("/login")}
            className="rounded-xl border border-background/20 bg-background/10 px-3 py-2 font-extrabold"
          >
            TEST: LOGIN
          </button>
          <button
            type="button"
            onClick={() => hardGo("/inscription-ouvrier")}
            className="rounded-xl border border-background/20 bg-background/10 px-3 py-2 font-extrabold"
          >
            TEST: PRESTATAIRE
          </button>
        </div>

        <div className="mt-3 opacity-85">lastAction: {lastAction ?? "—"}</div>
        <div className="mt-1 opacity-85 break-words">
          lastEvt:{" "}
          {lastEvt
            ? `${lastEvt.type} @ (${lastEvt.x},${lastEvt.y}) hit=${lastEvt.hit} pe=${lastEvt.pe} z=${lastEvt.z} pos=${lastEvt.pos}`
            : "—"}
        </div>
      </div>
    </div>
  );
}
