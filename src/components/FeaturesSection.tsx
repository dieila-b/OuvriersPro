// src/components/FeaturesSection.tsx
import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, MapPin, MessageCircle, Star, Users, Clock, Sparkles } from "lucide-react";

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
        "Profils contrôlés, informations claires et présence professionnelle rassurante.",
        "Reviewed profiles, clear information and a reassuring professional presence."
      ),
      accent: "from-emerald-500/15 to-emerald-100/50",
      iconColor: "text-emerald-600",
      ring: "ring-emerald-100",
    },
    {
      icon: MessageCircle,
      title: cms("home.features.card2.title", "Contact rapide", "Fast contact"),
      description: cms(
        "home.features.card2.desc",
        "Échangez facilement avec les prestataires et obtenez un premier contact sans complexité.",
        "Easily connect with providers and get a first contact without friction."
      ),
      accent: "from-blue-500/15 to-blue-100/50",
      iconColor: "text-blue-600",
      ring: "ring-blue-100",
    },
    {
      icon: Star,
      title: cms("home.features.card3.title", "Avis & confiance", "Reviews & trust"),
      description: cms(
        "home.features.card3.desc",
        "Consultez les évaluations pour choisir plus sereinement le bon professionnel.",
        "Use reviews to choose the right professional with more confidence."
      ),
      accent: "from-violet-500/15 to-violet-100/50",
      iconColor: "text-violet-600",
      ring: "ring-violet-100",
    },
  ];

  const stats = [
    {
      icon: Users,
      number: cms("home.stats.item1.value", "2 500+", "2,500+"),
      label: cms("home.stats.item1.label", "Professionnels", "Professionals"),
    },
    {
      icon: Star,
      number: cms("home.stats.item2.value", "4.8/5", "4.8/5"),
      label: cms("home.stats.item2.label", "Note moyenne", "Average rating"),
    },
    {
      icon: Clock,
      number: cms("home.stats.item3.value", "24h", "24h"),
      label: cms("home.stats.item3.label", "Temps de réponse", "Response time"),
    },
    {
      icon: Shield,
      number: cms("home.stats.item4.value", "100%", "100%"),
      label: cms("home.stats.item4.label", "Profils vérifiés", "Verified profiles"),
    },
  ];

  return (
    <section className="w-full bg-[linear-gradient(180deg,#f8fbff_0%,#f3f7fd_44%,#ffffff_100%)] py-12 sm:py-14 lg:py-18">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:px-16">
        <div className="mx-auto mb-8 max-w-3xl text-center sm:mb-10 lg:mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-700 shadow-sm sm:text-sm">
            <Sparkles className="h-4 w-4" />
            <span>
              {cms("home.features.kicker", "Pourquoi choisir ProxiServices", "Why choose ProxiServices")}
            </span>
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {cms("home.features.title", "Pourquoi ProxiServices ?", "Why ProxiServices?")}
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            {cms(
              "home.features.subtitle",
              "Des pros vérifiés, un contact simple, des avis utiles.",
              "Verified experts, simple contact, and helpful reviews."
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-6">
          {features.map((f, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_34px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_54px_rgba(15,23,42,0.10)] sm:p-7"
            >
              <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${f.accent}`} />

              <div className="relative">
                <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ${f.ring}`}>
                  <f.icon className={`h-8 w-8 ${f.iconColor}`} />
                </div>

                <h3 className="text-xl font-bold tracking-tight text-slate-900">
                  {f.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_16px_42px_rgba(15,23,42,0.06)] sm:mt-10">
          <div className="grid grid-cols-2 gap-y-0 md:grid-cols-4">
            {stats.map((s, index) => (
              <div
                key={index}
                className={`flex min-h-[140px] flex-col items-center justify-center px-4 py-6 text-center ${
                  index < stats.length - 1 ? "md:border-r md:border-slate-100" : ""
                } ${
                  index === 0 || index === 1 ? "border-b border-slate-100 md:border-b-0" : ""
                }`}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {s.number}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-slate-500 sm:text-sm">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
