import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Star, MapPin, Search } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Arborescence des localisations pour la Guinée
 * (tu pourras compléter / ajuster au besoin).
 */
const GUINEA_LOCATION_TREE: {
  [region: string]: {
    [city: string]: {
      [commune: string]: string[]; // quartiers
    };
  };
} = {
  Conakry: {
    Conakry: {
      "Dixinn": ["Bellevue", "Minière", "Taouyah", "Dixinn centre"],
      "Kaloum": ["Boulbinet", "Sandervalia", "Tombo", "Almamya"],
      "Matam": ["Bonfi", "Carrière", "Madina", "Matam centre"],
      "Matoto": ["Enco 5", "Yimbaya", "Kissosso", "Matoto centre"],
      "Ratoma": ["Nongo", "Taouyah", "Lambanyi", "Kaporo", "Sonfonia"],
    },
  },
  Kindia: {
    Kindia: {
      "Kindia centre": ["Cité", "Manquepas", "Abattoir"],
    },
  },
  "Mamou": {
    Mamou: {
      "Mamou centre": ["Poudrière", "Petel", "Konkouré"],
    },
  },
  "Labé": {
    Labe: {
      "Labé centre": ["Kouroula", "Dow-Saaré", "Tata"],
    },
  },
  "Boké": {
    Boke: {
      "Boké centre": ["Yomboya", "Kakoui", "Dibia"],
    },
  },
  "Kankan": {
    Kankan: {
      "Kankan centre": ["Missidé", "Kabada", "Banankoroda"],
    },
  },
  "Faranah": {
    Faranah: {
      "Faranah centre": ["Mosquée", "Aviation", "Coyah"],
    },
  },
  "N’Zérékoré": {
    Nzerekore: {
      "N’Zérékoré centre": ["Dorota", "Gbanghana", "Horoya"],
    },
  },
};

type Worker = {
  id: string;
  first_name: string;
  last_name: string;
  profession: string | null;
  description: string | null;
  hourly_rate: number | null;
  currency: string | null;
  region: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  avatar_url: string | null;
};

const WorkerSearchSection: React.FC = () => {
  const { language } = useLanguage();

  const [keyword, setKeyword] = useState("");
  const [selectedProfession, setSelectedProfession] = useState("");
  const [maxPrice, setMaxPrice] = useState<number>(100);
  const [minRating, setMinRating] = useState<number>(0); // pour plus tard

  // filtres localisation
  const [country] = useState<"Guinée" | "">("Guinée"); // par défaut Guinée
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [commune, setCommune] = useState("");
  const [district, setDistrict] = useState("");

  const [results, setResults] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(false);

  // options calculées pour les selects
  const regionOptions = useMemo(
    () => Object.keys(GUINEA_LOCATION_TREE),
    []
  );

  const cityOptions = useMemo(() => {
    if (!region) return [];
    return Object.keys(GUINEA_LOCATION_TREE[region] || {});
  }, [region]);

  const communeOptions = useMemo(() => {
    if (!region || !city) return [];
    return Object.keys(GUINEA_LOCATION_TREE[region]?.[city] || {});
  }, [region, city]);

  const districtOptions = useMemo(() => {
    if (!region || !city || !commune) return [];
    return GUINEA_LOCATION_TREE[region]?.[city]?.[commune] || [];
  }, [region, city, commune]);

  // réinitialiser quand on change de niveau
  const handleRegionChange = (value: string) => {
    setRegion(value);
    setCity("");
    setCommune("");
    setDistrict("");
  };

  const handleCityChange = (value: string) => {
    setCity(value);
    setCommune("");
    setDistrict("");
  };

  const handleCommuneChange = (value: string) => {
    setCommune(value);
    setDistrict("");
  };

  // requête Supabase
  const fetchWorkers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("op_ouvriers")
        .select(
          "id, first_name, last_name, profession, description, hourly_rate, currency, region, city, commune, district, avatar_url"
        )
        .eq("status", "approved");

      if (keyword.trim()) {
        query = query.ilike("profession", `%${keyword.trim()}%`);
      }

      if (selectedProfession) {
        query = query.eq("profession", selectedProfession);
      }

      if (maxPrice > 0) {
        query = query.lte("hourly_rate", maxPrice);
      }

      // filtres localisation
      if (country === "Guinée") {
        if (region) query = query.eq("region", region);
        if (city) query = query.eq("city", city);
        if (commune) query = query.eq("commune", commune);
        if (district) query = query.eq("district", district);
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;
      setResults((data || []) as Worker[]);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // première recherche au chargement
  useEffect(() => {
    fetchWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tTxt = (fr: string, en: string) => (language === "fr" ? fr : en);

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 grid md:grid-cols-[320px,1fr] gap-10">
        {/* FILTRES */}
        <aside className="bg-gray-50 border border-gray-200 rounded-xl p-5 h-fit">
          <h2 className="text-lg font-semibold text-pro-gray mb-4 flex items-center gap-2">
            <Search className="w-4 h-4" />
            {tTxt("Filtres", "Filters")}
          </h2>

          {/* Recherche métier texte */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tTxt("Métier", "Trade")}
            </label>
            <Input
              placeholder={tTxt("Rechercher…", "Search…")}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>

          {/* Sélecteur métier simple (optionnel : à alimenter) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tTxt("Métier (liste)", "Trade (list)")}
            </label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={selectedProfession}
              onChange={(e) => setSelectedProfession(e.target.value)}
            >
              <option value="">{tTxt("Tous les métiers", "All trades")}</option>
              <option value="Plombier">Plombier</option>
              <option value="Électricien">Électricien</option>
              <option value="Maçon">Maçon</option>
              <option value="Menuisier">Menuisier</option>
              <option value="Peintre">Peintre</option>
            </select>
          </div>

          {/* Prix horaire */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tTxt("Prix par heure", "Hourly rate")} (0 – {maxPrice}€)
            </label>
            <Slider
              defaultValue={[maxPrice]}
              min={0}
              max={100}
              step={5}
              onValueChange={(values) => setMaxPrice(values[0] ?? 100)}
            />
          </div>

          {/* Localisation – Pays (locked Guinée) */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tTxt("Pays", "Country")}
            </label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-gray-100 cursor-not-allowed"
              value={country}
              disabled
            >
              <option value="Guinée">Guinée</option>
            </select>
          </div>

          {/* Région */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tTxt("Région", "Region")}
            </label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={region}
              onChange={(e) => handleRegionChange(e.target.value)}
            >
              <option value="">{tTxt("Toutes les régions", "All regions")}</option>
              {regionOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Ville */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tTxt("Ville", "City")}
            </label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={city}
              onChange={(e) => handleCityChange(e.target.value)}
              disabled={!region}
            >
              <option value="">
                {region
                  ? tTxt("Toutes les villes", "All cities")
                  : tTxt("Choisissez une région", "Choose a region")}
              </option>
              {cityOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Commune */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tTxt("Commune", "Commune")}
            </label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={commune}
              onChange={(e) => handleCommuneChange(e.target.value)}
              disabled={!city}
            >
              <option value="">
                {city
                  ? tTxt("Toutes les communes", "All communes")
                  : tTxt("Choisissez une ville", "Choose a city")}
              </option>
              {communeOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Quartier */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tTxt("Quartier", "District / neighborhood")}
            </label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              disabled={!commune}
            >
              <option value="">
                {commune
                  ? tTxt("Tous les quartiers", "All districts")
                  : tTxt("Choisissez une commune", "Choose a commune")}
              </option>
              {districtOptions.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>

          {/* Bouton appliquer */}
          <Button
            className="w-full mt-2"
            onClick={fetchWorkers}
            disabled={loading}
          >
            {loading
              ? tTxt("Recherche en cours…", "Searching…")
              : tTxt("Appliquer les filtres", "Apply filters")}
          </Button>
        </aside>

        {/* LISTE DES RÉSULTATS */}
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-pro-gray mb-4">
            {tTxt("Trouvez votre professionnel", "Find your professional")}
          </h2>

          <p className="text-sm text-gray-500 mb-4">
            {results.length}{" "}
            {tTxt("résultat(s) trouvé(s)", "result(s) found")}
          </p>

          <div className="space-y-3">
            {results.map((w) => (
              <Link key={w.id} to={`/ouvrier/${w.id}`} className="block">
                <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4 flex gap-4 items-center">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-pro-blue/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {w.avatar_url ? (
                        <img
                          src={w.avatar_url}
                          alt={`${w.first_name} ${w.last_name}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-pro-blue font-semibold text-lg">
                          {w.first_name?.[0]}
                          {w.last_name?.[0]}
                        </span>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-wrap justify-between gap-2">
                        <div>
                          <div className="font-semibold text-pro-gray">
                            {w.first_name} {w.last_name}
                          </div>
                          {w.profession && (
                            <div className="text-sm text-pro-blue font-medium">
                              {w.profession}
                            </div>
                          )}
                          <div className="mt-1 text-xs text-gray-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {[w.district, w.commune, w.city]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        </div>

                        <div className="text-right">
                          {w.hourly_rate && w.currency && (
                            <div className="text-pro-blue font-bold">
                              {w.hourly_rate.toLocaleString("fr-FR")}{" "}
                              {w.currency}/h
                            </div>
                          )}
                          <div className="text-xs text-gray-500 flex items-center justify-end mt-1">
                            <Star className="w-3 h-3 text-yellow-400 mr-1" />
                            {/* placeholder note pour plus tard */}
                            4.8
                          </div>
                        </div>
                      </div>

                      {w.description && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {w.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {!loading && results.length === 0 && (
              <p className="text-sm text-gray-500">
                {tTxt(
                  "Aucun ouvrier ne correspond à ces critères pour le moment.",
                  "No worker matches these filters yet."
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkerSearchSection;
