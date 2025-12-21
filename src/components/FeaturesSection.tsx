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
    <section className="w-full bg-pro-light">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
        {/* Titre */}
        <div className="text-center mb-8 sm:mb-10 lg:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-pro-gray leading-tight">
            {t("home.features.title")}
          </h2>
        </div>

        {/* Cartes des features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 w-full">
          {features.map((f, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-5 sm:p-6 lg:p-8 shadow-sm hover:shadow-md transition-shadow animate-fade-in"
              style={{ animationDelay: `${index * 0.12}s` }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 shadow-inner">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 lg:gap-10 mt-10 sm:mt-12 lg:mt-14 w-full">
          {stats.map((s, index) => (
            <div
              key={index}
              className="text-center animate-fade-in"
              style={{ animationDelay: `${index * 0.12 + 0.35}s` }}
            >
              <s.icon className="w-7 h-7 sm:w-8 sm:h-8 text-pro-blue mx-auto mb-2" />
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
