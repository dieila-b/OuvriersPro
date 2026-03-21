// src/components/HeroSection.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  MapPin,
  LocateFixed,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import AdSlot from "@/components/AdSlot";
import { Capacitor } from "@capacitor/core";

const isNativeRuntime = () => {
  try {
    if (Capacitor?.isNativePlatform?.()) return true;
  } catch {}

  try {
    const wCap = (window as any)?.Capacitor;
    if (wCap?.isNativePlatform?.()) return true;
  } catch {}

  try {
    const p = window.location?.protocol ?? "";
    if (p === "capacitor:" || p === "file:") return true;
  } catch {}

  return false;
};

const HeroSection = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const cms = (key: string, fr: string, en: string) => {
    const v = t(key);
    if (!v || v === key) return language === "fr" ? fr : en;
    return v;
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [district, setDistrict] = useState("");
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);

  const [jobOptions, setJobOptions] = useState<string[]>([]);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);

  const [openJobs, setOpenJobs] = useState(false);
  const [openDistricts, setOpenDistricts] = useState(false);

  const jobsBoxRef = useRef<HTMLDivElement>(null);
  const districtsBoxRef = useRef<HTMLDivElement>(null);

  const [geoLoading, setGeoLoading] = useState(false);

  const native = useMemo(() => isNativeRuntime(), []);
  const [compactHero, setCompactHero] = useState(() => {
    try {
      return native || window.innerWidth < 640;
    } catch {
      return native;
    }
  });

  useEffect(() => {
    const syncCompactHero = () => {
      try {
        setCompactHero(native || window.innerWidth < 640);
      } catch {
        setCompactHero(native);
      }
    };

    syncCompactHero();
    window.addEventListener("resize", syncCompactHero);
    return () => window.removeEventListener("resize", syncCompactHero);
  }, [native]);

  useEffect(() => {
    const loadOptions = async () => {
      const { data } = await supabase
        .from("op_ouvriers")
        .select("profession, district")
        .eq("status", "approved");

      if (data) {
        setJobOptions([...new Set(data.map((w: any) => w.profession).filter(Boolean))]);
        setDistrictOptions([...new Set(data.map((w: any) => w.district).filter(Boolean))]);
      }
    };

    loadOptions();
  }, []);

  const filteredJobs = useMemo(() => {
    return jobOptions
      .filter((j) => j.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 8);
  }, [searchTerm, jobOptions]);

  const filteredDistricts = useMemo(() => {
    return districtOptions
      .filter((d) => d.toLowerCase().includes(district.toLowerCase()))
      .slice(0, 8);
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
    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
      }
    );
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("keyword", searchTerm);
    if (district) params.set("district", district);
    if (geo) {
      params.set("lat", String(geo.lat));
      params.set("lng", String(geo.lng));
      params.set("near", "1");
    }

    navigate(`/rechercher?${params.toString()}`);
  };

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-pro-blue to-blue-600 text-white">
      <div className="relative z-10 px-4 py-10 sm:px-6 sm:py-12 lg:px-10">
        <div className="mx-auto max-w-7xl text-center">
          <h1
            className={
              compactHero
                ? "mx-auto flex min-h-[40px] w-full max-w-[92vw] items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-2 py-2 text-center text-[11px] font-extrabold leading-none tracking-[-0.02em] text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-sm"
                : "mx-auto max-w-[1200px] text-center text-[16px] font-bold leading-[1.15] tracking-tight sm:text-[24px] md:text-[34px] lg:text-[42px] xl:text-[48px]"
            }
          >
            <span
              className={
                compactHero
                  ? "block whitespace-nowrap drop-shadow-[0_1px_6px_rgba(0,0,0,0.28)]"
                  : ""
              }
            >
              Le bon professionnel, au bon moment, près de chez vous
            </span>
          </h1>

          {!compactHero && (
            <p className="mt-3 text-sm text-blue-100 sm:text-lg">
              Parce que trouver la bonne personne devrait toujours être simple.
            </p>
          )}

          <div className={`${compactHero ? "mt-3" : "mt-4"} flex flex-wrap justify-center gap-3 text-xs`}>
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" />
              {cms("hero.badge.verified", "Profils vérifiés", "Verified profiles")}
            </span>

            <span className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
              <Zap className="h-3.5 w-3.5" />
              {cms("hero.badge.fast", "Réponse rapide", "Fast response")}
            </span>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-4xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="rounded-2xl bg-white p-3 text-gray-900 shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="relative" ref={jobsBoxRef}>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <Input
                  placeholder={cms(
                    "home.search.placeholder_keyword",
                    "Quel service ?",
                    "What service?"
                  )}
                  value={searchTerm}
                  onFocus={() => setOpenJobs(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setOpenJobs(true);
                  }}
                  className="h-11 rounded-xl border-gray-200 pl-9 focus:ring-2 focus:ring-blue-500"
                />

                {openJobs && filteredJobs.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border bg-white shadow">
                    {filteredJobs.map((j) => (
                      <div
                        key={j}
                        onClick={() => {
                          setSearchTerm(j);
                          setOpenJobs(false);
                        }}
                        className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        {j}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={districtsBoxRef}>
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                <Input
                  placeholder={cms(
                    "home.search.placeholder_district",
                    "Où ?",
                    "Where?"
                  )}
                  value={district}
                  onFocus={() => setOpenDistricts(true)}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setOpenDistricts(true);
                    if (geo) setGeo(null);
                  }}
                  className="h-11 rounded-xl border-gray-200 pl-9 pr-10 focus:ring-2 focus:ring-blue-500"
                />

                <button
                  type="button"
                  onClick={handleGeoLocate}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
                >
                  <LocateFixed className={`h-4 w-4 ${geoLoading ? "animate-pulse" : ""}`} />
                </button>

                {openDistricts && filteredDistricts.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border bg-white shadow">
                    {filteredDistricts.map((d) => (
                      <div
                        key={d}
                        onClick={() => {
                          setDistrict(d);
                          setGeo(null);
                          setOpenDistricts(false);
                        }}
                        className="cursor-pointer px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-700"
              >
                {cms("home.search.btn", "Trouver maintenant", "Find now")}
              </Button>
            </div>

            {geo && (
              <div className="mt-2 text-xs text-gray-500">
                📍 {cms("geo.active", "Recherche proche activée", "Nearby search enabled")}
              </div>
            )}
          </form>
        </div>
      </div>

      {!native && (
        <div className="mt-6">
          <AdSlot placement="home_feed" />
        </div>
      )}
    </section>
  );
};

export default HeroSection;
