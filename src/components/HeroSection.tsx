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

  const handleGeoLocate = () => {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setGeoLoading(false);
    });
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

      <div className="relative z-10 px-4 sm:px-6 lg:px-10 py-12">

        {/* TITRE */}
        <div className="max-w-6xl mx-auto text-center">

          <h1 className="whitespace-nowrap overflow-hidden text-ellipsis text-[22px] sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Trouvez le bon professionnel pour votre besoin
          </h1>

          <p className="mt-3 text-blue-100 text-sm sm:text-lg">
            {cms(
              "home.hero.subtitle",
              "Simple, rapide et fiable — en quelques clics.",
              "Simple, fast and reliable — in just a few clicks."
            )}
          </p>

          {/* BADGES */}
          <div className="mt-4 flex justify-center gap-3 flex-wrap text-xs">
            <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full backdrop-blur">
              <ShieldCheck className="w-3.5 h-3.5" />
              Profils vérifiés
            </span>

            <span className="flex items-center gap-1 bg-white/10 px-3 py-1 rounded-full backdrop-blur">
              <Zap className="w-3.5 h-3.5" />
              Réponse rapide
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
            className="bg-white rounded-2xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-gray-900"
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
                  className="pl-9 h-11 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500"
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
                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
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
                  className="pl-9 pr-10 h-11 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500"
                />

                <button
                  type="button"
                  onClick={handleGeoLocate}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
                >
                  <LocateFixed className={`w-4 h-4 ${geoLoading ? "animate-pulse" : ""}`} />
                </button>
              </div>

              {/* CTA */}
              <Button
                type="submit"
                className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-700 text-white font-semibold shadow-md"
              >
                Trouver maintenant
              </Button>
            </div>

            {geo && (
              <div className="text-xs text-gray-500 mt-2">
                📍 Recherche proche activée
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
