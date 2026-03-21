// src/components/AdSlot.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ExternalLink, Image as ImageIcon, Sparkles } from "lucide-react";

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
  display_seconds?: number | null;
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
      kind: "spot";
      campaign: AdCampaign;
      asset: AdAsset;
    }
  | {
      kind: "asset";
      campaign: AdCampaign;
      asset: AdAsset;
    };

type Props = {
  placement: string;
  className?: string;
  mode?: "spot" | "asset";
  expiresIn?: number;
  defaultDisplaySeconds?: number;
  transitionMs?: number;
  pauseOnHover?: boolean;
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

  const [idx, setIdx] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [front, setFront] = useState<{ item: AdItem; signed: SignedEntry } | null>(null);
  const [back, setBack] = useState<{ item: AdItem; signed: SignedEntry } | null>(null);
  const [hovered, setHovered] = useState(false);

  const [compactAd, setCompactAd] = useState(() => {
    try {
      return window.innerWidth < 640;
    } catch {
      return false;
    }
  });

  const signedCache = useRef<Map<string, SignedEntry>>(new Map());
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

  const shouldPause = pauseOnHover && hovered && !compactAd;
  const effectiveShowCounter = showCounter && !compactAd;

  useEffect(() => {
    const syncCompact = () => {
      try {
        setCompactAd(window.innerWidth < 640);
      } catch {
        setCompactAd(false);
      }
    };

    syncCompact();
    window.addEventListener("resize", syncCompact);
    return () => window.removeEventListener("resize", syncCompact);
  }, []);

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

  const signAsset = useCallback(
    async (asset: AdAsset, forceRefresh = false): Promise<SignedEntry> => {
      const cached = signedCache.current.get(asset.id);
      if (cached && !forceRefresh) return cached;

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

  const signAssetWithRetry = useCallback(
    async (asset: AdAsset): Promise<SignedEntry> => {
      try {
        return await signAsset(asset, false);
      } catch {
        signedCache.current.delete(asset.id);
        return await signAsset(asset, true);
      }
    },
    [signAsset]
  );

  const prefetchNext = useCallback(async () => {
    const next = items[nextIndex];
    if (!next) return;
    try {
      await signAssetWithRetry(next.asset);
    } catch {
      // silencieux
    }
  }, [items, nextIndex, signAssetWithRetry]);

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
            setFront(null);
            setBack(null);
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
        active.forEach((c) => {
          byId[c.id] = c;
        });

        let built: AdItem[] = [];

        if (mode === "asset") {
          built = (assets ?? [])
            .map((a: any) => {
              const c = byId[a.campaign_id];
              if (!c) return null;
              return { kind: "asset", campaign: c, asset: a as AdAsset } as AdItem;
            })
            .filter(Boolean) as AdItem[];
        } else {
          const latestByCampaign: Record<string, AdAsset> = {};
          (assets ?? []).forEach((a: any) => {
            if (!latestByCampaign[a.campaign_id]) {
              latestByCampaign[a.campaign_id] = a as AdAsset;
            }
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
          setFront(null);
          setBack(null);
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

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!currentItem) {
        setFront(null);
        setBack(null);
        return;
      }

      try {
        const signed = await signAssetWithRetry(currentItem.asset);
        if (cancelled) return;

        setError(null);
        setFront({ item: currentItem, signed });
        setBack(null);

        void prefetchNext();
      } catch (e: any) {
        if (cancelled) return;

        if (items.length > 1) {
          setIdx((prev) => (items.length ? (prev + 1) % items.length : 0));
          return;
        }

        setError(e?.message ?? "Ads media error");
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem?.asset?.id, currentItem?.campaign?.id, items.length]);

  useEffect(() => {
    clearTimer();

    if (!front || !items.length) return;
    if (shouldPause) return;

    scheduleTimer(currentDurationMs);

    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front?.item.asset.id, idx, items.length, currentDurationMs, shouldPause]);

  useEffect(() => {
    if (!pauseOnHover) return;
    if (compactAd) return;

    if (shouldPause) pauseTimer();
    else resumeTimer();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPause, compactAd]);

  const goNext = useCallback(async () => {
    if (!items.length) return;

    const next = items[nextIndex];
    if (!next) return;
    if (isFading) return;

    try {
      const nextSigned = await signAssetWithRetry(next.asset);

      setBack({ item: next, signed: nextSigned });
      setIsFading(true);

      window.setTimeout(() => {
        setIdx(nextIndex);
        setFront({ item: next, signed: nextSigned });
        setBack(null);
        setIsFading(false);

        Promise.resolve().then(() => {
          const ni = items.length ? (nextIndex + 1) % items.length : 0;
          const nxt = items[ni];
          if (nxt) void signAssetWithRetry(nxt.asset).catch(() => {});
        });
      }, transitionMs);
    } catch {
      if (items.length > 1) {
        setIdx((i) => (items.length ? (i + 1) % items.length : 0));
      } else {
        setError("Ads media error");
      }
    }
  }, [items, nextIndex, isFading, signAssetWithRetry, transitionMs]);

  const skipOnError = useCallback(() => {
    if (!items.length) return;

    signedCache.current.delete(items[idx]?.asset.id);

    if (items.length > 1) {
      setIdx((i) => (items.length ? (i + 1) % items.length : 0));
      return;
    }

    setError("Ads media error");
  }, [items, idx]);

  const frameClass =
    "relative w-full overflow-hidden rounded-[28px] border border-white/18 bg-white/[0.04] shadow-[0_28px_80px_rgba(0,0,0,0.20)] ring-1 ring-white/10 backdrop-blur-sm";

  const aspectClass = compactAd
    ? "aspect-[16/7] min-h-[132px]"
    : "aspect-[36/7] min-h-[156px] sm:aspect-[36/7] sm:min-h-[176px] md:aspect-[38/7] md:min-h-[192px] lg:aspect-[40/7] lg:min-h-[208px] xl:aspect-[42/7] xl:min-h-[224px]";

  const skeletonClass = [
    "w-full rounded-[28px] border border-white/10",
    "bg-gradient-to-br from-white/10 via-white/5 to-white/10",
    "shadow-[0_28px_80px_rgba(0,0,0,0.18)] animate-pulse",
    aspectClass,
  ].join(" ");

  const mediaBase = "absolute inset-0 h-full w-full object-cover";

  const fallbackClass = [
    "relative isolate w-full overflow-hidden rounded-[28px]",
    "border border-white/15 bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900",
    "shadow-[0_28px_80px_rgba(0,0,0,0.20)] ring-1 ring-white/10",
    aspectClass,
  ].join(" ");

  if (error) {
    return (
      <div className={fallbackClass}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.28),transparent_35%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur">
              {compactAd ? "Sponsorisé" : "Espace sponsorisé"}
            </span>
            {!compactAd && (
              <span className="rounded-full bg-red-500/15 px-3 py-1 text-[11px] font-medium text-red-100 backdrop-blur">
                Indisponible
              </span>
            )}
          </div>

          {!compactAd ? (
            <>
              <div className="max-w-xl">
                <h3 className="text-lg font-extrabold text-white sm:text-xl">
                  Publicité momentanément indisponible
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  Le slot publicitaire existe bien, mais le média n’a pas pu être chargé pour le moment.
                </p>
                <p className="mt-2 text-xs text-red-100/80">{error}</p>
              </div>

              <div className="flex items-center gap-2 text-white/70">
                <ImageIcon className="h-4 w-4" />
                <span className="text-xs">Rechargement automatique au prochain rendu</span>
              </div>
            </>
          ) : (
            <div className="flex h-full items-end">
              <p className="text-xs text-white/70">Publicité indisponible</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) return <div className={skeletonClass} />;

  if (!front) {
    return (
      <div className={fallbackClass}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.30),transparent_35%)]" />
        <div className="absolute right-[-40px] top-[-40px] h-32 w-32 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-50px] left-[-30px] h-36 w-36 rounded-full bg-blue-400/20 blur-3xl" />

        <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90 backdrop-blur">
              {compactAd ? "Sponsorisé" : "Espace sponsorisé"}
            </span>
            {!compactAd && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
                Disponible
              </span>
            )}
          </div>

          {!compactAd ? (
            <>
              <div className="max-w-xl">
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white shadow-lg backdrop-blur">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-extrabold text-white sm:text-2xl">
                  Votre publicité peut apparaître ici
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/75 sm:text-[15px]">
                  Mettez en avant votre campagne avec un visuel premium visible sur mobile et desktop.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-white/65">
                  Placement : <span className="font-semibold text-white/85">{placement}</span>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/85 backdrop-blur">
                  Aucun média actif
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-end">
              <p className="text-xs text-white/70">Aucun média actif</p>
            </div>
          )}
        </div>
      </div>
    );
  }

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
        className={[frameClass, aspectClass, "group"].join(" ")}
        onMouseEnter={() => {
          if (!compactAd) setHovered(true);
        }}
        onMouseLeave={() => {
          if (!compactAd) setHovered(false);
        }}
      >
        {renderMedia(front, "front")}
        {back ? renderMedia(back, "back") : null}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/42 via-black/10 to-black/4" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.12),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/20" />

        <div className="absolute left-3 top-3 z-20 flex max-w-[75%] flex-wrap items-center gap-2 sm:left-4 sm:top-4">
          {showSponsorBadge && (
            <span className="rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow-sm">
              Sponsorisé
            </span>
          )}

          {!compactAd && (
            <>
              <span className="max-w-full truncate rounded-full bg-black/28 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                {front.item.campaign.title}
              </span>

              {mode === "asset" && (
                <span className="rounded-full bg-black/28 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
                  Média
                </span>
              )}
            </>
          )}
        </div>

        {effectiveShowCounter && totalCount > 1 && (
          <div className="absolute right-3 top-3 z-20 rounded-full bg-black/28 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur sm:right-4 sm:top-4">
            {idx + 1}/{totalCount}
          </div>
        )}

        {!compactAd && (
          <div className="absolute inset-x-0 bottom-0 z-20 p-3 sm:p-4 lg:px-5 lg:py-4">
            <div className="flex items-end justify-between gap-4">
              <div className="max-w-[80%]">
                <h3 className="line-clamp-2 text-sm font-extrabold text-white drop-shadow sm:text-base lg:text-[1.05rem]">
                  {activeCampaign.title}
                </h3>

                <p className="mt-1 line-clamp-2 text-[11px] text-white/82 sm:text-xs lg:text-[13px]">
                  Découvrez cette campagne sponsorisée et profitez d’une mise en avant premium.
                </p>
              </div>

              {activeCampaign.link_url && (
                <div className="hidden shrink-0 items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur lg:flex">
                  <span>Découvrir</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </div>
              )}
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/14">
                <div
                  key={`${activeCampaign.id}-${idx}`}
                  className="h-full rounded-full bg-white/90"
                  style={{
                    width: "100%",
                    animation: shouldPause ? "none" : `adProgress ${currentDurationMs}ms linear forwards`,
                  }}
                />
              </div>

              {pauseOnHover && (
                <div className="shrink-0 rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur">
                  {hovered ? "Pause" : "Auto"}
                </div>
              )}
            </div>
          </div>
        )}

        <style>
          {`
            @keyframes adProgress {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}
        </style>
      </div>
    </Wrapper>
  );
}
