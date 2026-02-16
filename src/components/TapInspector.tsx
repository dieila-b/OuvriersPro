// src/components/TapInspector.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

type Hit = {
  tag: string;
  id?: string;
  cls?: string;
  z?: string;
  pos?: string;
  pe?: string;
  rect?: { x: number; y: number; w: number; h: number };
};

function describe(el: Element | null): Hit | null {
  if (!el) return null;
  const h = el as HTMLElement;
  const cs = window.getComputedStyle(h);
  const r = h.getBoundingClientRect();

  return {
    tag: h.tagName.toLowerCase(),
    id: h.id || undefined,
    cls: (h.className && String(h.className).slice(0, 160)) || undefined,
    z: cs.zIndex || undefined,
    pos: cs.position || undefined,
    pe: cs.pointerEvents || undefined,
    rect: {
      x: Math.round(r.left),
      y: Math.round(r.top),
      w: Math.round(r.width),
      h: Math.round(r.height),
    },
  };
}

function fmtShort(h: Hit | null) {
  if (!h) return "TapInspector actif — touche/clique sur “Connexion”";
  const id = h.id ? `#${h.id}` : "";
  return `Hit=${h.tag}${id} | pos=${h.pos ?? "?"} | z=${h.z ?? "?"} | pe=${h.pe ?? "?"}`;
}

async function copyText(text: string) {
  // Clipboard API (si dispo)
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  // Fallback execCommand
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "true");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function TapInspector() {
  const [hit, setHit] = useState<Hit | null>(null);
  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState<null | "ok" | "fail">(null);

  const boxRef = useRef<HTMLDivElement | null>(null);

  const shortText = useMemo(() => fmtShort(hit), [hit]);

  useEffect(() => {
    const paintBox = (info: Hit | null) => {
      if (!boxRef.current || !info?.rect) return;
      boxRef.current.style.left = info.rect.x + "px";
      boxRef.current.style.top = info.rect.y + "px";
      boxRef.current.style.width = info.rect.w + "px";
      boxRef.current.style.height = info.rect.h + "px";
      boxRef.current.style.display = "block";
    };

    const handleAt = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y);
      const info = describe(el);
      setHit(info);
      setCount((c) => c + 1);
      paintBox(info);

      // Log court + détail
      try {
        console.log("[TapInspector]", fmtShort(info));
        console.log("[TapInspector][detail]", info);
      } catch {}
    };

    const onTouch = (e: TouchEvent) => {
      const t = e.touches?.[0] || e.changedTouches?.[0];
      if (!t) return;
      handleAt(t.clientX, t.clientY);
    };

    const onPointer = (e: PointerEvent) => {
      handleAt(e.clientX, e.clientY);
    };

    const onMouse = (e: MouseEvent) => {
      handleAt(e.clientX, e.clientY);
    };

    // capture=true pour passer avant les handlers qui “mangent” l’event
    const opts: AddEventListenerOptions = { capture: true, passive: true };

    window.addEventListener("touchstart", onTouch, opts);
    window.addEventListener("pointerdown", onPointer, opts);
    window.addEventListener("mousedown", onMouse, opts);

    return () => {
      // Important: retirer avec capture:true
      window.removeEventListener("touchstart", onTouch as any, true);
      window.removeEventListener("pointerdown", onPointer as any, true);
      window.removeEventListener("mousedown", onMouse as any, true);
    };
  }, []);

  const doCopy = async () => {
    const ok = await copyText(shortText);
    setCopied(ok ? "ok" : "fail");
    window.setTimeout(() => setCopied(null), 900);
  };

  return (
    <>
      {/* Outline de l’élément touché */}
      <div
        ref={boxRef}
        style={{
          position: "fixed",
          zIndex: 2147483647,
          border: "2px solid #ff2d2d",
          pointerEvents: "none",
          display: "none",
          // rend plus stable sur WebView
          transform: "translateZ(0)",
        }}
      />

      {/* HUD toujours visible + bouton copier */}
      <div
        style={{
          position: "fixed",
          zIndex: 2147483647,
          left: 8,
          right: 8,
          top: 8,
          transform: "translateZ(0)",
          pointerEvents: "auto", // pour cliquer COPIER
        }}
        onPointerDown={(e) => {
          // évite que ton tap sur COPIER déclenche une mesure “parasite”
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(0,0,0,.78)",
            color: "white",
            padding: "10px 12px",
            borderRadius: 12,
            fontSize: 12,
            lineHeight: 1.25,
            boxShadow: "0 8px 28px rgba(0,0,0,.35)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>
              TapInspector ON <span style={{ opacity: 0.7 }}>({count})</span>
            </div>
            <div style={{ opacity: 0.95, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {shortText}
            </div>
          </div>

          <button
            type="button"
            onClick={doCopy}
            style={{
              flex: "0 0 auto",
              border: "1px solid rgba(255,255,255,.25)",
              background: "rgba(255,255,255,.12)",
              color: "white",
              padding: "8px 10px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {copied === "ok" ? "COPIÉ" : copied === "fail" ? "ÉCHEC" : "COPIER"}
          </button>
        </div>
      </div>

      {/* Panneau détail en bas (facultatif) */}
      <div
        style={{
          position: "fixed",
          zIndex: 2147483647,
          left: 8,
          bottom: 8,
          right: 8,
          background: "rgba(0,0,0,.72)",
          color: "white",
          padding: "8px 10px",
          borderRadius: 12,
          fontSize: 12,
          pointerEvents: "none",
          lineHeight: 1.25,
          transform: "translateZ(0)",
        }}
      >
        {!hit ? (
          <div>
            <b>Conseil:</b> touche “Connexion”, puis envoie-moi la ligne <b>Hit/pos/z/pe</b> (bouton COPIER).
          </div>
        ) : (
          <>
            <div>
              <b>Hit:</b> {hit.tag}
              {hit.id ? `#${hit.id}` : ""}
            </div>
            <div>
              <b>pos:</b> {hit.pos} &nbsp; <b>z:</b> {hit.z} &nbsp; <b>pe:</b> {hit.pe}
            </div>
            {hit.cls ? (
              <div>
                <b>class:</b> {hit.cls}
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
