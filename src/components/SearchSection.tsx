import React, { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Search } from "lucide-react";

interface WorkerCard {
  id: number;
  name: string;
  job: string;
  city: string;
  experienceYears: number;
  hourlyRate: number;
  currency: string;
  rating: number;
  ratingCount: number;
  tag: string;
}

const MOCK_WORKERS: WorkerCard[] = [
  {
    id: 1,
    name: "Pierre Martin",
    job: "Plombier",
    city: "Conakry - Ratoma",
    experienceYears: 8,
    hourlyRate: 150000,
    currency: "GNF",
    rating: 4.8,
    ratingCount: 156,
    tag: "Plomberie",
  },
  {
    id: 2,
    name: "Sophie Dubois",
    job: "Électricienne",
    city: "Conakry - Matoto",
    experienceYears: 12,
    hourlyRate: 180000,
    currency: "GNF",
    rating: 4.9,
    ratingCount: 203,
    tag: "Electricité",
  },
  {
    id: 3,
    name: "Ibrahima Bah",
    job: "Maçon",
    city: "Kindia",
    experienceYears: 6,
    hourlyRate: 130000,
    currency: "GNF",
    rating: 4.6,
    ratingCount: 97,
    tag: "Bâtiment",
  },
];

const SearchSection: React.FC = () => {
  const { language } = useLanguage();

  const [keyword, setKeyword] = useState("");
  const [selectedJob, setSelectedJob] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<number>(250000);
  const [minRating, setMinRating] = useState<number>(0);

  const jobs = ["Plombier", "Électricien", "Maçon", "Menuisier", "Peintre"];

  const filteredWorkers = MOCK_WORKERS.filter((w) => {
    const matchKeyword =
      !keyword ||
      w.name.toLowerCase().includes(keyword.toLowerCase()) ||
      w.job.toLowerCase().includes(keyword.toLowerCase());

    const matchJob = selectedJob === "all" || w.job === selectedJob;
    const matchPrice = w.hourlyRate <= maxPrice;
    const matchRating = w.rating >= minRating;

    return matchKeyword && matchJob && matchPrice && matchRating;
  });

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
    filters:
      language === "fr"
        ? "Filtres"
        : "Filters",
    job:
      language === "fr"
        ? "Métier"
        : "Job",
    searchPlaceholder:
      language === "fr"
        ? "Rechercher un métier, un service ou un nom…"
        : "Search a trade, service or name…",
    allJobs:
      language === "fr"
        ? "Tous les métiers"
        : "All trades",
    priceLabel:
      language === "fr"
        ? "Prix max par heure"
        : "Max hourly rate",
    ratingLabel:
      language === "fr"
        ? "Note minimum"
        : "Minimum rating",
    btnFilter:
      language === "fr"
        ? "Appliquer les filtres"
        : "Apply filters",
    noResults:
      language === "fr"
        ? "Aucun professionnel ne correspond à ces critères pour le moment."
        : "No professional matches your criteria yet.",
    contact:
      language === "fr"
        ? "Contacter"
        : "Contact",
    perHour:
      language === "fr"
        ? "/heure"
        : "/hour",
    years:
      language === "fr"
        ? "ans d'expérience"
        : "years of experience",
    resultCount: (count: number) =>
      language === "fr"
        ? `${count} résultat${count > 1 ? "s" : ""} trouvé${count > 1 ? "s" : ""}`
        : `${count} result${count > 1 ? "s" : ""} found`,
  };

  return (
    <section id="search" className="w-full py-20 bg-white">
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8">
        {/* Titre */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-pro-gray leading-tight">
              {text.title}
            </h2>
            <p className="text-gray-600 mt-2 text-sm md:text-base">
              {language === "fr"
                ? "Affinez votre recherche par métier, prix, note et trouvez l’ouvrier le plus proche de chez vous."
                : "Filter by trade, price and rating to find the closest professional."}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Search className="w-4 h-4" />
            <span>{text.resultCount(filteredWorkers.length)}</span>
          </div>
        </div>

        {/* Grille filtres + résultats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Filtres */}
          <aside className="md:col-span-1 bg-gray-50 rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 text-pro-blue" />
              <h3 className="text-base font-semibold text-pro-gray">
                {text.filters}
              </h3>
            </div>

            {/* Recherche par mot clé */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {text.job}
              </label>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={text.searchPlaceholder}
                className="text-sm"
              />
            </div>

            {/* Select métier */}
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

            {/* Prix max */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {text.priceLabel} ({formatCurrency(maxPrice, "GNF")})
              </label>
              <div className="pt-2">
                <Slider
                  defaultValue={[maxPrice]}
                  min={50000}
                  max={300000}
                  step={10000}
                  onValueChange={(v) => setMaxPrice(v[0])}
                />
              </div>
            </div>

            {/* Note minimum */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {text.ratingLabel} ({minRating.toFixed(1)})
              </label>
              <div className="flex items-center gap-2 pt-2">
                <Slider
                  defaultValue={[minRating]}
                  min={0}
                  max={5}
                  step={0.5}
                  onValueChange={(v) => setMinRating(v[0])}
                />
              </div>
            </div>

            <Button className="w-full bg-pro-blue hover:bg-blue-700 text-sm mt-2">
              {text.btnFilter}
            </Button>
          </aside>

          {/* Résultats */}
          <div className="md:col-span-2 space-y-4">
            {filteredWorkers.length === 0 && (
              <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500 text-sm">
                {text.noResults}
              </div>
            )}

            {filteredWorkers.map((w) => (
              <div
                key={w.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center gap-4"
              >
                {/* Avatar simple (initiales) */}
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-full bg-pro-blue text-white flex items-center justify-center text-lg font-semibold">
                    {w.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                </div>

                {/* Infos principales */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-pro-gray text-base md:text-lg truncate">
                      {w.name}
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-pro-blue border border-blue-100">
                      {w.tag}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs md:text-sm text-gray-600">
                    <span>{w.job}</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {w.city}
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

                {/* Prix + bouton */}
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
        </div>
      </div>
    </section>
  );
};

export default SearchSection;
