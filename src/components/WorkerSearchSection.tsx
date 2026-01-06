// src/components/WorkerSearchSection.tsx
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
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
  average_rating: number | null;
  rating_count: number | null;
  computed_average_rating: number | null;
  computed_rating_count: number | null;
  status: string | null;
  latitude?: number | null;
  longitude?: number | null;
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

const DEFAULT_MAX_PRICE = 300000;
const DEFAULT_RADIUS_KM = 10;

const DEFAULT_FILTERS: Filters = {
  keyword: "",
  job: "all",
  region: "",
  city: "",
  commune: "",
  district: "",
  maxPrice: DEFAULT_MAX_PRICE,
  minRating: 0,
  view: "list",
  near: false,
  radiusKm: DEFAULT_RADIUS_KM,
  lat: null,
  lng: null,
};

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

  if (f.keyword) next.keyword = f.keyword;
  if (f.district) next.district = f.district;

  if (f.job !== "all") next.job = f.job;
  if (f.region) next.region = f.region;
  if (f.city) next.city = f.city;
  if (f.commune) next.commune = f.commune;

  if (f.maxPrice !== DEFAULT_MAX_PRICE) next.maxPrice = String(f.maxPrice);
  if (f.minRating !== 0) next.minRating = String(f.minRating);
  if (f.view !== "list") next.view = f.view;

  if (f.near) next.near = "1";
  if (f.near && f.radiusKm !== DEFAULT_RADIUS_KM) next.radiusKm = String(f.radiusKm);
  if (f.near && f.lat != null && f.lng != null) {
    next.lat = String(f.lat);
    next.lng = String(f.lng);
  }

  return next;
}

function paramsToFilters(searchParams: URLSearchParams): Filters {
  const spKeyword = (searchParams.get("keyword") ?? "").trim();
  const spJob = (searchParams.get("job") ?? "all").trim() || "all";
  const spRegion = (searchParams.get("region") ?? "").trim();
  const spCity = (searchParams.get("city") ?? "").trim();
  const spCommune = (searchParams.get("commune") ?? "").trim();
  const spDistrict = (searchParams.get("district") ?? "").trim();
  const spMaxPrice = Number(searchParams.get("maxPrice") ?? String(DEFAULT_MAX_PRICE));
  const spMinRating = Number(searchParams.get("minRating") ?? "0");
  const spView = ((searchParams.get("view") as ViewMode) ?? "list") as ViewMode;

  const spNear = searchParams.get("near") === "1";
  const spRadius = Number(searchParams.get("radiusKm") ?? String(DEFAULT_RADIUS_KM));
  const spLat = searchParams.get("lat");
  const spLng = searchParams.get("lng");

  const latNum = spLat != null ? Number(spLat) : null;
  const lngNum = spLng != null ? Number(spLng) : null;

  return {
    keyword: spKeyword,
    job: spJob,
    region: spRegion,
    city: spCity,
    commune: spCommune,
    district: spDistrict,
    maxPrice: Number.isFinite(spMaxPrice) ? spMaxPrice : DEFAULT_MAX_PRICE,
    minRating: Number.isFinite(spMinRating) ? spMinRating : 0,
    view: spView === "grid" ? "grid" : "list",
    near: spNear,
    radiusKm: Number.isFinite(spRadius) ? spRadius : DEFAULT_RADIUS_KM,
    lat: Number.isFinite(latNum as number) ? (latNum as number) : null,
    lng: Number.isFinite(lngNum as number) ? (lngNum as number) : null,
  };
}

const WorkerSearchSection: React.FC = () => {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // ✅ CMS helper (fallback FR/EN)
  const cms = (key: string, fallbackFr: string, fallbackEn: string) => {
    const v = t(key);
    if (!v || v === key) return language === "fr" ? fallbackFr : fallbackEn;
    return v;
  };

  const sectionRef = useRef<HTMLElement | null>(null);
  const topAnchorRef = useRef<HTMLDivElement | null>(null);

  const isSearchRoute = location.pathname === "/search" || location.pathname === "/rechercher";

  // ✅ Mesure réelle des overlays en haut (header + barres sticky/fixed)
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

    for (const x of samplesX) {
      consider(document.elementFromPoint(x, yProbe));
    }

    const headerEl = document.querySelector("header") as HTMLElement | null;
    if (headerEl) {
      const r = headerEl.getBoundingClientRect();
      if (r.height > 0) maxBottom = Math.max(maxBottom, r.bottom);
    }

    return Math.max(0, Math.round(maxBottom));
  };

  // ✅ Scroll qui “snap” sur le titre
  const scrollToResultsTop = (opts?: { behavior?: ScrollBehavior }) => {
    const el = topAnchorRef.current ?? sectionRef.current;
    if (!el) return;

    const desiredGap = 6;
    const behavior = opts?.behavior ?? "auto";

    const doAdjust = () => {
      const overlay = getTopOverlayOffset();
      const targetTop = overlay + desiredGap;

      const rect = el.getBoundingClientRect();
      const delta = rect.top - targetTop;

      if (Math.abs(delta) > 1) {
        window.scrollBy({ top: delta, behavior: "auto" });
      }
    };

    el.scrollIntoView({ block: "start", behavior });

    requestAnimationFrame(() => {
      doAdjust();
      requestAnimationFrame(doAdjust);
    });

    window.setTimeout(doAdjust, 60);
  };

  // ✅ session: pour bloquer l’accès au profil ouvrier si non connecté
  const [session, setSession] = useState<any>(null);

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
        title: cms("search.auth.required.title", "Connexion requise", "Login required"),
        description: cms("search.auth.required.desc", "Connectez-vous pour voir le profil.", "Sign in to view the profile."),
      });

      window.setTimeout(() => {
        navigate(`/login?redirect=${encodeURIComponent(target)}`, { replace: false });
      }, 650);

      return;
    }

    navigate(target);
  };

  // ✅ Init robuste (URL + sessionStorage + event)
  const initializedRef = useRef(false);
  const applyingExternalRef = useRef(false);

  const [workers, setWorkers] = useState<WorkerCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Geolocation state
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // ✅ 1 seul état "applied" – on conserve "draft" uniquement pour l’UI
  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS);
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);

  // ------------------------------------------------------------------
  // ✅ AUTO-APPLY (debounce)
  // ------------------------------------------------------------------
  const applyTimerRef = useRef<number | null>(null);

  const clearApplyTimer = () => {
    if (applyTimerRef.current != null) {
      window.clearTimeout(applyTimerRef.current);
      applyTimerRef.current = null;
    }
  };

  const applyFiltersObject = (nextApplied: Filters, opts?: { immediate?: boolean }) => {
    clearApplyTimer();

    const run = () => {
      setApplied(nextApplied);
      setSearchParams(filtersToParams(nextApplied), { replace: true });

      if (isSearchRoute) {
        scrollToResultsTop({ behavior: "auto" });
      }
    };

    if (opts?.immediate) {
      run();
      return;
    }

    applyTimerRef.current = window.setTimeout(run, 250);
  };

  const updateDraft = (patch: Partial<Filters>, opts?: { immediate?: boolean }) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      if (!applyingExternalRef.current) applyFiltersObject(next, opts);
      return next;
    });
  };

  useEffect(() => {
    return () => clearApplyTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ------------------------------------------------------------------

  // ----------------------------
  // 1) Fetch workers
  // ----------------------------
  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("op_ouvriers_with_ratings")
          .select(
            `
            id,
            first_name,
            last_name,
            profession,
            country,
            region,
            city,
            commune,
            district,
            hourly_rate,
            currency,
            years_experience,
            average_rating,
            rating_count,
            computed_average_rating,
            computed_rating_count,
            status,
            latitude,
            longitude
          `
          )
          .eq("status", "approved");

        if (error) throw error;

        const rows = (data ?? []) as DbWorker[];

        const mapped: WorkerCard[] = rows.map((w) => {
          const effectiveRating = w.computed_average_rating ?? w.average_rating ?? 0;
          const effectiveCount = w.computed_rating_count ?? w.rating_count ?? 0;

          const lat = typeof w.latitude === "number" ? w.latitude : null;
          const lng = typeof w.longitude === "number" ? w.longitude : null;

          return {
            id: w.id,
            name: (((w.first_name || "") + (w.last_name ? ` ${w.last_name}` : "")).trim() || cms("search.card.default_name", "Ouvrier", "Worker")) as string,
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
        });

        setWorkers(mapped);
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error("WorkerSearchSection fetch error:", err);
        setWorkers([]);
        setError(
          cms(
            "search.error.load",
            "Impossible de charger les professionnels pour le moment.",
            "Unable to load professionals at the moment."
          )
        );
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----------------------------
  // 2) Init: URL / sessionStorage / event
  // ----------------------------
  const applyExternalFilters = (f: Filters) => {
    applyingExternalRef.current = true;
    setApplied(f);
    setDraft(f);

    window.setTimeout(() => {
      applyingExternalRef.current = false;
    }, 0);
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
      const f = paramsToFilters(searchParams);
      applyExternalFilters(f);
      initializedRef.current = true;
      return;
    }

    // fallback sessionStorage (Index.tsx)
    const stored = safeParseJson<SearchPayload>(sessionStorage.getItem("op:last_search"));
    if (stored && (stored.keyword || stored.district || stored.lat || stored.lng || stored.near)) {
      const next = new URLSearchParams(searchParams);

      if (stored.keyword) next.set("keyword", stored.keyword);
      if (stored.district) next.set("district", stored.district);
      if (stored.near) next.set("near", stored.near);
      if (stored.lat) next.set("lat", stored.lat);
      if (stored.lng) next.set("lng", stored.lng);

      setSearchParams(next, { replace: true });
      initializedRef.current = true;
      return;
    }

    applyExternalFilters(DEFAULT_FILTERS);
    initializedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ À l’arrivée sur /search : aligner juste sous le header/sticky
  useLayoutEffect(() => {
    if (isSearchRoute) {
      scrollToResultsTop({ behavior: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Ré-appliquer quand l'URL change
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

  // Support event global op:search
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
        if (isSearchRoute) scrollToResultsTop({ behavior: "auto" });
      }
    };

    window.addEventListener("op:search", onSearch as EventListener);
    return () => window.removeEventListener("op:search", onSearch as EventListener);
  }, [setSearchParams, isSearchRoute]);

  // ----------------------------
  // 3) Derived options
  // ----------------------------
  const jobs = useMemo(
    () => Array.from(new Set(workers.map((w) => w.job).filter((j) => j && j.trim().length > 0))),
    [workers]
  );

  const regions = useMemo(
    () => Array.from(new Set(workers.map((w) => w.region).filter((r) => r && r.trim().length > 0))),
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
            .filter((w) => (!draft.region || w.region === draft.region) && (!draft.city || w.city === draft.city))
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
        const matchKeyword = !kw || w.name.toLowerCase().includes(kw) || w.job.toLowerCase().includes(kw);

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
          !f.near || f.lat == null || f.lng == null || w.distanceKm == null || w.distanceKm <= f.radiusKm;

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
    }

    return list;
  }, [workers, applied]);

  // ----------------------------
  // 4) Actions
  // ----------------------------
  const resetAll = () => {
    applyingExternalRef.current = true;
    setDraft(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setSearchParams({}, { replace: true });
    setGeoError(null);

    window.setTimeout(() => {
      applyingExternalRef.current = false;
    }, 0);

    if (isSearchRoute) scrollToResultsTop({ behavior: "auto" });
  };

  const requestMyPosition = () => {
    setGeoError(null);

    if (!navigator.geolocation) {
      updateDraft({ near: false, lat: null, lng: null }, { immediate: true });
      setGeoError(
        cms(
          "home.search.geo.unsupported",
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
          {
            near: true,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
          { immediate: true }
        );
        setGeoLocating(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error("geolocation error", err);
        setGeoLocating(false);

        updateDraft({ near: false, lat: null, lng: null }, { immediate: true });

        setGeoError(
          cms(
            "home.search.geo.error",
            "Impossible de récupérer votre position. Autorisez la localisation dans votre navigateur.",
            "Unable to retrieve your location. Please allow location access in your browser."
          )
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const resultCount = (count: number) =>
    language === "fr"
      ? `${count} résultat${count > 1 ? "s" : ""} trouvé${count > 1 ? "s" : ""}`
      : `${count} result${count > 1 ? "s" : ""} found`;

  const hasAnyGeoWorkers = useMemo(() => workers.some((w) => w.latitude != null && w.longitude != null), [workers]);
  const appliedHasCoords = applied.lat != null && applied.lng != null;

  // CMS texts
  const title = cms("search.page.title", "Trouvez votre professionnel", "Find your professional");
  const subtitle = cms(
    "search.page.subtitle",
    "Modifiez vos filtres pour lancer la recherche automatiquement.",
    "Adjust filters to automatically update results."
  );

  const filtersTitle = cms("search.filters.title", "Filtres", "Filters");
  const resetLabel = cms("search.filters.btn_reset", "Réinitialiser", "Reset");
  const geoCta = cms("search.filters.btn_geolocate", "Utiliser ma position", "Use my location");

  const viewModeLabel = cms("search.view.mode", "Affichage", "View");
  const viewList = cms("search.view.list", "Liste", "List");
  const viewGrid = cms("search.view.grid", "Mosaïque", "Grid");

  const keywordLabel = cms("search.filters.keyword_label", "Métier ou nom", "Trade or name");
  const keywordPlaceholder = cms(
    "search.filters.keyword_placeholder",
    "Plombier, électricien, Mamadou...",
    "Plumber, electrician, John..."
  );

  const jobLabel = cms("search.filters.job_label", "Métier", "Job");
  const allJobs = cms("search.filters.job_all", "Tous les métiers", "All trades");

  const regionLabel = cms("search.filters.region_label", "Région", "Region");
  const cityLabel = cms("search.filters.city_label", "Ville", "City");
  const communeLabel = cms("search.filters.commune_label", "Commune", "Commune");
  const districtLabel = cms("search.filters.district_label", "Quartier", "District");

  const allRegions = cms("search.filters.region_all", "Toutes les régions", "All regions");
  const allCities = cms("search.filters.city_all", "Toutes les villes", "All cities");
  const allCommunes = cms("search.filters.commune_all", "Toutes les communes", "All communes");
  const allDistricts = cms("search.filters.district_all", "Tous les quartiers", "All districts");

  const priceLabel = cms("search.filters.price_label", "Tarif horaire max", "Max hourly rate");
  const priceNoLimit = cms("search.filters.price_nolimit", "Aucune limite", "No limit");

  const ratingLabel = cms("search.filters.rating_label", "Note minimum", "Minimum rating");
  const ratingAny = cms("search.filters.rating_any", "Toutes", "Any");

  const distanceLabel = cms("search.filters.distance_label", "Distance", "Distance");
  const radiusLabel = cms("search.filters.radius_label", "Rayon", "Radius");

  const geoHint = cms(
    "search.filters.geo_hint",
    "Activez la localisation pour trier et filtrer par distance.",
    "Enable location to sort/filter by distance."
  );

  const appliedBadge = cms("search.filters.applied_badge", "Filtres appliqués", "Applied filters");

  const noResults = cms(
    "search.results.no_results",
    "Aucun professionnel ne correspond à ces critères pour le moment.",
    "No professional matches your criteria yet."
  );
  const noData = cms("search.results.no_data", "Aucun professionnel n’est encore disponible.", "No professionals are available yet.");
  const loadingText = cms("search.results.loading", "Chargement des professionnels...", "Loading professionals...");

  const contactBtn = cms("search.card.btn_contact", "Contacter", "Contact");
  const perHourSuffix = cms("search.card.price_suffix", "/h", "/h");
  const yearsSuffix = cms("search.card.years_suffix", "ans d'expérience", "years of experience");

  return (
    <section ref={sectionRef} id="worker-search" className="w-full pt-0 pb-10 sm:pb-14 lg:pb-16 bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-10 2xl:px-16 min-w-0">
        {/* ✅ ancre = haut du titre */}
        <div ref={topAnchorRef} />

        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between mb-5 sm:mb-7 border-b border-gray-200 pb-3 min-w-0">
          <div className="min-w-0">
            <h2 className="mt-0 text-2xl sm:text-3xl md:text-4xl font-bold text-pro-gray leading-tight">
              {title}
            </h2>
            <p className="text-gray-600 mt-1.5 sm:mt-2 text-sm sm:text-base max-w-4xl">{subtitle}</p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Search className="w-3 h-3" />
                {loading ? (
                  <span>{cms("common.loading", "Chargement...", "Loading...")}</span>
                ) : (
                  <span>{resultCount(filteredWorkers.length)}</span>
                )}
              </span>

              <span className="inline-flex items-center gap-1">
                <Info className="w-3 h-3" />
                <span>{geoHint}</span>
              </span>

              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 border-emerald-200 bg-emerald-50 text-emerald-700">
                <Check className="w-3 h-3" />
                {appliedBadge}
              </span>
            </div>

            {applied.near && appliedHasCoords && !hasAnyGeoWorkers && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                <Info className="w-4 h-4" />
                {cms(
                  "search.geo.missing_coords_warning",
                  "Certains profils n'ont pas encore de position GPS.",
                  "Some profiles do not have GPS coordinates yet."
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wide">{viewModeLabel}</span>
            <div className="flex border border-gray-300 rounded-lg bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => updateDraft({ view: "list" }, { immediate: true })}
                className={`inline-flex items-center gap-1 px-3 py-2 text-xs ${
                  draft.view === "list" ? "bg-pro-blue text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <LayoutList className="w-3 h-3" />
                {viewList}
              </button>
              <button
                type="button"
                onClick={() => updateDraft({ view: "grid" }, { immediate: true })}
                className={`inline-flex items-center gap-1 px-3 py-2 text-xs ${
                  draft.view === "grid" ? "bg-pro-blue text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                {viewGrid}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6 lg:gap-8 items-start min-w-0">
          <aside className="min-w-0 bg-gray-50 rounded-2xl p-4 sm:p-5 border border-gray-200">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h3 className="text-base font-semibold text-pro-gray">{filtersTitle}</h3>

              <Button className="border-gray-300 text-sm" variant="outline" type="button" onClick={resetAll}>
                <RotateCcw className="w-4 h-4 mr-2" />
                {resetLabel}
              </Button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">{keywordLabel}</label>
              <Input
                value={draft.keyword}
                onChange={(e) => updateDraft({ keyword: e.target.value })}
                placeholder={keywordPlaceholder}
                className="text-sm"
              />
            </div>

            <div className="mb-5">
              <Button
                type="button"
                size="sm"
                className="w-full bg-pro-blue hover:bg-blue-700"
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
                <LocateFixed className="w-4 h-4 mr-2" />
                {geoLocating ? cms("search.geo.locating", "Localisation...", "Locating...") : geoCta}
              </Button>

              {geoError && (
                <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {geoError}
                </div>
              )}

              {draft.near && draft.lat != null && draft.lng != null && (
                <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
                    <span>{radiusLabel}</span>
                    <span className="text-[11px] text-gray-500">{draft.radiusKm} km</span>
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

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">{jobLabel}</label>
              <select
                value={draft.job}
                onChange={(e) => updateDraft({ job: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
              >
                <option value="all">{allJobs}</option>
                {jobs.map((job) => (
                  <option key={job} value={job}>
                    {job}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">{regionLabel}</label>
              <select
                value={draft.region}
                onChange={(e) => {
                  const region = e.target.value;
                  updateDraft({ region, city: "", commune: "", district: "" });
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
              >
                <option value="">{allRegions}</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">{cityLabel}</label>
              <select
                value={draft.city}
                onChange={(e) => {
                  const city = e.target.value;
                  updateDraft({ city, commune: "", district: "" });
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
              >
                <option value="">{allCities}</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">{communeLabel}</label>
              <select
                value={draft.commune}
                onChange={(e) => {
                  const commune = e.target.value;
                  updateDraft({ commune, district: "" });
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
              >
                <option value="">{allCommunes}</option>
                {communes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-600 mb-1">{districtLabel}</label>
              <select
                value={draft.district}
                onChange={(e) => updateDraft({ district: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
              >
                <option value="">{allDistricts}</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
                <span>{priceLabel}</span>
                <span className="text-[11px] text-gray-500">
                  {draft.maxPrice >= DEFAULT_MAX_PRICE ? priceNoLimit : `${draft.maxPrice.toLocaleString("fr-FR")} GNF`}
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

            <div className="mb-2">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
                <span>{ratingLabel}</span>
                <span className="text-[11px] text-gray-500">
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
          </aside>

          <div className="min-w-0">
            {error && (
              <div className="border border-red-200 bg-red-50 text-red-700 rounded-xl p-4 text-sm mb-4">{error}</div>
            )}

            {!error && !loading && workers.length === 0 && (
              <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500 text-sm">
                {noData}
              </div>
            )}

            {!error && !loading && workers.length > 0 && filteredWorkers.length === 0 && (
              <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500 text-sm">
                {noResults}
              </div>
            )}

            {loading && filteredWorkers.length === 0 && (
              <div className="border border-gray-100 rounded-xl p-6 text-sm text-gray-500">
                {loadingText}
              </div>
            )}

            {applied.view === "list" && filteredWorkers.length > 0 && (
              <div className="space-y-3 sm:space-y-4 min-w-0">
                {filteredWorkers.map((w) => {
                  const initials = w.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0]?.toUpperCase())
                    .join("");

                  return (
                    <div
                      key={w.id}
                      className="min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 rounded-full bg-pro-blue text-white flex items-center justify-center text-lg font-semibold">
                          {initials || "OP"}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <h3 className="font-semibold text-pro-gray text-base sm:text-lg truncate min-w-0">{w.name}</h3>

                          {w.job && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-pro-blue border border-blue-100">
                              {w.job}
                            </span>
                          )}

                          {applied.near && appliedHasCoords && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-50 text-slate-700 border border-slate-200">
                              {distanceLabel}:{" "}
                              <span className="font-semibold ml-1">
                                {w.distanceKm == null ? "—" : formatKm(w.distanceKm, language)}
                              </span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs sm:text-sm text-gray-600 min-w-0">
                          <span className="flex items-center gap-1 min-w-0">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              {[w.region, w.city, w.commune, w.district].filter(Boolean).join(" • ")}
                            </span>
                          </span>

                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400" />
                            {w.rating.toFixed(1)} ({w.ratingCount})
                          </span>

                          <span>
                            {w.experienceYears} {yearsSuffix}
                          </span>
                        </div>
                      </div>

                      <div className="w-full sm:w-auto flex sm:flex-col items-start sm:items-end justify-between sm:justify-start gap-2 min-w-0">
                        <div className="text-pro-blue font-bold text-base sm:text-lg">
                          {formatCurrency(w.hourlyRate, w.currency)}
                          <span className="text-xs sm:text-sm text-gray-600 ml-1">{perHourSuffix}</span>
                        </div>

                        <Button
                          size="sm"
                          className="w-full sm:w-auto bg-pro-blue hover:bg-blue-700 text-xs sm:text-sm"
                          onClick={() => goToWorkerProfile(w.id)}
                        >
                          {contactBtn}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {applied.view === "grid" && filteredWorkers.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-w-0">
                {filteredWorkers.map((w) => {
                  const initials = w.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0]?.toUpperCase())
                    .join("");

                  return (
                    <div
                      key={w.id}
                      className="min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-pro-blue text-white flex items-center justify-center text-sm font-semibold shrink-0">
                          {initials || "OP"}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-pro-gray truncate">{w.name}</h3>
                          {w.job && <div className="text-xs text-pro-blue mt-0.5 truncate">{w.job}</div>}
                          {applied.near && appliedHasCoords && (
                            <div className="text-[11px] text-slate-600 mt-1">
                              {distanceLabel}:{" "}
                              <span className="font-semibold">
                                {w.distanceKm == null ? "—" : formatKm(w.distanceKm, language)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1 min-w-0">
                        <span className="flex items-center gap-1 min-w-0">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {[w.region, w.city, w.commune, w.district].filter(Boolean).join(" • ")}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400" />
                          {w.rating.toFixed(1)} ({w.ratingCount})
                        </span>
                        <span>
                          {w.experienceYears} {yearsSuffix}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="text-sm font-bold text-pro-blue">
                          {formatCurrency(w.hourlyRate, w.currency)}
                          <span className="ml-1 text-[11px] text-gray-600">{perHourSuffix}</span>
                        </div>

                        <Button
                          size="sm"
                          className="bg-pro-blue hover:bg-blue-700 text-[11px]"
                          onClick={() => goToWorkerProfile(w.id)}
                        >
                          {contactBtn}
                        </Button>
                      </div>
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
