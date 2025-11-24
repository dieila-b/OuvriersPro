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
    // TODO: Implémenter la redirection vers la page de recherche / filtrage
  };

  return (
    <section className="w-full bg-gradient-to-br from-pro-blue to-blue-600 text-white py-8 sm:py-12 md:py-16">
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6 text-center">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 md:mb-6 leading-tight">
            {t("home.title")}
          </h1>

          <p className="text-sm sm:text-base md:text-lg mb-6 sm:mb-8 text-blue-100">
            {t("home.subtitle")}
          </p>

          {/* Search Form */}
          <div className="bg-white rounded-lg p-3 sm:p-4 md:p-5 shadow-xl max-w-3xl mx-auto">
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t("home.search.placeholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 sm:h-11 text-gray-900 text-sm"
                />
              </div>

              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t("home.location.placeholder")}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-9 h-10 sm:h-11 text-gray-900 text-sm"
                />
              </div>

              <Button
                onClick={handleSearch}
                className="w-full bg-pro-blue hover:bg-blue-700 h-10 sm:h-11 text-sm font-medium"
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
