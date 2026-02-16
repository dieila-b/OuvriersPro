// src/components/TapInspector.tsx
import React, { useEffect, useRef, useState } from "react";

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

export default function TapInspector() {
  const [hit, setHit] = useState<Hit | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

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
      paintBox(info);

      // ✅ utile si overlay invisible: on log aussi en console
      try {
        console.log("[TapInspector]", info);
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
    window.addEventListener("touchstart", onTouch, { capture: true, passive: true });
    window.addEventListener("pointerdown", onPointer, { capture: true, passive: true });
    window.addEventListener("mousedown", onMouse, { capture: true, passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouch as any, true);
      window.removeEventListener("pointerdown", onPointer as any, true);
      window.removeEventListener("mousedown", onMouse as any, true);
    };
  }, []);

  return (
    <>
      {/* outline de l’élément touché */}
      <div
        ref={boxRef}
        style={{
          position: "fixed",
          zIndex: 2147483647,
          border: "2px solid red",
          pointerEvents: "none",
          display: "none",
        }}
      />

      {/* badge */}
      <div
        style={{
          position: "fixed",
          zIndex: 2147483647,
          left: 8,
          bottom: 8,
          right: 8,
          background: "rgba(0,0,0,.75)",
          color: "white",
          padding: "8px 10px",
          borderRadius: 10,
          fontSize: 12,
          pointerEvents: "none",
          lineHeight: 1.25,
        }}
      >
        {!hit ? (
          <div>
            <b>TapInspector actif</b> — touche (ou clique) sur “Connexion”
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
