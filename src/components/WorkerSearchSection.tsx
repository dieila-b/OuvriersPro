// src/components/WorkerSearchSection.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Star,
  MapPin,
  Search,
  LayoutList,
  LayoutGrid,
  LocateFixed,
  Info,
  RotateCcw,
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

  // ✅ Geo
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

const DEFAULT_MAX_PRICE = 300000;
const DEFAULT_RADIUS_KM = 10;

const toRad = (deg: number) => (deg * Math.PI) / 180;

// Haversine (km)
const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatKm = (km: number, language: string) => {
  if (!Number.isFinite(km)) return "—";
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m`;
  }
  const rounded = Math.round(km * 10) / 10;
  return `${rounded} km`;
};

const WorkerSearchSection: React.FC = () => {
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);

  // Data
  const [workers, setWorkers] = useState<WorkerCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [keyword, setKeyword] = useState("");
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<number>(DEFAULT_MAX_PRICE);
  const [minRating, setMinRating] = useState<number>(0);

  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCommune, setSelectedCommune] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");

  // View
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // ✅ Near me (UX demandé)
  // - par défaut: on ne montre que le bouton “Utiliser ma position”
  // - après clic: on affiche “Rayon + Activez la localisation...” ou l’erreur.
  const [nearUiExpanded, setNearUiExpanded] = useState(false);

  const [useMyPosition, setUseMyPosition] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // 1) Load from Supabase
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
            name:
              ((w.first_name || "") + (w.last_name ? ` ${w.last_name}` : "")).trim() ||
              (language === "fr" ? "Ouvrier" : "Worker"),
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
        console.error("WorkerSearchSection fetch error:", err);
        setWorkers([]);
        setError(
          language === "fr"
            ? "Impossible de charger les professionnels pour le moment."
            : "Unable to load professionals at the moment."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, [language]);

  // 2) Sync filters from URL
  useEffect(() => {
    const spKeyword = searchParams.get("keyword") ?? "";
    const spJob = searchParams.get("job") ?? "all";
    const spRegion = searchParams.get("region") ?? "";
    const spCity = searchParams.get("city") ?? "";
    const spCommune = searchParams.get("commune") ?? "";
    const spDistrict = searchParams.get("district") ?? "";
    const spMaxPrice = Number(searchParams.get("maxPrice") ?? String(DEFAULT_MAX_PRICE));
    const spMinRating = Number(searchParams.get("minRating") ?? "0");
    const spView = (searchParams.get("view") as "list" | "grid") ?? "list";

    // ✅ near me
    const spNear = searchParams.get("near") === "1";
    const spRadius = Number(searchParams.get("radiusKm") ?? String(DEFAULT_RADIUS_KM));
    const spLat = searchParams.get("lat");
    const spLng = searchParams.get("lng");

    setKeyword(spKeyword);
    setSelectedJob(spJob);
    setSelectedRegion(spRegion);
    setSelectedCity(spCity);
    setSelectedCommune(spCommune);
    setSelectedDistrict(spDistrict);
    setMaxPrice(Number.isFinite(spMaxPrice) ? spMaxPrice : DEFAULT_MAX_PRICE);
    setMinRating(Number.isFinite(spMinRating) ? spMinRating : 0);
    setViewMode(spView);

    setUseMyPosition(spNear);
    setRadiusKm(Number.isFinite(spRadius) ? spRadius : DEFAULT_RADIUS_KM);

    const latNum = spLat != null ? Number(spLat) : null;
    const lngNum = spLng != null ? Number(spLng) : null;
    setMyLat(Number.isFinite(latNum as number) ? (latNum as number) : null);
    setMyLng(Number.isFinite(lngNum as number) ? (lngNum as number) : null);

    // ✅ si near=1 dans l'URL, on peut ouvrir l'UI du bloc (sinon bouton seul)
    setNearUiExpanded(spNear);

    if (!initializedFromUrl) setInitializedFromUrl(true);
  }, [searchParams, initializedFromUrl]);

  // 3) Sync URL from filters
  useEffect(() => {
    if (!initializedFromUrl) return;

    const next: Record<string, string> = {};

    if (keyword) next.keyword = keyword;
    if (selectedDistrict) next.district = selectedDistrict;

    if (selectedJob !== "all") next.job = selectedJob;
    if (selectedRegion) next.region = selectedRegion;
    if (selectedCity) next.city = selectedCity;
    if (selectedCommune) next.commune = selectedCommune;
    if (maxPrice !== DEFAULT_MAX_PRICE) next.maxPrice = String(maxPrice);
    if (minRating !== 0) next.minRating = String(minRating);
    if (viewMode !== "list") next.view = viewMode;

    // ✅ around me
    if (useMyPosition) next.near = "1";
    if (useMyPosition && radiusKm !== DEFAULT_RADIUS_KM) next.radiusKm = String(radiusKm);
    if (useMyPosition && myLat != null && myLng != null) {
      next.lat = String(myLat);
      next.lng = String(myLng);
    }

    setSearchParams(next, { replace: true });
  }, [
    initializedFromUrl,
    keyword,
    selectedJob,
    selectedRegion,
    selectedCity,
    selectedCommune,
    selectedDistrict,
    maxPrice,
    minRating,
    viewMode,
    useMyPosition,
    radiusKm,
    myLat,
    myLng,
    setSearchParams,
  ]);

  // Lists
  const jobs = useMemo(
    () =>
      Array.from(
        new Set(workers.map((w) => w.job).filter((j) => j && j.trim().length > 0))
      ),
    [workers]
  );

  const regions = useMemo(
    () =>
      Array.from(
        new Set(workers.map((w) => w.region).filter((r) => r && r.trim().length > 0))
      ),
    [workers]
  );

  const cities = useMemo(
    () =>
      Array.from(
        new Set(
          workers
            .filter((w) => !selectedRegion || w.region === selectedRegion)
            .map((w) => w.city)
            .filter((c) => c && c.trim().length > 0)
        )
      ),
    [workers, selectedRegion]
  );

  const communes = useMemo(
    () =>
      Array.from(
        new Set(
          workers
            .filter(
              (w) =>
                (!selectedRegion || w.region === selectedRegion) &&
                (!selectedCity || w.city === selectedCity)
            )
            .map((w) => w.commune)
            .filter((c) => c && c.trim().length > 0)
        )
      ),
    [workers, selectedRegion, selectedCity]
  );

  const districts = useMemo(
    () =>
      Array.from(
        new Set(
          workers
            .filter(
              (w) =>
                (!selectedRegion || w.region === selectedRegion) &&
                (!selectedCity || w.city === selectedCity) &&
                (!selectedCommune || w.commune === selectedCommune)
            )
            .map((w) => w.district)
            .filter((d) => d && d.trim().length > 0)
        )
      ),
    [workers, selectedRegion, selectedCity, selectedCommune]
  );

  const formatCurrency = (value: number, currency: string) => {
    if (currency === "GNF") return `${value.toLocaleString("fr-FR")} GNF`;
    return `${value} ${currency}`;
  };

  const computeDistance = (w: WorkerCard) => {
    if (!useMyPosition) return null;
    if (myLat == null || myLng == null) return null;
    if (w.latitude == null || w.longitude == null) return null;
    return haversineKm(myLat, myLng, w.latitude, w.longitude);
  };

  // Filter + distance + sort
  const filteredWorkers = useMemo(() => {
    const list = workers
      .map((w) => {
        const distanceKm = computeDistance(w);
        return { ...w, distanceKm };
      })
      .filter((w) => {
        const kw = keyword.trim().toLowerCase();

        const matchKeyword =
          !kw || w.name.toLowerCase().includes(kw) || w.job.toLowerCase().includes(kw);

        const matchJob = selectedJob === "all" || w.job === selectedJob;
        const matchPrice = w.hourlyRate <= maxPrice;
        const matchRating = w.rating >= minRating;

        const regionNorm = w.region?.trim().toLowerCase() || "";
        const cityNorm = w.city?.trim().toLowerCase() || "";
        const communeNorm = w.commune?.trim().toLowerCase() || "";
        const districtNorm = w.district?.trim().toLowerCase() || "";

        const matchRegion = !selectedRegion || regionNorm === selectedRegion.trim().toLowerCase();
        const matchCity = !selectedCity || cityNorm === selectedCity.trim().toLowerCase();
        const matchCommune =
          !selectedCommune || communeNorm === selectedCommune.trim().toLowerCase();
        const matchDistrict =
          !selectedDistrict || districtNorm === selectedDistrict.trim().toLowerCase();

        // ✅ radius filter only when we actually have a position
        const radiusActive = useMyPosition && myLat != null && myLng != null;
        const matchRadius =
          !radiusActive || w.distanceKm == null || w.distanceKm <= radiusKm;

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

    // ✅ sort by distance when position is available
    if (useMyPosition && myLat != null && myLng != null) {
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
  }, [
    workers,
    keyword,
    selectedJob,
    maxPrice,
    minRating,
    selectedRegion,
    selectedCity,
    selectedCommune,
    selectedDistrict,
    useMyPosition,
    radiusKm,
    myLat,
    myLng,
  ]);

  const resetFilters = () => {
    setKeyword("");
    setSelectedJob("all");
    setMaxPrice(DEFAULT_MAX_PRICE);
    setMinRating(0);
    setSelectedRegion("");
    setSelectedCity("");
    setSelectedCommune("");
    setSelectedDistrict("");
    setViewMode("list");

    setNearUiExpanded(false);
    setUseMyPosition(false);
    setRadiusKm(DEFAULT_RADIUS_KM);
    setMyLat(null);
    setMyLng(null);
    setGeoError(null);
  };

  // ✅ Requested UX: show only button by default, expand on click
  const requestMyPosition = () => {
    setNearUiExpanded(true);
    setGeoError(null);
    setUseMyPosition(true);

    if (!navigator.geolocation) {
      setGeoError(
        language === "fr"
          ? "La géolocalisation n'est pas supportée par ce navigateur."
          : "Geolocation is not supported by this browser."
      );
      return;
    }

    setGeoLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLat(pos.coords.latitude);
        setMyLng(pos.coords.longitude);
        setGeoLocating(false);
      },
      (err) => {
        console.error("geolocation error", err);
        setGeoLocating(false);
        setMyLat(null);
        setMyLng(null);

        setGeoError(
          language === "fr"
            ? "Impossible de récupérer votre position. Autorisez la localisation dans votre navigateur."
            : "Unable to retrieve your location. Please allow location access in your browser."
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const text = {
    title: language === "fr" ? "Trouvez votre professionnel" : "Find your professional",
    subtitle:
      language === "fr"
        ? "Filtrez par métier, zone géographique, tarif et distance pour trouver l’ouvrier le plus proche."
        : "Filter by trade, area, rate and distance to find the closest professional.",
    filters: language === "fr" ? "Filtres" : "Filters",
    keywordLabel: language === "fr" ? "Métier ou nom" : "Trade or name",
    searchPlaceholder:
      language === "fr"
        ? "Plombier, électricien, Mamadou..."
        : "Plumber, electrician, John...",
    job: language === "fr" ? "Métier" : "Job",
    allJobs: language === "fr" ? "Tous les métiers" : "All trades",
    priceLabel: language === "fr" ? "Tarif horaire max" : "Max hourly rate",
    ratingLabel: language === "fr" ? "Note minimum" : "Minimum rating",
    region: language === "fr" ? "Région" : "Region",
    city: language === "fr" ? "Ville" : "City",
    commune: language === "fr" ? "Commune" : "Commune",
    district: language === "fr" ? "Quartier" : "District",
    allRegions: language === "fr" ? "Toutes les régions" : "All regions",
    allCities: language === "fr" ? "Toutes les villes" : "All cities",
    allCommunes: language === "fr" ? "Toutes les communes" : "All communes",
    allDistricts: language === "fr" ? "Tous les quartiers" : "All districts",
    reset: language === "fr" ? "Réinitialiser" : "Reset",
    noResults:
      language === "fr"
        ? "Aucun professionnel ne correspond à ces critères pour le moment."
        : "No professional matches your criteria yet.",
    noData:
      language === "fr"
        ? "Aucun professionnel n’est encore disponible."
        : "No professionals are available yet.",
    contact: language === "fr" ? "Contacter" : "Contact",
    perHour: "/h",
    years: language === "fr" ? "ans d'expérience" : "years of experience",
    viewMode: language === "fr" ? "Affichage" : "View",
    viewList: language === "fr" ? "Liste" : "List",
    viewGrid: language === "fr" ? "Mosaïque" : "Grid",
    resultCount: (count: number) =>
      language === "fr"
        ? `${count} résultat${count > 1 ? "s" : ""} trouvé${count > 1 ? "s" : ""}`
        : `${count} result${count > 1 ? "s" : ""} found`,
    aroundMe: language === "fr" ? "Autour de moi" : "Near me",
    useMyPos: language === "fr" ? "Utiliser ma position" : "Use my location",
    radius: language === "fr" ? "Rayon" : "Radius",
    km: "km",
    distance: language === "fr" ? "Distance" : "Distance",
    geoHint:
      language === "fr"
        ? "Cliquez sur “Utiliser ma position” pour afficher le rayon et calculer les distances."
        : "Click “Use my location” to show radius and calculate distances.",
    missingWorkerGeo:
      language === "fr"
        ? "Certains profils n'ont pas encore de position GPS."
        : "Some profiles do not have GPS coordinates yet.",
    enableLoc:
      language === "fr"
        ? "Activez la localisation pour calculer les distances."
        : "Enable location to compute distances.",
  };

  const hasAnyGeoWorkers = useMemo(
    () => workers.some((w) => w.latitude != null && w.longitude != null),
    [workers]
  );

  return (
    <section className="w-full pt-4 pb-12 sm:pt-6 sm:pb-16 lg:pt-8 lg:pb-20 bg-white">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between mb-6 sm:mb-8 border-b border-gray-200 pb-4">
          <div>
            <h2
              id="worker-search-title"
              className="mt-0 text-2xl sm:text-3xl md:text-4xl font-bold text-pro-gray leading-tight"
            >
              {text.title}
            </h2>
            <p className="text-gray-600 mt-1.5 sm:mt-2 text-sm sm:text-base">
              {text.subtitle}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Search className="w-3 h-3" />
                {loading ? (
                  <span>{language === "fr" ? "Chargement..." : "Loading..."}</span>
                ) : (
                  <span>{text.resultCount(filteredWorkers.length)}</span>
                )}
              </span>

              <span className="inline-flex items-center gap-1">
                <Info className="w-3 h-3" />
                <span>{text.geoHint}</span>
              </span>
            </div>

            {useMyPosition && !hasAnyGeoWorkers && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                <Info className="w-4 h-4" />
                {text.missingWorkerGeo}
              </div>
            )}
          </div>

          {/* VIEW MODE */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wide">
              {text.viewMode}
            </span>
            <div className="flex border border-gray-300 rounded-lg bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex items-center gap-1 px-3 py-2 text-xs ${
                  viewMode === "list"
                    ? "bg-pro-blue text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <LayoutList className="w-3 h-3" />
                {text.viewList}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`inline-flex items-center gap-1 px-3 py-2 text-xs ${
                  viewMode === "grid"
                    ? "bg-pro-blue text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                {text.viewGrid}
              </button>
            </div>
          </div>
        </div>

        {/* Filters + results */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 items-start">
          {/* Filters */}
          <aside className="lg:col-span-1 bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200">
            <h3 className="text-base font-semibold text-pro-gray mb-4">{text.filters}</h3>

            {/* ✅ AUTOUR DE MOI (UX rangé) */}
            <div className="mb-5">
              {/* Toujours visible: bouton seul */}
              <Button
                type="button"
                size="sm"
                className="w-full rounded-xl bg-pro-blue hover:bg-blue-700 flex items-center justify-center gap-2"
                onClick={requestMyPosition}
                disabled={geoLocating}
              >
                <LocateFixed className="w-4 h-4" />
                {geoLocating
                  ? language === "fr"
                    ? "Localisation..."
                    : "Locating..."
                  : text.useMyPos}
              </Button>

              {/* Visible uniquement après clic */}
              {nearUiExpanded && (
                <Card className="mt-3 p-4 rounded-2xl border border-gray-200 bg-white">
                  {geoError && (
                    <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      {geoError}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-2">
                    <span>{text.radius}</span>
                    <span className="text-[11px] text-gray-500">
                      {radiusKm} {text.km}
                    </span>
                  </div>

                  <Slider
                    value={[radiusKm]}
                    min={1}
                    max={100}
                    step={1}
                    onValueChange={(v) => setRadiusKm(v[0])}
                  />

                  {(myLat == null || myLng == null) && (
                    <div className="mt-2 text-[11px] text-gray-500">{text.enableLoc}</div>
                  )}

                  {/* Optionnel: petit bouton pour désactiver */}
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full border-gray-300"
                      onClick={() => {
                        setUseMyPosition(false);
                        setMyLat(null);
                        setMyLng(null);
                      }}
                    >
                      {language === "fr" ? "Désactiver" : "Disable"}
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {/* Keyword */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {text.keywordLabel}
              </label>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={text.searchPlaceholder}
                className="text-sm"
              />
            </div>

            {/* Job */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {text.job}
              </label>
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
              >
                <option value="all">{text.allJobs}</option>
                {jobs.map((job) => (
                  <option key={job} value={job}>
                    {job}
                  </option>
                ))}
              </select>
            </div>

            {/* Region */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {text.region}
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setSelectedCity("");
                  setSelectedCommune("");
                  setSelectedDistrict("");
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
              >
                <option value="">{text.allRegions}</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* City */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {text.city}
              </label>
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSelectedCommune("");
                  setSelectedDistrict("");
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
              >
                <option value="">{text.allCities}</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Commune */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {text.commune}
              </label>
              <select
                value={selectedCommune}
                onChange={(e) => {
                  setSelectedCommune(e.target.value);
                  setSelectedDistrict("");
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
              >
                <option value="">{text.allCommunes}</option>
                {communes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* District */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {text.district}
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
              >
                <option value="">{text.allDistricts}</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Max price */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
                <span>{text.priceLabel}</span>
                <span className="text-[11px] text-gray-500">
                  {maxPrice >= DEFAULT_MAX_PRICE
                    ? language === "fr"
                      ? "Aucune limite"
                      : "No limit"
                    : formatCurrency(maxPrice, "GNF")}
                </span>
              </div>
              <Slider
                value={[maxPrice]}
                min={50000}
                max={DEFAULT_MAX_PRICE}
                step={10000}
                onValueChange={(v) => setMaxPrice(v[0])}
              />
            </div>

            {/* Min rating */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
                <span>{text.ratingLabel}</span>
                <span className="text-[11px] text-gray-500">
                  {minRating === 0
                    ? language === "fr"
                      ? "Toutes"
                      : "Any"
                    : minRating.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[minRating]}
                min={0}
                max={5}
                step={0.5}
                onValueChange={(v) => setMinRating(v[0])}
              />
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1 border-gray-300 text-sm"
                variant="outline"
                type="button"
                onClick={resetFilters}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {text.reset}
              </Button>
            </div>
          </aside>

          {/* Results */}
          <div className="lg:col-span-3">
            {error && (
              <div className="border border-red-200 bg-red-50 text-red-700 rounded-xl p-4 text-sm mb-4">
                {error}
              </div>
            )}

            {!error && !loading && workers.length === 0 && (
              <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500 text-sm">
                {text.noData}
              </div>
            )}

            {!error && !loading && workers.length > 0 && filteredWorkers.length === 0 && (
              <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500 text-sm">
                {text.noResults}
              </div>
            )}

            {loading && filteredWorkers.length === 0 && (
              <div className="border border-gray-100 rounded-xl p-6 text-sm text-gray-500">
                {language === "fr"
                  ? "Chargement des professionnels..."
                  : "Loading professionals..."}
              </div>
            )}

            {/* LIST VIEW */}
            {viewMode === "list" && filteredWorkers.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
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
                      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 rounded-full bg-pro-blue text-white flex items-center justify-center text-lg font-semibold">
                          {initials || "OP"}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-pro-gray text-base sm:text-lg truncate">
                            {w.name}
                          </h3>

                          {w.job && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-pro-blue border border-blue-100">
                              {w.job}
                            </span>
                          )}

                          {useMyPosition && myLat != null && myLng != null && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-50 text-slate-700 border border-slate-200">
                              {text.distance}:{" "}
                              <span className="font-semibold ml-1">
                                {w.distanceKm == null ? "—" : formatKm(w.distanceKm, language)}
                              </span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs sm:text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {[w.region, w.city, w.commune, w.district]
                              .filter(Boolean)
                              .join(" • ")}
                          </span>

                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400" />
                            {w.rating.toFixed(1)} ({w.ratingCount})
                          </span>

                          <span>
                            {w.experienceYears} {text.years}
                          </span>
                        </div>
                      </div>

                      {/* Price + CTA */}
                      <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 text-right">
                        <div className="text-pro-blue font-bold text-base sm:text-lg">
                          {formatCurrency(w.hourlyRate, w.currency)}
                          <span className="text-xs sm:text-sm text-gray-600 ml-1">
                            {text.perHour}
                          </span>
                        </div>

                        <Link to={`/ouvrier/${w.id}`}>
                          <Button size="sm" className="bg-pro-blue hover:bg-blue-700 text-xs sm:text-sm">
                            {text.contact}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* GRID VIEW */}
            {viewMode === "grid" && filteredWorkers.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-pro-blue text-white flex items-center justify-center text-sm font-semibold">
                          {initials || "OP"}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-pro-gray truncate">{w.name}</h3>
                          {w.job && <div className="text-xs text-pro-blue mt-0.5">{w.job}</div>}
                          {useMyPosition && myLat != null && myLng != null && (
                            <div className="text-[11px] text-slate-600 mt-1">
                              {text.distance}:{" "}
                              <span className="font-semibold">
                                {w.distanceKm == null ? "—" : formatKm(w.distanceKm, language)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {[w.region, w.city, w.commune, w.district]
                            .filter(Boolean)
                            .join(" • ")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400" />
                          {w.rating.toFixed(1)} ({w.ratingCount})
                        </span>
                        <span>
                          {w.experienceYears} {text.years}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-sm font-bold text-pro-blue">
                          {formatCurrency(w.hourlyRate, w.currency)}
                          <span className="ml-1 text-[11px] text-gray-600">{text.perHour}</span>
                        </div>
                        <Link to={`/ouvrier/${w.id}`}>
                          <Button size="sm" className="bg-pro-blue hover:bg-blue-700 text-[11px]">
                            {text.contact}
                          </Button>
                        </Link>
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
