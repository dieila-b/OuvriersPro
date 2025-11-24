// src/components/HeroSection.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type DbWorkerLite = {
  profession: string | null;
  district: string | null;
  status: string | null;
};

const HeroSection = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  // ---- valeurs saisies
  const [searchTerm, setSearchTerm] = useState(""); // Métier
  const [district, setDistrict] = useState("");     // Quartier

  // ---- listes globales (provenant des workers approuvés)
  const [jobOptions, setJobOptions] = useState<string[]>([]);
  const [districtOptions, setDistrictOptions] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // ---- dropdown open/close
  const [openJobs, setOpenJobs] = useState(false);
  const [openDistricts, setOpenDistricts] = useState(false);

  const jobsBoxRef = useRef<HTMLDivElement>(null);
  const districtsBoxRef = useRef<HTMLDivElement>(null);

  // -------------------------
  // Charger métiers + quartiers depuis Supabase
  // -------------------------
  useEffect(() => {
    const loadOptions = async () => {
      setLoadingOptions(true);
      const { data, error } = await supabase
        .from<DbWorkerLite>("op_ouvriers")
        .select("profession, district, status")
        .eq("status", "approved");

      if (!error && data) {
        const jobs = Array.from(
          new Set(
            data
              .map((w) => (w.profession ?? "").trim())
              .filter((v) => v.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b, "fr"));

        const districts = Array.from(
          new Set(
            data
              .map((w) => (w.district ?? "").trim())
              .filter((v) => v.length > 0)
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

  // -------------------------
  // Suggestions filtrées (après 3 lettres)
  // -------------------------
  const filteredJobs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (q.length < 3) return [];
    return jobOptions.filter((j) => j.toLowerCase().includes(q)).slice(0, 8);
  }, [searchTerm, jobOptions]);

  const filteredDistricts = useMemo(() => {
    const q = district.trim().toLowerCase();
    if (q.length < 3) return [];
    return districtOptions.filter((d) => d.toLowerCase().includes(q)).slice(0, 8);
  }, [district, districtOptions]);

  // -------------------------
  // Fermer dropdown si clic extérieur
  // -------------------------
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        jobsBoxRef.current &&
        !jobsBoxRef.current.contains(e.target as Node)
      ) {
        setOpenJobs(false);
      }
      if (
        districtsBoxRef.current &&
        !districtsBoxRef.current.contains(e.target as Node)
      ) {
        setOpenDistricts(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("service", searchTerm.trim());
    if (district.trim()) params.set("quartier", district.trim());
    navigate(`/?${params.toString()}#search`);
  };

  return (
    <section className="w-full bg-gradient-to-br from-pro-blue to-blue-600 text-white">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 md:py-20 lg:py-24 text-center">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight tracking-tight">
            {t("home.title")}
          </h1>

          <p className="text-sm sm:text-base md:text-xl lg:text-2xl mb-6 sm:mb-8 md:mb-10 text-blue-100">
            {t("home.subtitle")}
          </p>

          {/* Search Form (Métier + Quartier avec suggestions) */}
          <div className="bg-white rounded-2xl p-2 sm:p-3 md:p-4 shadow-xl max-w-3xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">

              {/* ---- Métier combobox */}
              <div ref={jobsBoxRef} className="relative text-left">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t("home.search.placeholder") || "Métier / service"}
                  value={searchTerm}
                  onFocus={() => setOpenJobs(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setOpenJobs(true);
                  }}
                  className="pl-10 pr-8 py-3 text-gray-900 text-sm sm:text-base w-full"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />

                {openJobs && (filteredJobs.length > 0 || loadingOptions) && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {loadingOptions && (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        Chargement...
                      </div>
                    )}
                    {!loadingOptions && filteredJobs.map((j) => (
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

              {/* ---- Quartier combobox */}
              <div ref={districtsBoxRef} className="relative text-left">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t("home.quartier.placeholder") || "Quartier"}
                  value={district}
                  onFocus={() => setOpenDistricts(true)}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setOpenDistricts(true);
                  }}
                  className="pl-10 pr-8 py-3 text-gray-900 text-sm sm:text-base w-full"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />

                {openDistricts && (filteredDistricts.length > 0 || loadingOptions) && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {loadingOptions && (
                      <div className="px-3 py-2 text-xs text-gray-500">
                        Chargement...
                      </div>
                    )}
                    {!loadingOptions && filteredDistricts.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setDistrict(d);
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

              {/* ---- Bouton */}
              <Button
                onClick={handleSearch}
                className="sm:col-span-2 w-full bg-pro-blue hover:bg-blue-700 px-6 md:px-8 py-3 text-sm sm:text-base"
              >
                {t("home.search.button") || "Rechercher"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
