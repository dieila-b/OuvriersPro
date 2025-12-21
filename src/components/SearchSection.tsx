// src/components/SearchSection.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkerSearch } from "@/hooks/useWorkerSearch";
import { useGeolocation } from "@/hooks/useGeolocation";
import { calculateDistance, formatDistance } from "@/lib/geoUtils";
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
  Loader2,
  Navigation,
  RotateCcw,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

const DEFAULT_MAX_PRICE = 300000;
const DEFAULT_RADIUS_KM = 10;

const SearchSection: React.FC = () => {
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const { workers, loading, error, search } = useWorkerSearch();

  // URL params
  const urlService =
    searchParams.get("service") ?? searchParams.get("keyword") ?? "";
  const urlDistrict =
    searchParams.get("quartier") ?? searchParams.get("district") ?? "";

  // UI filters
  const [keyword, setKeyword] = useState<string>(urlService);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(urlDistrict);
  const [maxPrice, setMaxPrice] = useState<number>(DEFAULT_MAX_PRICE);
  const [minRating, setMinRating] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Geolocation (clean UX)
  const {
    latitude,
    longitude,
    error: geoError,
    loading: geoLoading,
    getLocation,
    clearLocation,
    hasLocation,
  } = useGeolocation();

  const [useMyPosition, setUseMyPosition] = useState<boolean>(false);
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_RADIUS_KM);

  const hasMyCoords = hasLocation && latitude != null && longitude != null;

  // Sync local states from URL (only keyword/district)
  useEffect(() => {
    const service =
      searchParams.get("service") ?? searchParams.get("keyword") ?? "";
    const district =
      searchParams.get("quartier") ?? searchParams.get("district") ?? "";
    setKeyword(service);
    setSelectedDistrict(district);
  }, [searchParams]);

  // Fetch workers when URL changes (service/district)
  useEffect(() => {
    const service =
      searchParams.get("service") ?? searchParams.get("keyword") ?? "";
    const district =
      searchParams.get("quartier") ?? searchParams.get("district") ?? "";
    search(service, district, language);
  }, [language, searchParams, search]);

  // District options from loaded workers
  const districts = useMemo(
    () =>
      Array.from(
        new Set(
          (workers ?? [])
            .map((w: any) => w.district)
            .filter((d: string) => d && d.trim().length > 0)
        )
      ),
    [workers]
  );

  // Trigger search ONLY on button click
  const handleSearchClick = () => {
    const params: Record<string, string> = {};
    if (keyword.trim()) params.service = keyword.trim();
    if (selectedDistrict.trim()) params.quartier = selectedDistrict.trim();

    // keep near params only if coords exist
    if (useMyPosition && hasMyCoords) {
      params.near = "1";
      if (radiusKm !== DEFAULT_RADIUS_KM) params.radiusKm = String(radiusKm);
      params.lat = String(latitude);
      params.lng = String(longitude);
    }

    setSearchParams(params, { replace: false });

    // scroll to results after state/url update
    window.setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    }, 120);
  };

  const requestMyPosition = () => {
    // Important: we only enable the "near me" mode if coords are obtained
    setUseMyPosition(false);
    clearLocation();

    getLocation();
    // We will show radius only if hasMyCoords becomes true
    // If user refuses, geoError will show, and no radius will appear.
  };

  // When coords appear, enable near mode automatically
  useEffect(() => {
    if (hasMyCoords) {
      setUseMyPosition(true);
    }
  }, [hasMyCoords]);

  const resetFilters = () => {
    setKeyword("");
    setSelectedDistrict("");
    setMaxPrice(DEFAULT_MAX_PRICE);
    setMinRating(0);
    setViewMode("list");

    setUseMyPosition(false);
    setRadiusKm(DEFAULT_RADIUS_KM);
    clearLocation();

    setSearchParams({}, { replace: false });
  };

  // Add distance on client side
  const workersWithDistance = useMemo(() => {
    if (!useMyPosition || !hasMyCoords) {
      return (workers ?? []).map((w: any) => ({ ...w, distance: null }));
    }

    return (workers ?? []).map((w: any) => {
      if (w.lat && w.lng) {
        const distance = calculateDistance(latitude, longitude, w.lat, w.lng);
        return { ...w, distance };
      }
      return { ...w, distance: null };
    });
  }, [workers, useMyPosition, hasMyCoords, latitude, longitude]);

  // Filter client-side: price, rating, and radius (only if coords exist)
  const filteredWorkers = useMemo(() => {
    let filtered = workersWithDistance.filter((w: any) => {
      const matchPrice = (w.hourlyRate ?? 0) <= maxPrice;
      const matchRating = (w.rating ?? 0) >= minRating;

      if (useMyPosition && hasMyCoords) {
        if (w.distance === null) return false;
        return matchPrice && matchRating && w.distance <= radiusKm;
      }

      return matchPrice && matchRating;
    });

    // Sort by distance only if active + coords
    if (useMyPosition && hasMyCoords) {
      filtered = filtered.sort((a: any, b: any) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    return filtered;
  }, [workersWithDistance, maxPrice, minRating, useMyPosition, hasMyCoords, radiusKm]);

  const formatCurrency = (value: number, currency: string) => {
    if (currency === "GNF") return `${value.toLocaleString("fr-FR")} GNF`;
    return `${value} ${currency}`;
  };

  const text = {
    title: language === "fr" ? "Trouvez votre professionnel" : "Find your professional",
    subtitle:
      language === "fr"
        ? "Filtrez par métier, quartier et tarif pour trouver l'ouvrier le plus proche."
        : "Filter by trade, district and rate to find the closest professional.",
    filters: language === "fr" ? "Filtres" : "Filters",
    keywordLabel: language === "fr" ? "Métier ou nom" : "Trade or name",
    searchPlaceholder:
      language === "fr"
        ? "Plombier, électricien, Mamadou..."
        : "Plumber, electrician, John...",
    district: language === "fr" ? "Quartier" : "District",
    allDistricts: language === "fr" ? "Tous les quartiers" : "All districts",
    priceLabel: language === "fr" ? "Tarif horaire max" : "Max hourly rate",
    ratingLabel: language === "fr" ? "Note minimum" : "Minimum rating",
    reset: language === "fr" ? "Réinitialiser" : "Reset",
    noResults:
      language === "fr"
        ? "Aucun professionnel ne correspond à ces critères pour le moment."
        : "No professional matches your criteria yet.",
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
    topSearchTitle: language === "fr" ? "Rechercher un ouvrier" : "Search a worker",
    topSearchBtn: language === "fr" ? "Rechercher" : "Search",
    useMyPos: language === "fr" ? "Utiliser ma position" : "Use my location",
    radius: language === "fr" ? "Rayon" : "Radius",
  };

  return (
    <section id="search" className="w-full py-12 sm:py-16 lg:py-20 bg-white">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* TOP SEARCH (Hero Card) */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-pro-blue" />
              <h3 className="font-semibold text-pro-gray text-sm sm:text-base">
                {text.topSearchTitle}
              </h3>
            </div>

            {/* IMPORTANT: no auto navigation / no scroll on input click */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchClick();
              }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end"
            >
              {/* Trade/keyword */}
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

              {/* District */}
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
                type="submit"
                className="lg:col-span-4 w-full bg-pro-blue hover:bg-blue-700"
              >
                {text.topSearchBtn}
              </Button>
            </form>
          </div>
        </div>

        {/* Header */}
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
                <span>{language === "fr" ? "Chargement..." : "Loading..."}</span>
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

            {/* Keyword */}
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

            {/* ✅ Use my position (clean, no extra text unless coords exist) */}
            <div className="mb-5">
              <Button
                type="button"
                size="sm"
                className="w-full bg-pro-blue hover:bg-blue-700"
                onClick={() => {
                  // Toggle OFF if already enabled
                  if (useMyPosition || hasMyCoords) {
                    setUseMyPosition(false);
                    setRadiusKm(DEFAULT_RADIUS_KM);
                    clearLocation();
                    return;
                  }
                  requestMyPosition();
                }}
                disabled={geoLoading}
              >
                {geoLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === "fr" ? "Localisation..." : "Locating..."}
                  </>
                ) : (
                  <>
                    <LocateFixed className="w-4 h-4 mr-2" />
                    {text.useMyPos}
                  </>
                )}
              </Button>

              {/* Error only (no radius) */}
              {geoError && !hasMyCoords && (
                <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {geoError}
                </div>
              )}

              {/* Radius ONLY when coords exist */}
              {useMyPosition && hasMyCoords && (
                <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
                    <span>{text.radius}</span>
                    <span className="text-[11px] text-gray-500">{radiusKm} km</span>
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
            </div>

            {/* District */}
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
                value={[maxPrice]}
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
                  {minRating === 0
                    ? language === "fr"
                      ? "Toutes"
                      : "Any"
                    : minRating.toFixed(1)}
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

            <div className="flex gap-2">
              <Button
                className="flex-1 border-gray-300 text-sm"
                variant="outline"
                type="button"
                onClick={resetFilters}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {text.reset}
              </Button>
            </div>
          </aside>

          {/* Results */}
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
            {viewMode === "list" && filteredWorkers.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                {filteredWorkers.map((w: any) => (
                  <div
                    key={w.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 rounded-full bg-pro-blue text-white flex items-center justify-center text-lg font-semibold">
                        {(w.name ?? "OP")
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((n: string) => n[0]?.toUpperCase())
                          .join("") || "OP"}
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

                        {useMyPosition && hasMyCoords && w.distance != null && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-50 text-slate-700 border border-slate-200">
                            <Navigation className="w-3 h-3" />
                            {formatDistance(w.distance, language)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs sm:text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {[w.city, w.commune, w.district].filter(Boolean).join(" • ")}
                        </span>

                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400" />
                          {(w.rating ?? 0).toFixed(1)} ({w.ratingCount ?? 0})
                        </span>

                        <span>
                          {w.experienceYears ?? 0} {text.years}
                        </span>
                      </div>
                    </div>

                    <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 text-right">
                      <div className="text-pro-blue font-bold text-base sm:text-lg">
                        {formatCurrency(w.hourlyRate ?? 0, w.currency ?? "GNF")}
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
            {viewMode === "grid" && filteredWorkers.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredWorkers.map((w: any) => (
                  <div
                    key={w.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-pro-blue text-white flex items-center justify-center text-sm font-semibold">
                        {(w.name ?? "OP")
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((n: string) => n[0]?.toUpperCase())
                          .join("") || "OP"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-pro-gray truncate">
                          {w.name}
                        </h3>
                        {w.job && (
                          <div className="text-xs text-pro-blue mt-0.5">{w.job}</div>
                        )}
                        {useMyPosition && hasMyCoords && w.distance != null && (
                          <div className="text-[11px] text-slate-600 mt-1 inline-flex items-center gap-1">
                            <Navigation className="w-3 h-3" />
                            <span className="font-semibold">
                              {formatDistance(w.distance, language)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 space-y-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[w.city, w.commune, w.district].filter(Boolean).join(" • ")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400" />
                        {(w.rating ?? 0).toFixed(1)} ({w.ratingCount ?? 0})
                      </span>
                      <span>
                        {w.experienceYears ?? 0} {text.years}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm font-bold text-pro-blue">
                        {formatCurrency(w.hourlyRate ?? 0, w.currency ?? "GNF")}
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
