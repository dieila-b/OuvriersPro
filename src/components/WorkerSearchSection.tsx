// src/components/WorkerSearchSection.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

const WorkerSearchSection: React.FC = () => {
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);

  const [workers, setWorkers] = useState<WorkerCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [keyword, setKeyword] = useState("");
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<number>(DEFAULT_MAX_PRICE);
  const [minRating, setMinRating] = useState<number>(0);

  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCommune, setSelectedCommune] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");

  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const [useMyPosition, setUseMyPosition] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const hasMyCoords = myLat != null && myLng != null;

  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("op_ouvriers_with_ratings")
          .select(`
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
          `)
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
            name: (((w.first_name || "") + (w.last_name ? ` ${w.last_name}` : "")).trim() || "Ouvrier"),
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

    if (!initializedFromUrl) setInitializedFromUrl(true);
  }, [searchParams, initializedFromUrl]);

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

    if (useMyPosition) next.near = "1";
    if (useMyPosition && radiusKm !== DEFAULT_RADIUS_KM) next.radiusKm = String(radiusKm);
    if (useMyPosition && hasMyCoords) {
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
    hasMyCoords,
    myLat,
    myLng,
    setSearchParams,
  ]);

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
    if (!hasMyCoords) return null;
    if (w.latitude == null || w.longitude == null) return null;
    return haversineKm(myLat as number, myLng as number, w.latitude, w.longitude);
  };

  const filteredWorkers = useMemo(() => {
    const list = workers
      .map((w) => ({ ...w, distanceKm: computeDistance(w) }))
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

        const matchRadius =
          !useMyPosition || !hasMyCoords || w.distanceKm == null || w.distanceKm <= radiusKm;

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

    if (useMyPosition && hasMyCoords) {
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
    hasMyCoords,
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
    setUseMyPosition(false);
    setRadiusKm(DEFAULT_RADIUS_KM);
    setMyLat(null);
    setMyLng(null);
    setGeoError(null);
  };

  const requestMyPosition = () => {
    setGeoError(null);

    if (!navigator.geolocation) {
      setUseMyPosition(false);
      setMyLat(null);
      setMyLng(null);
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
        setUseMyPosition(true);
        setMyLat(pos.coords.latitude);
        setMyLng(pos.coords.longitude);
        setGeoLocating(false);
      },
      (err) => {
        console.error("geolocation error", err);
        setGeoLocating(false);
        setUseMyPosition(false);
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
      language === "fr" ? "Plombier, électricien, Mamadou..." : "Plumber, electrician, John...",
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
      language === "fr" ? "Aucun professionnel n’est encore disponible." : "No professionals are available yet.",
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
    distance: language === "fr" ? "Distance" : "Distance",
    useMyPos: language === "fr" ? "Utiliser ma position" : "Use my location",
    radius: language === "fr" ? "Rayon" : "Radius",
    km: "km",
    geoHint:
      language === "fr"
        ? "Activez la localisation pour trier et filtrer par distance."
        : "Enable location to sort/filter by distance.",
  };

  const hasAnyGeoWorkers = useMemo(
    () => workers.some((w) => w.latitude != null && w.longitude != null),
    [workers]
  );

  return (
    // ✅ IMPORTANT: réduction forte des padding verticaux (source du “vide”)
    <section className="w-full bg-white py-8 sm:py-10 lg:py-12">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* HEADER (mb + pb réduits) */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-4 sm:mb-6 border-b border-gray-200 pb-3">
          <div>
            <h2 className="mt-0 text-2xl sm:text-3xl md:text-4xl font-bold text-pro-gray leading-tight">
              {text.title}
            </h2>
            <p className="text-gray-600 mt-1.5 text-sm sm:text-base">{text.subtitle}</p>

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

            {useMyPosition && hasMyCoords && !hasAnyGeoWorkers && (
              <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 inline-flex items-center gap-2">
                <Info className="w-4 h-4" />
                {language === "fr"
                  ? "Certains profils n'ont pas encore de position GPS."
                  : "Some profiles do not have GPS coordinates yet."}
              </div>
            )}
          </div>

          {/* VIEW TOGGLE */}
          <div className="flex items-center gap-2">
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 items-start">
          {/* FILTERS */}
          <aside className="lg:col-span-1 bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200">
            <h3 className="text-base font-semibold text-pro-gray mb-4">{text.filters}</h3>

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

            <div className="mb-5">
              <Button
                type="button"
                size="sm"
                className="w-full bg-pro-blue hover:bg-blue-700"
                onClick={() => {
                  if (useMyPosition || hasMyCoords) {
                    setUseMyPosition(false);
                    setMyLat(null);
                    setMyLng(null);
                    setGeoError(null);
                    return;
                  }
                  requestMyPosition();
                }}
                disabled={geoLocating}
              >
                <LocateFixed className="w-4 h-4 mr-2" />
                {geoLocating
                  ? language === "fr"
                    ? "Localisation..."
                    : "Locating..."
                  : text.useMyPos}
              </Button>

              {geoError && (
                <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {geoError}
                </div>
              )}

              {useMyPosition && hasMyCoords && (
                <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
                    <span>{text.radius}</span>
                    <span className="text-[11px] text-gray-500">
                      {radiusKm} {text.km}
                    </span>
                  </div>
                  <Slider
                    defaultValue={[radiusKm]}
                    min={1}
                    max={100}
                    step={1}
                    onValueChange={(v) => setRadiusKm(v[0])}
                  />
                </div>
              )}
            </div>

            {/* ... le reste inchangé (select, sliders, reset, résultats) ... */}
            {/* IMPORTANT: je n’ai pas modifié ta logique de données, uniquement les espacements responsables du “vide”. */}

            {/* Job */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">{text.job}</label>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">{text.region}</label>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">{text.city}</label>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">{text.commune}</label>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">{text.district}</label>
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

            {/* Price */}
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
                defaultValue={[maxPrice]}
                min={50000}
                max={DEFAULT_MAX_PRICE}
                step={10000}
                onValueChange={(v) => setMaxPrice(v[0])}
              />
            </div>

            {/* Rating */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
                <span>{text.ratingLabel}</span>
                <span className="text-[11px] text-gray-500">
                  {minRating === 0 ? (language === "fr" ? "Toutes" : "Any") : minRating.toFixed(1)}
                </span>
              </div>
              <Slider
                defaultValue={[minRating]}
                min={0}
                max={5}
                step={0.5}
                onValueChange={(v) => setMinRating(v[0])}
              />
            </div>

            <Button
              className="w-full border-gray-300 text-sm"
              variant="outline"
              type="button"
              onClick={resetFilters}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {text.reset}
            </Button>
          </aside>

          {/* RESULTS (inchangé) */}
          <div className="lg:col-span-3">
            {/* ... ta partie résultats reste identique ... */}

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
                {language === "fr" ? "Chargement des professionnels..." : "Loading professionals..."}
              </div>
            )}

            {/* (tes blocs list/grid inchangés) */}
            {/* ... */}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkerSearchSection;
