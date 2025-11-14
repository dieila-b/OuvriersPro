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
}

const SearchSection: React.FC = () => {
  const { language } = useLanguage();

  // Données depuis Supabase
  const [workers, setWorkers] = useState<WorkerCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [keyword, setKeyword] = useState("");
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<number>(300000);
  const [minRating, setMinRating] = useState<number>(0);

  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCommune, setSelectedCommune] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");

  // Vue : liste ou mosaïque
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // 🔹 Chargement des ouvriers depuis Supabase
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
          status
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
        })) ?? [];

      setWorkers(mapped);
      setLoading(false);
    };

    fetchWorkers();
  }, [language]);

  // 🔹 Listes pour les filtres (dynamiques à partir des données)
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

  const regions = useMemo(
    () =>
      Array.from(
        new Set(
          workers
            .map((w) => w.region)
            .filter((r) => r && r.trim().length > 0)
        )
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

  // 🔹 Application des filtres
  const filteredWorkers = useMemo(
    () =>
      workers.filter((w) => {
        const matchKeyword =
          !keyword ||
          w.name.toLowerCase().includes(keyword.toLowerCase()) ||
          w.job.toLowerCase().includes(keyword.toLowerCase());

        const matchJob = selectedJob === "all" || w.job === selectedJob;
        const matchPrice = w.hourlyRate <= maxPrice;
        const matchRating = w.rating >= minRating;

        const matchRegion = !selectedRegion || w.region === selectedRegion;
        const matchCity = !selectedCity || w.city === selectedCity;
        const matchCommune =
          !selectedCommune || w.commune === selectedCommune;
        const matchDistrict =
          !selectedDistrict || w.district === selectedDistrict;

        return (
          matchKeyword &&
          matchJob &&
          matchPrice &&
          matchRating &&
          matchRegion &&
          matchCity &&
          matchCommune &&
          matchDistrict
        );
      }),
    [
      workers,
      keyword,
      selectedJob,
      maxPrice,
      minRating,
      selectedRegion,
      selectedCity,
      selectedCommune,
      selectedDistrict,
    ]
  );

  const resetFilters = () => {
    setKeyword("");
    setSelectedJob("all");
    setMaxPrice(300000);
    setMinRating(0);
    setSelectedRegion("");
    setSelectedCity("");
    setSelectedCommune("");
    setSelectedDistrict("");
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
        ? "Filtrez par métier, zone géographique et tarif pour trouver l’ouvrier le plus proche."
        : "Filter by trade, area and rate to find the closest professional.",
    filters: language === "fr" ? "Filtres" : "Filters",
    keywordLabel:
      language === "fr" ? "Métier ou nom" : "Trade or name",
    searchPlaceholder:
      language === "fr"
        ? "Plombier, électricien, Mamadou..."
        : "Plumber, electrician, John...",
    job: language === "fr" ? "Métier" : "Job",
    allJobs:
      language === "fr" ? "Tous les métiers" : "All trades",
    priceLabel:
      language === "fr"
        ? "Tarif horaire max"
        : "Max hourly rate",
    ratingLabel:
      language === "fr"
        ? "Note minimum"
        : "Minimum rating",
    region: language === "fr" ? "Région" : "Region",
    city: language === "fr" ? "Ville" : "City",
    commune: language === "fr" ? "Commune" : "Commune",
    district: language === "fr" ? "Quartier" : "District",
    allRegions:
      language === "fr" ? "Toutes les régions" : "All regions",
    allCities:
      language === "fr" ? "Toutes les villes" : "All cities",
    allCommunes:
      language === "fr" ? "Toutes les communes" : "All communes",
    allDistricts:
      language === "fr" ? "Tous les quartiers" : "All districts",
    reset:
      language === "fr"
        ? "Réinitialiser les filtres"
        : "Reset filters",
    noResults:
      language === "fr"
        ? "Aucun professionnel ne correspond à ces critères pour le moment."
        : "No professional matches your criteria yet.",
    contact: language === "fr" ? "Contacter" : "Contact",
    perHour: language === "fr" ? "/h" : "/h",
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
  };

  return (
    <section id="search" className="w-full bg-white py-20">
      <div className="w-full mx-auto max-w-6xl px-4 md:px-8">
        {/* Titre + stats + switch de vue */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-pro-gray md:text-4xl">
              {text.title}
            </h2>
            <p className="mt-2 text-sm text-gray-600 md:text-base">
              {text.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 md:flex-col md:items-end">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Search className="h-4 w-4" />
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

            <div className="flex items-center gap-2 text-xs md:text-sm">
              <span className="text-gray-500">{text.viewMode}</span>
              <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs md:text-sm ${
                    viewMode === "list"
                      ? "bg-pro-blue text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <LayoutList className="h-3 w-3" />
                  <span className="hidden sm:inline">{text.viewList}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs md:text-sm ${
                    viewMode === "grid"
                      ? "bg-pro-blue text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <LayoutGrid className="h-3 w-3" />
                  <span className="hidden sm:inline">{text.viewGrid}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Grille filtres + résultats */}
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-3">
          {/* Filtres */}
          <aside className="rounded-xl border border-gray-200 bg-gray-50 p-5 md:col-span-1">
            <h3 className="mb-4 text-base font-semibold text-pro-gray">
              {text.filters}
            </h3>

            {/* Mot clé */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {text.keywordLabel}
              </label>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={text.searchPlaceholder}
                className="text-sm"
              />
            </div>

            {/* Région */}
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">
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
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
              >
                <option value="">{text.allRegions}</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Ville */}
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {text.city}
              </label>
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSelectedCommune("");
                  setSelectedDistrict("");
                }}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
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
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {text.commune}
              </label>
              <select
                value={selectedCommune}
                onChange={(e) => {
                  setSelectedCommune(e.target.value);
                  setSelectedDistrict("");
                }}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
              >
                <option value="">{text.allCommunes}</option>
                {communes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Quartier */}
            <div className="mb-6">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                {text.district}
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
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
              <div className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600">
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
                defaultValue={[maxPrice]}
                min={50000}
                max={300000}
                step={10000}
                onValueChange={(v) => setMaxPrice(v[0])}
              />
            </div>

            {/* Note minimum */}
            <div className="mb-6">
              <div className="mb-1 flex items-center justify-between text-xs font-medium text-gray-600">
                <span>{text.ratingLabel}</span>
                <span className="text-[11px] text-gray-500">
                  {minRating === 0 ? "Toutes" : minRating.toFixed(1)}
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
              type="button"
              onClick={resetFilters}
              variant="outline"
              className="mt-2 w-full border-gray-300 text-sm"
            >
              {text.reset}
            </Button>
          </aside>

          {/* Résultats */}
          <div className="md:col-span-2">
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {!error && !loading && filteredWorkers.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                {text.noResults}
              </div>
            )}

            {loading && filteredWorkers.length === 0 && (
              <div className="rounded-xl border border-gray-100 p-6 text-sm text-gray-500">
                {language === "fr"
                  ? "Chargement des professionnels..."
                  : "Loading professionals..."}
              </div>
            )}

            {/* Vue LISTE */}
            {viewMode === "list" && (
              <div className="space-y-4">
                {filteredWorkers.map((w) => (
                  <div
                    key={w.id}
                    className="flex flex-col items-start gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md md:flex-row md:items-center md:p-5"
                  >
                    <div className="flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pro-blue text-sm font-semibold text-white md:h-14 md:w-14 md:text-lg">
                        {w.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-pro-gray md:text-lg">
                          {w.name}
                        </h3>
                        {w.job && (
                          <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs text-pro-blue">
                            {w.job}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600 md:text-sm">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[w.region, w.city, w.commune, w.district]
                            .filter(Boolean)
                            .join(" • ")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-400" />
                          {w.rating.toFixed(1)} ({w.ratingCount})
                        </span>
                        <span>
                          {w.experienceYears} {text.years}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 text-right">
                      <div className="text-base font-bold text-pro-blue md:text-lg">
                        {formatCurrency(w.hourlyRate, w.currency)}
                        <span className="ml-1 text-xs text-gray-600 md:text-sm">
                          {text.perHour}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-pro-blue text-xs hover:bg-blue-700 md:text-sm"
                      >
                        {text.contact}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Vue MOSAÏQUE */}
            {viewMode === "grid" && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredWorkers.map((w) => (
                  <div
                    key={w.id}
                    className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-pro-blue text-sm font-semibold text-white">
                        {w.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-pro-gray">
                          {w.name}
                        </h3>
                        {w.job && (
                          <div className="mt-0.5 text-xs text-pro-blue">
                            {w.job}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[w.region, w.city, w.commune, w.district]
                          .filter(Boolean)
                          .join(" • ")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-400" />
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
                        className="bg-pro-blue text-[11px] hover:bg-blue-700"
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
