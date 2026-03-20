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

      const { data } = await supabase
        .from("op_ouvriers")
        .select("profession, district, status")
        .eq("status", "approved");

      if (data) {
        setJobOptions(
          [...new Set(data.map((w: any) => w.profession).filter(Boolean))].sort()
        );

        setDistrictOptions(
          [...new Set(data.map((w: any) => w.district).filter(Boolean))].sort()
        );
      }

      setLoadingOptions(false);
    };

    loadOptions();
  }, []);

  const filteredJobs = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return jobOptions.filter((j) => j.toLowerCase().includes(q)).slice(0, 8);
  }, [searchTerm, jobOptions]);

  const filteredDistricts = useMemo(() => {
    const q = district.toLowerCase();
    return districtOptions.filter((d) => d.toLowerCase().includes(q)).slice(0, 8);
  }, [district, districtOptions]);

  const handleGeoLocate = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoError("Localisation impossible");
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
    <section className="relative w-full text-white bg-gradient-to-br from-pro-blue to-blue-600 overflow-hidden">

      <div className="relative z-10 px-4 sm:px-6 lg:px-10 py-10">

        {/* TITRE */}
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight">
            {cms(
              "home.hero.title",
              "Trouvez le bon professionnel, près de chez vous",
              "Find the right professional near you"
            )}
          </h1>

          <p className="mt-3 text-blue-100 text-sm sm:text-lg">
            {cms(
              "home.hero.subtitle",
              "Simple, rapide et fiable — en quelques clics.",
              "Simple, fast and reliable — in just a few clicks."
            )}
          </p>

          {/* BADGES TRUST */}
          <div className="mt-4 flex justify-center gap-3 flex-wrap text-xs">
            <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              {cms("hero.badge.verified", "Profils vérifiés", "Verified profiles")}
            </span>

            <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full">
              <Zap className="w-3.5 h-3.5" />
              {cms("hero.badge.fast", "Réponse rapide", "Fast response")}
            </span>
          </div>
        </div>

        {/* SEARCH */}
        <div className="mt-8 max-w-4xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="bg-white rounded-2xl p-3 shadow-xl text-gray-900"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              {/* JOB */}
              <div className="relative" ref={jobsBoxRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Quel service ?"
                  value={searchTerm}
                  onFocus={() => setOpenJobs(true)}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-11"
                />

                {openJobs && filteredJobs.length > 0 && (
                  <div className="absolute w-full bg-white border rounded-xl shadow mt-1 z-50">
                    {filteredJobs.map((j) => (
                      <div
                        key={j}
                        onClick={() => {
                          setSearchTerm(j);
                          setOpenJobs(false);
                        }}
                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      >
                        {j}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* LOCATION */}
              <div className="relative" ref={districtsBoxRef}>
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Où ?"
                  value={district}
                  onFocus={() => setOpenDistricts(true)}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="pl-9 pr-10 h-11"
                />

                <button
                  type="button"
                  onClick={handleGeoLocate}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <LocateFixed className={`w-4 h-4 ${geoLoading ? "animate-pulse" : ""}`} />
                </button>
              </div>

              {/* CTA */}
              <Button
                type="submit"
                className="h-11 bg-pro-blue hover:bg-blue-700 font-semibold"
              >
                {cms("home.search.btn", "Trouver", "Search")}
              </Button>
            </div>

            {geo && (
              <div className="text-xs text-gray-500 mt-2">
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
