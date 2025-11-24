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
    <section className="w-full py-12 sm:py-16 md:py-20 bg-pro-light">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8">

        {/* Titre */}
        <div className="text-center mb-10 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-pro-gray mb-4 leading-tight px-2">
            {t("home.features.title")}
          </h2>
        </div>

        {/* Cartes des features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 w-full">
          {features.map((f, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 sm:p-8 shadow-sm hover:shadow-lg transition-all animate-fade-in"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3 sm:mb-4 shadow-inner">
                  <f.icon className={`w-7 h-7 sm:w-8 sm:h-8 ${f.color}`} />
                </div>

                <h3 className="text-lg sm:text-xl font-semibold text-pro-gray mb-2 sm:mb-3">
                  {f.title}
                </h3>

                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 md:gap-10 mt-12 sm:mt-16 md:mt-20 w-full">
          {stats.map((s, index) => (
            <div key={index} className="text-center animate-fade-in"
              style={{ animationDelay: `${index * 0.15 + 0.4}s` }}>
              <s.icon className="w-6 h-6 sm:w-8 sm:h-8 text-pro-blue mx-auto mb-2" />
              <div className="text-xl sm:text-2xl font-bold text-pro-gray">
                {s.number}
              </div>
              <div className="text-gray-600 text-xs sm:text-sm md:text-base">
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
