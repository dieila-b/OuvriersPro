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
  variant?: "banner" | "card"; // format
  pauseOnHover?: boolean;
};

const BUCKET = "ads-media";

const AdSlot: React.FC<Props> = ({
  placement,
  className,
  expiresIn = 300,
  intervalMs = 5000,
  limit = 6,
  variant = "banner",
  pauseOnHover = true,
}) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);
  const [isHover, setIsHover] = useState(false);

  const nowIso = useMemo(() => new Date().toISOString(), [placement]);
  const timerRef = useRef<number | null>(null);

  const slotClass =
    variant === "banner"
      ? "w-full overflow-hidden rounded-2xl shadow-sm border border-slate-100 bg-white aspect-[16/5] max-h-[160px] sm:max-h-[200px] md:max-h-[240px]"
      : "w-full overflow-hidden rounded-2xl shadow-sm border border-slate-100 bg-white aspect-video";

  const inWindow = (c: AdCampaign) =>
    (c.start_at ? c.start_at <= nowIso : true) &&
    (c.end_at ? c.end_at >= nowIso : true);

  // 1) Load slides: campagnes publiées + asset récent + signedUrl
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // campagnes
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

        // pour chaque campagne: dernier asset + signedUrl
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

  // 2) Auto-play
  useEffect(() => {
    if (slides.length <= 1) return;

    if (timerRef.current) window.clearInterval(timerRef.current);

    if (pauseOnHover && isHover) return;

    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, Math.max(1500, intervalMs));

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [slides.length, intervalMs, isHover, pauseOnHover]);

  // 3) Sécurité index si slides changent
  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

  if (slides.length === 0) return null;

  const current = slides[index];

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const merged = `${slotClass} ${className ?? ""}`.trim();

    if (current.campaign.link_url) {
      return (
        <a
          href={current.campaign.link_url}
          target="_blank"
          rel="noreferrer"
          className={merged}
          aria-label={current.campaign.title}
          title={current.campaign.title}
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
        >
          {children}
        </a>
      );
    }

    return (
      <div
        className={merged}
        aria-label={current.campaign.title}
        title={current.campaign.title}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
      >
        {children}
      </div>
    );
  };

  const goPrev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const goNext = () => setIndex((i) => (i + 1) % slides.length);

  return (
    <Wrapper>
      {/* Track (animation slide) */}
      <div
        className="h-full w-full flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((s) => (
          <div key={s.campaign.id} className="h-full w-full flex-shrink-0">
            {s.asset.media_type === "video" ? (
              <video
                src={s.signedUrl}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
            ) : (
              <img
                src={s.signedUrl}
                alt={s.campaign.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            )}
          </div>
        ))}
      </div>

      {/* Controls (optionnels, discrets) */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur border border-white/60 shadow-sm px-2 py-1 text-xs text-slate-700 hover:bg-white"
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
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 backdrop-blur border border-white/60 shadow-sm px-2 py-1 text-xs text-slate-700 hover:bg-white"
            aria-label="Next ad"
          >
            ▶
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-white" : "w-2.5 bg-white/60 hover:bg-white/80"
                }`}
                aria-label={`Go to ad ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </Wrapper>
  );
};

export default AdSlot;
