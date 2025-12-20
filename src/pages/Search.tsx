import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { LocateFixed, Search, MapPin, Star, Phone } from "lucide-react";

type NearbyWorker = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profession: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  average_rating: number | null;
  rating_count: number | null;
  hourly_rate: number | null;
  currency: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_km: number | null;
};

const SearchPage: React.FC = () => {
  const { language } = useLanguage();

  const t = useMemo(() => {
    const fr = language === "fr";
    return {
      heroTitle: fr ? "Trouvez le bon ouvrier pour vos travaux" : "Find the right worker for your job",
      heroSubtitle: fr
        ? "Connectez-vous avec des professionnels qualifiés près de chez vous"
        : "Connect with qualified professionals near you",
      profession: fr ? "Métier" : "Profession",
      professionPlaceholder: fr ? "Ex: Plombier" : "e.g. Plumber",
      useMyLocation: fr ? "Utiliser ma position" : "Use my location",
      radius: fr ? "Rayon" : "Radius",
      km: "km",
      search: fr ? "Rechercher" : "Search",
      locating: fr ? "Localisation..." : "Locating...",
      loading: fr ? "Chargement..." : "Loading...",
      noResults: fr ? "Aucun ouvrier trouvé dans ce rayon." : "No workers found in this radius.",
      needLocation: fr ? "Cliquez sur “Utiliser ma position” pour afficher les ouvriers autour." : "Click “Use my location” to see nearby workers.",
      locationDenied: fr
        ? "Accès à la localisation refusé. Autorisez la localisation dans votre navigateur."
        : "Location access denied. Allow it in your browser.",
      geoNotSupported: fr ? "Géolocalisation non supportée." : "Geolocation not supported.",
      distance: fr ? "Distance" : "Distance",
      viewProfile: fr ? "Voir le profil" : "View profile",
      call: fr ? "Appeler" : "Call",
    };
  }, [language]);

  const [profession, setProfession] = useState<string>("");

  const [radiusKm, setRadiusKm] = useState<number>(10);

  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [results, setResults] = useState<NearbyWorker[]>([]);

  const canSearch = userLat != null && userLng != null;

  const getMyLocation = () => {
    setError(null);

    if (!("geolocation" in navigator)) {
      setError(t.geoNotSupported);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLocating(false);
      },
      (e) => {
        setLocating(false);
        if (e.code === 1) setError(t.locationDenied);
        else setError("Impossible d'obtenir votre position.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const runSearch = async () => {
    if (!canSearch) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcErr } = await supabase.rpc("op_search_workers_nearby", {
        p_profession: profession?.trim() || null,
        p_user_lat: userLat,
        p_user_lng: userLng,
        p_radius_km: radiusKm,
        p_limit: 100,
      });

      if (rpcErr) throw rpcErr;

      setResults((data || []) as NearbyWorker[]);
    } catch (e: any) {
      console.error("runSearch error", e);
      setError(e?.message || "Erreur lors de la recherche.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Option : relancer automatiquement quand le rayon change (si localisation disponible)
  useEffect(() => {
    if (!canSearch) return;
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusKm]);

  const fullName = (w: NearbyWorker) => {
    const n = `${w.first_name || ""} ${w.last_name || ""}`.trim();
    return n || (language === "fr" ? "Ouvrier" : "Worker");
  };

  const placeLabel = (w: NearbyWorker) => {
    return [w.city, w.commune, w.district].filter(Boolean).join(" • ");
  };

  const ratingLabel = (w: NearbyWorker) => {
    if (w.average_rating == null) return "—";
    return `${Number(w.average_rating).toFixed(1)}${w.rating_count ? ` (${w.rating_count})` : ""}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pro-blue via-pro-blue to-white">
      <div className="max-w-5xl mx-auto px-4 py-14 md:py-20">
        <h1 className="text-white text-3xl md:text-5xl font-extrabold text-center leading-tight">
          {t.heroTitle}
        </h1>
        <p className="text-white/90 text-center mt-4 text-base md:text-lg">
          {t.heroSubtitle}
        </p>

        <div className="mt-10">
          <Card className="mx-auto max-w-3xl p-4 md:p-5 rounded-2xl bg-white shadow-lg border-slate-100">
            <div className="grid gap-3 md:grid-cols-[1.1fr,0.9fr,0.9fr] items-stretch">
              <div>
                <div className="text-xs font-medium text-slate-600 mb-1">{t.profession}</div>
                <Input
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder={t.professionPlaceholder}
                />
              </div>

              <div className="flex flex-col">
                <div className="text-xs font-medium text-slate-600 mb-1">
                  {t.radius}: {radiusKm} {t.km}
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-[11px] text-slate-500 mt-1">1–50 km</div>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={getMyLocation}
                  disabled={locating}
                  className="rounded-full w-full"
                >
                  <LocateFixed className="w-4 h-4 mr-2" />
                  {locating ? t.locating : t.useMyLocation}
                </Button>
              </div>
            </div>

            <div className="mt-3">
              <Button
                type="button"
                onClick={runSearch}
                disabled={!canSearch || loading}
                className="w-full bg-pro-blue hover:bg-pro-blue/90 rounded-xl"
              >
                <Search className="w-4 h-4 mr-2" />
                {loading ? t.loading : t.search}
              </Button>
            </div>

            {error && (
              <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {!canSearch && !error && (
              <div className="mt-3 text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                {t.needLocation}
              </div>
            )}
          </Card>
        </div>

        {/* Résultats */}
        <div className="mt-10 max-w-5xl mx-auto">
          <div className="grid gap-4 md:grid-cols-2">
            {!loading && canSearch && results.length === 0 && (
              <Card className="md:col-span-2 p-5 rounded-2xl bg-white border border-slate-100">
                <div className="text-sm text-slate-700">{t.noResults}</div>
              </Card>
            )}

            {results.map((w) => (
              <Card key={w.id} className="p-5 rounded-2xl bg-white border border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-slate-900 truncate">{fullName(w)}</div>
                    <div className="text-sm text-slate-600">{w.profession || "—"}</div>

                    <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{placeLabel(w) || "—"}</span>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Star className="w-4 h-4 text-orange-500" />
                        {ratingLabel(w)}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        {t.distance}:{" "}
                        <span className="font-semibold text-slate-900">
                          {w.distance_km != null ? `${Number(w.distance_km).toFixed(1)} km` : "—"}
                        </span>
                      </span>
                    </div>

                    {w.hourly_rate != null && (
                      <div className="mt-2 text-xs text-slate-600">
                        Tarif: <span className="font-semibold">{Number(w.hourly_rate).toLocaleString()}</span>{" "}
                        {w.currency || ""}/h
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col gap-2">
                    <Button
                      type="button"
                      className="rounded-full"
                      onClick={() => (window.location.href = `/worker/${w.id}`)}
                    >
                      {t.viewProfile}
                    </Button>

                    {w.phone && (
                      <Button asChild variant="outline" className="rounded-full">
                        <a href={`tel:${w.phone}`}>
                          <Phone className="w-4 h-4 mr-2" />
                          {t.call}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;
