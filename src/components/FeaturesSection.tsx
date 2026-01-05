import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, MapPin, MessageCircle, Star, Users, Clock } from "lucide-react";

const FeaturesSection = () => {
  const { t, language } = useLanguage();

  const cms = (key: string, fallbackFr: string, fallbackEn: string) => {
    const v = t(key);
    if (!v || v === key) return language === "fr" ? fallbackFr : fallbackEn;
    return v;
  };

  const features = [
    {
      icon: Shield,
      title: cms("home.features.card1.title", "Prestataires vérifiés", "Verified professionals"),
      description: cms(
        "home.features.card1.desc",
        "Profils contrôlés et informations utiles.",
        "Reviewed profiles with clear, useful details."
      ),
      color: "text-green-600",
    },
    {
      icon: MapPin,
      title: cms("home.features.card2.title", "Proche de vous", "Near you"),
      description: cms(
        "home.features.card2.desc",
        "Trouvez rapidement un prestataire dans votre zone.",
        "Quickly find a provider in your area."
      ),
      color: "text-blue-600",
    },
    {
      icon: MessageCircle,
      title: cms("home.features.card3.title", "Contact rapide", "Fast communication"),
      description: cms(
        "home.features.card3.desc",
        "Discutez et obtenez un devis simplement.",
        "Message providers and request a quote easily."
      ),
      color: "text-purple-600",
    },
  ];

  const stats = [
    {
      icon: Users,
      number: cms("home.features.stats.pros_value", "2 500+", "2,500+"),
      label: cms("home.features.stats.pros", "Professionnels", "Professionals"),
    },
    {
      icon: Star,
      number: cms("home.features.stats.rating_value", "4.8/5", "4.8/5"),
      label: cms("home.features.stats.rating", "Note moyenne", "Average rating"),
    },
    {
      icon: Clock,
      number: cms("home.features.stats.response_value", "24h", "24h"),
      label: cms("home.features.stats.response", "Temps de réponse", "Response time"),
    },
    {
      icon: Shield,
      number: cms("home.features.stats.verified_value", "100%", "100%"),
      label: cms("home.features.stats.verified", "Profils vérifiés", "Verified profiles"),
    },
  ];

  return (
    <section className="w-full bg-pro-light py-8 sm:py-10 lg:py-12">
      <div className="w-full px-4 sm:px-6 lg:px-10 2xl:px-16 min-w-0">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-pro-gray leading-tight">
            {cms("home.features.title", "Pourquoi ProxiServices ?", "Why choose ProxiServices?")}
          </h2>

          {/* Optionnel : si tu veux afficher un sous-titre CMS */}
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            {cms(
              "home.features.subtitle",
              "Des pros vérifiés, un contact simple, des avis utiles.",
              "Verified experts, streamlined communication, and reliable reviews."
            )}
          </p>
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

                <h3 className="text-lg sm:text-xl font-semibold text-pro-gray mb-2">{f.title}</h3>

                <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{f.description}</p>
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
              <div className="text-gray-600 text-xs sm:text-sm leading-snug whitespace-normal">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
