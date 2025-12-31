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
  display_seconds?: number | null; // optionnel
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

type AdItem =
  | {
      kind: "spot"; // rotation par campagne (1 média = asset le + récent)
      campaign: AdCampaign;
      asset: AdAsset;
    }
  | {
      kind: "asset"; // rotation par asset (tous les assets)
      campaign: AdCampaign;
      asset: AdAsset;
    };

type Props = {
  placement: string;
  className?: string;

  // ✅ Choix du mode de rotation
  mode?: "spot" | "asset"; // spot = par campagne, asset = par média

  // URL signées
  expiresIn?: number; // secondes (URL signée). Reco: 600+

  // Timing
  defaultDisplaySeconds?: number; // fallback si display_seconds absent
  transitionMs?: number; // durée du crossfade
  pauseOnHover?: boolean;

  // UI
  showSponsorBadge?: boolean;
  showCounter?: boolean;
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

type SignedEntry = {
  url: string;
  // timestamp ms pour “vieillissement” (optionnel)
  signedAt: number;
};

export default function AdSlot({
  placement,
  className,
  mode = "spot",
  expiresIn = 900,
  defaultDisplaySeconds = DEFAULT_SECONDS,
  transitionMs = 350,
  pauseOnHover = true,
  showSponsorBadge = true,
  showCounter = true,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AdItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // index “actif”
  const [idx, setIdx] = useState(0);

  // crossfade state
  const [isFading, setIsFading] = useState(false);
  const [front, setFront] = useState<{ item: AdItem; signed: SignedEntry } | null>(null);
  const [back, setBack] = useState<{ item: AdItem; signed: SignedEntry } | null>(null);

  // pause
  const [hovered, setHovered] = useState(false);

  // cache URLs signées par asset_id
  const signedCache = useRef<Map<string, SignedEntry>>(new Map());

  // timer “pause/resume” propre
  const timerRef = useRef<number | null>(null);
  const remainingRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);

  const totalCount = items.length;

  const currentItem = useMemo(() => items[idx] ?? null, [items, idx]);
  const nextIndex = useMemo(() => {
    if (!items.length) return 0;
    return (idx + 1) % items.length;
  }, [items.length, idx]);

  const currentDurationMs = useMemo(() => {
    const it = currentItem;
    if (!it) return defaultDisplaySeconds * 1000;
    const seconds = safeSeconds(it.campaign.display_seconds, defaultDisplaySeconds);
    return seconds * 1000;
  }, [currentItem, defaultDisplaySeconds]);

  const shouldPause = pauseOnHover && hovered;

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduleTimer = useCallback(
    (ms: number) => {
      clearTimer();
      remainingRef.current = ms;
      startedAtRef.current = Date.now();

      timerRef.current = window.setTimeout(() => {
        remainingRef.current = 0;
        startedAtRef.current = 0;
        // déclenche la transition
        void goNext();
      }, ms);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, idx, currentDurationMs, shouldPause, transitionMs]
  );

  const pauseTimer = () => {
    if (!timerRef.current) return;
    const elapsed = Date.now() - startedAtRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    clearTimer();
  };

  const resumeTimer = () => {
    if (remainingRef.current > 0) scheduleTimer(remainingRef.current);
  };

  // signer un asset (avec cache)
  const signAsset = useCallback(
    async (asset: AdAsset): Promise<SignedEntry> => {
      const cached = signedCache.current.get(asset.id);
      if (cached) return cached;

      const { data, error: sErr } = await supabase.storage
        .from("ads-media")
        .createSignedUrl(asset.storage_path, expiresIn);

      if (sErr) throw sErr;

      const entry: SignedEntry = {
        url: data?.signedUrl ?? "",
        signedAt: Date.now(),
      };

      if (!entry.url) throw new Error("Signed URL vide");
      signedCache.current.set(asset.id, entry);
      return entry;
    },
    [expiresIn]
  );

  // précharger le prochain média (sign URL en avance)
  const prefetchNext = useCallback(async () => {
    const next = items[nextIndex];
    if (!next) return;
    try {
      await signAsset(next.asset);
    } catch {
      // silencieux : on gèrera à l’affichage
    }
  }, [items, nextIndex, signAsset]);

  // construire la liste selon le mode
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const campaigns = await safeSelectCampaigns(placement);
        const active = (campaigns ?? []).filter((c) => inWindow(c, new Date()));

        if (!active.length) {
          if (!cancelled) {
            setItems([]);
            setIdx(0);
          }
          return;
        }

        const ids = active.map((c) => c.id);

        const { data: assets, error: aErr } = await supabase
          .from("ads_assets")
          .select("id,campaign_id,media_type,storage_path,mime_type,size_bytes,created_at")
          .in("campaign_id", ids)
          .order("created_at", { ascending: false });

        if (aErr) throw aErr;

        const byId: Record<string, AdCampaign> = {};
        active.forEach((c) => (byId[c.id] = c));

        let built: AdItem[] = [];

        if (mode === "asset") {
          // rotation par asset: on garde tous les assets
          built = (assets ?? [])
            .map((a: any) => {
              const c = byId[a.campaign_id];
              if (!c) return null;
              return { kind: "asset", campaign: c, asset: a as AdAsset } as AdItem;
            })
            .filter(Boolean) as AdItem[];
        } else {
          // rotation par spot/campagne: 1 seul asset (le + récent) par campagne
          const latestByCampaign: Record<string, AdAsset> = {};
          (assets ?? []).forEach((a: any) => {
            if (!latestByCampaign[a.campaign_id]) latestByCampaign[a.campaign_id] = a as AdAsset;
          });

          built = active
            .map((c) => {
              const a = latestByCampaign[c.id];
              if (!a) return null;
              return { kind: "spot", campaign: c, asset: a } as AdItem;
            })
            .filter(Boolean) as AdItem[];
        }

        if (!cancelled) {
          setItems(built);
          setIdx(0);
          signedCache.current.clear();
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
  }, [placement, mode]);

  // initialiser front/back quand currentItem change
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!currentItem) {
        setFront(null);
        setBack(null);
        return;
      }

      try {
        const signed = await signAsset(currentItem.asset);
        if (cancelled) return;

        setFront({ item: currentItem, signed });
        setBack(null);

        // précharge le prochain
        void prefetchNext();
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Ads media error");
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem?.asset?.id, currentItem?.campaign?.id]);

  // timer: (re)planifier quand item/durée change et pas en pause
  useEffect(() => {
    clearTimer();

    if (!front || !items.length) return;
    if (shouldPause) return;

    scheduleTimer(currentDurationMs);

    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front?.item.asset.id, idx, items.length, currentDurationMs, shouldPause]);

  // pause/resume sur hover
  useEffect(() => {
    if (!pauseOnHover) return;

    if (shouldPause) pauseTimer();
    else resumeTimer();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPause]);

  const goNext = useCallback(async () => {
    if (!items.length) return;

    const next = items[nextIndex];
    if (!next) return;

    // si déjà en transition, ignore
    if (isFading) return;

    try {
      // assurer url signée prête (cache)
      const nextSigned = await signAsset(next.asset);

      // monter le back + lancer fade
      setBack({ item: next, signed: nextSigned });
      setIsFading(true);

      // après transition: swap idx + front/back
      window.setTimeout(() => {
        setIdx(nextIndex);
        setFront({ item: next, signed: nextSigned });
        setBack(null);
        setIsFading(false);

        // précharge le suivant (nouvel idx)
        // (la valeur nextIndex dans ce scope correspond à l’ancien, mais idx est mis à jour)
        // On déclenche une précharge “optimiste” via microtask:
        Promise.resolve().then(() => {
          // recalcul via items + (nextIndex+1)
          const ni = items.length ? (nextIndex + 1) % items.length : 0;
          const nxt = items[ni];
          if (nxt) void signAsset(nxt.asset).catch(() => {});
        });
      }, transitionMs);
    } catch {
      // si media en erreur: on saute direct au prochain index
      setIdx(nextIndex);
    }
  }, [items, nextIndex, isFading, signAsset, transitionMs]);

  const skipOnError = useCallback(() => {
    if (!items.length) return;
    setIdx((i) => (items.length ? (i + 1) % items.length : 0));
  }, [items.length]);

  // UI classes
  const frameClass =
    "relative w-full overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-[0_24px_70px_rgba(0,0,0,0.22)]";
  const aspectClass =
    "aspect-[16/5] max-h-[180px] sm:max-h-[220px] md:max-h-[260px] lg:max-h-[320px]";
  const skeletonClass =
    "animate-pulse bg-white/10 border border-white/10 rounded-2xl w-full aspect-[16/5] max-h-[180px] sm:max-h-[220px] md:max-h-[260px] lg:max-h-[320px]";
  const mediaBase = "absolute inset-0 h-full w-full object-cover";

  if (error) {
    return (
      <div className="text-xs text-red-200/90 bg-red-500/10 border border-red-300/20 rounded-xl px-3 py-2">
        Ads error: {error}
      </div>
    );
  }

  if (loading) return <div className={skeletonClass} />;
  if (!front) return null;

  const activeCampaign = front.item.campaign;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (activeCampaign.link_url) {
      return (
        <a
          href={activeCampaign.link_url}
          target="_blank"
          rel="noreferrer"
          className={className}
          aria-label={activeCampaign.title}
          title={activeCampaign.title}
        >
          {children}
        </a>
      );
    }
    return <div className={className}>{children}</div>;
  };

  const renderMedia = (entry: { item: AdItem; signed: SignedEntry }, layer: "front" | "back") => {
    const { asset, campaign } = entry.item;
    const url = entry.signed.url;

    const isTop = layer === "back" ? isFading : !isFading;
    const opacity =
      layer === "front"
        ? isFading
          ? 0
          : 1
        : isFading
          ? 1
          : 0;

    const commonClass = [
      mediaBase,
      "transition-opacity",
      `duration-[${transitionMs}ms]`,
      isTop ? "z-10" : "z-0",
    ].join(" ");

    // ✅ Key = URL signée => force refresh + évite “freeze” navigateur
    const k = `${asset.id}:${url}`;

    if (asset.media_type === "video") {
      return (
        <video
          key={k}
          src={url}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          controls={false}
          className={commonClass}
          style={{ opacity }}
          onError={skipOnError}
        />
      );
    }

    return (
      <img
        key={k}
        src={url}
        alt={campaign.title}
        loading="lazy"
        className={commonClass}
        style={{ opacity }}
        onError={skipOnError}
      />
    );
  };

  return (
    <Wrapper>
      <div
        className={[frameClass, aspectClass].join(" ")}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* couches crossfade */}
        {renderMedia(front, "front")}
        {back ? renderMedia(back, "back") : null}

        {/* overlay pro */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/35 via-black/10 to-black/30" />

        {/* chips */}
        <div className="absolute left-3 top-3 flex items-center gap-2 z-20">
          {showSponsorBadge && (
            <span className="rounded-full bg-white/90 text-gray-900 text-[11px] px-2 py-1 font-medium shadow-sm">
              Sponsorisé
            </span>
          )}
          <span className="rounded-full bg-black/35 text-white text-[11px] px-2 py-1 font-medium backdrop-blur">
            {front.item.campaign.title}
          </span>
          {mode === "asset" && (
            <span className="rounded-full bg-black/35 text-white text-[11px] px-2 py-1 font-medium backdrop-blur">
              Média
            </span>
          )}
        </div>

        {/* counter */}
        {showCounter && totalCount > 1 && (
          <div className="absolute right-3 top-3 z-20 rounded-full bg-black/35 text-white text-[11px] px-2 py-1 font-medium backdrop-blur">
            {idx + 1}/{totalCount}
          </div>
        )}

        {/* petit “hint pause” */}
        {pauseOnHover && (
          <div className="absolute right-3 bottom-3 z-20 text-[11px] text-white/90 bg-black/25 px-2 py-1 rounded-full backdrop-blur">
            {hovered ? "Pause" : "Auto"}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
