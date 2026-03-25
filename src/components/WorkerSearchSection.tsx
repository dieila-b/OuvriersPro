// src/components/WorkerSearchSection.tsx
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { useNetworkStatus } from "@/services/networkService";
import { localStore } from "@/services/localStore";
import { authCache } from "@/services/authCache";
import { favoritesRepository } from "@/services/favoritesRepository";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Star,
  MapPin,
  Search,
  LayoutList,
  LayoutGrid,
  LocateFixed,
  Info,
  RotateCcw,
  Check,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  WifiOff,
  Database,
  Heart,
  Loader2,
} from "lucide-react";

type DbWorker = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profession: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  hourly_rate: number | null;
  currency: string | null;
  years_experience: number | null;
  average_rating?: number | null;
  rating_count?: number | null;
  computed_average_rating?: number | null;
  computed_rating_count?: number | null;
  status: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_visible?: number | null;
  is_suspended?: boolean | null;
  deleted_at?: string | null;
};

interface WorkerCard {
  id: string;
  name: string;
  job: string;
  country: string;
  region: string;
  city: string;
  commune: string;
  district: string;
  experienceYears: number;
  hourlyRate: number;
  currency: string;
  rating: number;
  ratingCount: number;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
}

type ViewMode = "list" | "grid";

type Filters = {
  keyword: string;
  job: string;
  region: string;
  city: string;
  commune: string;
  district: string;
  maxPrice: number;
  minRating: number;
  view: ViewMode;
  near: boolean;
  radiusKm: number;
  lat: number | null;
  lng: number | null;
};

type SearchPayload = {
  keyword?: string;
  district?: string;
  lat?: string;
  lng?: string;
  near?: string;
};

type FavoriteItem = {
  id: string;
  worker_id: string;
  worker_name: string | null;
  profession: string | null;
  created_at: string;
};

const DEFAULT_MAX_PRICE = 300000;
const DEFAULT_RADIUS_KM = 10;
const WORKERS_CACHE_KEY = "cached_workers_list_v1";
const WORKERS_CACHE_UPDATED_AT_KEY = "cached_workers_list_updated_at_v1";
const LAST_SEARCH_KEY = "op:last_search";

const getDeviceDefaultView = (): ViewMode => {
  try {
    const isNative = document.documentElement?.getAttribute("data-ui-native") === "true";
    if (isNative) return "grid";
  } catch {}

  try {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      return "grid";
    }
  } catch {}

  return "list";
};

const createDefaultFilters = (): Filters => ({
  keyword: "",
  job: "all",
  region: "",
  city: "",
  commune: "",
  district: "",
  maxPrice: DEFAULT_MAX_PRICE,
  minRating: 0,
  view: getDeviceDefaultView(),
  near: false,
  radiusKm: DEFAULT_RADIUS_KM,
  lat: null,
  lng: null,
});

const toRad = (deg: number) => (deg * Math.PI) / 180;

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatKm = (km: number, language: string) => {
  if (!Number.isFinite(km)) return "—";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  const rounded = Math.round(km * 10) / 10;
  return language === "fr" ? `${rounded} km` : `${rounded} km`;
};

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function filtersToParams(f: Filters) {
  const next: Record<string, string> = {};
  const defaultView = getDeviceDefaultView();

  if (f.keyword) next.keyword = f.keyword;
  if (f.district) next.district = f.district;

  if (f.job !== "all") next.job = f.job;
  if (f.region) next.region = f.region;
  if (f.city) next.city = f.city;
  if (f.commune) next.commune = f.commune;

  if (f.maxPrice !== DEFAULT_MAX_PRICE) next.maxPrice = String(f.maxPrice);
  if (f.minRating !== 0) next.minRating = String(f.minRating);
  if (f.view !== defaultView) next.view = f.view;

  if (f.near) next.near = "1";
  if (f.near && f.radiusKm !== DEFAULT_RADIUS_KM) next.radiusKm = String(f.radiusKm);
  if (f.near && f.lat != null && f.lng != null) {
    next.lat = String(f.lat);
    next.lng = String(f.lng);
  }

  return next;
}

function paramsToFilters(searchParams: URLSearchParams): Filters {
  const defaultView = getDeviceDefaultView();

  const spKeyword = (searchParams.get("keyword") ?? "").trim();
  const spJob = (searchParams.get("job") ?? "all").trim() || "all";
  const spRegion = (searchParams.get("region") ?? "").trim();
  const spCity = (searchParams.get("city") ?? "").trim();
  const spCommune = (searchParams.get("commune") ?? "").trim();
  const spDistrict = (searchParams.get("district") ?? "").trim();
  const spMaxPrice = Number(searchParams.get("maxPrice") ?? String(DEFAULT_MAX_PRICE));
  const spMinRating = Number(searchParams.get("minRating") ?? "0");
  const spViewRaw = searchParams.get("view");

  const spNear = searchParams.get("near") === "1";
  const spRadius = Number(searchParams.get("radiusKm") ?? String(DEFAULT_RADIUS_KM));
  const spLat = searchParams.get("lat");
  const spLng = searchParams.get("lng");

  const latNum = spLat != null ? Number(spLat) : null;
  const lngNum = spLng != null ? Number(spLng) : null;

  const resolvedView: ViewMode =
    spViewRaw === "grid" ? "grid" : spViewRaw === "list" ? "list" : defaultView;

  return {
    keyword: spKeyword,
    job: spJob,
    region: spRegion,
    city: spCity,
    commune: spCommune,
    district: spDistrict,
    maxPrice: Number.isFinite(spMaxPrice) ? spMaxPrice : DEFAULT_MAX_PRICE,
    minRating: Number.isFinite(spMinRating) ? spMinRating : 0,
    view: resolvedView,
    near: spNear,
    radiusKm: Number.isFinite(spRadius) ? spRadius : DEFAULT_RADIUS_KM,
    lat: Number.isFinite(latNum as number) ? (latNum as number) : null,
    lng: Number.isFinite(lngNum as number) ? (lngNum as number) : null,
  };
}

const normalizeWorker = (w: DbWorker, cms: (k: string, fr: string, en: string) => string): WorkerCard => {
  const effectiveRating = (w.computed_average_rating ?? w.average_rating ?? 0) as number;
  const effectiveCount = (w.computed_rating_count ?? w.rating_count ?? 0) as number;

  const lat = typeof w.latitude === "number" ? w.latitude : null;
  const lng = typeof w.longitude === "number" ? w.longitude : null;

  return {
    id: w.id,
    name:
      (((w.first_name || "") + (w.last_name ? ` ${w.last_name}` : "")).trim() ||
        cms("search.worker.fallback_name", "Ouvrier", "Worker")) as string,
    job: w.profession ?? "",
    country: w.country ?? "",
    region: w.region ?? "",
    city: w.city ?? "",
    commune: w.commune ?? "",
    district: w.district ?? "",
    experienceYears: w.years_experience ?? 0,
    hourlyRate: w.hourly_rate ?? 0,
    currency: w.currency ?? "GNF",
    rating: Number(effectiveRating) || 0,
    ratingCount: Number(effectiveCount) || 0,
    latitude: lat,
    longitude: lng,
    distanceKm: null,
  };
};

const WorkerSearchSection: React.FC = () => {
  const { t, language } = useLanguage();
  const { connected, initialized } = useNetworkStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const cms = (key: string, fallbackFr: string, fallbackEn: string) => {
    const v = t(key);
    if (!v || v === key) return language === "fr" ? fallbackFr : fallbackEn;
    return v;
  };

  const sectionRef = useRef<HTMLElement | null>(null);
  const topAnchorRef = useRef<HTMLDivElement | null>(null);
  const resultsAnchorRef = useRef<HTMLDivElement | null>(null);

  const isSearchRoute = location.pathname === "/search" || location.pathname === "/rechercher";

  const isMobileOrNative = () => {
    try {
      const isNative = document.documentElement?.getAttribute("data-ui-native") === "true";
      if (isNative) return true;
    } catch {}

    try {
      return window.innerWidth < 1280;
    } catch {}

    return false;
  };

  const isCompactMobile = () => {
    try {
      const isNative = document.documentElement?.getAttribute("data-ui-native") === "true";
      if (isNative) return true;
    } catch {}

    try {
      return window.innerWidth < 768;
    } catch {}

    return false;
  };

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(() => !isCompactMobile());

  useEffect(() => {
    const syncMobileFiltersState = () => {
      if (!isCompactMobile()) {
        setMobileFiltersOpen(true);
      }
    };

    syncMobileFiltersState();
    window.addEventListener("resize", syncMobileFiltersState);
    return () => window.removeEventListener("resize", syncMobileFiltersState);
  }, []);

  const getTopOverlayOffset = () => {
    const samplesX = [20, Math.floor(window.innerWidth / 2), window.innerWidth - 20];
    const yProbe = 6;
    let maxBottom = 0;

    const consider = (el: Element | null) => {
      if (!el) return;
      let cur: Element | null = el;

      while (cur) {
        const cs = window.getComputedStyle(cur as HTMLElement);
        const pos = cs.position;
        if (pos === "fixed" || pos === "sticky") {
          const r = (cur as HTMLElement).getBoundingClientRect();
          if (r.top <= 0 && r.height > 0) maxBottom = Math.max(maxBottom, r.bottom);
        }
        cur = cur.parentElement;
      }
    };

    for (const x of samplesX) consider(document.elementFromPoint(x, yProbe));

    const headerEl = document.querySelector("header") as HTMLElement | null;
    if (headerEl) {
      const r = headerEl.getBoundingClientRect();
      if (r.height > 0) maxBottom = Math.max(maxBottom, r.bottom);
    }

    return Math.max(0, Math.round(maxBottom));
  };

  const scrollToResultsTop = (opts?: { behavior?: ScrollBehavior }) => {
    const mobileLike = isMobileOrNative();
    const el = mobileLike
      ? (resultsAnchorRef.current ?? sectionRef.current)
      : (topAnchorRef.current ?? sectionRef.current);

    if (!el) return;

    const desiredGap = mobileLike ? 10 : 6;
    const behavior = opts?.behavior ?? "auto";

    const doAdjust = () => {
      const overlay = getTopOverlayOffset();
      const targetTop = overlay + desiredGap;
      const rect = el.getBoundingClientRect();
      const delta = rect.top - targetTop;
      if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: "auto" });
    };

    el.scrollIntoView({ block: "start", behavior });

    requestAnimationFrame(() => {
      doAdjust();
      requestAnimationFrame(doAdjust);
    });

    window.setTimeout(doAdjust, 60);
  };

  const [session, setSession] = useState<any>(null);

  const [favoriteMap, setFavoriteMap] = useState<Record<string, FavoriteItem>>({});
  const [favoriteLoadingByWorkerId, setFavoriteLoadingByWorkerId] = useState<Record<string, boolean>>({});
  const [favoriteCacheLoaded, setFavoriteCacheLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const goToWorkerProfile = (workerId: string) => {
    const target = `/ouvrier/${workerId}`;

    if (!session) {
      toast({
        title: cms("auth.login_required.title", "Connexion requise", "Login required"),
        description: cms(
          "auth.login_required.desc",
          "Connectez-vous pour voir le profil.",
          "Sign in to view the profile."
        ),
      });

      window.setTimeout(
        () => navigate(`/login?redirect=${encodeURIComponent(target)}`, { replace: false }),
        650
      );
      return;
    }

    navigate(target);
  };

  const initializedRef = useRef(false);
  const applyingExternalRef = useRef(false);

  const [workers, setWorkers] = useState<WorkerCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [applied, setApplied] = useState<Filters>(() => createDefaultFilters());
  const [draft, setDraft] = useState<Filters>(() => createDefaultFilters());

  const [usedOfflineCache, setUsedOfflineCache] = useState(false);
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<string | null>(null);

  const applyTimerRef = useRef<number | null>(null);

  const clearApplyTimer = () => {
    if (applyTimerRef.current != null) {
      window.clearTimeout(applyTimerRef.current);
      applyTimerRef.current = null;
    }
  };

  const persistLastSearchPayload = async (nextApplied: Filters) => {
    const payload: SearchPayload = {};
    if (nextApplied.keyword) payload.keyword = nextApplied.keyword;
    if (nextApplied.district) payload.district = nextApplied.district;
    if (nextApplied.near) payload.near = "1";
    if (nextApplied.near && nextApplied.lat != null && nextApplied.lng != null) {
      payload.lat = String(nextApplied.lat);
      payload.lng = String(nextApplied.lng);
    }

    try {
      await localStore.set(LAST_SEARCH_KEY, payload);
    } catch {}

    try {
      sessionStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(payload));
    } catch {}
  };

  const applyFiltersObject = (nextApplied: Filters, opts?: { immediate?: boolean }) => {
    clearApplyTimer();

    const run = () => {
      setApplied(nextApplied);
      setSearchParams(filtersToParams(nextApplied), { replace: true });
      void persistLastSearchPayload(nextApplied);
      if (isSearchRoute) scrollToResultsTop({ behavior: "auto" });
    };

    if (opts?.immediate) return run();
    applyTimerRef.current = window.setTimeout(run, 250);
  };

  const updateDraft = (patch: Partial<Filters>, opts?: { immediate?: boolean }) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      if (!applyingExternalRef.current) applyFiltersObject(next, opts);
      return next;
    });
  };

  useEffect(() => () => clearApplyTimer(), []);

  useEffect(() => {
    const readCache = async () => {
      const cachedWorkers = await localStore.get<WorkerCard[]>(WORKERS_CACHE_KEY);
      const cachedUpdatedAt = await localStore.get<string>(WORKERS_CACHE_UPDATED_AT_KEY);

      if (cachedWorkers?.length) {
        setWorkers(cachedWorkers);
        setUsedOfflineCache(true);
        setCacheUpdatedAt(cachedUpdatedAt ?? null);
        return true;
      }

      setWorkers([]);
      setUsedOfflineCache(true);
      setCacheUpdatedAt(cachedUpdatedAt ?? null);
      return false;
    };

    const fetchFrom = async (source: "op_ouvriers_with_ratings" | "op_ouvriers") => {
      const baseFields = [
        "id",
        "first_name",
        "last_name",
        "profession",
        "country",
        "region",
        "city",
        "commune",
        "district",
        "hourly_rate",
        "currency",
        "years_experience",
        "status",
        "latitude",
        "longitude",
      ];

      const ratingFields =
        source === "op_ouvriers_with_ratings"
          ? ["average_rating", "rating_count", "computed_average_rating", "computed_rating_count"]
          : [];

      const selectStr = [...baseFields, ...ratingFields].join(",");

      const q = supabase.from(source).select(selectStr).eq("status", "approved");
      const res = await q;
      return res;
    };

    const fetchWorkers = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!connected) {
          const ok = await readCache();
          if (!ok) {
            setError(
              cms(
                "search.error.offline_no_cache",
                "Aucune donnée locale disponible pour le moment. Connectez-vous une fois pour synchroniser les prestataires.",
                "No local data is available yet. Go online once to sync workers."
              )
            );
          }
          return;
        }

        let res = await fetchFrom("op_ouvriers_with_ratings");

        if (res.error) {
          console.warn("[workers] view failed, fallback to table:", res.error);
          res = await fetchFrom("op_ouvriers");
        }

        if (res.error) throw res.error;

        const rows = (res.data ?? []) as unknown as DbWorker[];

        const mapped: WorkerCard[] = rows.map((w) => normalizeWorker(w, cms));

        setWorkers(mapped);
        setUsedOfflineCache(false);

        const syncedAt = new Date().toISOString();
        setCacheUpdatedAt(syncedAt);

        await Promise.all([
          localStore.set(WORKERS_CACHE_KEY, mapped),
          localStore.set(WORKERS_CACHE_UPDATED_AT_KEY, syncedAt),
        ]);
      } catch (err: any) {
        console.error("WorkerSearchSection fetch error:", err);

        const ok = await readCache();

        if (!ok) {
          setWorkers([]);
          setError(
            cms(
              "search.error.load_workers",
              "Impossible de charger les professionnels pour le moment.",
              "Unable to load professionals at the moment."
            ) + (err?.message ? ` (${err.message})` : "")
          );
        }
      } finally {
        setLoading(false);
      }
    };

    if (initialized) {
      void fetchWorkers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, connected, initialized]);

  useEffect(() => {
    let cancelled = false;

    const loadFavorites = async () => {
      setFavoriteCacheLoaded(false);

      const userId = session?.user?.id || (await authCache.getUserId());
      if (!userId) {
        if (!cancelled) {
          setFavoriteMap({});
          setFavoriteCacheLoaded(false);
        }
        return;
      }

      try {
        const result = await favoritesRepository.loadFavorites(userId, connected);
        if (cancelled) return;

        const nextMap = (result.items || []).reduce<Record<string, FavoriteItem>>((acc, item) => {
          acc[item.worker_id] = item as FavoriteItem;
          return acc;
        }, {});

        setFavoriteMap(nextMap);
        setFavoriteCacheLoaded(result.fromCache);
      } catch (err) {
        console.error("[WorkerSearchSection] loadFavorites error:", err);
        if (!cancelled) {
          setFavoriteMap({});
          setFavoriteCacheLoaded(false);
        }
      }
    };

    if (initialized) {
      void loadFavorites();
    }

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, connected, initialized]);

  const applyExternalFilters = (f: Filters) => {
    applyingExternalRef.current = true;
    setApplied(f);
    setDraft(f);
    window.setTimeout(() => (applyingExternalRef.current = false), 0);
  };

  useEffect(() => {
    if (initializedRef.current) return;

    const hasUrlCriteria =
      !!searchParams.get("keyword") ||
      !!searchParams.get("district") ||
      !!searchParams.get("lat") ||
      !!searchParams.get("lng") ||
      searchParams.get("near") === "1" ||
      !!searchParams.get("region") ||
      !!searchParams.get("city") ||
      !!searchParams.get("commune") ||
      (searchParams.get("job") ?? "") !== "" ||
      !!searchParams.get("maxPrice") ||
      !!searchParams.get("minRating") ||
      !!searchParams.get("view");

    if (hasUrlCriteria) {
      applyExternalFilters(paramsToFilters(searchParams));
      initializedRef.current = true;
      return;
    }

    const storedSession = safeParseJson<SearchPayload>(sessionStorage.getItem(LAST_SEARCH_KEY));
    if (
      storedSession &&
      (storedSession.keyword || storedSession.district || storedSession.lat || storedSession.lng || storedSession.near)
    ) {
      const next = new URLSearchParams(searchParams);
      if (storedSession.keyword) next.set("keyword", storedSession.keyword);
      if (storedSession.district) next.set("district", storedSession.district);
      if (storedSession.near) next.set("near", storedSession.near);
      if (storedSession.lat) next.set("lat", storedSession.lat);
      if (storedSession.lng) next.set("lng", storedSession.lng);
      setSearchParams(next, { replace: true });
      initializedRef.current = true;
      return;
    }

    const defaults = createDefaultFilters();
    applyExternalFilters(defaults);
    initializedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (isSearchRoute) scrollToResultsTop({ behavior: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (applyingExternalRef.current) return;

    const f = paramsToFilters(searchParams);

    const isSame =
      f.keyword === applied.keyword &&
      f.job === applied.job &&
      f.region === applied.region &&
      f.city === applied.city &&
      f.commune === applied.commune &&
      f.district === applied.district &&
      f.maxPrice === applied.maxPrice &&
      f.minRating === applied.minRating &&
      f.view === applied.view &&
      f.near === applied.near &&
      f.radiusKm === applied.radiusKm &&
      f.lat === applied.lat &&
      f.lng === applied.lng;

    if (!isSame) {
      applyExternalFilters(f);
      if (isSearchRoute) scrollToResultsTop({ behavior: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  useEffect(() => {
    const onSearch = (evt: any) => {
      const payload: SearchPayload | undefined = evt?.detail;
      if (!payload) return;

      const next: Record<string, string> = {};
      if (payload.keyword) next.keyword = payload.keyword;
      if (payload.district) next.district = payload.district;
      if (payload.near) next.near = payload.near;
      if (payload.lat) next.lat = payload.lat;
      if (payload.lng) next.lng = payload.lng;

      if (Object.keys(next).length) {
        setSearchParams(next, { replace: true });
        if (isSearchRoute) {
          window.setTimeout(() => {
            scrollToResultsTop({ behavior: "auto" });
          }, 50);
        }
      }
    };

    const onSearchBootstrap = (evt: any) => {
      const payload: SearchPayload | undefined = evt?.detail;
      if (!payload) return;
      if (searchParams.toString()) return;

      const next: Record<string, string> = {};
      if (payload.keyword) next.keyword = payload.keyword;
      if (payload.district) next.district = payload.district;
      if (payload.near) next.near = payload.near;
      if (payload.lat) next.lat = payload.lat;
      if (payload.lng) next.lng = payload.lng;

      if (Object.keys(next).length) {
        setSearchParams(next, { replace: true });
      }
    };

    window.addEventListener("op:search", onSearch as EventListener);
    window.addEventListener("op:search-bootstrap", onSearchBootstrap as EventListener);

    return () => {
      window.removeEventListener("op:search", onSearch as EventListener);
      window.removeEventListener("op:search-bootstrap", onSearchBootstrap as EventListener);
    };
  }, [setSearchParams, isSearchRoute, searchParams]);

  const jobs = useMemo(
    () => Array.from(new Set(workers.map((w) => w.job).filter((j) => j && j.trim().length > 0))),
    [workers]
  );

  const regions = useMemo(
    () =>
      Array.from(new Set(workers.map((w) => w.region).filter((r) => r && r.trim().length > 0))),
    [workers]
  );

  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          workers
            .filter((w) => !draft.region || w.region === draft.region)
            .map((w) => w.city)
            .filter((c) => c && c.trim().length > 0)
        )
      ),
    [workers, draft.region]
  );

  const communes = useMemo(
    () =>
      Array.from(
        new Set(
          workers
            .filter(
              (w) =>
                (!draft.region || w.region === draft.region) &&
                (!draft.city || w.city === draft.city)
            )
            .map((w) => w.commune)
            .filter((c) => c && c.trim().length > 0)
        )
      ),
    [workers, draft.region, draft.city]
  );

  const districts = useMemo(
    () =>
      Array.from(
        new Set(
          workers
            .filter(
              (w) =>
                (!draft.region || w.region === draft.region) &&
                (!draft.city || w.city === draft.city) &&
                (!draft.commune || w.commune === draft.commune)
            )
            .map((w) => w.district)
            .filter((d) => d && d.trim().length > 0)
        )
      ),
    [workers, draft.region, draft.city, draft.commune]
  );

  const formatCurrency = (value: number, currency: string) => {
    if (currency === "GNF") return `${value.toLocaleString("fr-FR")} GNF`;
    return `${value} ${currency}`;
  };

  const computeDistance = (w: WorkerCard, f: Filters) => {
    if (!f.near) return null;
    if (f.lat == null || f.lng == null) return null;
    if (w.latitude == null || w.longitude == null) return null;
    return haversineKm(f.lat, f.lng, w.latitude, w.longitude);
  };

  const filteredWorkers = useMemo(() => {
    const f = applied;

    const list = workers
      .map((w) => ({ ...w, distanceKm: computeDistance(w, f) }))
      .filter((w) => {
        const kw = f.keyword.trim().toLowerCase();

        const searchPool = [
          w.name,
          w.job,
          w.country,
          w.region,
          w.city,
          w.commune,
          w.district,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchKeyword = !kw || searchPool.includes(kw);
        const matchJob = f.job === "all" || w.job === f.job;
        const matchPrice = w.hourlyRate <= f.maxPrice;
        const matchRating = w.rating >= f.minRating;

        const regionNorm = w.region?.trim().toLowerCase() || "";
        const cityNorm = w.city?.trim().toLowerCase() || "";
        const communeNorm = w.commune?.trim().toLowerCase() || "";
        const districtNorm = w.district?.trim().toLowerCase() || "";

        const matchRegion = !f.region || regionNorm === f.region.trim().toLowerCase();
        const matchCity = !f.city || cityNorm === f.city.trim().toLowerCase();
        const matchCommune = !f.commune || communeNorm === f.commune.trim().toLowerCase();
        const matchDistrict = !f.district || districtNorm === f.district.trim().toLowerCase();

        const matchRadius =
          !f.near ||
          f.lat == null ||
          f.lng == null ||
          w.distanceKm == null ||
          w.distanceKm <= f.radiusKm;

        return (
          matchKeyword &&
          matchJob &&
          matchPrice &&
          matchRating &&
          matchRegion &&
          matchCity &&
          matchCommune &&
          matchDistrict &&
          matchRadius
        );
      });

    if (f.near && f.lat != null && f.lng != null) {
      list.sort((a, b) => {
        const da = a.distanceKm;
        const db = b.distanceKm;
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
      return list;
    }

    list.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [workers, applied]);

  const resetAll = () => {
    const defaults = createDefaultFilters();
    applyingExternalRef.current = true;
    setDraft(defaults);
    setApplied(defaults);
    setSearchParams({}, { replace: true });
    setGeoError(null);
    void persistLastSearchPayload(defaults);
    window.setTimeout(() => (applyingExternalRef.current = false), 0);
    if (isSearchRoute) scrollToResultsTop({ behavior: "auto" });
  };

  const requestMyPosition = () => {
    setGeoError(null);

    if (!navigator.geolocation) {
      updateDraft({ near: false, lat: null, lng: null }, { immediate: true });
      setGeoError(
        cms(
          "search.geo.unsupported",
          "La géolocalisation n'est pas supportée par ce navigateur.",
          "Geolocation is not supported by this browser."
        )
      );
      return;
    }

    setGeoLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateDraft(
          { near: true, lat: pos.coords.latitude, lng: pos.coords.longitude },
          { immediate: true }
        );
        setGeoLocating(false);
      },
      (err) => {
        console.error("geolocation error", err);
        setGeoLocating(false);
        updateDraft({ near: false, lat: null, lng: null }, { immediate: true });
        setGeoError(
          cms(
            "search.geo.error",
            "Impossible de récupérer votre position. Autorisez la localisation dans votre navigateur.",
            "Unable to retrieve your location. Please allow location access in your browser."
          )
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const title = cms("search.page.title", "Trouvez votre professionnel", "Find your professional");
  const subtitle = cms(
    "search.page.subtitle",
    "Modifiez vos filtres pour lancer la recherche automatiquement.",
    "Adjust filters to automatically update results."
  );

  const filtersTitle = cms("search.filters.title", "Filtres", "Filters");
  const keywordLabel = cms("search.filters.keyword.label", "Métier ou nom", "Trade or name");
  const keywordPlaceholder = cms(
    "search.filters.keyword.placeholder",
    "Plombier, électricien, Mamadou...",
    "Plumber, electrician, John..."
  );

  const jobLabel = cms("search.filters.job.label", "Métier", "Job");
  const jobAll = cms("search.filters.job.all", "Tous les métiers", "All trades");

  const priceLabel = cms("search.filters.price.label", "Tarif horaire max", "Max hourly rate");
  const priceNoLimit = cms("search.filters.price.no_limit", "Aucune limite", "No limit");

  const ratingLabel = cms("search.filters.rating.label", "Note minimum", "Minimum rating");
  const ratingAny = cms("search.filters.rating.any", "Toutes", "Any");

  const regionLabel = cms("search.filters.region.label", "Région", "Region");
  const regionAll = cms("search.filters.region.all", "Toutes les régions", "All regions");

  const cityLabel = cms("search.filters.city.label", "Ville", "City");
  const cityAll = cms("search.filters.city.all", "Toutes les villes", "All cities");

  const communeLabel = cms("search.filters.commune.label", "Commune", "Commune");
  const communeAll = cms("search.filters.commune.all", "Toutes les communes", "All communes");

  const districtLabel = cms("search.filters.district.label", "Quartier", "District");
  const districtAll = cms("search.filters.district.all", "Tous les quartiers", "All districts");

  const resetLabel = cms("search.filters.btn_reset", "Réinitialiser", "Reset");
  const hideFiltersLabel = cms("search.filters.hide", "Masquer les filtres", "Hide filters");
  const activeFiltersLabel = cms("search.filters.active_count", "filtres actifs", "active filters");

  const viewModeLabel = cms("search.view.label", "Affichage", "View");
  const viewListLabel = cms("search.view.list", "Liste", "List");
  const viewGridLabel = cms("search.view.grid", "Mosaïque", "Grid");

  const contactLabel = cms("search.card.btn_contact", "Contacter", "Contact");
  const perHourLabel = cms("search.card.per_hour", "/h", "/h");
  const yearsSuffix = cms("search.card.years_suffix", "ans d'expérience", "years of experience");
  const distanceLabel = cms("search.card.distance_label", "Distance", "Distance");

  const geoHint = cms(
    "search.geo.hint",
    "Activez la localisation pour trier et filtrer par distance.",
    "Enable location to sort/filter by distance."
  );
  const useMyPos = cms(
    "search.filters.btn_geolocate",
    "Utiliser ma position",
    "Use my location"
  );
  const radiusLabel = cms("search.filters.radius.label", "Rayon", "Radius");
  const kmLabel = cms("search.filters.radius.unit", "km", "km");

  const noResults = cms(
    "search.results.none",
    "Aucun professionnel ne correspond à ces critères pour le moment.",
    "No professional matches your criteria yet."
  );
  const noData = cms(
    "search.results.nodata",
    "Aucun professionnel n’est encore disponible.",
    "No professionals are available yet."
  );

  const loadingShort = cms("common.loading", "Chargement...", "Loading...");
  const loadingWorkers = cms(
    "search.loading_workers",
    "Chargement des professionnels...",
    "Loading professionals..."
  );

  const offlineTitle = cms("search.offline.title", "Mode hors connexion", "Offline mode");
  const offlineDesc = cms(
    "search.offline.desc",
    "Affichage des prestataires synchronisés jusqu’à la dernière connexion.",
    "Showing workers synced up to the last connection."
  );
  const offlineCacheLabel = cms(
    "search.offline.cache",
    "Résultats chargés depuis le cache local.",
    "Results loaded from local cache."
  );

  const favAdd = cms("search.favorites.add", "Ajouter aux favoris", "Add to favourites");
  const favRemove = cms("search.favorites.remove", "Retirer des favoris", "Remove from favourites");
  const favAddedOnline = cms(
    "search.favorites.added_online",
    "Prestataire ajouté aux favoris.",
    "Provider added to favourites."
  );
  const favRemovedOnline = cms(
    "search.favorites.removed_online",
    "Prestataire retiré des favoris.",
    "Provider removed from favourites."
  );
  const favAddedOffline = cms(
    "search.favorites.added_offline",
    "Favori enregistré hors ligne. Synchronisation automatique au retour du réseau.",
    "Favourite saved offline. It will sync automatically when back online."
  );
  const favRemovedOffline = cms(
    "search.favorites.removed_offline",
    "Retrait enregistré hors ligne. Synchronisation automatique au retour du réseau.",
    "Offline removal saved. It will sync automatically when back online."
  );
  const favUpdating = cms("search.favorites.updating", "Mise à jour...", "Updating...");
  const favLoginRequiredTitle = cms(
    "search.favorites.login_title",
    "Connexion requise",
    "Login required"
  );
  const favLoginRequiredDesc = cms(
    "search.favorites.login_desc",
    "Connectez-vous pour gérer vos favoris.",
    "Sign in to manage your favourites."
  );

  const hasAnyGeoWorkers = useMemo(
    () => workers.some((w) => w.latitude != null && w.longitude != null),
    [workers]
  );
  const appliedHasCoords = applied.lat != null && applied.lng != null;

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (draft.keyword.trim()) count += 1;
    if (draft.job !== "all") count += 1;
    if (draft.region) count += 1;
    if (draft.city) count += 1;
    if (draft.commune) count += 1;
    if (draft.district) count += 1;
    if (draft.maxPrice !== DEFAULT_MAX_PRICE) count += 1;
    if (draft.minRating !== 0) count += 1;
    if (draft.near) count += 1;
    if (draft.radiusKm !== DEFAULT_RADIUS_KM && draft.near) count += 1;
    return count;
  }, [draft]);

  const resultCountLabel = useMemo(() => {
    const count = filteredWorkers.length;
    if (language === "fr") {
      const s = count > 1 ? "s" : "";
      const e = count > 1 ? "s" : "";
      return cms(
        "search.results.count",
        `${count} résultat${s} trouvé${e}`,
        `${count} result${count > 1 ? "s" : ""} found`
      );
    }
    return cms(
      "search.results.count",
      `${count} résultat${count > 1 ? "s" : ""} trouvé${count > 1 ? "s" : ""}`,
      `${count} result${count > 1 ? "s" : ""} found`
    );
  }, [filteredWorkers.length, language]); // eslint-disable-line react-hooks/exhaustive-deps

  const compactMobile = isCompactMobile();

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("") || "OP";

  const getWorkerSubtitle = (w: WorkerCard) => {
    const primary = w.job?.trim();
    const location = [w.city, w.commune, w.district].filter(Boolean).join(" • ");
    return (
      primary ||
      location ||
      cms("search.card.subtitle", "Prestataire qualifié", "Qualified provider")
    );
  };

  const getWorkerMetaLine = (w: WorkerCard) =>
    [w.region, w.city, w.commune, w.district].filter(Boolean).join(" • ");

  const renderStars = (rating: number) => {
    const full = Math.max(0, Math.min(5, Math.round(rating)));
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i < full ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"
        }`}
      />
    ));
  };

  const formattedCacheDate = useMemo(() => {
    if (!cacheUpdatedAt) return null;
    try {
      return new Date(cacheUpdatedAt).toLocaleString(language === "fr" ? "fr-FR" : "en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  }, [cacheUpdatedAt, language]);

  const isWorkerFavorite = (workerId: string) => !!favoriteMap[workerId];

  const toggleFavorite = async (worker: WorkerCard) => {
    const userId = session?.user?.id || (await authCache.getUserId());

    if (!userId) {
      toast({
        title: favLoginRequiredTitle,
        description: favLoginRequiredDesc,
      });

      window.setTimeout(() => {
        navigate(`/login?redirect=${encodeURIComponent(`/ouvrier/${worker.id}`)}`, { replace: false });
      }, 450);
      return;
    }

    setFavoriteLoadingByWorkerId((prev) => ({ ...prev, [worker.id]: true }));

    try {
      const existing = favoriteMap[worker.id];

      if (existing) {
        await favoritesRepository.removeFavorite({
          userId,
          connected,
          workerId: worker.id,
          favoriteId: existing.id,
        });

        setFavoriteMap((prev) => {
          const next = { ...prev };
          delete next[worker.id];
          return next;
        });

        toast({
          title: language === "fr" ? "Favoris" : "Favourites",
          description: connected ? favRemovedOnline : favRemovedOffline,
        });
      } else {
        const result = await favoritesRepository.addFavorite({
          userId,
          connected,
          workerId: worker.id,
          workerName: worker.name,
          profession: worker.job || null,
        });

        const nextItem: FavoriteItem = {
          id: result.id,
          worker_id: worker.id,
          worker_name: worker.name,
          profession: worker.job || null,
          created_at: new Date().toISOString(),
        };

        setFavoriteMap((prev) => ({ ...prev, [worker.id]: nextItem }));

        toast({
          title: language === "fr" ? "Favoris" : "Favourites",
          description: connected ? favAddedOnline : favAddedOffline,
        });
      }
    } catch (error: any) {
      console.error("[WorkerSearchSection] toggleFavorite error:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description:
          error?.message ||
          (language === "fr"
            ? "Impossible de mettre à jour les favoris."
            : "Unable to update favourites."),
        variant: "destructive",
      });
    } finally {
      setFavoriteLoadingByWorkerId((prev) => ({ ...prev, [worker.id]: false }));
    }
  };

  return (
    <section
      ref={sectionRef}
      id="worker-search"
      className="w-full bg-[linear-gradient(180deg,#f8fbff_0%,#f4f8fd_34%,#ffffff_100%)] pb-12 pt-2 sm:pb-16"
    >
      <div className="mx-auto w-full px-4 sm:px-6 lg:px-10 2xl:px-16">
        <div ref={topAnchorRef} />

        {!connected && initialized && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">{offlineTitle}</div>
              <div className="text-xs text-amber-800 mt-1">{offlineDesc}</div>
            </div>
          </div>
        )}

        {(usedOfflineCache || favoriteCacheLoaded) && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <Database className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">{offlineCacheLabel}</div>
              {formattedCacheDate && (
                <div className="text-xs text-sky-800 mt-1">
                  {language === "fr" ? "Dernière synchronisation :" : "Last sync:"} {formattedCacheDate}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-6 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {title}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                {subtitle}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                  <Search className="h-3.5 w-3.5" />
                  {loading ? loadingShort : resultCountLabel}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                  <Check className="h-3.5 w-3.5" />
                  {cms("search.badge.applied", "Filtres appliqués", "Applied filters")}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs text-blue-700">
                  <Info className="h-3.5 w-3.5" />
                  {geoHint}
                </span>
              </div>

              {applied.near && appliedHasCoords && !hasAnyGeoWorkers && (
                <div className="mt-3 inline-flex max-w-full items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="break-words">
                    {cms(
                      "search.geo.no_workers_coords",
                      "Certains profils n'ont pas encore de position GPS.",
                      "Some profiles do not have GPS coordinates yet."
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 self-start lg:self-auto">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
                {viewModeLabel}
              </span>

              <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => updateDraft({ view: "list" }, { immediate: true })}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                    draft.view === "list"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-600 hover:bg-white/70"
                  }`}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  {viewListLabel}
                </button>

                <button
                  type="button"
                  onClick={() => updateDraft({ view: "grid" }, { immediate: true })}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
                    draft.view === "grid"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white/70"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  {viewGridLabel}
                </button>
              </div>
            </div>
          </div>
        </div>

        {compactMobile && (
          <div className="mb-4">
            <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <SlidersHorizontal className="h-4 w-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{filtersTitle}</div>
                    <div className="truncate text-xs text-slate-500">
                      {activeFiltersCount > 0
                        ? `${activeFiltersCount} ${activeFiltersLabel}`
                        : cms(
                            "search.filters.compact_hint",
                            "Ajustez rapidement vos critères",
                            "Quickly adjust your criteria"
                          )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 && (
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 text-[10px] font-semibold text-white">
                      {activeFiltersCount}
                    </span>
                  )}
                  {mobileFiltersOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  )}
                </div>
              </button>

              {mobileFiltersOpen && (
                <div className="border-t border-slate-100 bg-slate-50/60 px-3 pb-3 pt-3">
                  <div className="mb-3 flex items-center gap-2">
                    <Button
                      className="h-9 flex-1 rounded-xl bg-blue-600 text-xs hover:bg-blue-700"
                      type="button"
                      onClick={() => setMobileFiltersOpen(false)}
                    >
                      {hideFiltersLabel}
                    </Button>
                    <Button
                      className="h-9 rounded-xl border-slate-300 px-3 text-xs"
                      variant="outline"
                      type="button"
                      onClick={resetAll}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      {resetLabel}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)] xl:gap-8">
          {(!compactMobile || mobileFiltersOpen) && (
            <aside
              className={`overflow-hidden border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)] ${
                compactMobile ? "rounded-[26px] p-3" : "sticky top-[98px] rounded-[30px] p-5"
              }`}
            >
              <div className={`flex items-start justify-between gap-3 ${compactMobile ? "mb-3" : "mb-5"}`}>
                <div>
                  <h3 className={`${compactMobile ? "text-sm" : "text-base"} font-semibold text-slate-900`}>
                    {filtersTitle}
                  </h3>
                  <div className="mt-1 text-xs text-slate-500">
                    {cms(
                      "search.filters.desc",
                      "Affinez la recherche selon vos critères.",
                      "Refine the search using your criteria."
                    )}
                  </div>
                </div>

                {!compactMobile && (
                  <Button
                    className="rounded-xl border-slate-300 text-sm"
                    variant="outline"
                    type="button"
                    onClick={resetAll}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {resetLabel}
                  </Button>
                )}
              </div>

              <div className={compactMobile ? "grid grid-cols-1 gap-3" : "space-y-4"}>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    {keywordLabel}
                  </label>
                  <Input
                    value={draft.keyword}
                    onChange={(e) => updateDraft({ keyword: e.target.value })}
                    placeholder={keywordPlaceholder}
                    className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm focus-visible:ring-blue-500"
                  />
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
                  <Button
                    type="button"
                    size="sm"
                    className="h-11 w-full rounded-xl bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      if (draft.near || (draft.lat != null && draft.lng != null)) {
                        updateDraft({ near: false, lat: null, lng: null }, { immediate: true });
                        setGeoError(null);
                        return;
                      }
                      requestMyPosition();
                    }}
                    disabled={geoLocating}
                  >
                    <LocateFixed className="mr-2 h-4 w-4" />
                    {geoLocating
                      ? cms("search.geo.locating", "Localisation...", "Locating...")
                      : useMyPos}
                  </Button>

                  {geoError && (
                    <div className="mt-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {geoError}
                    </div>
                  )}

                  {draft.near && draft.lat != null && draft.lng != null && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-600">
                        <span>{radiusLabel}</span>
                        <span className="text-slate-500">
                          {draft.radiusKm} {kmLabel}
                        </span>
                      </div>
                      <Slider
                        defaultValue={[draft.radiusKm]}
                        min={1}
                        max={100}
                        step={1}
                        onValueChange={(v) => updateDraft({ radiusKm: v[0] })}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{jobLabel}</label>
                  <select
                    value={draft.job}
                    onChange={(e) => updateDraft({ job: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">{jobAll}</option>
                    {jobs.map((job) => (
                      <option key={job} value={job}>
                        {job}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{regionLabel}</label>
                  <select
                    value={draft.region}
                    onChange={(e) => {
                      const region = e.target.value;
                      updateDraft({ region, city: "", commune: "", district: "" });
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{regionAll}</option>
                    {regions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{cityLabel}</label>
                  <select
                    value={draft.city}
                    onChange={(e) => {
                      const city = e.target.value;
                      updateDraft({ city, commune: "", district: "" });
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{cityAll}</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{communeLabel}</label>
                  <select
                    value={draft.commune}
                    onChange={(e) => {
                      const commune = e.target.value;
                      updateDraft({ commune, district: "" });
                    }}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{communeAll}</option>
                    {communes.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">{districtLabel}</label>
                  <select
                    value={draft.district}
                    onChange={(e) => updateDraft({ district: e.target.value })}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{districtAll}</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-600">
                    <span>{priceLabel}</span>
                    <span className="text-slate-500">
                      {draft.maxPrice >= DEFAULT_MAX_PRICE
                        ? priceNoLimit
                        : `${draft.maxPrice.toLocaleString("fr-FR")} GNF`}
                    </span>
                  </div>
                  <Slider
                    defaultValue={[draft.maxPrice]}
                    min={50000}
                    max={DEFAULT_MAX_PRICE}
                    step={10000}
                    onValueChange={(v) => updateDraft({ maxPrice: v[0] })}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-600">
                    <span>{ratingLabel}</span>
                    <span className="text-slate-500">
                      {draft.minRating === 0 ? ratingAny : draft.minRating.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    defaultValue={[draft.minRating]}
                    min={0}
                    max={5}
                    step={0.5}
                    onValueChange={(v) => updateDraft({ minRating: v[0] })}
                  />
                </div>

                {compactMobile && (
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 flex-1 rounded-xl border-slate-300 text-xs"
                      onClick={resetAll}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      {resetLabel}
                    </Button>
                    <Button
                      type="button"
                      className="h-10 flex-1 rounded-xl bg-blue-600 text-xs hover:bg-blue-700"
                      onClick={() => setMobileFiltersOpen(false)}
                    >
                      {hideFiltersLabel}
                    </Button>
                  </div>
                )}
              </div>
            </aside>
          )}

          <div className="min-w-0">
            <div ref={resultsAnchorRef} />

            {error && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {!error && !loading && workers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                {noData}
              </div>
            )}

            {!error && !loading && workers.length > 0 && filteredWorkers.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                {noResults}
              </div>
            )}

            {loading && filteredWorkers.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                {loadingWorkers}
              </div>
            )}

            {applied.view === "list" && filteredWorkers.length > 0 && (
              <div className="space-y-4">
                {filteredWorkers.map((w) => {
                  const isFav = isWorkerFavorite(w.id);
                  const favLoading = !!favoriteLoadingByWorkerId[w.id];

                  return (
                    <div
                      key={w.id}
                      className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_54px_rgba(15,23,42,0.10)]"
                    >
                      <div className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-4 sm:px-5 sm:py-5">
                        <div className="flex items-start gap-4">
                          <div className="relative shrink-0">
                            <div className="rounded-full bg-gradient-to-br from-blue-200 via-blue-300 to-blue-600 p-[3px] shadow-[0_14px_28px_rgba(37,99,235,0.22)]">
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-700 sm:h-20 sm:w-20 sm:text-lg">
                                {getInitials(w.name)}
                              </div>
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <h3 className="truncate text-[20px] font-bold tracking-tight text-slate-900 sm:text-[28px]">
                                  {w.name}
                                </h3>

                                <div className="mt-1.5 truncate text-sm text-slate-600 sm:text-base">
                                  {getWorkerSubtitle(w)}
                                </div>
                              </div>

                              <div className="shrink-0 text-left sm:text-right">
                                <div className="text-[20px] font-bold tracking-tight text-blue-700 sm:text-[28px]">
                                  {formatCurrency(w.hourlyRate, w.currency)}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">{perHourLabel}</div>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500 sm:text-sm">
                              <span className="inline-flex min-w-0 items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <span className="truncate max-w-[360px]">{getWorkerMetaLine(w)}</span>
                              </span>

                              {applied.near && appliedHasCoords && (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-blue-700">
                                  {distanceLabel}:
                                  <span className="font-semibold">
                                    {w.distanceKm == null ? "—" : formatKm(w.distanceKm, language)}
                                  </span>
                                </span>
                              )}
                            </div>

                            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                                <div className="flex items-center gap-0.5">{renderStars(w.rating)}</div>

                                <span className="inline-flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="font-medium text-slate-700">
                                    {w.rating.toFixed(1)} ({w.ratingCount})
                                  </span>
                                </span>

                                <span>
                                  {w.experienceYears} {yearsSuffix}
                                </span>
                              </div>

                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={`h-11 rounded-2xl px-4 text-sm font-semibold ${
                                    isFav
                                      ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void toggleFavorite(w);
                                  }}
                                  disabled={favLoading}
                                  title={isFav ? favRemove : favAdd}
                                >
                                  {favLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Heart className={`h-4 w-4 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
                                  )}
                                </Button>

                                <Button
                                  size="sm"
                                  className="h-11 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(37,99,235,0.22)] hover:from-blue-700 hover:to-blue-700"
                                  onClick={() => goToWorkerProfile(w.id)}
                                >
                                  {contactLabel}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="h-[3px] w-full bg-gradient-to-r from-blue-100 via-blue-300 to-blue-100" />
                    </div>
                  );
                })}
              </div>
            )}

            {applied.view === "grid" && filteredWorkers.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {filteredWorkers.map((w) => {
                  const isFav = isWorkerFavorite(w.id);
                  const favLoading = !!favoriteLoadingByWorkerId[w.id];

                  return (
                    <div
                      key={w.id}
                      className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(15,23,42,0.10)]"
                    >
                      <div className="bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            <div className="rounded-full bg-gradient-to-br from-blue-200 via-blue-300 to-blue-600 p-[2.5px] shadow-[0_12px_24px_rgba(37,99,235,0.20)]">
                              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-700">
                                {getInitials(w.name)}
                              </div>
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate text-[17px] font-bold tracking-tight text-slate-900">
                                  {w.name}
                                </h3>
                                <div className="mt-1 truncate text-xs text-slate-600">
                                  {getWorkerSubtitle(w)}
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                <div className="text-[16px] font-bold tracking-tight text-blue-700">
                                  {formatCurrency(w.hourlyRate, w.currency)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                              <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                              <span className="truncate max-w-[200px]">{getWorkerMetaLine(w)}</span>
                            </div>

                            <div className="mt-3 flex flex-col gap-3">
                              <div>
                                <div className="flex items-center gap-0.5">{renderStars(w.rating)}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                                  <span className="font-medium">
                                    {w.rating.toFixed(1)} ({w.ratingCount})
                                  </span>
                                  <span>
                                    {w.experienceYears} {yearsSuffix}
                                  </span>
                                  {applied.near && appliedHasCoords && (
                                    <span className="text-blue-700">
                                      {w.distanceKm == null ? "—" : formatKm(w.distanceKm, language)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={`h-10 min-w-10 rounded-xl px-3 ${
                                    isFav
                                      ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void toggleFavorite(w);
                                  }}
                                  disabled={favLoading}
                                  title={isFav ? favRemove : favAdd}
                                >
                                  {favLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Heart className={`h-4 w-4 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
                                  )}
                                </Button>

                                <Button
                                  size="sm"
                                  className="h-10 flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-[12px] font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)] hover:from-blue-700 hover:to-blue-700"
                                  onClick={() => goToWorkerProfile(w.id)}
                                >
                                  {contactLabel}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="h-[2px] w-full bg-gradient-to-r from-blue-100 via-blue-300 to-blue-100" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkerSearchSection;
