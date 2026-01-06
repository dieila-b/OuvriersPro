// src/components/SubscriptionSection.tsx
import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, BarChart3, Headphones, User } from "lucide-react";

const SubscriptionSection = () => {
  const { t, language } = useLanguage();

  const cms = (key: string, fallbackFr: string, fallbackEn: string) => {
    const v = t(key);
    if (!v || v === key) return language === "fr" ? fallbackFr : fallbackEn;
    return v;
  };

  const parseAmount = (s: string, fallback: number) => {
    const raw = (s ?? "").toString().replace(/\s/g, "").replace(/,/g, ".");
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };

  const formatPrice = (amount: number) => {
    try {
      return amount.toLocaleString(language === "fr" ? "fr-FR" : "en-US");
    } catch {
      return amount.toString();
    }
  };

  const plans = [
    {
      code: "FREE",
      name: cms("pricing.plan.free.name", "Gratuit", "Free"),
      price: parseAmount(cms("pricing.plan.free.price", "0", "0"), 0),
      period: cms("pricing.plan.free.period", "FG/mois", "GNF/month"),
      popular: false,
      isFree: true,
      features: [
        cms("pricing.plan.free.f1", "1 métier affiché", "1 listed trade"),
        cms("pricing.plan.free.f2", "Profil simplifié", "Simplified profile"),
        cms("pricing.plan.free.f3", "Nombre de contacts limité", "Limited number of contacts"),
        cms("pricing.plan.free.f4", "Pas de mise en avant", "No highlight in results"),
      ],
      btn: cms("pricing.plan.free.btn", "Choisir ce plan", "Choose this plan"),
    },
    {
      code: "MONTHLY",
      name: cms("pricing.plan.monthly.name", "Mensuel", "Monthly"),
      price: parseAmount(cms("pricing.plan.monthly.price", "5000", "5000"), 5000),
      period: cms("pricing.plan.monthly.period", "FG/mois", "GNF/month"),
      popular: true,
      isFree: false,
      features: [
        cms("pricing.plan.monthly.f1", "Profil professionnel complet", "Full professional profile"),
        cms("pricing.plan.monthly.f2", "Contacts clients illimités", "Unlimited client contacts"),
        cms("pricing.plan.monthly.f3", "Statistiques détaillées", "Detailed analytics"),
        cms("pricing.plan.monthly.f4", "Support prioritaire", "Priority support"),
      ],
      savings: cms("pricing.plan.monthly.ribbon", "Sans engagement", "No commitment"),
      badge: cms("pricing.plan.monthly.badge", "Populaire", "Popular"),
      btn: cms("pricing.plan.monthly.btn", "Choisir ce plan", "Choose this plan"),
    },
    {
      code: "YEARLY",
      name: cms("pricing.plan.yearly.name", "Annuel", "Yearly"),
      price: parseAmount(cms("pricing.plan.yearly.price", "50000", "50000"), 50000),
      period: cms("pricing.plan.yearly.period", "FG/an", "GNF/year"),
      popular: false,
      isFree: false,
      features: [
        cms("pricing.plan.yearly.f1", "Profil professionnel complet", "Full professional profile"),
        cms("pricing.plan.yearly.f2", "Contacts clients illimités", "Unlimited client contacts"),
        cms("pricing.plan.yearly.f3", "Statistiques détaillées", "Detailed analytics"),
        cms("pricing.plan.yearly.f4", "Support prioritaire", "Priority support"),
      ],
      savings: cms("pricing.plan.yearly.ribbon", "2 mois offerts", "2 months free"),
      btn: cms("pricing.plan.yearly.btn", "Choisir ce plan", "Choose this plan"),
    },
  ];

  const benefits = [
    {
      icon: User,
      title: cms("pricing.benefit1.title", "Profil vérifié", "Verified profile"),
      description: cms("pricing.benefit1.desc", "Badge de confiance sur votre profil", "Trust badge on your profile"),
    },
    {
      icon: BarChart3,
      title: cms("pricing.benefit2.title", "Analytics détaillés", "Detailed analytics"),
      description: cms("pricing.benefit2.desc", "Suivez vos performances et optimisez", "Track performance and optimize"),
    },
    {
      icon: Headphones,
      title: cms("pricing.benefit3.title", "Support dédié", "Dedicated support"),
      description: cms("pricing.benefit3.desc", "Assistance prioritaire 7j/7", "Priority support 7 days a week"),
    },
  ];

  return (
    <section id="subscription" className="w-full py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-4 sm:px-6 lg:px-10 2xl:px-16 min-w-0">
        <div className="text-center mb-10 sm:mb-12 lg:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-pro-gray mb-3 sm:mb-4">
            {cms("pricing.section.title", "Rejoignez ProxiServices", "Join ProxiServices")}
          </h2>
          <p className="text-sm sm:text-base md:text-xl text-gray-600 max-w-3xl mx-auto">
            {cms("pricing.section.subtitle", "Développez votre activité avec plus de visibilité", "Grow your business with more visibility")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 min-w-0">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative overflow-hidden transition-transform md:hover:scale-[1.02] ${
                plan.popular ? "ring-2 ring-pro-blue shadow-xl" : "shadow-lg"
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-pro-blue text-white text-center py-2">
                  <Badge className="bg-white text-pro-blue">
                    <Star className="w-3 h-3 mr-1" />
                    {plan.badge ?? (language === "fr" ? "Populaire" : "Popular")}
                  </Badge>
                </div>
              )}

              <CardHeader className={`text-center ${plan.popular ? "pt-12" : "pt-6"}`}>
                <CardTitle className="text-xl sm:text-2xl font-bold text-pro-gray">
                  {plan.name}
                </CardTitle>

                <div className="mt-4">
                  <span className="text-3xl sm:text-4xl font-bold text-pro-blue">
                    {formatPrice(plan.price)} <span className="text-xl sm:text-2xl">FG</span>
                  </span>
                  <span className="text-gray-600 text-sm sm:text-base">/{plan.period}</span>
                </div>

                {plan.savings && (
                  <Badge variant="secondary" className="mt-2 bg-green-100 text-green-700">
                    {plan.savings}
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700 text-sm sm:text-base">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full py-3 text-sm sm:text-base ${
                    plan.popular
                      ? "bg-pro-blue hover:bg-blue-700"
                      : plan.isFree
                      ? "bg-gray-800 hover:bg-gray-900"
                      : "bg-gray-700 hover:bg-gray-800"
                  }`}
                  onClick={() => {
                    window.location.href = `/inscription-ouvrier?plan=${plan.code}`;
                  }}
                >
                  {plan.btn}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mt-10 sm:mt-14 lg:mt-16 min-w-0">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center min-w-0">
              <div className="w-12 h-12 bg-pro-blue/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <benefit.icon className="w-6 h-6 text-pro-blue" />
              </div>
              <h3 className="font-semibold text-pro-gray mb-2 text-sm sm:text-base">{benefit.title}</h3>
              <p className="text-gray-600 text-xs sm:text-sm">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SubscriptionSection;
