// src/pages/ClientFavoritesList.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNetworkStatus } from "@/services/networkService";
import { localStore } from "@/services/localStore";
import { authCache } from "@/services/authCache";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft, Loader2, WifiOff } from "lucide-react";

type Favorite = {
  id: string;
  worker_id: string;
  worker_name: string | null;
  profession: string | null;
  created_at: string;
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

type WorkerProfileRow = {
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

const FAVORITES_CACHE_PREFIX = "cached_client_favorites";
const WORKER_CACHE_KEY_PREFIX = "cached_worker_profile";

const getFavoritesCacheKey = (userId?: string | null) =>
  userId ? `${FAVORITES_CACHE_PREFIX}:${userId}` : FAVORITES_CACHE_PREFIX;

const getWorkerCacheKey = (workerId?: string | null) =>
  workerId ? `${WORKER_CACHE_KEY_PREFIX}:${workerId}` : WORKER_CACHE_KEY_PREFIX;

const splitWorkerName = (name?: string | null) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    firstName: parts[0] ?? null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
};

const buildMinimalWorkerProfileFromFavorite = (fav: Favorite): WorkerProfileCache => {
  const { firstName, lastName } = splitWorkerName(fav.worker_name);

  return {
    id: fav.worker_id,
    user_id: null,
    first_name: firstName,
    last_name: lastName,
    email: null,
    phone: null,
    country: null,
    region: null,
    city: null,
    commune: null,
    district: null,
    profession: fav.profession ?? null,
    description: null,
    hourly_rate: null,
    currency: null,
    latitude: null,
    longitude: null,
  };
};

const mergeWorkerProfiles = (
  existing: WorkerProfileCache | null,
  incoming: WorkerProfileCache
): WorkerProfileCache => ({
  id: incoming.id,
  user_id: incoming.user_id ?? existing?.user_id ?? null,
  first_name: incoming.first_name ?? existing?.first_name ?? null,
  last_name: incoming.last_name ?? existing?.last_name ?? null,
  email: incoming.email ?? existing?.email ?? null,
  phone: incoming.phone ?? existing?.phone ?? null,
  country: incoming.country ?? existing?.country ?? null,
  region: incoming.region ?? existing?.region ?? null,
  city: incoming.city ?? existing?.city ?? null,
  commune: incoming.commune ?? existing?.commune ?? null,
  district: incoming.district ?? existing?.district ?? null,
  profession: incoming.profession ?? existing?.profession ?? null,
  description: incoming.description ?? existing?.description ?? null,
  hourly_rate: incoming.hourly_rate ?? existing?.hourly_rate ?? null,
  currency: incoming.currency ?? existing?.currency ?? null,
  latitude: incoming.latitude ?? existing?.latitude ?? null,
  longitude: incoming.longitude ?? existing?.longitude ?? null,
});

const normalizeWorkerProfileRow = (row: WorkerProfileRow): WorkerProfileCache => ({
  id: row.id,
  user_id: row.user_id ?? null,
  first_name: row.first_name ?? null,
  last_name: row.last_name ?? null,
  email: row.email ?? null,
  phone: row.phone ?? null,
  country: row.country ?? null,
  region: row.region ?? null,
  city: row.city ?? null,
  commune: row.commune ?? null,
  district: row.district ?? null,
  profession: row.profession ?? null,
  description: row.description ?? null,
  hourly_rate: row.hourly_rate ?? null,
  currency: row.currency ?? null,
  latitude: row.latitude ?? null,
  longitude: row.longitude ?? null,
});

const ClientFavoritesList: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { connected, initialized } = useNetworkStatus();

  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [usedCache, setUsedCache] = useState(false);
  const [openingWorkerId, setOpeningWorkerId] = useState<string | null>(null);

  const refreshTimerRef = useRef<number | null>(null);

  const t = {
    title: language === "fr" ? "Mes ouvriers favoris" : "My favourite workers",
    subtitle:
      language === "fr"
        ? "Les professionnels que vous avez ajoutés en favoris pour les retrouver plus rapidement."
        : "The professionals you marked as favorites to find them quickly.",
    empty:
      language === "fr"
        ? "Vous n’avez pas encore d’ouvrier en favori."
        : "You don’t have any favourite worker yet.",
    seeProfile: language === "fr" ? "Voir la fiche" : "View profile",
    addedOn: language === "fr" ? "Ajouté le" : "Added on",
    back:
      language === "fr"
        ? "Retour à mon espace client"
        : "Back to my client space",
    loading: language === "fr" ? "Chargement..." : "Loading...",
    offlineTitle: language === "fr" ? "Mode hors connexion" : "Offline mode",
    offlineDesc:
      language === "fr"
        ? "Vos favoris enregistrés localement restent consultables. Les nouvelles mises à jour nécessitent une connexion Internet."
        : "Your locally saved favourites remain available. New updates require an internet connection.",
    cacheInfo:
      language === "fr"
        ? "Affichage des favoris enregistrés localement."
        : "Showing locally saved favourites.",
    openingProfile:
      language === "fr" ? "Ouverture de la fiche..." : "Opening profile...",
  };

  const saveWorkerCache = useCallback(async (profile: WorkerProfileCache) => {
    const key = getWorkerCacheKey(profile.id);
    const existing = await localStore.get<WorkerProfileCache>(key);
    const merged = mergeWorkerProfiles(existing, profile);
    await localStore.set(key, merged);
  }, []);

  const cacheMinimalProfilesFromFavorites = useCallback(
    async (favorites: Favorite[]) => {
      await Promise.all(
        favorites.map((fav) => saveWorkerCache(buildMinimalWorkerProfileFromFavorite(fav)))
      );
    },
    [saveWorkerCache]
  );

  const syncDetailedProfilesFromServer = useCallback(
    async (favorites: Favorite[]) => {
      const workerIds = Array.from(
        new Set(
          favorites
            .map((fav) => String(fav.worker_id || "").trim())
            .filter(Boolean)
        )
      );

      if (!workerIds.length) return;

      const { data, error } = await supabase
        .from("op_ouvriers")
        .select(
          "id, user_id, first_name, last_name, email, phone, country, region, city, commune, district, profession, description, hourly_rate, currency, latitude, longitude"
        )
        .in("id", workerIds);

      if (error) {
        console.warn("[ClientFavoritesList] worker profile sync error:", error);
        return;
      }

      const rows = (data || []) as WorkerProfileRow[];
      await Promise.all(rows.map((row) => saveWorkerCache(normalizeWorkerProfileRow(row))));
    },
    [saveWorkerCache]
  );

  const refreshFavorites = useCallback(async () => {
    setLoading(true);
    setUsedCache(false);

    try {
      const userId = await authCache.getUserId();
      const cacheKey = getFavoritesCacheKey(userId);

      const readCache = async () => {
        const cached = await localStore.get<Favorite[]>(cacheKey);

        if (cached?.length) {
          setItems(cached);
          setUsedCache(true);
          await cacheMinimalProfilesFromFavorites(cached);
          return true;
        }

        setItems([]);
        setUsedCache(true);
        return false;
      };

      if (!connected) {
        await readCache();
        return;
      }

      const { data, error } = await supabase
        .from("op_ouvrier_favorites")
        .select("id, worker_id, worker_name, profession, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[ClientFavoritesList] Error loading favorites:", error);
        await readCache();
        return;
      }

      const nextItems = (data || []) as Favorite[];

      setItems(nextItems);
      setUsedCache(false);

      await Promise.all([
        localStore.set(cacheKey, nextItems),
        cacheMinimalProfilesFromFavorites(nextItems),
      ]);

      await syncDetailedProfilesFromServer(nextItems);
    } catch (error) {
      console.error("[ClientFavoritesList] Unexpected favorites load error:", error);

      try {
        const userId = await authCache.getUserId();
        const cacheKey = getFavoritesCacheKey(userId);
        const cached = await localStore.get<Favorite[]>(cacheKey);

        if (cached?.length) {
          setItems(cached);
          setUsedCache(true);
          await cacheMinimalProfilesFromFavorites(cached);
        } else {
          setItems([]);
          setUsedCache(true);
        }
      } catch (cacheError) {
        console.error("[ClientFavoritesList] Favorites cache fallback error:", cacheError);
        setItems([]);
        setUsedCache(false);
      }
    } finally {
      setLoading(false);
    }
  }, [cacheMinimalProfilesFromFavorites, connected, syncDetailedProfilesFromServer]);

  useEffect(() => {
    if (initialized) {
      void refreshFavorites();
    }
  }, [initialized, refreshFavorites]);

  useEffect(() => {
    const onRefresh = () => {
      void refreshFavorites();
    };

    window.addEventListener("focus", onRefresh);
    window.addEventListener("storage", onRefresh);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refreshFavorites();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("storage", onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshFavorites]);

  useEffect(() => {
    if (!connected) return;

    if (refreshTimerRef.current != null) {
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    refreshTimerRef.current = window.setInterval(() => {
      void refreshFavorites();
    }, 5000);

    return () => {
      if (refreshTimerRef.current != null) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [connected, refreshFavorites]);

  const handleOpenProfile = async (fav: Favorite) => {
    setOpeningWorkerId(fav.worker_id);

    try {
      await saveWorkerCache(buildMinimalWorkerProfileFromFavorite(fav));

      if (connected) {
        try {
          const { data, error } = await supabase
            .from("op_ouvriers")
            .select(
              "id, user_id, first_name, last_name, email, phone, country, region, city, commune, district, profession, description, hourly_rate, currency, latitude, longitude"
            )
            .eq("id", fav.worker_id)
            .maybeSingle();

          if (!error && data) {
            await saveWorkerCache(normalizeWorkerProfileRow(data as WorkerProfileRow));
          }
        } catch (err) {
          console.warn("[ClientFavoritesList] pre-open worker sync warning:", err);
        }
      }

      navigate(`/ouvrier/${fav.worker_id}`);
    } finally {
      setOpeningWorkerId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-4 flex items-center gap-2"
          onClick={() => navigate("/espace-client")}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">{t.back}</span>
        </Button>

        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm border border-slate-100 mb-3">
            <Heart className="w-3 h-3 text-rose-500" />
            <span>
              {language === "fr" ? "Vos ouvriers sauvegardés" : "Your saved workers"}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">{t.title}</h1>
          <p className="text-sm text-slate-600">{t.subtitle}</p>
        </header>

        {!connected && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">{t.offlineTitle}</div>
              <div className="text-xs text-amber-800 mt-1">{t.offlineDesc}</div>
            </div>
          </div>
        )}

        {usedCache && (
          <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            {t.cacheInfo}
          </div>
        )}

        <Card className="p-4 md:p-6 bg-white shadow-sm border-slate-200 rounded-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              <span className="text-sm">{t.loading}</span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">{t.empty}</div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {items.map((fav) => {
                const isOpening = openingWorkerId === fav.worker_id;

                return (
                  <li key={fav.id}>
                    <Card className="p-4 bg-slate-50/60 border-slate-200 rounded-xl h-full flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h2 className="text-sm font-semibold text-slate-900">
                            {fav.worker_name || (language === "fr" ? "Ouvrier" : "Worker")}
                          </h2>
                          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                        </div>

                        {fav.profession && (
                          <p className="text-xs text-slate-600 mb-2">{fav.profession}</p>
                        )}

                        <p className="text-[11px] text-slate-400">
                          {t.addedOn}{" "}
                          {new Date(fav.created_at).toLocaleDateString(
                            language === "fr" ? "fr-FR" : "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>

                      <div className="mt-4 flex justify-between items-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs rounded-full"
                          onClick={() => void handleOpenProfile(fav)}
                          disabled={isOpening}
                        >
                          {isOpening ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                              {t.openingProfile}
                            </>
                          ) : (
                            t.seeProfile
                          )}
                        </Button>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ClientFavoritesList;
