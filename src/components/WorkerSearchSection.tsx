import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Phone } from "lucide-react";

type Worker = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profession: string | null;
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

// ⚙️ Données de localisation simplifiées pour la Guinée
// (tu pourras compléter / étendre tranquillement par la suite)
const GUINEA_LOCATIONS = {
  Conakry: {
    cities: {
      Conakry: {
        communes: {
          Ratoma: ["Kipé", "Taouyah", "Lambanyi", "Nongo"],
          Matoto: ["Gbessia", "Yimbaya", "Sangoyah"],
          Dixinn: ["Bellevue", "Coleah", "Camayenne"],
          Kaloum: ["Sandervalia", "Boulbinet"],
        },
      },
    },
  },
  Kindia: {
    cities: {
      Kindia: {
        communes: {
          "Commune urbaine": ["Kolenté", "Damakania"],
        },
      },
    },
  },
  Boké: {
    cities: {
      Boké: {
        communes: {
          "Commune urbaine": ["Koumbia", "Tanènè"],
        },
      },
    },
  },
};

const DEFAULT_COUNTRY = "Guinée";

const WorkerSearchSection: React.FC = () => {
  const { language } = useLanguage();

  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🧠 Filtres
  const [searchText, setSearchText] = useState("");
  const [country] = useState<string>(DEFAULT_COUNTRY);
  const [region, setRegion] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [commune, setCommune] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [maxHourlyRate, setMaxHourlyRate] = useState<number>(0); // 0 = pas de limite
  const [minRating, setMinRating] = useState<number>(0); // 0 = toutes les notes

  // 🔁 Lorsque région change → reset ville/commune/quartier
  useEffect(() => {
    setCity("");
    setCommune("");
    setDistrict("");
  }, [region]);

  useEffect(() => {
    setCommune("");
    setDistrict("");
  }, [city]);

  useEffect(() => {
    setDistrict("");
  }, [commune]);

  // 📥 Chargement initial des ouvriers
  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: supaError } = await supabase
          .from("op_ouvriers")
          .select(
            `
            id,
            first_name,
            last_name,
            profession,
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
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(100);

        if (supaError) {
          throw supaError;
        }

        setWorkers((data as Worker[]) || []);
      } catch (err: any) {
        console.error(err);
        setError(
          language === "fr"
            ? "Impossible de charger les professionnels pour le moment."
            : "Unable to load workers at the moment."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, [language]);

  // 📊 Options calculées à partir des données de localisation
  const regionOptions = useMemo(
    () => Object.keys(GUINEA_LOCATIONS),
    []
  );

  const cityOptions = useMemo(() => {
    if (!region || !GUINEA_LOCATIONS[region as keyof typeof GUINEA_LOCATIONS]) {
      return [];
    }
    return Object.keys(
      GUINEA_LOCATIONS[region as keyof typeof GUINEA_LOCATIONS].cities
    );
  }, [region]);

  const communeOptions = useMemo(() => {
    if (!region || !city) return [];
    const regionData = GUINEA_LOCATIONS[region as keyof typeof GUINEA_LOCATIONS];
    if (!regionData) return [];
    const cityData = regionData.cities[city as keyof typeof regionData.cities];
    if (!cityData) return [];
    return Object.keys(cityData.communes);
  }, [region, city]);

  const districtOptions = useMemo(() => {
    if (!region || !city || !commune) return [];
    const regionData = GUINEA_LOCATIONS[region as keyof typeof GUINEA_LOCATIONS];
    if (!regionData) return [];
    const cityData = regionData.cities[city as keyof typeof regionData.cities];
    if (!cityData) return [];
    const districts =
      cityData.communes[commune as keyof typeof cityData.communes];
    return districts || [];
  }, [region, city, commune]);

  // 🧮 Application des filtres côté front
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      // Texte : métier + nom/prénom
      if (searchText.trim()) {
        const txt = searchText.toLowerCase();
        const fullName = `${w.first_name || ""} ${w.last_name || ""}`.toLowerCase();
        const job = (w.profession || "").toLowerCase();
        if (!fullName.includes(txt) && !job.includes(txt)) {
          return false;
        }
      }

      // Pays (pour l'instant on ne filtre pas sur la colonne country)
      if (country === DEFAULT_COUNTRY) {
        // rien de spécial, mais plus tard on pourra vérifier w.country
      }

      if (region && (w.region || "") !== region) return false;
      if (city && (w.city || "") !== city) return false;
      if (commune && (w.commune || "") !== commune) return false;
      if (district && (w.district || "") !== district) return false;

      if (maxHourlyRate > 0 && w.hourly_rate != null) {
        if (w.hourly_rate > maxHourlyRate) return false;
      }

      if (minRating > 0 && w.average_rating != null) {
        if (w.average_rating < minRating) return false;
      }

      return true;
    });
  }, [
    workers,
    searchText,
    country,
    region,
    city,
    commune,
    district,
    maxHourlyRate,
    minRating,
  ]);

  const formatPrice = (worker: Worker) => {
    if (!worker.hourly_rate) return language === "fr" ? "Tarif non renseigné" : "Rate not set";

    // Pour la Guinée : GNF, sinon on affiche brut
    if (worker.currency === "GNF") {
      // On affiche en milliers pour que ça reste lisible
      const value = Math.round(worker.hourly_rate / 1000) * 1000;
      return `${value.toLocaleString("fr-FR")} GNF / h`;
    }

    return `${worker.hourly_rate} ${worker.currency || ""} / h`;
  };

  const formatLocation = (worker: Worker) => {
    const parts = [
      worker.district,
      worker.commune,
      worker.city,
      worker.region,
    ].filter(Boolean);
    return parts.join(" • ");
  };

  return (
    <section className="py-16 bg-white border-t border-gray-100">
      <div className="container mx-auto px-4">
        {/* Titre */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-pro-gray mb-2">
            {language === "fr"
              ? "Trouvez votre professionnel"
              : "Find your professional"}
          </h2>
          <p className="text-gray-600">
            {language === "fr"
              ? "Filtrez par métier, zone géographique et tarif pour trouver l’ouvrier le plus proche."
              : "Filter by trade, area and rate to find the best nearby worker."}
          </p>
        </div>

        <div className="grid md:grid-cols-[320px,1fr] gap-8 items-start">
          {/* 🧰 Filtres */}
          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-4 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-pro-gray mb-3 flex items-center gap-2">
                  {language === "fr" ? "Filtres" : "Filters"}
                </h3>

                {/* Recherche métier / nom */}
                <div className="space-y-1 mb-4">
                  <label className="text-xs font-medium text-gray-600">
                    {language === "fr"
                      ? "Métier ou nom"
                      : "Trade or name"}
                  </label>
                  <Input
                    placeholder={
                      language === "fr"
                        ? "Plombier, électricien, Mamadou..."
                        : "Plumber, electrician, Mamadou..."
                    }
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>

                {/* Région */}
                <div className="space-y-1 mb-3">
                  <label className="text-xs font-medium text-gray-600">
                    {language === "fr" ? "Région" : "Region"}
                  </label>
                  <select
                    className="w-full border rounded-md px-2 py-2 text-sm"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                  >
                    <option value="">
                      {language === "fr"
                        ? "Toutes les régions"
                        : "All regions"}
                    </option>
                    {regionOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ville */}
                <div className="space-y-1 mb-3">
                  <label className="text-xs font-medium text-gray-600">
                    {language === "fr" ? "Ville" : "City"}
                  </label>
                  <select
                    className="w-full border rounded-md px-2 py-2 text-sm"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!region}
                  >
                    <option value="">
                      {language === "fr"
                        ? "Toutes les villes"
                        : "All cities"}
                    </option>
                    {cityOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Commune */}
                <div className="space-y-1 mb-3">
                  <label className="text-xs font-medium text-gray-600">
                    {language === "fr" ? "Commune" : "Commune"}
                  </label>
                  <select
                    className="w-full border rounded-md px-2 py-2 text-sm"
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    disabled={!city}
                  >
                    <option value="">
                      {language === "fr"
                        ? "Toutes les communes"
                        : "All communes"}
                    </option>
                    {communeOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quartier */}
                <div className="space-y-1 mb-3">
                  <label className="text-xs font-medium text-gray-600">
                    {language === "fr" ? "Quartier" : "District"}
                  </label>
                  <select
                    className="w-full border rounded-md px-2 py-2 text-sm"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    disabled={!commune}
                  >
                    <option value="">
                      {language === "fr"
                        ? "Tous les quartiers"
                        : "All districts"}
                    </option>
                    {districtOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prix max */}
                <div className="space-y-1 mb-3">
                  <label className="text-xs font-medium text-gray-600 flex justify-between">
                    <span>
                      {language === "fr"
                        ? "Tarif horaire max"
                        : "Max hourly rate"}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {maxHourlyRate === 0
                        ? language === "fr"
                          ? "Aucune limite"
                          : "No limit"
                        : `${maxHourlyRate.toLocaleString("fr-FR")} GNF`}
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={500000}
                    step={25000}
                    value={maxHourlyRate}
                    onChange={(e) => setMaxHourlyRate(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Note minimum */}
                <div className="space-y-1 mb-3">
                  <label className="text-xs font-medium text-gray-600 flex justify-between">
                    <span>
                      {language === "fr"
                        ? "Note minimum"
                        : "Minimum rating"}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {minRating === 0
                        ? language === "fr"
                          ? "Toutes"
                          : "Any"
                        : `${minRating}+ ★`}
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={0.5}
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Bouton reset */}
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => {
                    setSearchText("");
                    setRegion("");
                    setCity("");
                    setCommune("");
                    setDistrict("");
                    setMaxHourlyRate(0);
                    setMinRating(0);
                  }}
                >
                  {language === "fr" ? "Réinitialiser les filtres" : "Reset filters"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 👷‍♂️ Liste des ouvriers */}
          <div className="space-y-4">
            {loading && (
              <div className="text-gray-500 text-sm">
                {language === "fr"
                  ? "Chargement des professionnels..."
                  : "Loading workers..."}
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            {!loading && !error && filteredWorkers.length === 0 && (
              <div className="text-gray-500 text-sm">
                {language === "fr"
                  ? "Aucun professionnel trouvé avec ces critères. Essayez d’élargir votre recherche."
                  : "No worker found with these filters. Try broadening your search."}
              </div>
            )}

            {!loading &&
              !error &&
              filteredWorkers.map((w) => (
                <Card
                  key={w.id}
                  className="shadow-sm border-gray-200 hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-full bg-pro-blue/10 flex items-center justify-center font-semibold text-pro-blue">
                          {((w.first_name || "?")[0] ?? "").toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-pro-gray">
                            {w.first_name} {w.last_name}
                          </div>
                          <div className="text-sm text-blue-600 font-medium">
                            {w.profession}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {formatLocation(w) || (language === "fr" ? "Localisation non précisée" : "Location not set")}
                        </span>

                        {w.years_experience != null && (
                          <span>
                            {w.years_experience}{" "}
                            {language === "fr" ? "ans d'expérience" : "years experience"}
                          </span>
                        )}

                        {w.average_rating != null && (
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400" />
                            {w.average_rating.toFixed(1)}{" "}
                            <span className="text-gray-400">
                              ({w.rating_count || 0})
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-sm font-semibold text-pro-blue">
                        {formatPrice(w)}
                      </div>
                      <Button className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {language === "fr" ? "Contacter" : "Contact"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkerSearchSection;
