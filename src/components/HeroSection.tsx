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
    <section className="w-full bg-gradient-to-br from-pro-blue to-blue-600 text-white py-12 sm:py-16 md:py-20 lg:py-24">
      {/* IMPORTANT : on enlève `container` pour laisser la section vraiment full-width */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 text-center">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-4 sm:mb-6 leading-tight px-2">
            {t("home.title")}
          </h1>

          <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl mb-8 sm:mb-10 text-blue-100 px-2">
            {t("home.subtitle")}
          </p>

          {/* Search Form */}
          <div className="bg-white rounded-lg p-3 sm:p-4 md:p-6 shadow-xl max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <Input
                  placeholder={t("home.search.placeholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 sm:pl-10 py-2.5 sm:py-3 text-gray-900 text-sm md:text-base"
                />
              </div>

              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <Input
                  placeholder={t("home.location.placeholder")}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-9 sm:pl-10 py-2.5 sm:py-3 text-gray-900 text-sm md:text-base"
                />
              </div>

              <Button
                onClick={handleSearch}
                className="w-full sm:w-auto bg-pro-blue hover:bg-blue-700 px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 text-sm md:text-base whitespace-nowrap"
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
