// src/components/SearchSection.tsx
import React, { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

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
  status: string | null;

  // coords optionnelles
  lat: number | null;
  lng: number | null;
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
  lat?: number | null;
  lng?: number | null;
}

type GeoPoint = { lat: number; lng: number };

// ---- normalisation robuste (accents, casse, espaces)
const norm = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const haversineKm = (a: GeoPoint, b: GeoPoint) => {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * R * Math.asin(Math.sqrt(h));
};

const SearchSection: React.FC = () => {
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const [workers, setWorkers] = useState<WorkerCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Filtres
  const [keyword, setKeyword] = useState(""); // Métier
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>(""); // Quartier
  const [maxPrice, setMaxPrice] = useState<number>(300000);
  const [minRating, setMinRating] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // ✅ Géoloc URL
  const [userGeo, setUserGeo] = useState<GeoPoint | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(10);

  // -------------------------
  // 1) Charge ouvriers
  // -------------------------
  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from<DbWorker>("op_ouvriers")
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
          status,
          lat,
          lng
        `
        )
        .eq("status", "approved");

      if (error) {
        console.error(error);
        setError(
          language === "fr"
            ? "Impossible de charger les professionnels pour le moment."
            : "Unable to load professionals at the moment."
        );
        setLoading(false);
        return;
      }

      const mapped: WorkerCard[] =
        (data ?? []).map((w) => ({
          id: w.id,
          name:
            ((w.first_name || "").trim() +
              (w.last_name ? ` ${w.last_name.trim()}` : "")).trim() ||
            "Ouvrier",
          job: (w.profession ?? "").trim(),
          country: (w.country ?? "").trim(),
          region: (w.region ?? "").trim(),
          city: (w.city ?? "").trim(),
          commune: (w.commune ?? "").trim(),
          district: (w.district ?? "").trim(),
          experienceYears: w.years_experience ?? 0,
          hourlyRate: w.hourly_rate ?? 0,
          currency: w.currency ?? "GNF",
          rating: w.average_rating ?? 0,
          ratingCount: w.rating_count ?? 0,
          lat: w.lat ?? null,
          lng: w.lng ?? null,
        })) ?? [];

      setWorkers(mapped);
      setLoading(false);
    };

    fetchWorkers();
  }, [language]);

  // -------------------------
  // 2) Lecture URL -> états (à CHAQUE changement URL)
  // -------------------------
  useEffect(() => {
    const spKeyword =
      searchParams.get("service") ??
      searchParams.get("keyword") ??
      "";

    const spDistrict =
      searchParams.get("quartier") ??
      searchParams.get("district") ??
      "";

    const spJob = searchParams.get("job") ?? "all";
    const spMaxPrice = Number(searchParams.get("maxPrice") ?? "300000");
    const spMinRating = Number(searchParams.get("minRating") ?? "0");
    const spView = (searchParams.get("view") as "list" | "grid") ?? "list";

    const spLat = searchParams.get("lat");
    const spLng = searchParams.get("lng");
    const spRadius = Number(searchParams.get("radiusKm") ?? "10");

    setKeyword((prev) => (prev !== spKeyword ? spKeyword : prev));
    setSelectedDistrict((prev) =>
      prev !== spDistrict ? spDistrict : prev
    );
    setSelectedJob((prev) => (prev !== spJob ? spJob : prev));
    setMaxPrice((prev) =>
      Number.isFinite(spMaxPrice) && prev !== spMaxPrice ? spMaxPrice : prev
    );
    setMinRating((prev) =>
      Number.isFinite(spMinRating) && prev !== spMinRating ? spMinRating : prev
    );
    setViewMode((prev) => (prev !== spView ? spView : prev));

    if (spLat && spLng) {
      const latNum = Number(spLat);
      const lngNum = Number(spLng);
      if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
        setUserGeo((prev) => {
          if (!prev || prev.lat !== latNum || prev.lng !== lngNum) {
            return { lat: latNum, lng: lngNum };
          }
          return prev;
        });
        setRadiusKm((prev) =>
          Number.isFinite(spRadius) && prev !== spRadius ? spRadius : prev
        );
      }
    } else {
      setUserGeo(null);
      setRadiusKm(10);
    }
  }, [searchParams]);

  // -------------------------
  // 3) Sync états -> URL (sans boucle)
  // -------------------------
  useEffect(() => {
    const next: Record<string, string> = {};

    if (keyword.trim()) next.service = keyword.trim();
    if (selectedDistrict.trim()) next.quartier = selectedDistrict.trim();
    if (selectedJob !== "all") next.job = selectedJob;
    if (maxPrice !== 300000) next.maxPrice = String(maxPrice);
    if (minRating !== 0) next.minRating = String(minRating);
    if (viewMode !== "list") next.view = viewMode;

    if (userGeo) {
      next.lat = String(userGeo.lat);
      next.lng = String(userGeo.lng);
      if (radiusKm !== 10) next.radiusKm = String(radiusKm);
    }

    const current = Object.fromEntries(searchParams.entries());
    const same = JSON.stringify(current) === JSON.stringify(next);

    if (!same) {
      setSearchParams(next, { replace: true });
    }
  }, [
    keyword,
    selectedDistrict,
    selectedJob,
    maxPrice,
    minRating,
    viewMode,
    userGeo,
    radiusKm,
    searchParams,
    setSearchParams,
  ]);

  // -------------------------
  // Options métiers / quartiers
  // -------------------------
  const jobs = useMemo(() => {
    return Array.from(
      new Set(
        workers
          .map((w) => w.job.trim())
          .filter((j) => j.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "fr"));
  }, [workers]);

  const districts = useMemo(() => {
    return Array.from(
      new Set(
        workers
          .map((w) => w.district.trim())
          .filter((d) => d.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "fr"));
  }, [workers]);

  // -------------------------
  // Filtrage + distance (robuste accents/casse)
  // -------------------------
  const filteredWorkers = useMemo(() => {
    const kw = norm(keyword || "");
    const dist = norm(selectedDistrict || "");
    const selJobNorm =
      selectedJob === "all" ? "" : norm(selectedJob);

    const base = workers.filter((w) => {
      const wName = norm(w.name);
      const wJob = norm(w.job);
      const wDistrict = norm(w.district);

      // Métier / service (recherche souple)
      const matchKeyword =
        !kw || wName.includes(kw) || wJob.includes(kw);

      // Select métier sidebar (égalité normalisée)
      const matchJob =
        selectedJob === "all" || wJob === selJobNorm;

      // Quartier (égalité normalisée)
      const matchDistrict =
        !dist || wDistrict === dist;

      const matchPrice = w.hourlyRate <= maxPrice;
      const matchRating = w.rating >= minRating;

      return (
        matchKeyword &&
        matchJob &&
        matchPrice &&
        matchRating &&
        matchDistrict
      );
    });

    if (userGeo) {
      return base
        .map((w) => {
          if (typeof w.lat === "number" && typeof w.lng === "number") {
            const dKm = haversineKm(userGeo, {
              lat: w.lat,
              lng: w.lng,
            });
            return { ...w, _distanceKm: dKm };
          }
          return { ...w, _distanceKm: null as number | null };
        })
        .filter((w) => w._distanceKm !== null && w._distanceKm <= radiusKm)
        .sort((a, b) => a._distanceKm! - b._distanceKm!);
    }

    return base;
  }, [
    workers,
    keyword,
    selectedJob,
    maxPrice,
    minRating,
    selectedDistrict,
    userGeo,
    radiusKm,
  ]);

  const resetFilters = () => {
    setKeyword("");
    setSelectedJob("all");
    setSelectedDistrict("");
    setMaxPrice(300000);
    setMinRating(0);
    setViewMode("list");
    setUserGeo(null);
    setRadiusKm(10);
  };

  const formatCurrency = (value: number, currency: string) => {
    if (currency === "GNF") {
      return `${value.toLocaleString("fr-FR")} GNF`;
    }
    return `${value} ${currency}`;
  };

  const text = {
    title:
      language === "fr"
        ? "Trouvez votre professionnel"
        : "Find your professional",
    subtitle:
      language === "fr"
        ? "Filtrez par métier, quartier et tarif pour trouver l’ouvrier le plus proche."
        : "Filter by trade, district and rate to find the closest professional.",
    filters: language === "fr" ? "Filtres" : "Filters",
    keywordLabel: language === "fr" ? "Métier ou nom" : "Trade or name",
    searchPlaceholder:
      language === "fr"
        ? "Plombier, électricien, Mamadou..."
        : "Plumber, electrician, John...",
    job: language === "fr" ? "Métier" : "Job",
    allJobs: language === "fr" ? "Tous les métiers" : "All trades",
    district: language === "fr" ? "Quartier" : "District",
    allDistricts:
      language === "fr" ? "Tous les quartiers" : "All districts",
    priceLabel:
      language === "fr" ? "Tarif horaire max" : "Max hourly rate",
    ratingLabel:
      language === "fr" ? "Note minimum" : "Minimum rating",
    reset:
      language === "fr" ? "Réinitialiser les filtres" : "Reset filters",
    noResults:
      language === "fr"
        ? "Aucun professionnel ne correspond à ces critères pour le moment."
        : "No professional matches your criteria yet.",
    contact: language === "fr" ? "Contacter" : "Contact",
    perHour: "/h",
    years:
      language === "fr"
        ? "ans d'expérience"
        : "years of experience",
    viewMode: language === "fr" ? "Affichage" : "View",
    viewList: language === "fr" ? "Liste" : "List",
    viewGrid: language === "fr" ? "Mosaïque" : "Grid",
    resultCount: (count: number) =>
      language === "fr"
        ? `${count} résultat${count > 1 ? "s" : ""} trouvé${count > 1 ? "s" : ""}`
        : `${count} result${count > 1 ? "s" : ""} found`,
    geoRadiusLabel:
      language === "fr" ? "Rayon autour de moi" : "Radius around me",
    km: "km",
    topSearchTitle:
      language === "fr" ? "Rechercher un ouvrier" : "Search a worker",
    topSearchBtn: language === "fr" ? "Rechercher" : "Search",
  };

  return (
    <section id="search" className="w-full py-12 sm:py-16 lg:py-20 bg-white">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ZONE DE RECHERCHE HAUT */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-pro-blue" />
              <h3 className="font-semibold text-pro-gray text-sm sm:text-base">
                {text.topSearchTitle}
              </h3>
            </div>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="
                grid grid-cols-1 gap-3
                sm:grid-cols-2
                lg:grid-cols-4
                items-end
              "
            >
              {/* Métier */}
              <div className="lg:col-span-2">
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

              {/* Quartier */}
              <div className="lg:col-span-2">
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

              {/* Rayon si geo */}
              {userGeo && (
                <div className="lg:col-span-4">
                  <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
                    <span>{text.geoRadiusLabel}</span>
                    <span className="text-[11px] text-gray-500">
                      {radiusKm} {text.km}
                    </span>
                  </div>
                  <Slider
                    value={[radiusKm]}
                    min={1}
                    max={50}
                    step={1}
                    onValueChange={(v) => setRadiusKm(v[0])}
                  />
                </div>
              )}

              <Button
                type="button"
                className="lg:col-span-4 w-full bg-pro-blue hover:bg-blue-700"
                onClick={() => {
                  const el = document.getElementById("results");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {text.topSearchBtn}
              </Button>
            </form>
          </div>
        </div>

        {/* En-tête */}
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between mb-6 sm:mb-8 border-b border-gray-200 pb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-pro-gray leading-tight">
              {text.title}
            </h2>
            <p className="text-gray-600 mt-1.5 sm:mt-2 text-sm sm:text-base">
              {text.subtitle}
            </p>

            <div className="mt-2 flex items-center gap-1 text-[11px] sm:text-xs text-gray-500">
              <Search className="w-3 h-3" />
              {loading ? (
                <span>
                  {language === "fr"
                    ? "Chargement des résultats..."
                    : "Loading results..."}
                </span>
              ) : (
                <span>{text.resultCount(filteredWorkers.length)}</span>
              )}
            </div>
          </div>

          {/* View modes */}
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

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 items-start">
          {/* Sidebar */}
          <aside className="lg:col-span-1 bg-gray-50 rounded-xl p-4 sm:p-5 border border-gray-200">
            <h3 className="text-base font-semibold text-pro-gray mb-4">
              {text.filters}
            </h3>

            {/* Mot clé */}
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

            {/* Métier */}
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

            {/* Quartier */}
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

            {/* Rayon geo */}
            {userGeo && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
                  <span>{text.geoRadiusLabel}</span>
                  <span className="text-[11px] text-gray-500">
                    {radiusKm} {text.km}
                  </span>
                </div>
                <Slider
                  value={[radiusKm]}
                  min={1}
                  max={50}
                  step={1}
                  onValueChange={(v) => setRadiusKm(v[0])}
                />
              </div>
            )}

            {/* Prix max */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
                <span>{text.priceLabel}</span>
                <span className="text-[11px] text-gray-500">
                  {maxPrice >= 300000
                    ? language === "fr"
                      ? "Aucune limite"
                      : "No limit"
                    : formatCurrency(maxPrice, "GNF")}
                </span>
              </div>
              <Slider
                value={[maxPrice]}
                min={50000}
                max={300000}
                step={10000}
                onValueChange={(v) => setMaxPrice(v[0])}
              />
            </div>

            {/* Note min */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
                <span>{text.ratingLabel}</span>
                <span className="text-[11px] text-gray-500">
                  {minRating === 0 ? "Toutes" : minRating.toFixed(1)}
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

            <Button
              className="w-full border-gray-300 text-sm"
              variant="outline"
              type="button"
              onClick={resetFilters}
            >
              {text.reset}
            </Button>
          </aside>

          {/* Résultats */}
          <div id="results" className="lg:col-span-3">
            {error && (
              <div className="border border-red-200 bg-red-50 text-red-700 rounded-xl p-4 text-sm mb-4">
                {error}
              </div>
            )}

            {!error && !loading && filteredWorkers.length === 0 && (
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

            {/* LIST */}
            {viewMode === "list" && (
              <div className="space-y-3 sm:space-y-4">
                {filteredWorkers.map((w: any) => (
                  <div
                    key={w.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-pro-blue text-white flex items-center justify-center text-lg font-semibold">
                        {w.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
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
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs sm:text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {[w.city, w.commune, w.district]
                            .filter(Boolean)
                            .join(" • ")}
                        </span>

                        {userGeo && w._distanceKm != null && (
                          <span className="text-[11px] text-gray-500">
                            {w._distanceKm.toFixed(1)} {text.km}
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400" />
                          {w.rating.toFixed(1)} ({w.ratingCount})
                        </span>

                        <span>
                          {w.experienceYears} {text.years}
                        </span>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 text-right">
                      <div className="text-pro-blue font-bold text-base sm:text-lg">
                        {formatCurrency(w.hourlyRate, w.currency)}
                        <span className="text-xs sm:text-sm text-gray-600 ml-1">
                          {text.perHour}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-pro-blue hover:bg-blue-700 text-xs sm:text-sm"
                      >
                        {text.contact}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* GRID */}
            {viewMode === "grid" && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredWorkers.map((w: any) => (
                  <div
                    key={w.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-pro-blue text-white flex items-center justify-center text-sm font-semibold">
                        {w.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-pro-gray truncate">
                          {w.name}
                        </h3>
                        {w.job && (
                          <div className="text-xs text-pro-blue mt-0.5">
                            {w.job}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 space-y-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[w.city, w.commune, w.district]
                          .filter(Boolean)
                          .join(" • ")}
                      </span>

                      {userGeo && w._distanceKm != null && (
                        <span className="text-[11px] text-gray-500">
                          {w._distanceKm.toFixed(1)} {text.km}
                        </span>
                      )}

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
                        <span className="ml-1 text-[11px] text-gray-600">
                          {text.perHour}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-pro-blue hover:bg-blue-700 text-[11px]"
                      >
                        {text.contact}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SearchSection;
