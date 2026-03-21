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
    <section className="relative w-full overflow-hidden bg-[linear-gradient(135deg,#1f57db_0%,#2d63e2_45%,#356bf0_100%)] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_center,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_26%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/35" />
      <div className="absolute inset-x-0 top-[72px] h-px bg-white/15" />

      <div className="relative z-10 px-4 py-10 sm:px-6 sm:py-12 lg:px-4 lg:py-14 xl:px-5">
        <div className={compactHero ? "mx-auto max-w-7xl text-center" : "mx-auto w-full max-w-none text-center"}>
          <h1
            className={
              compactHero
                ? "mx-auto flex min-h-[40px] w-full max-w-[92vw] items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-2 py-2 text-center text-[11px] font-extrabold leading-none tracking-[-0.02em] text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-sm"
                : "mx-auto block w-full max-w-none px-2 text-center font-black leading-[0.98] tracking-[-0.05em] text-white drop-shadow-[0_18px_42px_rgba(0,0,0,0.22)] text-[clamp(2.35rem,3.8vw,5rem)]"
            }
          >
            <span className={compactHero ? "block whitespace-nowrap drop-shadow-[0_1px_6px_rgba(0,0,0,0.28)]" : "block w-full"}>
              Le bon professionnel, au bon moment, près de chez vous
            </span>
          </h1>

          {!compactHero && (
            <div className="mx-auto mt-5 flex justify-center">
              <p className="max-w-[860px] text-center text-[18px] font-medium leading-[1.7] text-blue-50/95 sm:text-[20px] lg:text-[21px]">
                Parce que trouver la bonne personne devrait toujours être simple.
              </p>
            </div>
          )}

          <div className={`${compactHero ? "mt-3" : "mt-6"} flex flex-wrap justify-center gap-2.5 text-xs`}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3.5 py-1.5 text-[11px] font-medium text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5" />
              {cms("hero.badge.verified", "Profils vérifiés", "Verified profiles")}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3.5 py-1.5 text-[11px] font-medium text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-md">
              <Zap className="h-3.5 w-3.5" />
              {cms("hero.badge.fast", "Réponse rapide", "Fast response")}
            </span>
          </div>
        </div>

        <div className={`mx-auto ${compactHero ? "mt-6" : "mt-9"} max-w-[1020px] lg:max-w-[1140px] xl:max-w-[1200px]`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className={[
              "relative overflow-visible rounded-[30px] p-3.5 text-gray-900",
              "border border-white/45 bg-white/92",
              "shadow-[0_28px_80px_rgba(8,15,40,0.22),0_10px_30px_rgba(255,255,255,0.08)]",
              "backdrop-blur-xl",
              compactHero ? "" : "ring-1 ring-white/25",
            ].join(" ")}
          >
            {!compactHero && (
              <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.22fr_1.22fr_0.92fr]">
              <div className="relative" ref={jobsBoxRef}>
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

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
                  className="h-[54px] rounded-[20px] border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(241,245,249,0.95)_100%)] pl-11 text-[15px] font-medium text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_2px_rgba(15,23,42,0.03)] focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />

                {openJobs && filteredJobs.length > 0 && (
                  <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.18)]">
                    {filteredJobs.map((j) => (
                      <div
                        key={j}
                        onClick={() => {
                          setSearchTerm(j);
                          setOpenJobs(false);
                        }}
                        className="cursor-pointer px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {j}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={districtsBoxRef}>
                <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

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
                  className="h-[54px] rounded-[20px] border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(241,245,249,0.95)_100%)] pl-11 pr-11 text-[15px] font-medium text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_1px_2px_rgba(15,23,42,0.03)] focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />

                <button
                  type="button"
                  onClick={handleGeoLocate}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full border border-transparent p-2 text-slate-500 transition-all hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600"
                >
                  <LocateFixed className={`h-4 w-4 ${geoLoading ? "animate-pulse" : ""}`} />
                </button>

                {openDistricts && filteredDistricts.length > 0 && (
                  <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.18)]">
                    {filteredDistricts.map((d) => (
                      <div
                        key={d}
                        onClick={() => {
                          setDistrict(d);
                          setGeo(null);
                          setOpenDistricts(false);
                        }}
                        className="cursor-pointer px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className={[
                  "h-[54px] rounded-[20px] border border-blue-500/70",
                  "bg-[linear-gradient(135deg,#2f66ea_0%,#2a5fe0_48%,#1f57db_100%)]",
                  "font-semibold text-white",
                  "shadow-[0_14px_34px_rgba(37,99,235,0.34),inset_0_1px_0_rgba(255,255,255,0.18)]",
                  "transition-all duration-200 hover:-translate-y-[1px] hover:brightness-105",
                ].join(" ")}
              >
                {cms("home.search.btn", "Trouver maintenant", "Find now")}
              </Button>
            </div>

            {geo && (
              <div className="mt-3 text-xs text-slate-500">
                📍 {cms("geo.active", "Recherche proche activée", "Nearby search enabled")}
              </div>
            )}
          </form>
        </div>
      </div>

      <div
        className={[
          compactHero
            ? "mt-1 -translate-y-4 px-4"
            : "mt-6 px-2 sm:px-3 lg:px-4 xl:px-5",
        ].join(" ")}
      >
        <div className={compactHero ? "mx-auto max-w-7xl" : "mx-auto w-full max-w-none"}>
          <AdSlot
            placement="home_feed"
            showSponsorBadge={true}
            showCounter={false}
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
