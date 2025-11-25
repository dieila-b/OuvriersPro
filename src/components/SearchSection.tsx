// src/components/SearchSection.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkerSearch } from "@/hooks/useWorkerSearch";
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

  // coords optionnelles (si tu les utilises plus tard)
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

  // On lit une fois les paramètres de l’URL
  const urlService =
    searchParams.get("service") ??
    searchParams.get("keyword") ??
    "";
  const urlDistrict =
    searchParams.get("quartier") ??
    searchParams.get("district") ??
    "";

  const [workers, setWorkers] = useState<WorkerCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Filtres UI (initialisés à partir de l’URL à la première charge)
  const [keyword, setKeyword] = useState<string>(urlService);
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>(urlDistrict);
  const [maxPrice, setMaxPrice] = useState<number>(300000);
  const [minRating, setMinRating] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // ✅ Géoloc (optionnel, utilisée seulement si tu la branches depuis Hero)
  const [userGeo, setUserGeo] = useState<GeoPoint | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(10);

  // -------------------------
  // 1) Charger depuis Supabase avec filtre SQL métier + quartier
  // -------------------------
  useEffect(() => {
    const service = (searchParams.get("service") ?? searchParams.get("keyword") ?? "").trim();
    const district = (searchParams.get("quartier") ?? searchParams.get("district") ?? "").trim();
    search(service, district, language);
  }, [language, searchParams, search]);

  // Fonction locale pour déclencher la recherche depuis le bouton
  const handleSearchClick = async () => {
      setLoading(true);
      setError(null);

      try {
        // On repart de la valeur actuelle dans l’URL
        const service = (
          searchParams.get("service") ??
          searchParams.get("keyword") ??
          ""
        ).trim();

        const district = (
          searchParams.get("quartier") ??
          searchParams.get("district") ??
          ""
        ).trim();

        let query = supabase
          .from("op_ouvriers")
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
            latitude,
            longitude
          `
          )
          .eq("status", "approved");

        // ✅ Filtre SQL métier (profession) si fourni
        if (service) {
          query = query.ilike("profession", `%${service}%`);
        }

        // ✅ Filtre SQL quartier (district) si fourni
        if (district) {
          query = query.ilike("district", `%${district}%`);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Supabase error:", error);
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
              ((w.first_name || "") +
                (w.last_name ? ` ${w.last_name}` : "")) || "Ouvrier",
            job: w.profession ?? "",
            country: w.country ?? "",
            region: w.region ?? "",
            city: w.city ?? "",
            commune: w.commune ?? "",
            district: w.district ?? "",
            experienceYears: w.years_experience ?? 0,
            hourlyRate: w.hourly_rate ?? 0,
            currency: w.currency ?? "GNF",
            rating: w.average_rating ?? 0,
            ratingCount: w.rating_count ?? 0,
            lat: w.latitude ?? null,
            lng: w.longitude ?? null,
          })) ?? [];

        setWorkers(mapped);

        // ✅ On synchronise l’UI avec l’URL (si l’URL change, l’UI suit)
        setKeyword(service);
        setSelectedDistrict(district);
      } catch (e) {
        console.error(e);
        setError(
          language === "fr"
            ? "Une erreur est survenue lors du chargement."
            : "An error occurred while loading."
        );
      } finally {
        setLoading(false);
      }
    };

    // On relance dès que langue ou searchParams changent (ex : depuis Hero)
    fetchWorkers();
  }, [language, searchParams]);

  // -------------------------
  // 2) Options métiers / quartiers (à partir des ouvriers déjà filtrés SQL)
  // -------------------------
  const jobs = useMemo(
    () =>
      Array.from(
        new Set(
          workers
            .map((w) => w.job)
            .filter((j) => j && j.trim().length > 0)
        )
      ),
    [workers]
  );

  const districts = useMemo(
    () =>
      Array.from(
        new Set(
          workers
            .map((w) => w.district)
            .filter((d) => d && d.trim().length > 0)
        )
      ),
    [workers]
  );

  // -------------------------
  // 3) Filtrage côté front (uniquement pour les critères NON filtrés par SQL)
  //    La requête SQL filtre déjà par profession (keyword) et district
  // -------------------------
  const filteredWorkers = useMemo(() => {
    const base = workers.filter((w) => {
      const jobNorm = (w.job || "").toLowerCase();

      // Filtre par sélecteur de métier (dropdown séparé)
      const matchJob =
        selectedJob === "all" || jobNorm === selectedJob.toLowerCase();

      // Filtre par prix max
      const matchPrice = w.hourlyRate <= maxPrice;
      
      // Filtre par note minimum
      const matchRating = w.rating >= minRating;

      return matchJob && matchPrice && matchRating;
    });

    // Si tu veux réactiver plus tard le filtre distance, tu peux le
    // remettre ici sur `base` à partir de userGeo et radiusKm.
    return base;
  }, [
    workers,
    selectedJob,
    maxPrice,
    minRating,
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
        {/* Debug léger : ce que nous lisons réellement dans l’URL */}
        {/* Tu peux supprimer ce bloc après test */}
        <div className="mb-4 text-xs text-gray-500">
          <strong>URL service :</strong> "{urlService || "∅"}" —{" "}
          <strong>URL quartier :</strong> "{urlDistrict || "∅"}"
        </div>

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

              <Button
                type="button"
                className="lg:col-span-4 w-full bg-pro-blue hover:bg-blue-700"
                onClick={handleSearchClick}
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
