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
  placement: string;          // ex: "home_feed"
  className?: string;
  expiresIn?: number;         // secondes URL signée
  intervalMs?: number;        // auto-défile
  limit?: number;             // nb max de pubs
  variant?: "banner" | "card";
  pauseOnHover?: boolean;
  showLabel?: boolean;
  showControls?: boolean;
  showProgress?: boolean;
};

const BUCKET = "ads-media";

const AdSlot: React.FC<Props> = ({
  placement,
  className,
  expiresIn = 300,
  intervalMs = 6500,
  limit = 6,
  variant = "banner",
  pauseOnHover = true,
  showLabel = true,
  showControls = true,
  showProgress = true,
}) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);
  const [isHover, setIsHover] = useState(false);
  const [animKey, setAnimKey] = useState(0); // relance fade/zoom à chaque slide

  const timerRef = useRef<number | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const nowIso = useMemo(() => new Date().toISOString(), [placement]);

  const slotClass =
    variant === "banner"
      ? "relative w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.10)] aspect-[16/5] max-h-[150px] sm:max-h-[190px] md:max-h-[230px]"
      : "relative w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.10)] aspect-video";

  const inWindow = (c: AdCampaign) =>
    (c.start_at ? c.start_at <= nowIso : true) &&
    (c.end_at ? c.end_at >= nowIso : true);

  // ---- Load slides (campagnes publiées + dernier asset + URL signée) ----
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

        const validCampaigns = (campaigns as AdCampaign[] | null)?.filter(inWindow) ?? [];
        if (validCampaigns.length === 0) {
          if (!cancelled) setSlides([]);
          return;
        }

        const built: Slide[] = [];

        for (const c of validCampaigns) {
          const { data: assets, error: aErr } = await supabase
            .from("ads_assets")
            .select("id,campaign_id,media_type,storage_path,mime_type,size_bytes,created_at")
            .eq("campaign_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (aErr) continue;

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
          setAnimKey((k) => k + 1);
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

  // ---- Progress bar reset helper ----
  const resetProgress = () => {
    if (!progressRef.current) return;
    // force reflow pour relancer l'animation
    progressRef.current.style.animation = "none";
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    progressRef.current.offsetHeight;
    progressRef.current.style.animation = "";
  };

  // ---- Auto-play ----
  useEffect(() => {
    if (slides.length <= 1) return;

    if (timerRef.current) window.clearInterval(timerRef.current);

    const shouldPause = pauseOnHover && isHover;
    if (shouldPause) return;

    resetProgress();

    timerRef.current = window.setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % slides.length;
        return next;
      });
      setAnimKey((k) => k + 1);
      resetProgress();
    }, Math.max(2000, intervalMs));

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [slides.length, intervalMs, isHover, pauseOnHover]);

  // ---- Safety if slides shrink ----
  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

  if (slides.length === 0) return null;

  const current = slides[index];

  const mergedClass = `${slotClass} ${className ?? ""}`.trim();

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const commonProps = {
      className: mergedClass,
      onMouseEnter: () => setIsHover(true),
      onMouseLeave: () => setIsHover(false),
      "aria-label": current.campaign.title,
      title: current.campaign.title,
    } as const;

    if (current.campaign.link_url) {
      return (
        <a
          href={current.campaign.link_url}
          target="_blank"
          rel="noreferrer"
          {...commonProps}
        >
          {children}
        </a>
      );
    }
    return <div {...commonProps}>{children}</div>;
  };

  const goPrev = () => {
    setIndex((i) => (i - 1 + slides.length) % slides.length);
    setAnimKey((k) => k + 1);
    resetProgress();
  };
  const goNext = () => {
    setIndex((i) => (i + 1) % slides.length);
    setAnimKey((k) => k + 1);
    resetProgress();
  };

  return (
    <Wrapper>
      {/* Background gradient + subtle pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/10 via-sky-900/5 to-indigo-900/10" />
        <div className="absolute -left-24 -top-24 h-56 w-56 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="absolute -right-24 -bottom-24 h-56 w-56 rounded-full bg-indigo-500/10 blur-2xl" />
      </div>

      {/* Media layer (fade + slight zoom) */}
      <div key={animKey} className="absolute inset-0">
        {current.asset.media_type === "video" ? (
          <video
            src={current.signedUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover opacity-0 animate-[adFadeIn_700ms_ease-out_forwards] will-change-transform"
          />
        ) : (
          <img
            src={current.signedUrl}
            alt={current.campaign.title}
            className="h-full w-full object-cover opacity-0 animate-[adFadeIn_700ms_ease-out_forwards] will-change-transform"
            loading="lazy"
          />
        )}

        {/* Soft overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-slate-900/5 to-transparent pointer-events-none" />
      </div>

      {/* Top label */}
      {showLabel && (
        <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/85 backdrop-blur border border-white/50 px-3 py-1 text-[10px] font-semibold tracking-wide text-slate-800 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Sponsorisé
          </span>
        </div>
      )}

      {/* Title (optional, subtle) */}
      <div className="absolute left-3 right-3 bottom-3 sm:left-4 sm:right-4 sm:bottom-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-semibold text-white drop-shadow">
              {current.campaign.title}
            </div>
          </div>

          {/* Dots */}
          {slides.length > 1 && (
            <div className="flex items-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIndex(i);
                    setAnimKey((k) => k + 1);
                    resetProgress();
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index
                      ? "w-6 bg-white"
                      : "w-2.5 bg-white/60 hover:bg-white/85"
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
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 backdrop-blur border border-white/50 shadow-sm px-2.5 py-1.5 text-[11px] text-slate-800 hover:bg-white"
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
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 backdrop-blur border border-white/50 shadow-sm px-2.5 py-1.5 text-[11px] text-slate-800 hover:bg-white"
            aria-label="Next ad"
          >
            ▶
          </button>
        </>
      )}

      {/* Progress bar */}
      {showProgress && slides.length > 1 && !(pauseOnHover && isHover) && (
        <div className="absolute left-0 right-0 bottom-0 h-[3px] bg-white/20">
          <div
            ref={progressRef}
            className="h-full bg-white/90"
            style={{
              animation: `adProgress ${Math.max(2000, intervalMs)}ms linear infinite`,
            }}
          />
        </div>
      )}

      {/* Pause indicator when hover */}
      {pauseOnHover && isHover && slides.length > 1 && (
        <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
          <span className="inline-flex items-center rounded-full bg-black/35 backdrop-blur px-3 py-1 text-[10px] font-semibold text-white border border-white/15">
            Pause
          </span>
        </div>
      )}

      {/* CSS keyframes (inline, no config Tailwind needed) */}
      <style>
        {`
          @keyframes adFadeIn {
            0%   { opacity: 0; transform: scale(1.02); }
            100% { opacity: 1; transform: scale(1.00); }
          }
          @keyframes adProgress {
            0%   { width: 0%; }
            100% { width: 100%; }
          }
        `}
      </style>
    </Wrapper>
  );
};

export default AdSlot;
