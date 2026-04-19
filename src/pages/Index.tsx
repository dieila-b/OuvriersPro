// src/pages/Index.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNetworkStatus } from "@/services/networkService";
import { localStore } from "@/services/localStore";
import { WifiOff } from "lucide-react";

import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WorkerSearchSection from "@/components/WorkerSearchSection";
import SubscriptionSection from "@/components/SubscriptionSection";
import Footer from "@/components/Footer";

type SearchPayload = {
  keyword?: string;
  district?: string;
  lat?: string;
  lng?: string;
  near?: string;
};

type CachedWorkerProfile = {
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

const LAST_SEARCH_KEY = "op:last_search";
const SEARCH_BOOTSTRAP_KEY = "op:last_search_bootstrap";
const SEARCH_RESULTS_CACHE_KEY = "cached_workers_search_results";
const SEARCH_RESULTS_SYNCED_AT_KEY = "cached_workers_search_results_synced_at";
const WORKER_CACHE_KEY_PREFIX = "cached_worker_profile";

/**
 * ✅ Native = vrai Capacitor (protocol capacitor/file, ou Capacitor platform != web)
 * ❌ IMPORTANT: on NE considère JAMAIS "localhost" comme natif sur le Web.
 */
function isNativeRuntime(): boolean {
  try {
    const p = window.location?.protocol ?? "";
    if (p === "capacitor:" || p === "file:") return true;
  } catch {
    // ignore
  }

  try {
    const cap = (window as any)?.Capacitor;
    if (cap?.isNativePlatform?.()) return true;
    const gp = cap?.getPlatform?.();
    if (gp && gp !== "web") return true;
  } catch {
    // ignore
  }

  return false;
}

/**
 * ✅ Fix “tap qui ne clique pas” sur Android WebView (UNIQUEMENT NATIF)
 * - convertit touchend -> click sur élément cliquable
 * - anti double-fire
 */
function useNativeTapToClickFix(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (!isNativeRuntime()) return;

    let lastSyntheticAt = 0;

    const isClickable = (el: HTMLElement | null) => {
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === "button") return true;
      if (tag === "a" && (el as HTMLAnchorElement).href) return true;
      if (el.getAttribute("role") === "button") return true;
      if (el.hasAttribute("data-clickable")) return true;
      if (el.getAttribute("data-radix-collection-item") != null) return true;
      return false;
    };

    const closestClickable = (start: HTMLElement | null) => {
      let cur: HTMLElement | null = start;
      while (cur) {
        if (isClickable(cur)) return cur;
        cur = cur.parentElement;
      }
      return null;
    };

    const shouldIgnoreTarget = (el: HTMLElement) => {
      const tag = el.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      if ((el as any).disabled) return true;
      if (el.getAttribute("aria-disabled") === "true") return true;
      return false;
    };

    const onTouchEndCapture = (e: TouchEvent) => {
      if (e.defaultPrevented) return;
      if (e.touches && e.touches.length > 0) return;

      const now = Date.now();
      if (now - lastSyntheticAt < 350) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const clickable = closestClickable(target);
      if (!clickable) return;
      if (shouldIgnoreTarget(clickable)) return;

      try {
        lastSyntheticAt = now;
        clickable.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
          })
        );
      } catch {
        // ignore
      }
    };

    document.addEventListener("touchend", onTouchEndCapture, true);
    return () => document.removeEventListener("touchend", onTouchEndCapture, true);
  }, [enabled]);
}

const getWorkerCacheKey = (workerId?: string | null) =>
  workerId ? `${WORKER_CACHE_KEY_PREFIX}:${workerId}` : WORKER_CACHE_KEY_PREFIX;

const normalizeNullableString = (value: unknown): string | null => {
  if (typeof value !== "string") return value == null ? null : String(value);
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const normalizeNullableNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const pickFirst = (source: Record<string, any>, keys: string[]) => {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return null;
};

const normalizeWorkerResultToProfile = (row: Record<string, any>): CachedWorkerProfile | null => {
  const id = normalizeNullableString(
    pickFirst(row, ["id", "worker_id", "ouvrier_id", "provider_id"])
  );

  if (!id) return null;

  const firstName = normalizeNullableString(
    pickFirst(row, ["first_name", "firstname", "prenom", "given_name"])
  );
  const lastName = normalizeNullableString(
    pickFirst(row, ["last_name", "lastname", "nom", "family_name"])
  );
  const fullName = normalizeNullableString(
    pickFirst(row, ["full_name", "name", "worker_name", "display_name"])
  );

  const inferredFirstName =
    firstName ??
    (fullName ? fullName.split(" ").filter(Boolean).slice(0, 1).join(" ") || null : null);

  const inferredLastName =
    lastName ??
    (fullName
      ? fullName.split(" ").filter(Boolean).slice(1).join(" ").trim() || null
      : null);

  return {
    id,
    user_id: normalizeNullableString(pickFirst(row, ["user_id"])),
    first_name: inferredFirstName,
    last_name: inferredLastName,
    email: normalizeNullableString(pickFirst(row, ["email"])),
    phone: normalizeNullableString(pickFirst(row, ["phone", "phone_number", "telephone"])),
    country: normalizeNullableString(pickFirst(row, ["country", "pays"])),
    region: normalizeNullableString(pickFirst(row, ["region"])),
    city: normalizeNullableString(pickFirst(row, ["city", "ville"])),
    commune: normalizeNullableString(pickFirst(row, ["commune"])),
    district: normalizeNullableString(pickFirst(row, ["district", "quartier"])),
    profession: normalizeNullableString(
      pickFirst(row, ["profession", "job_title", "service", "metier"])
    ),
    description: normalizeNullableString(pickFirst(row, ["description", "bio", "about"])),
    hourly_rate: normalizeNullableNumber(
      pickFirst(row, ["hourly_rate", "rate", "tarif_horaire", "price_per_hour"])
    ),
    currency: normalizeNullableString(pickFirst(row, ["currency", "devise"])) ?? "GNF",
    latitude: normalizeNullableNumber(pickFirst(row, ["latitude", "lat"])),
    longitude: normalizeNullableNumber(pickFirst(row, ["longitude", "lng", "lon"])),
  };
};

const extractWorkersFromUnknownPayload = (payload: unknown): CachedWorkerProfile[] => {
  if (!payload) return [];

  const candidates: unknown[] = [];

  if (Array.isArray(payload)) {
    candidates.push(...payload);
  } else if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;

    if (Array.isArray(obj.results)) candidates.push(...obj.results);
    if (Array.isArray(obj.items)) candidates.push(...obj.items);
    if (Array.isArray(obj.workers)) candidates.push(...obj.workers);
    if (Array.isArray(obj.providers)) candidates.push(...obj.providers);
    if (Array.isArray(obj.data)) candidates.push(...obj.data);

    if (candidates.length === 0 && obj.id) {
      candidates.push(obj);
    }
  }

  const normalized: CachedWorkerProfile[] = [];
  const seen = new Set<string>();

  for (const item of candidates) {
    if (!item || typeof item !== "object") continue;
    const profile = normalizeWorkerResultToProfile(item as Record<string, any>);
    if (!profile?.id) continue;
    if (seen.has(profile.id)) continue;
    seen.add(profile.id);
    normalized.push(profile);
  }

  return normalized;
};

const persistWorkerDetailCache = async (workers: CachedWorkerProfile[]) => {
  if (!workers.length) return;

  await Promise.all(
    workers.map(async (worker) => {
      const key = getWorkerCacheKey(worker.id);
      const existing = await localStore.get<CachedWorkerProfile>(key);

      const merged: CachedWorkerProfile = {
        id: worker.id,
        user_id: worker.user_id ?? existing?.user_id ?? null,
        first_name: worker.first_name ?? existing?.first_name ?? null,
        last_name: worker.last_name ?? existing?.last_name ?? null,
        email: worker.email ?? existing?.email ?? null,
        phone: worker.phone ?? existing?.phone ?? null,
        country: worker.country ?? existing?.country ?? null,
        region: worker.region ?? existing?.region ?? null,
        city: worker.city ?? existing?.city ?? null,
        commune: worker.commune ?? existing?.commune ?? null,
        district: worker.district ?? existing?.district ?? null,
        profession: worker.profession ?? existing?.profession ?? null,
        description: worker.description ?? existing?.description ?? null,
        hourly_rate: worker.hourly_rate ?? existing?.hourly_rate ?? null,
        currency: worker.currency ?? existing?.currency ?? "GNF",
        latitude: worker.latitude ?? existing?.latitude ?? null,
        longitude: worker.longitude ?? existing?.longitude ?? null,
      };

      await localStore.set(key, merged);
    })
  );
};

const persistSearchResultsSnapshot = async (workers: CachedWorkerProfile[]) => {
  if (!workers.length) return;

  try {
    await localStore.set(SEARCH_RESULTS_CACHE_KEY, workers);
    await localStore.set(SEARCH_RESULTS_SYNCED_AT_KEY, new Date().toISOString());
  } catch {
    // ignore
  }
};

const Index = () => {
  const { language } = useLanguage();
  const { connected, initialized } = useNetworkStatus();

  const location = useLocation();
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

  const isSearchRoute = location.pathname === "/search" || location.pathname === "/rechercher";
  const isHomeRoute = location.pathname === "/";

  useNativeTapToClickFix(false);

  const [workerCheckLoading, setWorkerCheckLoading] = useState(true);
  const [isWorker, setIsWorker] = useState(false);
  const [restoredSearch, setRestoredSearch] = useState<SearchPayload | null>(null);

  /**
   * ✅ Détecter si l'utilisateur connecté est un ouvrier (table op_ouvriers)
   * - on utilise getSession() => pas de AuthSessionMissingError
   */
  useEffect(() => {
    let mounted = true;

    const checkWorker = async () => {
      if (!mounted) return;
      setWorkerCheckLoading(true);

      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user ?? null;

        if (!mounted) return;

        if (!user) {
          setIsWorker(false);
          return;
        }

        if (!connected) {
          setIsWorker(false);
          return;
        }

        const { data: workerRow, error } = await supabase
          .from("op_ouvriers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.warn("[Index] checkWorker query error:", error);
          setIsWorker(false);
        } else {
          setIsWorker(!!workerRow);
        }
      } catch (e) {
        if (!mounted) return;
        console.warn("[Index] checkWorker exception:", e);
        setIsWorker(false);
      } finally {
        if (mounted) setWorkerCheckLoading(false);
      }
    };

    if (initialized) {
      void checkWorker();
    }

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void checkWorker();
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [connected, initialized]);

  const searchPayload: SearchPayload = useMemo(() => {
    const p = new URLSearchParams(location.search);
    const payload: SearchPayload = {};

    const keyword = p.get("keyword")?.trim();
    const district = p.get("district")?.trim();
    const lat = p.get("lat")?.trim();
    const lng = p.get("lng")?.trim();
    const near = p.get("near")?.trim();

    if (keyword) payload.keyword = keyword;
    if (district) payload.district = district;
    if (lat) payload.lat = lat;
    if (lng) payload.lng = lng;
    if (near) payload.near = near;

    return payload;
  }, [location.search]);

  const hasAnySearchParam = useMemo(() => {
    return (
      !!searchPayload.keyword ||
      !!searchPayload.district ||
      !!searchPayload.lat ||
      !!searchPayload.lng ||
      !!searchPayload.near
    );
  }, [searchPayload]);

  // ✅ restauration de la dernière recherche locale
  useEffect(() => {
    let mounted = true;

    const restoreLastSearch = async () => {
      try {
        const cached =
          (await localStore.get<SearchPayload>(LAST_SEARCH_KEY)) ??
          (() => {
            try {
              const raw = sessionStorage.getItem(LAST_SEARCH_KEY);
              return raw ? (JSON.parse(raw) as SearchPayload) : null;
            } catch {
              return null;
            }
          })();

        if (!mounted) return;
        setRestoredSearch(cached);
      } catch {
        if (!mounted) return;
        setRestoredSearch(null);
      }
    };

    if (initialized) {
      void restoreLastSearch();
    }

    return () => {
      mounted = false;
    };
  }, [initialized]);

  // ✅ persistance de la recherche courante
  useEffect(() => {
    const persist = async () => {
      if (!hasAnySearchParam) return;

      try {
        await localStore.set(LAST_SEARCH_KEY, searchPayload);
      } catch {
        // ignore
      }

      try {
        sessionStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(searchPayload));
      } catch {
        // ignore
      }
    };

    void persist();
  }, [hasAnySearchParam, searchPayload]);

  // ✅ diffuse l’état réseau au composant de recherche
  useEffect(() => {
    if (!initialized) return;

    try {
      window.dispatchEvent(
        new CustomEvent("op:network-status", {
          detail: {
            connected,
            initialized,
          },
        })
      );
    } catch {
      // ignore
    }
  }, [connected, initialized]);

  // ✅ diffuse la dernière recherche connue au composant de recherche
  useEffect(() => {
    if (!initialized) return;
    if (hasAnySearchParam) return;
    if (!restoredSearch) return;

    try {
      const alreadyBootstrapped =
        (() => {
          try {
            return sessionStorage.getItem(SEARCH_BOOTSTRAP_KEY) === "1";
          } catch {
            return false;
          }
        })() && isHomeRoute;

      if (!alreadyBootstrapped) {
        window.dispatchEvent(
          new CustomEvent("op:search-bootstrap", {
            detail: restoredSearch,
          })
        );

        try {
          sessionStorage.setItem(SEARCH_BOOTSTRAP_KEY, "1");
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }, [initialized, restoredSearch, hasAnySearchParam, isHomeRoute]);

  // ✅ alimente automatiquement le cache détail à partir des résultats de recherche
  useEffect(() => {
    if (!initialized) return;

    let mounted = true;

    const handleWorkersPayload = async (payload: unknown) => {
      const workers = extractWorkersFromUnknownPayload(payload);
      if (!workers.length) return;

      try {
        await persistWorkerDetailCache(workers);
        await persistSearchResultsSnapshot(workers);
      } catch (error) {
        console.warn("[Index] persist worker detail cache warning:", error);
      }
    };

    const onCustomResults = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      void handleWorkersPayload(detail);
    };

    const onStorageSync = async () => {
      if (!mounted) return;

      try {
        const cachedResults = await localStore.get<CachedWorkerProfile[]>(SEARCH_RESULTS_CACHE_KEY);
        if (cachedResults?.length) {
          await persistWorkerDetailCache(cachedResults);
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener("op:workers-results", onCustomResults as EventListener);
    window.addEventListener("op:worker-results", onCustomResults as EventListener);
    window.addEventListener("op:search-results", onCustomResults as EventListener);
    window.addEventListener("op:workers-search-results", onCustomResults as EventListener);
    window.addEventListener("storage", onStorageSync);
    window.addEventListener("focus", onStorageSync);

    return () => {
      mounted = false;
      window.removeEventListener("op:workers-results", onCustomResults as EventListener);
      window.removeEventListener("op:worker-results", onCustomResults as EventListener);
      window.removeEventListener("op:search-results", onCustomResults as EventListener);
      window.removeEventListener("op:workers-search-results", onCustomResults as EventListener);
      window.removeEventListener("storage", onStorageSync);
      window.removeEventListener("focus", onStorageSync);
    };
  }, [initialized]);

  // ✅ si on a déjà un snapshot local de résultats, on régénère aussi les caches détail au boot offline
  useEffect(() => {
    if (!initialized) return;

    let mounted = true;

    const hydrateDetailCacheFromSnapshot = async () => {
      try {
        const cachedResults = await localStore.get<CachedWorkerProfile[]>(SEARCH_RESULTS_CACHE_KEY);
        if (!mounted) return;
        if (!cachedResults?.length) return;
        await persistWorkerDetailCache(cachedResults);
      } catch {
        // ignore
      }
    };

    void hydrateDetailCacheFromSnapshot();

    return () => {
      mounted = false;
    };
  }, [initialized]);

  // ✅ Mesure des overlays en haut (header + barres sticky/fixed)
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
          if (r.top <= 0 && r.height > 0) {
            maxBottom = Math.max(maxBottom, r.bottom);
          }
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

  // ✅ 0) /search ou /rechercher -> accueil + #search
  useEffect(() => {
    if (!isSearchRoute) return;
    if (redirectedRef.current) return;

    redirectedRef.current = true;

    if (hasAnySearchParam) {
      try {
        sessionStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(searchPayload));
      } catch {
        // ignore
      }

      void localStore.set(LAST_SEARCH_KEY, searchPayload).catch(() => undefined);
    }

    const target = `/${location.search || ""}#search`;
    navigate(target, { replace: true });
  }, [isSearchRoute, hasAnySearchParam, searchPayload, location.search, navigate]);

  // ✅ 1) Accueil + #search + params : notifie WorkerSearchSection
  useEffect(() => {
    if (!isHomeRoute) return;
    if (location.hash !== "#search") return;

    const detail = hasAnySearchParam ? searchPayload : restoredSearch;
    if (!detail) return;

    try {
      window.dispatchEvent(new CustomEvent("op:search", { detail }));
    } catch {
      // ignore
    }
  }, [isHomeRoute, location.hash, hasAnySearchParam, searchPayload, restoredSearch]);

  // ✅ 2) Scroll ancres (#search, #subscription...) sur l’accueil
  useEffect(() => {
    if (!isHomeRoute) return;
    if (!location.hash) return;

    const id = location.hash.replace("#", "");
    const el = document.getElementById(id);
    if (!el) return;

    const desiredGap = 6;

    const doScroll = () => {
      const overlay = getTopOverlayOffset();
      const targetTop = overlay + desiredGap;

      const rect = el.getBoundingClientRect();
      const delta = rect.top - targetTop;

      if (Math.abs(delta) > 1) {
        window.scrollBy({ top: delta, behavior: "auto" });
      }
    };

    const timeout = window.setTimeout(() => {
      el.scrollIntoView({ block: "start", behavior: "smooth" });

      requestAnimationFrame(() => {
        doScroll();
        requestAnimationFrame(doScroll);
      });

      window.setTimeout(doScroll, 80);
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [isHomeRoute, location.hash]);

  // ✅ 3) Accueil : remonter en haut si pas d’ancre
  useEffect(() => {
    if (!isHomeRoute) return;
    if (location.hash) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [isHomeRoute, location.hash]);

  return (
    <div
      className="min-h-dvh w-full min-w-0 overflow-x-hidden flex flex-col"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <Header />

      <main className="w-full flex-1 min-w-0 relative">
        {!connected && initialized && (
          <div className="mx-auto w-full max-w-7xl px-4 pt-4">
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
              <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-medium">
                  {language === "fr" ? "Mode hors connexion" : "Offline mode"}
                </div>
                <div className="text-xs text-amber-800 mt-1">
                  {language === "fr"
                    ? "Affichage des prestataires et profils synchronisés jusqu’à la dernière connexion."
                    : "Showing workers and profiles synced up to the last connection."}
                </div>
              </div>
            </div>
          </div>
        )}

        <HeroSection />
        <FeaturesSection />

        <div id="search" className="w-full">
          <WorkerSearchSection />
        </div>

        {!workerCheckLoading && !isWorker && (
          <div id="subscription" className="w-full">
            <SubscriptionSection />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
