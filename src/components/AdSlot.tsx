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

  expiresIn?: number;
  intervalMs?: number;
  limit?: number;

  height?: "sm" | "md" | "lg";
  ctaLabel?: string; // ex "Découvrir", "Contacter", "Voir l’offre"
};

const BUCKET = "ads-media";

const HEIGHT_MAP: Record<NonNullable<Props["height"]>, string> = {
  sm: "min-h-[170px] sm:min-h-[220px] md:min-h-[260px]",
  md: "min-h-[210px] sm:min-h-[270px] md:min-h-[340px]",
  lg: "min-h-[260px] sm:min-h-[340px] md:min-h-[420px]",
};

const AdSlot: React.FC<Props> = ({
  placement,
  className,
  expiresIn = 300,
  intervalMs = 6500,
  limit = 8,
  height = "lg",
  ctaLabel = "Découvrir",
}) => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const timerRef = useRef<number | null>(null);

  const nowIso = useMemo(() => new Date().toISOString(), [placement]);

  const inWindow = (c: AdCampaign) =>
    (c.start_at ? c.start_at <= nowIso : true) &&
    (c.end_at ? c.end_at >= nowIso : true);

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

  useEffect(() => {
    if (slides.length <= 1) return;
    if (timerRef.current) window.clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      setDir(1);
      setIndex((i) => (i + 1) % slides.length);
    }, Math.max(2500, intervalMs));

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [slides.length, intervalMs]);

  if (slides.length === 0) return null;

  const current = slides[index];

  const shell =
    "relative w-full overflow-hidden rounded-[28px] border border-white/20 bg-slate-950 shadow-[0_30px_90px_rgba(2,6,23,0.35)]";

  const containerClass = `${shell} ${HEIGHT_MAP[height]} ${className ?? ""}`.trim();

  const slideAnim =
    dir === 1
      ? "animate-[adSlideInRight_650ms_cubic-bezier(0.22,1,0.36,1)_forwards]"
      : "animate-[adSlideInLeft_650ms_cubic-bezier(0.22,1,0.36,1)_forwards]";

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

  const Inner = (
    <div className={containerClass} title={current.campaign.title} aria-label={current.campaign.title}>
      {/* Background blur */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 scale-110 blur-3xl opacity-70">
          <Media url={current.signedUrl} type={current.asset.media_type} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/88 via-slate-950/55 to-slate-950/88" />
        <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_20%_10%,rgba(255,255,255,0.12),transparent_55%)]" />
      </div>

      {/* Foreground media */}
      <div className="absolute inset-0 flex items-center justify-center px-3 sm:px-6">
        <div className="relative w-full max-w-5xl overflow-hidden rounded-[26px] border border-white/18 bg-white/10 backdrop-blur-xl shadow-[0_28px_90px_rgba(0,0,0,0.45)] h-[84%]">
          <div className={`absolute inset-0 ${slideAnim}`}>
            <Media url={current.signedUrl} type={current.asset.media_type} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
          </div>

          {/* Premium CTA block */}
          <div className="absolute left-4 right-4 bottom-4 sm:left-6 sm:right-6 sm:bottom-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/85 backdrop-blur border border-white/45 px-3 py-1 text-[10px] font-semibold text-slate-900">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.20)]" />
                    Sponsorisé
                  </span>
                  {slides.length > 1 && (
                    <span className="text-[10px] text-white/80">
                      {index + 1}/{slides.length}
                    </span>
                  )}
                </div>

                <div className="text-white text-lg sm:text-2xl font-extrabold tracking-tight drop-shadow line-clamp-2">
                  {current.campaign.title}
                </div>

                <div className="text-white/80 text-xs sm:text-sm mt-1">
                  Offre / activité mise en avant sur OuvriersPro
                </div>
              </div>

              {current.campaign.link_url ? (
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline text-[11px] text-white/70">
                    Cliquez pour en savoir plus
                  </span>
                  <span className="inline-flex">
                    <span className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-slate-900 bg-white shadow-[0_18px_50px_rgba(255,255,255,0.20)] border border-white/60 hover:bg-white/95 transition">
                      {ctaLabel} →
                    </span>
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-white/70">—</div>
              )}
            </div>
          </div>

          {/* Dots minimal */}
          {slides.length > 1 && (
            <div className="absolute left-4 top-4 sm:left-6 sm:top-6 flex items-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDir(i > index ? 1 : -1);
                    setIndex(i);
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

      <style>
        {`
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
    </div>
  );

  if (current.campaign.link_url) {
    return (
      <a href={current.campaign.link_url} target="_blank" rel="noreferrer" className="block">
        {Inner}
      </a>
    );
  }

  return Inner;
};

export default AdSlot;
