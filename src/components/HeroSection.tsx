// src/components/HeroSection.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, ChevronDown, LocateFixed } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import AdSlot from "@/components/AdSlot";
import { useSiteContent } from "@/hooks/useSiteContent";

const HeroSection = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  // ✅ CMS locale
  const locale = language === "fr" ? "fr" : "en";

  // ✅ CMS: Title + Subtitle
  const cmsTitle = useSiteContent("home.hero.title", locale);
  const cmsSubtitle = useSiteContent("home.hero.subtitle", locale);

  const titleFallback =
    language === "fr"
      ? "Trouvez des prestataires fiables près de chez vous"
      : "Find trusted providers near you";

  const subtitleFallback =
    language === "fr"
      ? "Comparez, contactez, réservez en toute confiance."
      : "Compare, contact, and book with confidence.";

  const heroTitle = cmsTitle.data?.value?.trim() || titleFallback;
  const heroSubtitle = cmsSubtitle.data?.value?.trim() || subtitleFallback;

  const [searchTerm, setSearchTerm] = useState("");
  const [district, setDistrict] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  const [jobOptions, setJobOptions] = useState<string[]>([]);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const [openJobs, setOpenJobs] = useState(false);
  const [openDistricts, setOpenDistricts] = useState(false);

  const jobsBoxRef = useRef<HTMLDivElement>(null);
  const districtsBoxRef = useRef<HTMLDivElement>(null);

  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);

      const { data, error } = await supabase
        .from("op_ouvriers")
        .select("profession, district, status")
        .eq("status", "approved");

      if (!error && data) {
        const jobs = Array.from(
          new Set(
            data
              .map((w: any) => (w.profession ?? "").trim())
              .filter((v: string) => v.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b, "fr"));

        const districts = Array.from(
          new Set(
            data
              .map((w: any) => (w.district ?? "").trim())
              .filter((v: string) => v.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b, "fr"));

        setJobOptions(jobs);
        setDistrictOptions(districts);
      } else {
        console.error("Hero options error:", error);
      }

      setLoadingOptions(false);
    };

    loadOptions();
  }, []);

  const filteredJobs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (q.length < 2) return [];
    return jobOptions.filter((j) => j.toLowerCase().includes(q)).slice(0, 8);
  }, [searchTerm, jobOptions]);

  const filteredDistricts = useMemo(() => {
    const q = district.trim().toLowerCase();
    if (q.length < 2) return [];
    return districtOptions.filter((d) => d.toLowerCase().includes(q)).slice(0, 8);
  }, [district, districtOptions]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (jobsBoxRef.current && !jobsBoxRef.current.contains(e.target as Node)) {
        setOpenJobs(false);
      }
      if (districtsBoxRef.current && !districtsBoxRef.current.contains(e.target as Node)) {
        setOpenDistricts(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenJobs(false);
        setOpenDistricts(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleGeoLocate = () => {
    setGeoError(null);
    setGeoLoading(true);

    if (!("geolocation" in navigator)) {
      setGeoError(
        language === "fr"
          ? "La géolocalisation n'est pas supportée sur ce navigateur."
          : "Geolocation is not supported by this browser."
      );
      setGeoLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setOpenDistricts(false);
        setGeoLoading(false);
      },
      (err) => {
        console.error(err);
        setGeoError(
          language === "fr"
            ? "Impossible de récupérer votre position. Vérifiez les permissions."
            : "Unable to get your location. Check permissions."
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
    );
  };

  const handleSearch = () => {
    const job = searchTerm.trim();
    const qDistrict = district.trim();

    const params = new URLSearchParams();
    if (job) params.set("keyword", job);
    if (qDistrict) params.set("district", qDistrict);
    if (geo) {
      params.set("lat", String(geo.lat));
      params.set("lng", String(geo.lng));
      params.set("near", "1");
    }

    navigate({
      pathname: "/rechercher",
      search: params.toString() ? `?${params.toString()}` : "",
    });
  };

  return (
    <section className="relative w-full text-white bg-gradient-to-br from-pro-blue to-blue-600 overflow-hidden">
      {/* ✅ Contenu HERO au-dessus de la pub */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
        <div className="w-full max-w-5xl mx-auto text-center">
          {/* ✅ Title CMS + fallback (au lieu de t("home.title")) */}
          <h1 className="mx-auto text-balance text-2xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight break-words">
            {heroTitle}
          </h1>

          {/* ✅ Subtitle CMS + fallback (au lieu de t("home.subtitle")) */}
          <p className="mt-3 sm:mt-4 text-sm sm:text-base md:text-xl text-blue-100 break-words">
            {heroSubtitle}
          </p>
        </div>

        {/* ✅ BARRE RECHERCHE = pleine largeur */}
        <div className="mt-6 sm:mt-7 w-full">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="w-full bg-white rounded-2xl p-2 sm:p-3 md:p-4 shadow-xl text-gray-900 relative z-20"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 items-stretch min-w-0">
              {/* Job */}
              <div ref={jobsBoxRef} className="relative min-w-0 text-left lg:col-span-6">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t("home.search.placeholder") || "Métier / service"}
                  value={searchTerm}
                  onFocus={() => setOpenJobs(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setOpenJobs(true);
                  }}
                  className="w-full min-w-0 h-11 sm:h-12 pl-10 pr-9 text-sm sm:text-base text-gray-900"
                />
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />

                {openJobs && (filteredJobs.length > 0 || loadingOptions) && (
                  <div className="absolute z-50 mt-1 w-full min-w-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {loadingOptions && (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        {language === "fr" ? "Chargement..." : "Loading..."}
                      </div>
                    )}
                    {!loadingOptions &&
                      filteredJobs.map((j) => (
                        <button
                          key={j}
                          type="button"
                          onClick={() => {
                            setSearchTerm(j);
                            setOpenJobs(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {j}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* District */}
              <div ref={districtsBoxRef} className="relative min-w-0 text-left lg:col-span-6">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t("home.quartier.placeholder") || "Quartier"}
                  value={district}
                  onFocus={() => setOpenDistricts(true)}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setGeo(null);
                    setOpenDistricts(true);
                  }}
                  className="w-full min-w-0 h-11 sm:h-12 pl-10 pr-14 text-sm sm:text-base text-gray-900"
                />

                <button
                  type="button"
                  onClick={handleGeoLocate}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-2 py-1 text-gray-600 hover:bg-gray-50"
                  aria-label={language === "fr" ? "Utiliser ma position" : "Use my location"}
                  title={language === "fr" ? "Utiliser ma position" : "Use my location"}
                >
                  <LocateFixed className={`w-4 h-4 ${geoLoading ? "animate-pulse" : ""}`} />
                </button>

                {openDistricts && (filteredDistricts.length > 0 || loadingOptions) && (
                  <div className="absolute z-50 mt-1 w-full min-w-0 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {loadingOptions && (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        {language === "fr" ? "Chargement..." : "Loading..."}
                      </div>
                    )}
                    {!loadingOptions &&
                      filteredDistricts.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setDistrict(d);
                            setGeo(null);
                            setOpenDistricts(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          {d}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {geoError && (
                <div className="lg:col-span-12 text-xs text-red-600 text-left px-1">
                  {geoError}
                </div>
              )}

              <Button
                type="submit"
                className="lg:col-span-12 w-full h-11 sm:h-12 bg-pro-blue hover:bg-blue-700 text-sm sm:text-base"
              >
                {t("home.search.button") || "Rechercher"}
              </Button>
            </div>

            {geo && (
              <div className="mt-2 text-left text-[11px] sm:text-xs text-gray-500 px-1">
                {language === "fr"
                  ? "Position détectée : le tri par distance sera activé."
                  : "Location detected: distance sorting will be enabled."}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* ✅ Pub */}
      <div className="relative z-0 w-full px-0 pb-8 sm:pb-10 lg:pb-12 mt-4 sm:mt-6">
        <AdSlot placement="home_feed" className="w-full" />
      </div>
    </section>
  );
};

export default HeroSection;
