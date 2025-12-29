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

  expiresIn?: number; // signed url seconds
  intervalMs?: number;
  limit?: number;
  pauseOnHover?: boolean;

  height?: "sm" | "md" | "lg";
  showControls?: boolean;
  showDots?: boolean;
  showProgress?: boolean;
  showLabel?: boolean;
  showCta?: boolean;

  // Parallax (premium)
  parallax?: boolean;
  parallaxStrength?: number; // px, ex 18
};

const BUCKET = "ads-media";

const HEIGHT_MAP: Record<NonNullable<Props["height"]>, string> = {
  sm: "min-h-[160px] sm:min-h-[200px] md:min-h-[240px]",
  md: "min-h-[190px] sm:min-h-[240px] md:min-h-[300px]",
  lg: "min-h-[230px] sm:min-h-[300px] md:min-h-[380px]",
};

const AdSlot: React.FC<Props> = ({
  placement,
  className,

  expiresIn = 300,
  intervalMs = 6500,
  limit = 8,
  pauseOnHover = true,

  height = "md",
  showControls = true,
  showDots = true,
  showProgress = true,
  showLabel = true,
  showCta = true,

  parallax = true,
  parallaxStrength = 18,
}) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [isHover, setIsHover] = useState(false);

  const timerRef = useRef<number | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  // Parallax refs/state
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [parallaxY, setParallaxY] = useState(0);
  const rafRef = useRef<number | null>(null);

  // swipe
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  const nowIso = useMemo(() => new Date().toISOString(), [placement]);

  const inWindow = (c: AdCampaign) =>
    (c.start_at ? c.start_at <= nowIso : true) &&
    (c.end_at ? c.end_at >= nowIso : true);

  const resetProgress = () => {
    if (!progressRef.current) return;
    progressRef.current.style.animation = "none";
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    progressRef.current.offsetHeight;
    progressRef.current.style.animation = "";
  };

  // Load slides: published campaigns + last asset + signed url
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
        if (valid.length === 0) {
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
          setDir(1);
          resetProgress();
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
    if (slides.length <= 1) return;

    if (timerRef.current) window.clearInterval(timerRef.current);

    const shouldPause = pauseOnHover && isHover;
    if (shouldPause) return;

    resetProgress();

    timerRef.current = window.setInterval(() => {
      setDir(1);
      setIndex((i) => (i + 1) % slides.length);
      resetProgress();
    }, Math.max(2500, intervalMs));

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [slides.length, intervalMs, isHover, pauseOnHover]);

  // Keyboard nav
  useEffect(() => {
    if (slides.length <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

  const goPrev = () => {
    if (slides.length <= 1) return;
    setDir(-1);
    setIndex((i) => (i - 1 + slides.length) % slides.length);
    resetProgress();
  };

  const goNext = () => {
    if (slides.length <= 1) return;
    setDir(1);
    setIndex((i) => (i + 1) % slides.length);
    resetProgress();
  };

  // Swipe
  const onTouchStart = (e: React.TouchEvent) => {
    if (slides.length <= 1) return;
    touchStartX.current = e.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (slides.length <= 1) return;
    if (touchStartX.current == null) return;
    const x = e.touches[0]?.clientX ?? 0;
    touchDeltaX.current = x - touchStartX.current;
  };
  const onTouchEnd = () => {
    if (slides.length <= 1) return;
    const dx = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    if (Math.abs(dx) < 45) return;
    if (dx > 0) goPrev();
    else goNext();
  };

  // Parallax: compute offset based on component position in viewport
  useEffect(() => {
    if (!parallax) return;

    const update = () => {
      if (!shellRef.current) return;
      const rect = shellRef.current.getBoundingClientRect();
      const vh = window.innerHeight || 1;

      // normalized center distance [-1..1]
      const center = rect.top + rect.height / 2;
      const n = (center - vh / 2) / (vh / 2);
      const clamped = Math.max(-1, Math.min(1, n));

      // invert for nicer movement
      const y = -clamped * parallaxStrength;
      setParallaxY(y);
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
  }, [parallax, parallaxStrength]);

  if (slides.length === 0) return null;

  const current = slides[index];

  const slideAnim =
    dir === 1
      ? "animate-[adSlideInRight_650ms_cubic-bezier(0.22,1,0.36,1)_forwards]"
      : "animate-[adSlideInLeft_650ms_cubic-bezier(0.22,1,0.36,1)_forwards]";

  const shell =
    "relative w-full overflow-hidden rounded-[28px] border border-white/20 bg-slate-950 shadow-[0_30px_90px_rgba(2,6,23,0.35)]";

  const containerClass = `${shell} ${HEIGHT_MAP[height]} ${className ?? ""}`.trim();

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const commonProps = {
      className: containerClass,
      onMouseEnter: () => setIsHover(true),
      onMouseLeave: () => setIsHover(false),
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      title: current.campaign.title,
      "aria-label": current.campaign.title,
      ref: shellRef,
    } as const;

    if (current.campaign.link_url) {
      return (
        <a href={current.campaign.link_url} target="_blank" rel="noreferrer" {...commonProps as any}>
          {children}
        </a>
      );
    }
    return (
      <div {...commonProps as any}>
        {children}
      </div>
    );
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
    return <img src={url} alt={current.campaign.title} loading="lazy" className="h-full w-full object-cover" />;
  };

  return (
    <Wrapper>
      {/* Background: blurred media + parallax translateY */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 scale-110 blur-3xl opacity-70 will-change-transform"
          style={{ transform: `translate3d(0, ${parallax ? parallaxY : 0}px, 0) scale(1.1)` }}
        >
          <Media url={current.signedUrl} type={current.asset.media_type} />
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-950/55 to-slate-950/88" />
        <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_20%_10%,rgba(255,255,255,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_80%_30%,rgba(56,189,248,0.12),transparent_55%)]" />
      </div>

      {/* Foreground: center hero card */}
      <div className="absolute inset-0 flex items-center justify-center px-3 sm:px-6">
        <div
          className={[
            "relative w-full max-w-5xl overflow-hidden rounded-[26px]",
            "border border-white/18 bg-white/10 backdrop-blur-xl",
            "shadow-[0_28px_90px_rgba(0,0,0,0.45)]",
            "h-[82%] sm:h-[84%]",
          ].join(" ")}
        >
          {/* media */}
          <div className={`absolute inset-0 ${slideAnim}`}>
            <Media url={current.signedUrl} type={current.asset.media_type} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-black/10" />
            <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_15%_20%,rgba(255,255,255,0.18),transparent_60%)]" />
          </div>

          {/* Top chips */}
          <div className="absolute left-3 right-3 top-3 sm:left-5 sm:right-5 sm:top-5 flex items-center justify-between gap-3">
            {showLabel ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-white/85 backdrop-blur border border-white/45 px-3 py-1 text-[10px] font-semibold text-slate-900">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.20)]" />
                Sponsorisé
              </div>
            ) : (
              <div />
            )}

            {showCta && current.campaign.link_url ? (
              <div className="inline-flex items-center rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[10px] font-semibold text-white border border-white/20">
                Ouvrir
              </div>
            ) : null}
          </div>

          {/* Bottom line */}
          <div className="absolute left-3 right-3 bottom-3 sm:left-5 sm:right-5 sm:bottom-5">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-white text-sm sm:text-base font-semibold drop-shadow">
                  {current.campaign.title}
                </div>
              </div>

              {showDots && slides.length > 1 && (
                <div className="flex items-center gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDir(i > index ? 1 : -1);
                        setIndex(i);
                        resetProgress();
                      }}
                      className={`h-1.5 rounded-full transition-all ${
                        i === index ? "w-8 bg-white" : "w-2.5 bg-white/55 hover:bg-white/80"
                      }`}
                      aria-label={`Go to ad ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          {showControls && slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur border border-white/45 shadow-sm px-3 py-2 text-xs text-slate-900 hover:bg-white"
                aria-label="Previous ad"
              >
                ◀
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur border border-white/45 shadow-sm px-3 py-2 text-xs text-slate-900 hover:bg-white"
                aria-label="Next ad"
              >
                ▶
              </button>
            </>
          )}

          {/* Progress */}
          {showProgress && slides.length > 1 && !(pauseOnHover && isHover) && (
            <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-white/20">
              <div
                ref={progressRef}
                className="h-full bg-white/90"
                style={{
                  animation: `adProgress ${Math.max(2500, intervalMs)}ms linear infinite`,
                }}
              />
            </div>
          )}

          {/* Pause label */}
          {pauseOnHover && isHover && slides.length > 1 && (
            <div className="absolute right-3 top-3 sm:right-5 sm:top-5">
              <span className="inline-flex items-center rounded-full bg-black/40 backdrop-blur px-3 py-1 text-[10px] font-semibold text-white border border-white/15">
                Pause
              </span>
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes adProgress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          @keyframes adSlideInRight {
            0%   { opacity: 0; transform: translateX(18px) scale(1.01); filter: blur(6px); }
            100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0px); }
          }
          @keyframes adSlideInLeft {
            0%   { opacity: 0; transform: translateX(-18px) scale(1.01); filter: blur(6px); }
            100% { opacity: 1; transform: translateX(0) scale(1); filter: blur(0px); }
          }
        `}
      </style>
    </Wrapper>
  );
};

export default AdSlot;
