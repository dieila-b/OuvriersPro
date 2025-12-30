// src/components/AdSlot.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type AdItem = {
  campaign: AdCampaign;
  asset: AdAsset;
  signedUrl: string | null;
  signedAtMs: number;
};

type Props = {
  placement: string;
  className?: string;
  expiresIn?: number; // secondes (URL signée)
  rotateEveryMs?: number;
  refreshEveryMs?: number;
};

function isCampaignActiveNow(c: AdCampaign, nowMs: number) {
  const startOk = !c.start_at || new Date(c.start_at).getTime() <= nowMs;
  const endOk = !c.end_at || new Date(c.end_at).getTime() >= nowMs;
  return startOk && endOk;
}

export default function AdSlot({
  placement,
  className,
  expiresIn = 300,
  rotateEveryMs = 8000,
  refreshEveryMs = 60000,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AdItem[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const aliveRef = useRef(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Pour fallback propre si la vidéo ne peut pas jouer
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const buildSignedUrl = useCallback(
    async (storagePath: string) => {
      const { data, error } = await supabase.storage
        .from("ads-media")
        .createSignedUrl(storagePath, expiresIn);

      if (error) throw error;
      return data?.signedUrl ?? null;
    },
    [expiresIn]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const now = Date.now();

      const { data: campaignsRaw, error: cErr } = await supabase
        .from("ads_campaigns")
        .select("id,title,link_url,placement,start_at,end_at,status,created_at")
        .eq("placement", placement)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (cErr) throw cErr;

      const campaignsAll = (campaignsRaw ?? []) as AdCampaign[];
      const campaigns = campaignsAll.filter((c) => isCampaignActiveNow(c, now));

      if (!campaigns.length) {
        if (aliveRef.current) {
          setItems([]);
          setIndex(0);
          setVideoFailed(false);
        }
        return;
      }

      const ids = campaigns.map((c) => c.id);
      const { data: assetsRaw, error: aErr } = await supabase
        .from("ads_assets")
        .select("id,campaign_id,media_type,storage_path,mime_type,size_bytes,created_at")
        .in("campaign_id", ids)
        .order("created_at", { ascending: false });

      if (aErr) throw aErr;

      const assetsAll = (assetsRaw ?? []) as AdAsset[];

      // 1 asset le plus récent par campagne
      const latestByCampaign: Record<string, AdAsset> = {};
      for (const a of assetsAll) {
        if (!latestByCampaign[a.campaign_id]) latestByCampaign[a.campaign_id] = a;
      }

      const pairs = campaigns
        .map((c) => {
          const asset = latestByCampaign[c.id];
          if (!asset) return null;
          return { campaign: c, asset };
        })
        .filter(Boolean) as Array<{ campaign: AdCampaign; asset: AdAsset }>;

      if (!pairs.length) {
        if (aliveRef.current) {
          setItems([]);
          setIndex(0);
          setVideoFailed(false);
        }
        return;
      }

      const signed = await Promise.all(
        pairs.map(async (p) => {
          const url = await buildSignedUrl(p.asset.storage_path);
          return {
            campaign: p.campaign,
            asset: p.asset,
            signedUrl: url,
            signedAtMs: Date.now(),
          } as AdItem;
        })
      );

      if (aliveRef.current) {
        setItems(signed);
        setIndex((prev) => (signed.length ? Math.min(prev, signed.length - 1) : 0));
        setVideoFailed(false);
      }
    } catch (e: any) {
      if (aliveRef.current) {
        setItems([]);
        setIndex(0);
        setError(e?.message ?? "Unknown ads error");
        setVideoFailed(false);
      }
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [placement, buildSignedUrl]);

  useEffect(() => {
    refresh();
    const t = window.setInterval(refresh, refreshEveryMs);
    return () => window.clearInterval(t);
  }, [refresh, refreshEveryMs]);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, rotateEveryMs);
    return () => window.clearInterval(t);
  }, [items.length, rotateEveryMs]);

  // Renouvellement URL si proche expiration
  useEffect(() => {
    if (!items.length) return;
    const current = items[index];
    if (!current) return;

    const ttlMs = expiresIn * 1000;
    const renewAt = current.signedAtMs + Math.floor(ttlMs * 0.8);
    if (Date.now() < renewAt) return;

    let cancelled = false;
    (async () => {
      try {
        const url = await buildSignedUrl(current.asset.storage_path);
        if (cancelled || !aliveRef.current) return;

        setItems((prev) =>
          prev.map((it, i) =>
            i === index ? { ...it, signedUrl: url, signedAtMs: Date.now() } : it
          )
        );
      } catch {
        // best effort
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [index, items, expiresIn, buildSignedUrl]);

  // ✅ Force play() à chaque changement de spot vidéo
  useEffect(() => {
    if (!items.length) return;
    const current = items[index];
    if (!current) return;

    setVideoFailed(false);

    if (current.asset.media_type !== "video") return;

    const v = videoRef.current;
    if (!v) return;

    // important: muted BEFORE play
    v.muted = true;

    const tryPlay = async () => {
      try {
        const p = v.play();
        if (p && typeof (p as any).then === "function") await p;
      } catch {
        // Autoplay peut être bloqué => on garde le fallback (ou l'utilisateur peut cliquer)
      }
    };

    // on retente après un micro délai (souvent nécessaire quand src vient d’être set)
    const id = window.setTimeout(() => {
      void tryPlay();
    }, 50);

    return () => window.clearTimeout(id);
  }, [index, items]);

  if (loading && items.length === 0) return null;
  if (error) return <div className="text-xs text-red-600">Ads error: {error}</div>;
  if (!items.length) return null;

  const current = items[index];
  if (!current?.signedUrl) return null;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (current.campaign.link_url) {
      return (
        <a
          href={current.campaign.link_url}
          target="_blank"
          rel="noreferrer"
          className={className}
          aria-label={current.campaign.title}
        >
          {children}
        </a>
      );
    }
    return <div className={className}>{children}</div>;
  };

  const frameClass =
    "relative w-full overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-[0_24px_70px_rgba(0,0,0,0.22)]";
  const mediaClass = "absolute inset-0 h-full w-full object-cover";

  const isVideo = current.asset.media_type === "video";

  return (
    <Wrapper>
      <div
        className={[
          frameClass,
          "aspect-[16/5]",
          "max-h-[180px] sm:max-h-[220px] md:max-h-[260px] lg:max-h-[320px]",
        ].join(" ")}
      >
        {isVideo && !videoFailed ? (
          <video
            ref={videoRef}
            key={current.asset.id} // force re-mount à chaque asset
            src={current.signedUrl}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className={mediaClass}
            onCanPlay={() => {
              // retente play quand le navigateur dit "ok"
              const v = videoRef.current;
              if (v) {
                v.muted = true;
                void v.play().catch(() => {});
              }
            }}
            onLoadedData={() => {
              const v = videoRef.current;
              if (v) {
                v.muted = true;
                void v.play().catch(() => {});
              }
            }}
            onError={() => {
              // fallback : si la vidéo est servie avec un header / mime problématique, on évite de rester "figé"
              setVideoFailed(true);
            }}
          />
        ) : (
          <img
            key={current.asset.id}
            src={current.signedUrl}
            alt={current.campaign.title}
            loading="lazy"
            className={mediaClass}
          />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/35 via-black/10 to-black/30" />
      </div>
    </Wrapper>
  );
}
