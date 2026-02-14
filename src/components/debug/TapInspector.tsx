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
    rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
  };
}

export default function TapInspector() {
  const [hit, setHit] = useState<Hit | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onTouch = (e: TouchEvent) => {
      const t = e.touches?.[0];
      if (!t) return;
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const info = describe(el);
      setHit(info);

      // outline l'élément qui capte le tap
      if (boxRef.current && info?.rect) {
        boxRef.current.style.left = info.rect.x + "px";
        boxRef.current.style.top = info.rect.y + "px";
        boxRef.current.style.width = info.rect.w + "px";
        boxRef.current.style.height = info.rect.h + "px";
        boxRef.current.style.display = "block";
      }
    };

    // capture=true pour voir avant que ça soit bloqué
    window.addEventListener("touchstart", onTouch, { capture: true, passive: true });
    return () => window.removeEventListener("touchstart", onTouch as any, true);
  }, []);

  if (!hit) {
    return (
      <>
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
        <div
          style={{
            position: "fixed",
            zIndex: 2147483647,
            left: 8,
            bottom: 8,
            background: "rgba(0,0,0,.75)",
            color: "white",
            padding: "8px 10px",
            borderRadius: 10,
            fontSize: 12,
            pointerEvents: "none",
          }}
        >
          TapInspector actif — touche un bouton sur mobile
        </div>
      </>
    );
  }

  return (
    <>
      <div
        ref={boxRef}
        style={{
          position: "fixed",
          zIndex: 2147483647,
          border: "2px solid red",
          pointerEvents: "none",
        }}
      />
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
        <div><b>Hit:</b> {hit.tag}{hit.id ? `#${hit.id}` : ""}</div>
        <div><b>pos:</b> {hit.pos} &nbsp; <b>z:</b> {hit.z} &nbsp; <b>pe:</b> {hit.pe}</div>
        {hit.cls ? <div><b>class:</b> {hit.cls}</div> : null}
      </div>
    </>
  );
}
