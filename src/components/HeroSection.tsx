// src/components/HeroSection.tsx
import React, { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";

const HeroSection = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = () => {
    console.log("Searching for:", searchTerm, "in:", location);
    // TODO: redirection / filtrage
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
          <div className="bg-white rounded-2xl p-2 sm:p-3 md:p-4 shadow-xl max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t("home.search.placeholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 py-3 text-gray-900 text-sm sm:text-base w-full"
                />
              </div>

              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t("home.location.placeholder")}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10 py-3 text-gray-900 text-sm sm:text-base w-full"
                />
              </div>

              <Button
                onClick={handleSearch}
                className="w-full sm:w-auto bg-pro-blue hover:bg-blue-700 px-6 md:px-8 py-3 text-sm sm:text-base"
              >
                {t("home.search.button")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
