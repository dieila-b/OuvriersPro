// src/components/AdSlot.tsx
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
  mime_type: string | null;
  size_bytes: number | null;
  created_at?: string;
};

type Props = {
  placement: string; // ex: "home_feed"
  className?: string;

  // URL signée
  expiresIn?: number;

  // Carousel
  maxItems?: number; // nb max d’assets
  autoMs?: number; // auto-rotation
};

const AdSlot: React.FC<Props> = ({
  placement,
  className,
  expiresIn = 300,
  maxItems = 6,
  autoMs = 4500,
}) => {
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<AdCampaign | null>(null);
  const [assets, setAssets] = useState<AdAsset[]>([]);
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // léger parallax du fond
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef<number | null>(null);

  const nowIso = useMemo(() => new Date().toISOString(), []);

  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => setScrollY(window.scrollY || 0));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) Campagne publiée la plus récente
        const { data: campaigns, error: cErr } = await supabase
          .from("ads_campaigns")
          .select("id,title,link_url,placement,start_at,end_at,status,created_at")
          .eq("placement", placement)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(1);

        if (cErr) throw cErr;

        const c = campaigns?.[0] ?? null;

        const isInWindow =
          !!c &&
          (c.start_at ? c.start_at <= nowIso : true) &&
          (c.end_at ? c.end_at >= nowIso : true);

        if (!c || !isInWindow) {
          if (!cancelled) {
            setCampaign(null);
            setAssets([]);
            setSignedUrls([]);
            setActive(0);
          }
          return;
        }

        // 2) Assets récents (carousel)
        const { data: aData, error: aErr } = await supabase
          .from("ads_assets")
          .select("id,campaign_id,media_type,storage_path,mime_type,size_bytes,created_at")
          .eq("campaign_id", c.id)
          .order("created_at", { ascending: false })
          .limit(maxItems);

        if (aErr) throw aErr;

        const aList = (aData ?? []) as AdAsset[];

        if (aList.length === 0) {
          if (!cancelled) {
            setCampaign(c);
            setAssets([]);
            setSignedUrls([]);
            setActive(0);
          }
          return;
        }

        // 3) URLs signées en batch (plus fiable et rapide)
        const paths = aList.map((a) => a.storage_path);
        const { data: signedBatch, error: sErr } = await supabase.storage
          .from("ads-media")
          .createSignedUrls(paths, expiresIn);

        if (sErr) throw sErr;

        const urls =
          signedBatch?.map((x) => x?.signedUrl).filter(Boolean) as string[];

        if (!cancelled) {
          setCampaign(c);
          setAssets(aList);
          setSignedUrls(urls);
          setActive(0);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Unknown ads error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [placement, expiresIn, nowIso, maxItems]);

  // Auto-rotation
  useEffect(() => {
    if (!signedUrls.length) return;
    if (signedUrls.length === 1) return;

    const id = window.setInterval(() => {
      setActive((p) => (p + 1) % signedUrls.length);
    }, autoMs);

    return () => window.clearInterval(id);
  }, [signedUrls.length, autoMs]);

  if (loading) return null;
  if (error) return <div className="text-xs text-red-600">Ads error: {error}</div>;
  if (!campaign || assets.length === 0 || signedUrls.length === 0) return null;

  const currentUrl = signedUrls[Math.min(active, signedUrls.length - 1)];
  const currentAsset = assets[Math.min(active, assets.length - 1)];

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (campaign.link_url) {
      return (
        <a
          href={campaign.link_url}
          target="_blank"
          rel="noreferrer"
          className={className}
          aria-label={campaign.title}
        >
          {children}
        </a>
      );
    }
    return <div className={className}>{children}</div>;
  };

  // Parallax léger (fond flou)
  const parallax = Math.max(-18, Math.min(18, (scrollY % 600) / 600 * 22 - 11));

  return (
    <Wrapper>
      <div className="relative w-full">
        {/* Fond flou façon Apple/Spotify */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[28px]">
          <div
            className="absolute inset-0 scale-[1.25] blur-2xl opacity-90"
            style={{ transform: `translateY(${parallax}px) scale(1.25)` }}
          >
            {currentAsset.media_type === "video" ? (
              <video
                src={currentUrl}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
            ) : (
              <img src={currentUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/45" />
        </div>

        {/* Card Story 9:16 */}
        <div
          className={[
            "relative mx-auto",
            "w-full max-w-[520px]", // centre + premium
            "aspect-[9/16]", // ✅ STORY
            "overflow-hidden rounded-[28px]",
            "border border-white/15 bg-white/5",
            "shadow-[0_28px_90px_rgba(0,0,0,0.35)]",
            "backdrop-blur-xl",
          ].join(" ")}
        >
          {/* Media */}
          <div className="absolute inset-0">
            {currentAsset.media_type === "video" ? (
              <video
                src={currentUrl}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="h-full w-full object-cover"
              />
            ) : (
              <img
                src={currentUrl}
                alt={campaign.title}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/25" />
          </div>

          {/* Overlay premium + CTA */}
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-white/80 mb-1">
                  {placement.replaceAll("_", " ")}
                </div>
                <div className="text-white font-semibold leading-tight text-base sm:text-lg truncate">
                  {campaign.title}
                </div>
              </div>

              {campaign.link_url ? (
                <div className="shrink-0 rounded-full bg-white/95 text-slate-900 px-4 py-2 text-sm font-semibold shadow-sm">
                  Découvrir
                </div>
              ) : null}
            </div>

            {/* Dots */}
            {signedUrls.length > 1 ? (
              <div className="mt-3 flex items-center justify-center gap-1.5">
                {signedUrls.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setActive(i);
                    }}
                    className={[
                      "h-1.5 rounded-full transition-all",
                      i === active ? "w-6 bg-white" : "w-2.5 bg-white/45 hover:bg-white/65",
                    ].join(" ")}
                    aria-label={`Ad ${i + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* Effet “shine” premium */}
          <div className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 rotate-12 bg-white/10 blur-xl opacity-40" />
        </div>
      </div>
    </Wrapper>
  );
};

export default AdSlot;
