// src/components/HeroSection.tsx
import React, { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Building2, Map } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [commune, setCommune] = useState("");
  const [quartier, setQuartier] = useState("");

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("service", searchTerm.trim());
    if (location.trim()) params.set("ville", location.trim());
    if (commune.trim()) params.set("commune", commune.trim());
    if (quartier.trim()) params.set("quartier", quartier.trim());

    // ⚠️ Si ta route de recherche s'appelle autrement, change juste "/search"
    navigate(`/search?${params.toString()}`);
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

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl p-2 sm:p-3 md:p-4 shadow-xl max-w-5xl mx-auto"
          >
            <div
              className="
                grid grid-cols-1 gap-2
                sm:grid-cols-2 sm:gap-3
                lg:grid-cols-4 lg:gap-4
                items-center
              "
            >
              {/* Métier / Service */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t("home.search.placeholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 py-3 text-gray-900 text-sm sm:text-base w-full"
                />
              </div>

              {/* Ville / Code postal */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t("home.location.placeholder")}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10 py-3 text-gray-900 text-sm sm:text-base w-full"
                />
              </div>

              {/* Commune */}
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t("home.commune.placeholder") || "Commune"}
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  className="pl-10 py-3 text-gray-900 text-sm sm:text-base w-full"
                />
              </div>

              {/* Quartier */}
              <div className="relative">
                <Map className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t("home.quartier.placeholder") || "Quartier"}
                  value={quartier}
                  onChange={(e) => setQuartier(e.target.value)}
                  className="pl-10 py-3 text-gray-900 text-sm sm:text-base w-full"
                />
              </div>

              {/* Bouton */}
              <Button
                type="submit"
                className="
                  lg:col-span-4
                  w-full bg-pro-blue hover:bg-blue-700
                  px-6 md:px-8 py-3 text-sm sm:text-base
                "
              >
                {t("home.search.button")}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
