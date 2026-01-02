// src/components/FeaturesSection.tsx
import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, MapPin, MessageCircle, Star, Users, Clock } from "lucide-react";

const FeaturesSection = () => {
  const { t, language } = useLanguage();

  const safeT = (key: string, fallbackFr: string, fallbackEn: string) => {
    const v = t(key);
    // Si la traduction n'est pas trouvée, certaines implémentations renvoient la clé.
    if (!v || v === key) return language === "fr" ? fallbackFr : fallbackEn;
    return v;
  };

  const features = [
    {
      icon: Shield,
      title: safeT("home.features.quality.title", "Qualité garantie", "Quality guaranteed"),
      description: safeT(
        "home.features.quality.desc",
        "Des professionnels vérifiés et évalués pour des prestations fiables.",
        "Verified, rated professionals for reliable services."
      ),
      color: "text-green-600",
    },
    {
      icon: MapPin,
      title: safeT("home.features.local.title", "Proche de vous", "Near you"),
      description: safeT(
        "home.features.local.desc",
        "Trouvez rapidement un prestataire dans votre zone.",
        "Quickly find a provider in your area."
      ),
      color: "text-blue-600",
    },
    {
      icon: MessageCircle,
      title: safeT("home.features.contact.title", "Contact rapide", "Fast contact"),
      description: safeT(
        "home.features.contact.desc",
        "Discutez et réservez en toute simplicité.",
        "Chat and book easily."
      ),
      color: "text-purple-600",
    },
  ];

  const stats = [
    {
      icon: Users,
      number: "2 500+",
      label: safeT("home.features.stats.pros", "Professionnels", "Professionals"),
    },
    {
      icon: Star,
      number: "4.8/5",
      label: safeT("home.features.stats.rating", "Note moyenne", "Average rating"),
    },
    {
      icon: Clock,
      number: "24h",
      label: safeT("home.features.stats.response", "Temps de réponse", "Response time"),
    },
    {
      icon: Shield,
      number: "100%",
      label: safeT("home.features.stats.verified", "Profils vérifiés", "Verified profiles"),
    },
  ];

  return (
    <section className="w-full bg-pro-light py-8 sm:py-10 lg:py-12">
      <div className="w-full px-4 sm:px-6 lg:px-10 2xl:px-16 min-w-0">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-pro-gray leading-tight">
            {safeT("home.features.title", "Pourquoi nous choisir", "Why choose us")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 min-w-0">
          {features.map((f, index) => (
            <div
              key={index}
              className="min-w-0 bg-white rounded-2xl p-5 sm:p-6 lg:p-8 shadow-sm hover:shadow-md transition-shadow animate-fade-in"
              style={{ animationDelay: `${index * 0.12}s` }}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <f.icon className={`w-7 h-7 sm:w-8 sm:h-8 ${f.color}`} />
                </div>

                <h3 className="text-lg sm:text-xl font-semibold text-pro-gray mb-2">
                  {f.title}
                </h3>

                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-6 lg:gap-8 mt-7 sm:mt-9 min-w-0">
          {stats.map((s, index) => (
            <div
              key={index}
              className="text-center animate-fade-in min-w-0"
              style={{ animationDelay: `${index * 0.12 + 0.3}s` }}
            >
              <s.icon className="w-6 h-6 sm:w-7 sm:h-7 text-pro-blue mx-auto mb-1.5" />
              <div className="text-lg sm:text-xl font-bold text-pro-gray">{s.number}</div>

              {/* ✅ “mettre ça normal” : éviter les retours bizarres, garder propre */}
              <div className="text-gray-600 text-xs sm:text-sm leading-snug whitespace-normal">
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
