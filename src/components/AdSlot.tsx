// src/components/AdSlot.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type CampaignStatus = "draft" | "published" | "paused" | "ended";

type AdCampaign = {
  id: string;
  title: string;
  link_url: string | null;
  placement: string;
  start_at: string | null;
  end_at: string | null;
  status: CampaignStatus;
  created_at?: string;
  display_seconds?: number | null; // ✅ optionnel
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

type AdItemSpot = {
  campaign: AdCampaign;
  asset: AdAsset | null; // le plus récent du spot
};

type Props = {
  placement: string; // ex: "home_feed"
  className?: string;
  expiresIn?: number; // secondes (URL signée)
  defaultDisplaySeconds?: number; // fallback si colonne absente
  showSponsorBadge?: boolean;
};

const DEFAULT_SECONDS = 8;

function inWindow(c: AdCampaign, now: Date) {
  const sOk = c.start_at ? new Date(c.start_at).getTime() <= now.getTime() : true;
  const eOk = c.end_at ? new Date(c.end_at).getTime() >= now.getTime() : true;
  return sOk && eOk;
}

function safeSeconds(n: any, fallback = DEFAULT_SECONDS) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(1, Math.floor(v));
}

async function safeSelectCampaigns(placement: string) {
  // On tente avec display_seconds, puis fallback sans
  const withDisplay = await supabase
    .from("ads_campaigns")
    .select("id,title,link_url,placement,start_at,end_at,status,display_seconds,created_at")
    .eq("placement", placement)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (!withDisplay.error) return withDisplay.data as AdCampaign[];

  const withoutDisplay = await supabase
    .from("ads_campaigns")
    .select("id,title,link_url,placement,start_at,end_at,status,created_at")
    .eq("placement", placement)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (withoutDisplay.error) throw withoutDisplay.error;
  return (withoutDisplay.data ?? []) as AdCampaign[];
}

export default function AdSlot({
  placement,
  className,
  expiresIn = 300,
  defaultDisplaySeconds = DEFAULT_SECONDS,
  showSponsorBadge = true,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AdItemSpot[]>([]);
  const [index, setIndex] = useState(0);

  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [signedAssetId, setSignedAssetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  const current = useMemo(() => items[index] ?? null, [items, index]);
  const now = useMemo(() => new Date(), [placement]); // recalcul à chaque placement

  // 1) Charger les spots (campagnes) + asset le plus récent
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setSignedUrl(null);
      setSignedAssetId(null);

      try {
        const campaigns = await safeSelectCampaigns(placement);
        const active = (campaigns ?? []).filter((c) => inWindow(c, new Date()));

        if (!active.length) {
          if (!cancelled) {
            setItems([]);
            setIndex(0);
          }
          return;
        }

        // Récupérer l’asset le plus récent de chaque campagne (1 par campagne)
        const ids = active.map((c) => c.id);

        const { data: assets, error: aErr } = await supabase
          .from("ads_assets")
          .select("id,campaign_id,media_type,storage_path,mime_type,size_bytes,created_at")
          .in("campaign_id", ids)
          .order("created_at", { ascending: false });

        if (aErr) throw aErr;

        const latestByCampaign: Record<string, AdAsset> = {};
        (assets ?? []).forEach((a: any) => {
          if (!latestByCampaign[a.campaign_id]) latestByCampaign[a.campaign_id] = a as AdAsset;
        });

        const spotItems: AdItemSpot[] = active.map((c) => ({
          campaign: c,
          asset: latestByCampaign[c.id] ?? null,
        }));

        // garder seulement ceux qui ont un asset
        const filtered = spotItems.filter((x) => !!x.asset);

        if (!cancelled) {
          setItems(filtered);
          setIndex(0);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Ads error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [placement]);

  // 2) Signer l’asset courant
  useEffect(() => {
    let cancelled = false;

    const sign = async () => {
      setSignedUrl(null);
      setSignedAssetId(null);

      const cur = items[index];
      const asset = cur?.asset;
      if (!asset) return;

      try {
        const { data: signed, error: sErr } = await supabase.storage
          .from("ads-media")
          .createSignedUrl(asset.storage_path, expiresIn);

        if (sErr) throw sErr;

        if (!cancelled) {
          setSignedUrl(signed?.signedUrl ?? null);
          setSignedAssetId(asset.id);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Ads signing error");
      }
    };

    sign();

    return () => {
      cancelled = true;
    };
  }, [items, index, expiresIn]);

  // 3) Rotation (durée par spot = display_seconds de la campagne)
  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!items.length) return;

    const cur = items[index];
    const seconds = safeSeconds(cur?.campaign?.display_seconds, defaultDisplaySeconds);

    timerRef.current = window.setTimeout(() => {
      setIndex((i) => (items.length ? (i + 1) % items.length : 0));
    }, seconds * 1000);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [items, index, defaultDisplaySeconds]);

  // UI helpers
  const frameClass =
    "relative w-full overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-[0_24px_70px_rgba(0,0,0,0.22)]";

  const mediaClass = "absolute inset-0 h-full w-full object-cover";
  const skeletonClass =
    "animate-pulse bg-white/10 border border-white/10 rounded-2xl w-full aspect-[16/5] max-h-[180px] sm:max-h-[220px] md:max-h-[260px] lg:max-h-[320px]";

  if (error) {
    // silencieux en prod possible, mais utile en debug
    return (
      <div className="text-xs text-red-200/90 bg-red-500/10 border border-red-300/20 rounded-xl px-3 py-2">
        Ads error: {error}
      </div>
    );
  }

  if (loading) return <div className={skeletonClass} />;
  if (!current || !current.asset || !signedUrl) return null;

  const asset = current.asset;
  const campaign = current.campaign;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (campaign.link_url) {
      return (
        <a
          href={campaign.link_url}
          target="_blank"
          rel="noreferrer"
          className={className}
          aria-label={campaign.title}
          title={campaign.title}
        >
          {children}
        </a>
      );
    }
    return <div className={className}>{children}</div>;
  };

  const aspectClasses = [
    frameClass,
    "aspect-[16/5]",
    "max-h-[180px] sm:max-h-[220px] md:max-h-[260px] lg:max-h-[320px]",
  ].join(" ");

  return (
    <Wrapper>
      <div className={aspectClasses}>
        {/* Media */}
        {asset.media_type === "video" ? (
          <video
            key={signedAssetId ?? asset.id}
            src={signedUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            controls={false}
            className={mediaClass}
            onError={() => {
              // si la lecture échoue, on avance au prochain spot
              setIndex((i) => (items.length ? (i + 1) % items.length : 0));
            }}
          />
        ) : (
          <img
            src={signedUrl}
            alt={campaign.title}
            loading="lazy"
            className={mediaClass}
            onError={() => {
              setIndex((i) => (items.length ? (i + 1) % items.length : 0));
            }}
          />
        )}

        {/* Overlay pro */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/35 via-black/10 to-black/30" />

        {/* Header chips */}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          {showSponsorBadge && (
            <span className="rounded-full bg-white/90 text-gray-900 text-[11px] px-2 py-1 font-medium shadow-sm">
              Sponsorisé
            </span>
          )}
          <span className="rounded-full bg-black/35 text-white text-[11px] px-2 py-1 font-medium backdrop-blur">
            {campaign.title}
          </span>
        </div>

        {/* Progress / index */}
        {items.length > 1 && (
          <div className="absolute right-3 top-3 rounded-full bg-black/35 text-white text-[11px] px-2 py-1 font-medium backdrop-blur">
            {index + 1}/{items.length}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
