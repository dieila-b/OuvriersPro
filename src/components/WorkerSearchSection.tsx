// src/components/WorkerSearchSection.tsx
// OFFLINE-FIRST réel : cache liste + cache détail + navigation offline + préchargement intelligent

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  RotateCcw,
  Heart,
  Loader2,
  WifiOff,
  Database,
} from "lucide-react";

/* =========================
   TYPES
========================= */

type DbWorker = {
  id: string;
  user_id?: string | null;
  first_name: string | null;
  last_name: string | null;
  email?: string | null;
  phone?: string | null;
  profession: string | null;
  description?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  commune?: string | null;
  district?: string | null;
  hourly_rate?: number | null;
  currency?: string | null;
  years_experience?: number | null;
  average_rating?: number | null;
  rating_count?: number | null;
  computed_average_rating?: number | null;
  computed_rating_count?: number | null;
  status?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_visible?: number | null;
  is_suspended?: boolean | null;
  deleted_at?: string | null;
};

type WorkerCard = {
  id: string;
  name: string;
  job: string;
  region: string;
  city: string;
  hourlyRate: number;
  currency: string;
  rating: number;
  ratingCount: number;
  experienceYears: number;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
};

type WorkerProfileCache = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  profession: string | null;
  description: string | null;
  hourly_rate: number | null;
  currency: string | null;
  latitude: number | null;
  longitude: number | null;
};

type FavoriteItem = {
  id: string;
  worker_id: string;
  worker_name: string | null;
  profession: string | null;
  created_at: string;
};

type ViewMode = "list" | "grid";

type Filters = {
  keyword: string;
  job: string;
  region: string;
  maxPrice: number;
  minRating: number;
  view: ViewMode;
};

type SearchPayload = {
  keyword?: string;
  district?: string;
  lat?: string;
  lng?: string;
  near?: string;
};

/* =========================
   CONFIG
========================= */

const DEFAULT_MAX_PRICE = 300000;

const WORKERS_CACHE_KEY = "cached_workers_list_v1";
const WORKERS_CACHE_UPDATED_AT_KEY = "cached_workers_list_updated_at_v1";
const WORKER_CACHE_KEY_PREFIX = "cached_worker_profile";
const LAST_SEARCH_KEY = "op:last_search";

const WORKER_CACHE_WARM_EVENT = "op:worker-profile-cached";
const WORKERS_CACHE_UPDATED_EVENT = "op:workers-cache-updated";

/* =========================
   HELPERS
========================= */

const getWorkerCacheKey = (workerId?: string | null) =>
  workerId ? `${WORKER_CACHE_KEY_PREFIX}:${workerId}` : WORKER_CACHE_KEY_PREFIX;

const formatCurrency = (v: number) => `${v.toLocaleString("fr-FR")} GNF`;

const buildWorkerName = (w: Partial<DbWorker>) =>
  `${w.first_name ?? ""} ${w.last_name ?? ""}`.trim() || "Ouvrier";

const buildWorkerProfileCacheFromDb = (w: DbWorker): WorkerProfileCache => ({
  id: w.id,
  user_id: w.user_id ?? null,
  first_name: w.first_name ?? null,
  last_name: w.last_name ?? null,
  email: w.email ?? null,
  phone: w.phone ?? null,
  country: w.country ?? null,
  region: w.region ?? null,
  city: w.city ?? null,
  commune: w.commune ?? null,
  district: w.district ?? null,
  profession: w.profession ?? null,
  description: w.description ?? null,
  hourly_rate: w.hourly_rate ?? null,
  currency: w.currency ?? null,
  latitude: typeof w.latitude === "number" ? w.latitude : null,
  longitude: typeof w.longitude === "number" ? w.longitude : null,
});

const buildWorkerProfileCacheFromCard = (w: WorkerCard): WorkerProfileCache => {
  const parts = w.name.trim().split(/\s+/).filter(Boolean);

  return {
    id: w.id,
    user_id: null,
    first_name: parts[0] ?? w.name ?? null,
    last_name: parts.length > 1 ? parts.slice(1).join(" ") : null,
    email: null,
    phone: null,
    country: null,
    region: w.region ?? null,
    city: w.city ?? null,
    commune: null,
    district: null,
    profession: w.job ?? null,
    description: null,
    hourly_rate: w.hourlyRate ?? null,
    currency: w.currency ?? null,
    latitude: typeof w.latitude === "number" ? w.latitude : null,
    longitude: typeof w.longitude === "number" ? w.longitude : null,
  };
};

const normalizeWorker = (w: DbWorker): WorkerCard => {
  const effectiveRating = Number(w.computed_average_rating ?? w.average_rating ?? 0) || 0;
  const effectiveCount = Number(w.computed_rating_count ?? w.rating_count ?? 0) || 0;

  return {
    id: w.id,
    name: buildWorkerName(w),
    job: w.profession || "",
    region: w.region || "",
    city: w.city || "",
    hourlyRate: Number(w.hourly_rate ?? 0) || 0,
    currency: w.currency || "GNF",
    rating: effectiveRating,
    ratingCount: effectiveCount,
    experienceYears: Number(w.years_experience ?? 0) || 0,
    latitude: typeof w.latitude === "number" ? w.latitude : null,
    longitude: typeof w.longitude === "number" ? w.longitude : null,
    distanceKm: null,
  };
};

const dispatchSafeEvent = (eventName: string, detail?: Record<string, unknown>) => {
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  } catch {
    // ignore
  }
};

const cacheWorkerProfile = async (profile: WorkerProfileCache) => {
  const existing = await localStore.get<WorkerProfileCache>(getWorkerCacheKey(profile.id));

  const merged: WorkerProfileCache = {
    id: profile.id,
    user_id: profile.user_id ?? existing?.user_id ?? null,
    first_name: profile.first_name ?? existing?.first_name ?? null,
    last_name: profile.last_name ?? existing?.last_name ?? null,
    email: profile.email ?? existing?.email ?? null,
    phone: profile.phone ?? existing?.phone ?? null,
    country: profile.country ?? existing?.country ?? null,
    region: profile.region ?? existing?.region ?? null,
    city: profile.city ?? existing?.city ?? null,
    commune: profile.commune ?? existing?.commune ?? null,
    district: profile.district ?? existing?.district ?? null,
    profession: profile.profession ?? existing?.profession ?? null,
    description: profile.description ?? existing?.description ?? null,
    hourly_rate: profile.hourly_rate ?? existing?.hourly_rate ?? null,
    currency: profile.currency ?? existing?.currency ?? null,
    latitude: profile.latitude ?? existing?.latitude ?? null,
    longitude: profile.longitude ?? existing?.longitude ?? null,
  };

  await localStore.set(getWorkerCacheKey(profile.id), merged);

  dispatchSafeEvent(WORKER_CACHE_WARM_EVENT, {
    workerId: merged.id,
    cachedAt: new Date().toISOString(),
  });

  return merged;
};

const getDeviceDefaultView = (): ViewMode => {
  try {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      return "grid";
    }
  } catch {
    // ignore
  }
  return "grid";
};

const renderStars = (rating: number) =>
  [...Array(5)].map((_, i) => (
    <Star
      key={i}
      className={`h-3.5 w-3.5 ${
        i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-slate-300"
      }`}
    />
  ));

const safeParseJson = <T,>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

/* =========================
   COMPONENT
========================= */

const WorkerSearchSection: React.FC = () => {
  const { t, language } = useLanguage();
  const { connected, initialized } = useNetworkStatus();
  const { toast } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [workers, setWorkers] = useState<WorkerCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [usedOfflineCache, setUsedOfflineCache] = useState(false);
  const [cacheUpdatedAt, setCacheUpdatedAt] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>({
    keyword: "",
    job: "all",
    region: "",
    maxPrice: DEFAULT_MAX_PRICE,
    minRating: 0,
    view: getDeviceDefaultView(),
  });

  const [session, setSession] = useState<any>(null);
  const [favorites, setFavorites] = useState<Record<string, FavoriteItem>>({});
  const [favoriteLoadingByWorkerId, setFavoriteLoadingByWorkerId] = useState<
    Record<string, boolean>
  >({});
  const [favoriteCacheLoaded, setFavoriteCacheLoaded] = useState(false);

  const preloadInFlightRef = useRef<Set<string>>(new Set());

  const cms = (key: string, fallbackFr: string, fallbackEn: string) => {
    const v = t(key);
    if (!v || v === key) return language === "fr" ? fallbackFr : fallbackEn;
    return v;
  };

  /* =========================
     AUTH SESSION
  ========================= */

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

  /* =========================
     URL / LAST SEARCH
  ========================= */

  useEffect(() => {
    const initialKeyword = searchParams.get("keyword") ?? "";
    if (!initialKeyword) {
      const cached = safeParseJson<SearchPayload>(sessionStorage.getItem(LAST_SEARCH_KEY));
      if (cached?.keyword) {
        setFilters((prev) => ({ ...prev, keyword: cached.keyword || "" }));
        return;
      }
    }

    setFilters((prev) => ({
      ...prev,
      keyword: initialKeyword,
    }));
  }, [searchParams]);

  useEffect(() => {
    const payload: SearchPayload = {};
    if (filters.keyword.trim()) payload.keyword = filters.keyword.trim();

    try {
      sessionStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }

    void localStore.set(LAST_SEARCH_KEY, payload).catch(() => undefined);
  }, [filters.keyword]);

  /* =========================
     FETCH / READ CACHE
  ========================= */

  useEffect(() => {
    const readCache = async () => {
      const cachedWorkers = await localStore.get<WorkerCard[]>(WORKERS_CACHE_KEY);
      const cachedUpdatedAt = await localStore.get<string>(WORKERS_CACHE_UPDATED_AT_KEY);

      setCacheUpdatedAt(cachedUpdatedAt ?? null);

      if (cachedWorkers?.length) {
        setWorkers(cachedWorkers);
        setUsedOfflineCache(true);
        return true;
      }

      setWorkers([]);
      setUsedOfflineCache(true);
      return false;
    };

    const persistWorkers = async (rows: DbWorker[], mapped: WorkerCard[]) => {
      const syncedAt = new Date().toISOString();

      await Promise.all([
        localStore.set(WORKERS_CACHE_KEY, mapped),
        localStore.set(WORKERS_CACHE_UPDATED_AT_KEY, syncedAt),
        ...rows.map((row) => cacheWorkerProfile(buildWorkerProfileCacheFromDb(row))),
      ]);

      setCacheUpdatedAt(syncedAt);

      dispatchSafeEvent(WORKERS_CACHE_UPDATED_EVENT, {
        count: mapped.length,
        workerIds: mapped.map((w) => w.id),
        cachedAt: syncedAt,
      });
    };

    const fetchWorkers = async () => {
      setLoading(true);

      try {
        if (!connected) {
          await readCache();
          return;
        }

        const { data, error } = await supabase
          .from("op_ouvriers")
          .select("*")
          .eq("status", "approved");

        if (error) {
          console.warn("[WorkerSearchSection] online fetch failed, fallback cache:", error);
          await readCache();
          return;
        }

        const rows = ((data || []) as DbWorker[]).filter((w) => !w.deleted_at && !w.is_suspended);
        const mapped = rows.map(normalizeWorker);

        setWorkers(mapped);
        setUsedOfflineCache(false);

        await persistWorkers(rows, mapped);
      } catch (error) {
        console.warn("[WorkerSearchSection] fetch exception, fallback cache:", error);
        await readCache();
      } finally {
        setLoading(false);
      }
    };

    if (initialized) {
      void fetchWorkers();
    }
  }, [connected, initialized]);

  /* =========================
     FAVORITES
  ========================= */

  useEffect(() => {
    let cancelled = false;

    const loadFavorites = async () => {
      setFavoriteCacheLoaded(false);

      const userId = session?.user?.id || (await authCache.getUserId());
      if (!userId) {
        if (!cancelled) {
          setFavorites({});
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

        setFavorites(nextMap);
        setFavoriteCacheLoaded(result.fromCache);
      } catch (err) {
        console.error("[WorkerSearchSection] loadFavorites error:", err);
        if (!cancelled) {
          setFavorites({});
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

  const isWorkerFavorite = (workerId: string) => !!favorites[workerId];

  const toggleFavorite = async (worker: WorkerCard) => {
    const userId = session?.user?.id || (await authCache.getUserId());

    if (!userId) {
      toast({
        title: language === "fr" ? "Connexion requise" : "Login required",
        description:
          language === "fr"
            ? "Connectez-vous pour gérer vos favoris."
            : "Sign in to manage your favourites.",
      });
      return;
    }

    setFavoriteLoadingByWorkerId((prev) => ({ ...prev, [worker.id]: true }));

    try {
      const existing = favorites[worker.id];

      if (existing) {
        await favoritesRepository.removeFavorite({
          userId,
          connected,
          workerId: worker.id,
          favoriteId: existing.id,
        });

        setFavorites((prev) => {
          const next = { ...prev };
          delete next[worker.id];
          return next;
        });

        toast({
          title: language === "fr" ? "Favoris" : "Favourites",
          description: connected
            ? language === "fr"
              ? "Prestataire retiré des favoris."
              : "Provider removed from favourites."
            : language === "fr"
              ? "Retrait enregistré hors ligne. Synchronisation automatique au retour du réseau."
              : "Offline removal saved. It will sync automatically when back online.",
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

        setFavorites((prev) => ({ ...prev, [worker.id]: nextItem }));

        toast({
          title: language === "fr" ? "Favoris" : "Favourites",
          description: connected
            ? language === "fr"
              ? "Prestataire ajouté aux favoris."
              : "Provider added to favourites."
            : language === "fr"
              ? "Favori enregistré hors ligne. Synchronisation automatique au retour du réseau."
              : "Favourite saved offline. It will sync automatically when back online.",
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

  /* =========================
     FILTERS
  ========================= */

  const filtered = useMemo(() => {
    return workers.filter((w) => {
      return (
        (!filters.keyword ||
          `${w.name} ${w.job}`.toLowerCase().includes(filters.keyword.toLowerCase())) &&
        (filters.job === "all" || w.job === filters.job) &&
        (!filters.region || w.region === filters.region) &&
        w.hourlyRate <= filters.maxPrice &&
        w.rating >= filters.minRating
      );
    });
  }, [workers, filters]);

  const jobs = useMemo(
    () => Array.from(new Set(workers.map((w) => w.job).filter(Boolean))).sort(),
    [workers]
  );

  const regions = useMemo(
    () => Array.from(new Set(workers.map((w) => w.region).filter(Boolean))).sort(),
    [workers]
  );

  /* =========================
     PRELOAD INTELLIGENT
  ========================= */

  const preloadWorkerDetail = async (worker: WorkerCard) => {
    if (!worker?.id) return;
    if (preloadInFlightRef.current.has(worker.id)) return;

    preloadInFlightRef.current.add(worker.id);

    try {
      await cacheWorkerProfile(buildWorkerProfileCacheFromCard(worker));

      if (!connected) return;

      const { data, error } = await supabase
        .from("op_ouvriers")
        .select("*")
        .eq("id", worker.id)
        .maybeSingle();

      if (!error && data) {
        await cacheWorkerProfile(buildWorkerProfileCacheFromDb(data as DbWorker));
      }
    } catch (error) {
      console.warn("[WorkerSearchSection] preloadWorkerDetail warning:", worker.id, error);
    } finally {
      preloadInFlightRef.current.delete(worker.id);
    }
  };

  useEffect(() => {
    const visibleSlice = filtered.slice(0, 24);
    if (!visibleSlice.length) return;

    void Promise.allSettled(visibleSlice.map((worker) => preloadWorkerDetail(worker)));
  }, [filtered, connected]);

  /* =========================
     NAVIGATION OFFLINE SAFE
  ========================= */

  const goToWorkerProfile = async (worker: WorkerCard) => {
    const target = `/ouvrier/${worker.id}`;

    try {
      await preloadWorkerDetail(worker);
    } catch {
      // ignore
    }

    const cachedProfile = await localStore.get<WorkerProfileCache>(getWorkerCacheKey(worker.id));

    if (!connected && !cachedProfile) {
      toast({
        title: language === "fr" ? "Profil indisponible hors ligne" : "Profile unavailable offline",
        description:
          language === "fr"
            ? "Ouvrez ce prestataire une première fois en ligne pour l’utiliser sans réseau."
            : "Open this provider once online to use it offline.",
        variant: "destructive",
      });
      return;
    }

    navigate(target);
  };

  /* =========================
     EVENTS PROPRES POUR LE RESTE DE L'APP
  ========================= */

  useEffect(() => {
    dispatchSafeEvent("op:worker-search-results", {
      count: filtered.length,
      ids: filtered.map((w) => w.id),
      offline: !connected,
      fromCache: usedOfflineCache,
      cachedAt: cacheUpdatedAt,
      route: location.pathname,
    });
  }, [filtered, connected, usedOfflineCache, cacheUpdatedAt, location.pathname]);

  /* =========================
     UI LABELS
  ========================= */

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

  /* =========================
     UI
  ========================= */

  return (
    <section className="w-full bg-slate-50 py-6">
      <div className="mx-auto max-w-[1600px] px-4">
        {!connected && initialized && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">{offlineTitle}</div>
              <div className="mt-1 text-xs text-amber-800">{offlineDesc}</div>
            </div>
          </div>
        )}

        {(usedOfflineCache || favoriteCacheLoaded) && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <Database className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">{offlineCacheLabel}</div>
              {formattedCacheDate && (
                <div className="mt-1 text-xs text-sky-800">
                  {language === "fr" ? "Dernière synchronisation :" : "Last sync:"}{" "}
                  {formattedCacheDate}
                </div>
              )}
            </div>
          </div>
        )}

        {/* HEADER */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Trouver un professionnel</h2>
            <p className="text-sm text-slate-500">Recherche rapide et intelligente</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant={filters.view === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilters((f) => ({ ...f, view: "list" }))}
            >
              <LayoutList size={16} />
            </Button>

            <Button
              variant={filters.view === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilters((f) => ({ ...f, view: "grid" }))}
            >
              <LayoutGrid size={16} />
            </Button>
          </div>
        </div>

        {/* FILTERS */}
        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-5">
          <Input
            placeholder="Rechercher..."
            value={filters.keyword}
            onChange={(e) => {
              const value = e.target.value;
              setFilters((f) => ({ ...f, keyword: value }));

              const next = new URLSearchParams(searchParams);
              if (value.trim()) next.set("keyword", value.trim());
              else next.delete("keyword");
              setSearchParams(next, { replace: true });
            }}
          />

          <select
            value={filters.job}
            onChange={(e) => setFilters((f) => ({ ...f, job: e.target.value }))}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Tous les métiers</option>
            {jobs.map((job) => (
              <option key={job} value={job}>
                {job}
              </option>
            ))}
          </select>

          <select
            value={filters.region}
            onChange={(e) => setFilters((f) => ({ ...f, region: e.target.value }))}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Toutes les régions</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>

          <Slider
            defaultValue={[filters.maxPrice]}
            max={DEFAULT_MAX_PRICE}
            step={10000}
            onValueChange={(v) => setFilters((f) => ({ ...f, maxPrice: v[0] }))}
          />

          <div className="flex gap-2">
            <Slider
              defaultValue={[filters.minRating]}
              max={5}
              step={0.5}
              onValueChange={(v) => setFilters((f) => ({ ...f, minRating: v[0] }))}
            />

            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  keyword: "",
                  job: "all",
                  region: "",
                  maxPrice: DEFAULT_MAX_PRICE,
                  minRating: 0,
                  view: getDeviceDefaultView(),
                });
                setSearchParams({}, { replace: true });
                void localStore.set(LAST_SEARCH_KEY, {}).catch(() => undefined);
              }}
            >
              <RotateCcw size={16} />
            </Button>
          </div>
        </div>

        {/* RESULTS */}
        {loading && (
          <div className="text-center text-sm text-slate-500">
            {language === "fr" ? "Chargement..." : "Loading..."}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center text-sm text-slate-500">
            {language === "fr" ? "Aucun résultat" : "No result"}
          </div>
        )}

        {/* GRID */}
        {filters.view === "grid" && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((w) => {
              const isFav = isWorkerFavorite(w.id);
              const favLoading = !!favoriteLoadingByWorkerId[w.id];

              return (
                <div
                  key={w.id}
                  className="rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex justify-between">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{w.name}</div>
                      <div className="truncate text-xs text-slate-500">{w.job}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void toggleFavorite(w)}
                      disabled={favLoading}
                      className="shrink-0"
                    >
                      {favLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      ) : (
                        <Heart
                          className={`${isFav ? "fill-red-500 text-red-500" : "text-slate-400"}`}
                        />
                      )}
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                    <MapPin size={14} />
                    <span className="truncate">{w.city || w.region || "—"}</span>
                  </div>

                  <div className="mt-2 flex items-center gap-1">{renderStars(w.rating)}</div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="font-bold text-blue-600">{formatCurrency(w.hourlyRate)}</div>

                    <Button
                      size="sm"
                      onClick={() => void goToWorkerProfile(w)}
                      onMouseEnter={() => void preloadWorkerDetail(w)}
                      onTouchStart={() => void preloadWorkerDetail(w)}
                    >
                      {language === "fr" ? "Voir" : "View"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LIST */}
        {filters.view === "list" && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((w) => {
              const isFav = isWorkerFavorite(w.id);
              const favLoading = !!favoriteLoadingByWorkerId[w.id];

              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{w.name}</div>
                    <div className="truncate text-xs text-slate-500">{w.job}</div>
                    <div className="mt-1 flex items-center gap-1">{renderStars(w.rating)}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void toggleFavorite(w)}
                      disabled={favLoading}
                    >
                      {favLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      ) : (
                        <Heart
                          className={`${isFav ? "fill-red-500 text-red-500" : "text-slate-400"}`}
                        />
                      )}
                    </button>

                    <div className="text-sm font-bold text-blue-600">
                      {formatCurrency(w.hourlyRate)}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => void goToWorkerProfile(w)}
                      onMouseEnter={() => void preloadWorkerDetail(w)}
                      onTouchStart={() => void preloadWorkerDetail(w)}
                    >
                      {language === "fr" ? "Voir" : "View"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default WorkerSearchSection;
