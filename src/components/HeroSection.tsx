// src/components/HeroSection.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  MapPin,
  ChevronDown,
  LocateFixed,
  Sparkles,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import AdSlot from "@/components/AdSlot";
import { Capacitor } from "@capacitor/core";

const isNativeRuntime = () => {
  const wCap = (() => {
    try {
      return (window as any)?.Capacitor ?? null;
    } catch {
      return null;
    }
  })();

  try {
    if (Capacitor?.isNativePlatform?.()) return true;
  } catch {}
  try {
    if (wCap?.isNativePlatform?.()) return true;
  } catch {}

  try {
    const p = window.location?.protocol ?? "";
    if (p === "capacitor:" || p === "file:") return true;
  } catch {}

  try {
    const { protocol, hostname } = window.location;
    if (wCap && protocol === "http:" && hostname === "localhost") return true;
  } catch {}

  return false;
};

const HeroSection = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const cms = (key: string, fallbackFr: string, fallbackEn: string) => {
    const v = t(key);
    if (!v || v === key) return language === "fr" ? fallbackFr : fallbackEn;
    return v;
  };

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

  const native = useMemo(() => isNativeRuntime(), []);

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
      if (jobsBoxRef.current && !jobsBoxRef.current.contains(e.target as Node)) setOpenJobs(false);
      if (districtsBoxRef.current && !districtsBoxRef.current.contains(e.target as Node)) setOpenDistricts(false);
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
        cms(
          "home.search.geo.unsupported",
          "La géolocalisation n'est pas supportée sur ce navigateur.",
          "Geolocation is not supported by this browser."
        )
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
          cms(
            "home.search.geo.error",
            "Impossible de récupérer votre position. Vérifiez les permissions.",
            "Unable to get your location. Check permissions."
          )
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
    <section className="relative w-full overflow-hidden bg-[linear-gradient(135deg,#155dfc_0%,#2563eb_38%,#1d4ed8_68%,#1e3a8a_100%)] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_32%)]" />
        <div className="absolute -left-16 top-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-indigo-300/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-16 2xl:px-16">
        <div className="mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/95 shadow-[0_8px_24px_rgba(255,255,255,0.08)] backdrop-blur-sm sm:text-sm">
            <Sparkles className="h-4 w-4" />
            <span>
              {cms(
                "home.hero.kicker",
                "Marketplace moderne de prestataires de confiance",
                "Modern marketplace for trusted providers"
              )}
            </span>
          </div>

          <h1 className="mx-auto mt-5 max-w-4xl text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
            {cms(
              "home.hero.title",
              "Trouvez des prestataires fiables près de chez vous",
              "Find trusted providers near you"
            )}
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-blue-50/90 sm:text-base md:text-lg lg:text-xl">
            {cms(
              "home.hero.subtitle",
              "Comparez, contactez et réservez en toute confiance.",
              "Compare, contact and book with confidence."
            )}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs text-white/95 backdrop-blur-sm sm:text-sm">
              <ShieldCheck className="h-4 w-4" />
              <span>
                {cms("home.hero.badge1", "Profils vérifiés", "Verified profiles")}
              </span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs text-white/95 backdrop-blur-sm sm:text-sm">
              <Star className="h-4 w-4" />
              <span>
                {cms("home.hero.badge2", "Avis & confiance", "Reviews & trust")}
              </span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-xs text-white/95 backdrop-blur-sm sm:text-sm">
              <MapPin className="h-4 w-4" />
              <span>
                {cms("home.hero.badge3", "Recherche locale", "Local search")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 sm:mt-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="mx-auto w-full max-w-5xl overflow-visible rounded-[30px] border border-white/20 bg-white/95 p-3 text-gray-900 shadow-[0_30px_80px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:p-4 md:p-5"
          >
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.15fr_1fr_auto]">
              {/* Job */}
              <div ref={jobsBoxRef} className="relative min-w-0">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition-all duration-200 focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-md">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>

                  <Input
                    placeholder={cms(
                      "home.search.placeholder_keyword",
                      "Quel métier ou service recherchez-vous ?",
                      "Which trade or service are you looking for?"
                    )}
                    value={searchTerm}
                    onFocus={() => setOpenJobs(true)}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setOpenJobs(true);
                    }}
                    className="h-14 border-0 bg-transparent pl-12 pr-10 text-sm text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-0 sm:text-base"
                  />

                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                {openJobs && (filteredJobs.length > 0 || loadingOptions) && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                    {loadingOptions && (
                      <div className="px-4 py-3 text-xs text-slate-500">
                        {cms("common.loading", "Chargement...", "Loading...")}
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
                          className="w-full px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          {j}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* District */}
              <div ref={districtsBoxRef} className="relative min-w-0">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition-all duration-200 focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-md">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                    <MapPin className="h-5 w-5 text-slate-400" />
                  </div>

                  <Input
                    placeholder={cms(
                      "home.search.placeholder_district",
                      "Quartier, commune ou zone",
                      "District, area or zone"
                    )}
                    value={district}
                    onFocus={() => setOpenDistricts(true)}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setGeo(null);
                      setOpenDistricts(true);
                    }}
                    className="h-14 border-0 bg-transparent pl-12 pr-16 text-sm text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-0 sm:text-base"
                  />

                  <button
                    type="button"
                    onClick={handleGeoLocate}
                    className="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    aria-label={cms("home.search.geo.cta", "Utiliser ma position", "Use my location")}
                    title={cms("home.search.geo.cta", "Utiliser ma position", "Use my location")}
                  >
                    <LocateFixed className={`h-4 w-4 ${geoLoading ? "animate-pulse" : ""}`} />
                  </button>
                </div>

                {openDistricts && (filteredDistricts.length > 0 || loadingOptions) && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
                    {loadingOptions && (
                      <div className="px-4 py-3 text-xs text-slate-500">
                        {cms("common.loading", "Chargement...", "Loading...")}
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
                          className="w-full px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          {d}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* CTA */}
              <Button
                type="submit"
                className="h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] transition-all hover:from-blue-700 hover:to-blue-700 sm:text-base xl:min-w-[170px]"
              >
                <span className="inline-flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  {cms("home.search.btn_search", "Rechercher", "Search")}
                </span>
              </Button>
            </div>

            {geoError && (
              <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-left text-xs text-red-600">
                {geoError}
              </div>
            )}

            <div className="mt-3 flex flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500 sm:text-sm">
                {cms(
                  "home.search.helper",
                  "Choisissez un métier, une zone, puis lancez la recherche.",
                  "Choose a trade, an area, then launch the search."
                )}
              </div>

              {geo && (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <LocateFixed className="h-3.5 w-3.5" />
                  <span>
                    {cms(
                      "home.search.geo.enabled",
                      "Position détectée : tri par distance activé.",
                      "Location detected: distance sorting enabled."
                    )}
                  </span>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {!native && (
        <div className="relative z-0 w-full px-0 pb-8 pt-2 sm:pb-10 lg:pb-12">
          <AdSlot placement="home_feed" className="w-full" />
        </div>
      )}
    </section>
  );
};

export default HeroSection;
