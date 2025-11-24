import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, MapPin, MessageCircle, Star, Users, Clock } from "lucide-react";

const FeaturesSection = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Shield,
      title: t("home.features.quality.title"),
      description: t("home.features.quality.desc"),
      color: "text-green-600",
    },
    {
      icon: MapPin,
      title: t("home.features.local.title"),
      description: t("home.features.local.desc"),
      color: "text-blue-600",
    },
    {
      icon: MessageCircle,
      title: t("home.features.contact.title"),
      description: t("home.features.contact.desc"),
      color: "text-purple-600",
    },
  ];

  const stats = [
    { icon: Users, number: "2,500+", label: t("home.features.stats.pros") },
    { icon: Star, number: "4.8/5", label: t("home.features.stats.rating") },
    { icon: Clock, number: "24h", label: t("home.features.stats.response") },
    { icon: Shield, number: "100%", label: t("home.features.stats.verified") },
  ];

  return (
    <section className="w-full py-8 sm:py-12 md:py-16 bg-pro-light">
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-6">

        {/* Titre */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-pro-gray mb-3 leading-tight">
            {t("home.features.title")}
          </h2>
        </div>

        {/* Cartes des features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
          {features.map((f, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-lg transition-all animate-fade-in"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3 shadow-inner">
                  <f.icon className={`w-6 h-6 sm:w-7 sm:h-7 ${f.color}`} />
                </div>

                <h3 className="text-base sm:text-lg font-semibold text-pro-gray mb-2">
                  {f.title}
                </h3>

                <p className="text-gray-600 leading-relaxed text-sm">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-8 sm:mt-12 w-full">
          {stats.map((s, index) => (
            <div key={index} className="text-center animate-fade-in"
              style={{ animationDelay: `${index * 0.15 + 0.4}s` }}>
              <s.icon className="w-6 h-6 sm:w-7 sm:h-7 text-pro-blue mx-auto mb-2" />
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-pro-gray">
                {s.number}
              </div>
              <div className="text-gray-600 text-xs sm:text-sm">
                {s.label}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default FeaturesSection;
