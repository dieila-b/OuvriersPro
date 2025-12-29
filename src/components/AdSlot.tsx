import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type AdCampaign = {
  id: string;
  title: string;
  link_url: string | null;
  placement: string;
  start_at: string | null;
  end_at: string | null;
  status: "draft" | "published" | "paused" | "ended";
  created_at?: string;
};

type AdAsset = {
  id: string;
  campaign_id: string;
  media_type: "image" | "video";
  storage_path: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at?: string;
};

type Slide = {
  campaign: AdCampaign;
  asset: AdAsset;
  signedUrl: string;
};

type Props = {
  placement: string;
  className?: string;

  // Signed URL
  expiresIn?: number; // seconds

  // Data
  limit?: number;

  // UX
  autoplay?: boolean;
  intervalMs?: number;
  pauseOnHover?: boolean;

  // Stacked deck
  stackSize?: number; // how many cards visible in the stack
  swipeThreshold?: number; // px to trigger swipe
  height?: "sm" | "md" | "lg";

  // UI
  showDots?: boolean;
  showControls?: boolean;
  showCta?: boolean;
  ctaLabel?: string;
  label?: string; // "Sponsorisé"
};

const BUCKET = "ads-media";

const HEIGHT_MAP: Record<NonNullable<Props["height"]>, string> = {
  sm: "min-h-[210px] sm:min-h-[250px] md:min-h-[290px]",
  md: "min-h-[260px] sm:min-h-[320px] md:min-h-[380px]",
  lg: "min-h-[320px] sm:min-h-[390px] md:min-h-[460px]",
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const AdSlot: React.FC<Props> = ({
  placement,
  className,

  expiresIn = 300,
  limit = 10,

  autoplay = true,
  intervalMs = 6500,
  pauseOnHover = true,

  stackSize = 3,
  swipeThreshold = 70,
  height = "lg",

  showDots = true,
  showControls = true,
  showCta = true,
  ctaLabel = "Découvrir",
  label = "Sponsorisé",
}) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);

  const [isHover, setIsHover] = useState(false);

  // Drag state (mouse + touch)
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerDownX = useRef<number | null>(null);

  // For nice "throw" animation when releasing
  const [releaseDir, setReleaseDir] = useState<0 | 1 | -1>(0);
  const releaseTimer = useRef<number | null>(null);

  // Autoplay interval
  const timerRef = useRef<number | null>(null);

  // Parallax-ish background blur (light)
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [bgShift, setBgShift] = useState(0);
  const rafRef = useRef<number | null>(null);

  const nowIso = useMemo(() => new Date().toISOString(), [placement]);

  const inWindow = (c: AdCampaign) =>
    (c.start_at ? c.start_at <= nowIso : true) &&
    (c.end_at ? c.end_at >= nowIso : true);

  const goNext = () => {
    if (slides.length <= 1) return;
    setIndex((i) => (i + 1) % slides.length);
  };

  const goPrev = () => {
    if (slides.length <= 1) return;
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  };

  const primeRelease = (dir: 1 | -1) => {
    // Trigger a short "throw away" animation then switch slide
    if (releaseTimer.current) window.clearTimeout(releaseTimer.current);
    setReleaseDir(dir);
    releaseTimer.current = window.setTimeout(() => {
      setReleaseDir(0);
    }, 260);
  };

  // Load slides: campaigns (published) + last asset + signed url
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const { data: campaigns, error: cErr } = await supabase
          .from("ads_campaigns")
          .select("id,title,link_url,placement,start_at,end_at,status,created_at")
          .eq("placement", placement)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (cErr) throw cErr;

        const valid = (campaigns as AdCampaign[] | null)?.filter(inWindow) ?? [];
        if (!valid.length) {
          if (!cancelled) setSlides([]);
          return;
        }

        const built: Slide[] = [];
        for (const c of valid) {
          const { data: assets } = await supabase
            .from("ads_assets")
            .select("id,campaign_id,media_type,storage_path,mime_type,size_bytes,created_at")
            .eq("campaign_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1);

          const a = (assets?.[0] as AdAsset) ?? null;
          if (!a?.storage_path) continue;

          const { data: signed, error: sErr } = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(a.storage_path, expiresIn);

          if (sErr || !signed?.signedUrl) continue;

          built.push({ campaign: c, asset: a, signedUrl: signed.signedUrl });
        }

        if (!cancelled) {
          setSlides(built);
          setIndex(0);
          setDragX(0);
          setIsDragging(false);
        }
      } catch {
        if (!cancelled) setSlides([]);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [placement, expiresIn, limit, nowIso]);

  // Autoplay
  useEffect(() => {
    if (!autoplay) return;
    if (slides.length <= 1) return;

    if (timerRef.current) window.clearInterval(timerRef.current);

    const shouldPause = pauseOnHover && isHover;
    if (shouldPause || isDragging) return;

    timerRef.current = window.setInterval(() => {
      primeRelease(1);
      goNext();
    }, Math.max(2500, intervalMs));

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [autoplay, slides.length, intervalMs, isHover, pauseOnHover, isDragging]);

  // Light background shift on scroll (premium feel)
  useEffect(() => {
    const update = () => {
      if (!shellRef.current) return;
      const rect = shellRef.current.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const center = rect.top + rect.height / 2;
      const n = (center - vh / 2) / (vh / 2);
      const y = clamp(-n * 12, -12, 12);
      setBgShift(y);
    };

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        update();
      });
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (releaseTimer.current) window.clearTimeout(releaseTimer.current);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  if (!slides.length) return null;

  const stackCount = Math.max(1, Math.min(stackSize, slides.length));
  const current = slides[index];

  const onPointerDown = (clientX: number) => {
    pointerDownX.current = clientX;
    setIsDragging(true);
    setReleaseDir(0);
  };

  const onPointerMove = (clientX: number) => {
    if (pointerDownX.current == null) return;
    const dx = clientX - pointerDownX.current;
    setDragX(clamp(dx, -260, 260));
  };

  const onPointerUp = () => {
    if (pointerDownX.current == null) return;

    const dx = dragX;
    pointerDownX.current = null;
    setIsDragging(false);

    if (Math.abs(dx) >= swipeThreshold) {
      if (dx < 0) {
        primeRelease(1);
        goNext();
      } else {
        primeRelease(-1);
        goPrev();
      }
    }

    // Reset drag
    setDragX(0);
  };

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    if (slides.length <= 1) return;
    onPointerDown(e.touches[0]?.clientX ?? 0);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (slides.length <= 1) return;
    onPointerMove(e.touches[0]?.clientX ?? 0);
  };
  const onTouchEnd = () => {
    if (slides.length <= 1) return;
    onPointerUp();
  };

  // Mouse handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if (slides.length <= 1) return;
    e.preventDefault();
    onPointerDown(e.clientX);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    onPointerMove(e.clientX);
  };
  const onMouseUp = () => {
    if (!isDragging) return;
    onPointerUp();
  };
  const onMouseLeave = () => {
    if (!isDragging) return;
    onPointerUp();
  };

  const Media = ({ url, type }: { url: string; type: "image" | "video" }) => {
    if (type === "video") {
      return (
        <video
          src={url}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      );
    }
    return (
      <img
        src={url}
        alt={current.campaign.title}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    );
  };

  // Build visible stack: [current, next, next2...]
  const stack: Slide[] = [];
  for (let i = 0; i < stackCount; i++) {
    stack.push(slides[(index + i) % slides.length]);
  }

  // Card top transform based on drag
  const rotate = dragX / 28; // degrees-ish
  const dragOpacity = 1 - Math.min(Math.abs(dragX) / 320, 0.25);

  // Release "throw" effect
  const throwX =
    releaseDir === 1 ? -520 : releaseDir === -1 ? 520 : 0;
  const throwRot =
    releaseDir === 1 ? -12 : releaseDir === -1 ? 12 : 0;

  const shell =
    "relative w-full overflow-hidden rounded-[30px] border border-white/20 bg-slate-950 shadow-[0_34px_110px_rgba(2,6,23,0.38)]";

  const containerClass = `${shell} ${HEIGHT_MAP[height]} ${
    className ?? ""
  }`.trim();

  const clickable = Boolean(current.campaign.link_url);

  const Content = (
    <div
      ref={shellRef}
      className={containerClass}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => {
        setIsHover(false);
        onMouseLeave();
      }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="region"
      aria-label="Ads carousel"
    >
      {/* Premium blurred backdrop */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 scale-110 blur-3xl opacity-65 will-change-transform"
          style={{
            transform: `translate3d(0, ${bgShift}px, 0) scale(1.1)`,
          }}
        >
          <Media url={current.signedUrl} type={current.asset.media_type} />
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/55 to-slate-950/92" />
        <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_20%_10%,rgba(255,255,255,0.13),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_80%_30%,rgba(56,189,248,0.12),transparent_55%)]" />
      </div>

      {/* Stack area */}
      <div className="absolute inset-0 flex items-center justify-center px-3 sm:px-6">
        <div className="relative w-full max-w-5xl h-[86%]">
          {/* Cards: render from back to front */}
          {stack
            .slice()
            .reverse()
            .map((s, revIdx) => {
              // revIdx 0 = last card (back), last = top
              const i = stackCount - 1 - revIdx; // 0..stackCount-1 where 0 is top
              const isTop = i === 0;

              // Back cards style
              const depth = i; // 0 top, 1 second, etc.
              const scale = 1 - depth * 0.055;
              const translateY = depth * 14;
              const translateX = depth * 10;
              const blur = depth === 0 ? 0 : Math.min(depth * 1.2, 3);
              const opacity = depth === 0 ? 1 : 0.92 - depth * 0.12;

              // Top card interactive transform
              const topTransform = isTop
                ? `translate3d(${dragX + throwX}px, 0, 0) rotate(${rotate + throwRot}deg)`
                : `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;

              const topScale = isTop ? 1 : scale;

              return (
                <div
                  key={`${s.campaign.id}-${i}`}
                  className={[
                    "absolute inset-0 rounded-[26px] overflow-hidden",
                    "border border-white/18 bg-white/10 backdrop-blur-xl",
                    "shadow-[0_28px_90px_rgba(0,0,0,0.45)]",
                    "will-change-transform",
                    isTop ? "cursor-grab active:cursor-grabbing" : "",
                  ].join(" ")}
                  style={{
                    transform: isTop
                      ? `${topTransform} scale(${topScale})`
                      : topTransform,
                    transition: isTop
                      ? isDragging
                        ? "none"
                        : "transform 320ms cubic-bezier(0.22,1,0.36,1)"
                      : "transform 420ms cubic-bezier(0.22,1,0.36,1)",
                    filter: `blur(${blur}px)`,
                    opacity: isTop ? dragOpacity : opacity,
                    zIndex: 50 - i,
                  }}
                  onMouseDown={isTop ? onMouseDown : undefined}
                >
                  <div className="absolute inset-0">
                    <Media url={s.signedUrl} type={s.asset.media_type} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
                    <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_20%,rgba(255,255,255,0.16),transparent_60%)]" />
                  </div>

                  {/* Only on top card: label + CTA */}
                  {isTop && (
                    <>
                      <div className="absolute left-4 right-4 top-4 sm:left-6 sm:right-6 sm:top-6 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/85 backdrop-blur border border-white/45 px-3 py-1 text-[10px] font-semibold text-slate-900">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.20)]" />
                          {label}
                        </div>

                        {slides.length > 1 && (
                          <div className="text-[10px] text-white/80">
                            {index + 1}/{slides.length}
                          </div>
                        )}
                      </div>

                      <div className="absolute left-4 right-4 bottom-4 sm:left-6 sm:right-6 sm:bottom-6">
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-white text-lg sm:text-2xl font-extrabold tracking-tight drop-shadow line-clamp-2">
                              {s.campaign.title}
                            </div>
                            <div className="text-white/80 text-xs sm:text-sm mt-1">
                              Annonce premium • OuvriersPro
                            </div>
                          </div>

                          {showCta && s.campaign.link_url && (
                            <div className="flex items-center gap-2">
                              <span className="hidden sm:inline text-[11px] text-white/70">
                                Cliquez pour en savoir plus
                              </span>
                              <span className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-slate-900 bg-white shadow-[0_18px_50px_rgba(255,255,255,0.22)] border border-white/60 hover:bg-white/95 transition">
                                {ctaLabel} →
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Swipe hint */}
                      {slides.length > 1 && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-center gap-2 text-white/70">
                          <span className="text-[10px] rotate-90">Swipe</span>
                          <span className="h-10 w-[2px] bg-white/25 rounded-full overflow-hidden">
                            <span className="block h-4 w-full bg-white/75 animate-[adHint_1200ms_ease-in-out_infinite]" />
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

          {/* Dots */}
          {showDots && slides.length > 1 && (
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-7 sm:-bottom-8 flex items-center gap-2">
              {slides.slice(0, Math.min(9, slides.length)).map((_, i) => {
                const active = i === index;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIndex(i);
                      setDragX(0);
                      setReleaseDir(0);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      active ? "w-8 bg-slate-900" : "w-2.5 bg-slate-400/50 hover:bg-slate-600/70"
                    }`}
                    aria-label={`Go to ad ${i + 1}`}
                  />
                );
              })}
            </div>
          )}

          {/* Controls */}
          {showControls && slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  primeRelease(-1);
                  goPrev();
                }}
                className="absolute -left-1 sm:-left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur border border-white/45 shadow-sm px-3 py-2 text-xs text-slate-900 hover:bg-white"
                aria-label="Previous ad"
              >
                ◀
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  primeRelease(1);
                  goNext();
                }}
                className="absolute -right-1 sm:-right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur border border-white/45 shadow-sm px-3 py-2 text-xs text-slate-900 hover:bg-white"
                aria-label="Next ad"
              >
                ▶
              </button>
            </>
          )}
        </div>
      </div>

      {/* Click overlay: only when not dragging */}
      {clickable && !isDragging && current.campaign.link_url && (
        <a
          href={current.campaign.link_url}
          target="_blank"
          rel="noreferrer"
          className="absolute inset-0"
          aria-label="Open ad link"
        />
      )}

      <style>
        {`
          @keyframes adHint {
            0%   { transform: translateY(0); opacity: 0.25; }
            50%  { transform: translateY(14px); opacity: 1; }
            100% { transform: translateY(28px); opacity: 0.25; }
          }
        `}
      </style>
    </div>
  );

  return Content;
};

export default AdSlot;
