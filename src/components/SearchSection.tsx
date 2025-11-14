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

  // Vue liste / mosaïque
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
        : "Filter by trade, location and rate to find the closest professional.",
    filters: language === "fr" ? "Filtres" : "Filters",
    keywordLabel: language === "fr" ? "Métier ou nom" : "Trade or name",
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
    <section id="search" className="w-full py-20 bg-white">
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8">
        {/* Titre */}
        <div className="mb-4">
          <h2 className="text-3xl md:text-4xl font-bold text-pro-gray leading-tight">
            {text.title}
          </h2>
          <p className="text-gray-600 mt-2 text-sm md:text-base">
            {text.subtitle}
          </p>
        </div>

        {/* 🔵 BARRE LISTE / MOSAÏQUE + COMPTEUR (nouvelle) */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8 border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 md:px-4">
          <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
            <Search className="w-4 h-4" />
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
            <div className="flex border border-gray-200 rounded-lg bg-white p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-md ${
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
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-md ${
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

        {/* Grille filtres + résultats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Filtres */}
          <aside className="md:col-span-1 bg-gray-50 rounded-xl p-5 border border-gray-200">
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

            {/* Région */}
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

            {/* Ville */}
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
                defaultValue={[maxPrice]}
                min={50000}
                max={300000}
                step={10000}
                onValueChange={(v) => setMaxPrice(v[0])}
              />
            </div>

            {/* Note minimum */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
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
              className="w-full border-gray-300 text-sm"
              variant="outline"
              type="button"
              onClick={resetFilters}
            >
              {text.reset}
            </Button>
          </aside>

          {/* Résultats */}
          <div className="md:col-span-2">
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

            {/* LISTE */}
            {viewMode === "list" && (
              <div className="space-y-4">
                {filteredWorkers.map((w) => (
                  <div
                    key={w.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center gap-4"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-pro-blue text-white flex items-center justify-center text-lg font-semibold">
                        {w.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-pro-gray text-base md:text-lg truncate">
                          {w.name}
                        </h3>
                        {w.job && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-pro-blue border border-blue-100">
                            {w.job}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs md:text-sm text-gray-600">
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

                    <div className="flex flex-col items-end gap-2 text-right">
                      <div className="text-pro-blue font-bold text-base md:text-lg">
                        {formatCurrency(w.hourlyRate, w.currency)}
                        <span className="text-xs md:text-sm text-gray-600 ml-1">
                          {text.perHour}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="bg-pro-blue hover:bg-blue-700 text-xs md:text-sm"
                      >
                        {text.contact}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* MOSAÏQUE */}
            {viewMode === "grid" && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredWorkers.map((w) => (
                  <div
                    key={w.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-pro-blue text-white flex items-center justify-center text-sm font-semibold">
                        {w.name
                          .split(" ")
                          .map((n) => n[0])
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
