import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Search } from "lucide-react";

// -------------------
// Types & données GUI-NÉE
// -------------------

type Worker = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profession: string | null;
  description: string | null;
  region: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  hourly_rate: number | null;
  currency: string | null;
  years_experience: number | null;
  average_rating: number | null;
  rating_count: number | null;
};

type RegionKey = "Conakry" | "Kindia";

const GUINEA_LOCATIONS: Record<
  RegionKey,
  {
    label: string;
    cities: {
      key: string;
      label: string;
      communes: {
        key: string;
        label: string;
        districts: string[];
      }[];
    }[];
  }
> = {
  Conakry: {
    label: "Conakry",
    cities: [
      {
        key: "Conakry",
        label: "Conakry",
        communes: [
          {
            key: "Ratoma",
            label: "Ratoma",
            districts: [
              "Kipé",
              "Nongo",
              "Taouyah",
              "Ratoma",
              "Lambanyi",
              "Simbaya",
            ],
          },
          {
            key: "Matoto",
            label: "Matoto",
            districts: ["Gbessia", "Matoto", "Yimbaya", "Kissosso"],
          },
          {
            key: "Kaloum",
            label: "Kaloum",
            districts: ["Almamyah", "Boulbinet", "Tombo"],
          },
          {
            key: "Dixinn",
            label: "Dixinn",
            districts: ["Belle-vue", "Camayenne", "Minière"],
          },
          {
            key: "Matam",
            label: "Matam",
            districts: ["Matam", "Bonfi", "Boussoura"],
          },
        ],
      },
    ],
  },
  Kindia: {
    label: "Kindia",
    cities: [
      {
        key: "Kindia",
        label: "Kindia",
        communes: [
          {
            key: "Commune urbaine",
            label: "Commune urbaine",
            districts: ["Kolenté", "Mangoyah", "Kania"],
          },
        ],
      },
    ],
  },
};

// -------------------
// Composant principal
// -------------------

const WorkerSearchSection: React.FC = () => {
  const { language } = useLanguage();

  // Filtres
  const [searchText, setSearchText] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<RegionKey | "">("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCommune, setSelectedCommune] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [minHourlyRate, setMinHourlyRate] = useState(0);

  // Données & état de la requête
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Options dérivées des localisations
  const regionOptions = useMemo(
    () => Object.entries(GUINEA_LOCATIONS) as [RegionKey, typeof GUINEA_LOCATIONS[RegionKey]][],
    []
  );

  const cityOptions = useMemo(() => {
    if (!selectedRegion) return [];
    return GUINEA_LOCATIONS[selectedRegion].cities;
  }, [selectedRegion]);

  const communeOptions = useMemo(() => {
    if (!selectedRegion || !selectedCity) return [];
    const city = GUINEA_LOCATIONS[selectedRegion].cities.find(
      (c) => c.key === selectedCity
    );
    return city ? city.communes : [];
  }, [selectedRegion, selectedCity]);

  const districtOptions = useMemo(() => {
    if (!selectedRegion || !selectedCity || !selectedCommune) return [];
    const city = GUINEA_LOCATIONS[selectedRegion].cities.find(
      (c) => c.key === selectedCity
    );
    const commune = city?.communes.find((c) => c.key === selectedCommune);
    return commune ? commune.districts : [];
  }, [selectedRegion, selectedCity, selectedCommune]);

  // -------------------
  // Chargement des ouvriers
  // -------------------

  const fetchWorkers = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("op_ouvriers")
        .select(
          "id, first_name, last_name, profession, description, region, city, commune, district, hourly_rate, currency, years_experience, average_rating, rating_count"
        )
        .eq("status", "approved");

      if (searchText.trim()) {
        const term = `%${searchText.trim()}%`;
        query = query.or(
          `profession.ilike.${term},first_name.ilike.${term},last_name.ilike.${term}`
        );
      }

      if (selectedRegion) {
        query = query.eq("region", GUINEA_LOCATIONS[selectedRegion].label);
      }

      if (selectedCity) {
        query = query.eq("city", selectedCity);
      }

      if (selectedCommune) {
        query = query.eq("commune", selectedCommune);
      }

      if (selectedDistrict) {
        query = query.eq("district", selectedDistrict);
      }

      if (minHourlyRate > 0) {
        query = query.gte("hourly_rate", minHourlyRate);
      }

      const { data, error: qError } = await query.order("created_at", {
        ascending: false,
      });

      if (qError) throw qError;

      setWorkers((data || []) as Worker[]);
    } catch (err: any) {
      console.error(err);
      setError(
        language === "fr"
          ? "Impossible de charger les ouvriers. Veuillez réessayer."
          : "Unable to load workers. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Chargement initial
  useEffect(() => {
    fetchWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Réinitialiser ville/commune/quartier quand on change de niveau
  const handleRegionChange = (value: string) => {
    setSelectedRegion(value as RegionKey);
    setSelectedCity("");
    setSelectedCommune("");
    setSelectedDistrict("");
  };

  const handleCityChange = (value: string) => {
    setSelectedCity(value);
    setSelectedCommune("");
    setSelectedDistrict("");
  };

  const handleCommuneChange = (value: string) => {
    setSelectedCommune(value);
    setSelectedDistrict("");
  };

  // -------------------
  // Rendu
  // -------------------

  const t = (fr: string, en: string) => (language === "fr" ? fr : en);

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-pro-gray mb-6 text-center">
          {t("Trouvez votre professionnel", "Find your professional")}
        </h2>

        <div className="grid md:grid-cols-[320px,1fr] gap-8">
          {/* Colonne Filtres */}
          <aside className="bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-200">
            <h3 className="font-semibold text-pro-gray mb-4 flex items-center gap-2">
              {t("Filtres", "Filters")}
            </h3>

            {/* Recherche métier / nom */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t("Métier ou nom", "Trade or name")}
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue"
                  placeholder={t(
                    "Rechercher un métier ou un ouvrier...",
                    "Search a trade or worker..."
                  )}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
              </div>
            </div>

            {/* Région */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t("Région", "Region")}
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue"
                value={selectedRegion}
                onChange={(e) => handleRegionChange(e.target.value)}
              >
                <option value="">
                  {t("Toutes les régions", "All regions")}
                </option>
                {regionOptions.map(([key, reg]) => (
                  <option key={key} value={key}>
                    {reg.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Ville */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t("Ville", "City")}
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue"
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                disabled={!selectedRegion}
              >
                <option value="">
                  {t("Toutes les villes", "All cities")}
                </option>
                {cityOptions.map((city) => (
                  <option key={city.key} value={city.key}>
                    {city.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Commune */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t("Commune", "Commune")}
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue"
                value={selectedCommune}
                onChange={(e) => handleCommuneChange(e.target.value)}
                disabled={!selectedCity}
              >
                <option value="">
                  {t("Toutes les communes", "All communes")}
                </option>
                {communeOptions.map((com) => (
                  <option key={com.key} value={com.key}>
                    {com.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quartier */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t("Quartier", "District")}
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={!selectedCommune}
              >
                <option value="">
                  {t("Tous les quartiers", "All districts")}
                </option>
                {districtOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Prix minimum */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t("Tarif minimum (GNF / heure)", "Min rate (GNF / hour)")}
              </label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue"
                value={minHourlyRate}
                onChange={(e) => setMinHourlyRate(Number(e.target.value) || 0)}
              />
            </div>

            {/* Bouton appliquer */}
            <button
              type="button"
              onClick={fetchWorkers}
              className="w-full mt-2 inline-flex items-center justify-center rounded-lg bg-pro-blue text-white text-sm font-medium py-2.5 hover:bg-blue-700 transition-colors"
              disabled={loading}
            >
              {loading
                ? t("Recherche en cours...", "Searching...")
                : t("Appliquer les filtres", "Apply filters")}
            </button>
          </aside>

          {/* Colonne Résultats */}
          <div>
            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {workers.length === 0 && !loading && (
              <p className="text-gray-500 text-sm">
                {t(
                  "Aucun ouvrier ne correspond à vos critères pour le moment.",
                  "No worker matches your criteria yet."
                )}
              </p>
            )}

            {loading && (
              <p className="text-gray-500 text-sm">
                {t("Chargement des résultats...", "Loading results...")}
              </p>
            )}

            <div className="space-y-4">
              {workers.map((w) => (
                <div
                  key={w.id}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar simple (initiales) */}
                    <div className="w-10 h-10 rounded-full bg-pro-blue/10 flex items-center justify-center text-pro-blue font-semibold">
                      {`${(w.first_name || "").charAt(0)}${(
                        w.last_name || ""
                      ).charAt(0)}`}
                    </div>

                    <div>
                      <div className="font-semibold text-pro-gray">
                        {w.first_name} {w.last_name}
                      </div>
                      <div className="text-xs text-gray-500 mb-1">
                        {w.profession} ·{" "}
                        {[w.region, w.city, w.commune, w.district]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      <div className="text-xs text-gray-600 line-clamp-2 max-w-xl">
                        {w.description}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {w.years_experience != null &&
                          t(
                            `${w.years_experience} ans d'expérience`,
                            `${w.years_experience} years of experience`
                          )}
                        {w.average_rating != null &&
                          ` · ⭐ ${w.average_rating?.toFixed(1)} (${
                            w.rating_count || 0
                          })`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    {w.hourly_rate != null && (
                      <div className="text-pro-blue font-semibold text-sm">
                        {w.hourly_rate.toLocaleString("fr-FR")}{" "}
                        {w.currency || "GNF"}/
                        {t("h", "h")}
                      </div>
                    )}
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center justify-center rounded-full border border-pro-blue text-pro-blue text-xs font-medium px-4 py-1 hover:bg-pro-blue hover:text-white transition-colors"
                    >
                      {t("Contacter", "Contact")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkerSearchSection;
