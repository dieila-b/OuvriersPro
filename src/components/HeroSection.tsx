import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const HeroSection: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="w-full py-16 md:py-24">
      {/* On supprime `container` et on met juste un max-width pour ne pas avoir une ligne trop longue,
          mais le fond bleu reste full-width */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8">
        <div className="text-center space-y-6">
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight">
            {t("hero.titleLine1")} <br />
            {t("hero.titleLine2")}
          </h1>

          <p className="text-base md:text-lg opacity-90 max-w-3xl mx-auto">
            {t("hero.subtitle")}
          </p>

          {/* Barre de recherche simple (celle du hero) */}
          <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-white rounded-xl shadow-lg px-3 py-3">
            <div className="flex-1 flex items-center px-2">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                className="w-full border-none outline-none text-sm md:text-base"
                placeholder={t("hero.searchPlaceholder")}
              />
            </div>
            <Button className="w-full md:w-auto bg-pro-blue hover:bg-blue-700">
              {t("hero.searchButton")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
