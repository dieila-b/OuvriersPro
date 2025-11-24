import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, BarChart3, Headphones, User } from "lucide-react";

const SubscriptionSection = () => {
  const { t, language } = useLanguage();

  // Petite fonction utilitaire pour formater les montants (5 000, 50 000…)
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
      name: language === "fr" ? "Gratuit" : "Free",
      price: 0,
      period: t("subscription.month"),
      popular: false,
      isFree: true,
      features:
        language === "fr"
          ? [
              "1 métier affiché",
              "Profil simplifié",
              "Nombre de contacts limité",
              "Pas de mise en avant",
            ]
          : [
              "1 listed trade",
              "Simplified profile",
              "Limited number of contacts",
              "No highlight in search results",
            ],
    },
    {
      code: "MONTHLY",
      name: t("subscription.monthly"),
      price: 5000, // 5 000 FG / mois
      period: t("subscription.month"),
      popular: true,
      isFree: false,
      features: [
        t("subscription.features.profile"),
        t("subscription.features.unlimited"),
        t("subscription.features.stats"),
        t("subscription.features.support"),
      ],
      savings: language === "fr" ? "Sans engagement" : "No commitment",
    },
    {
      code: "YEARLY",
      name: t("subscription.yearly"),
      price: 50000, // 50 000 FG / an
      period: t("subscription.year"),
      popular: false,
      isFree: false,
      features: [
        t("subscription.features.profile"),
        t("subscription.features.unlimited"),
        t("subscription.features.stats"),
        t("subscription.features.support"),
      ],
      savings: language === "fr" ? "2 mois offerts" : "2 months free",
    },
  ];

  return (
    <section
      id="subscription"
      className="py-12 sm:py-16 md:py-20 bg-gradient-to-br from-gray-50 to-gray-100"
    >
      <div className="container mx-auto px-4 sm:px-6 md:px-8">
        <div className="text-center mb-10 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-pro-gray mb-3 sm:mb-4 px-2">
            {t("subscription.title")}
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            {t("subscription.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative overflow-hidden transition-transform hover:scale-105 ${
                plan.popular ? "ring-2 ring-pro-blue shadow-xl" : "shadow-lg"
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-pro-blue text-white text-center py-2">
                  <Badge className="bg-white text-pro-blue">
                    <Star className="w-3 h-3 mr-1" />
                    Populaire
                  </Badge>
                </div>
              )}

              <CardHeader
                className={`text-center ${plan.popular ? "pt-12" : "pt-6"}`}
              >
                <CardTitle className="text-2xl font-bold text-pro-gray">
                  {plan.name}
                </CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-pro-blue">
                    {formatPrice(plan.price)}{" "}
                    <span className="text-2xl">FG</span>
                  </span>
                  <span className="text-gray-600">/{plan.period}</span>
                </div>
                {plan.savings && (
                  <Badge
                    variant="secondary"
                    className="mt-2 bg-green-100 text-green-700"
                  >
                    {plan.savings}
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full py-3 ${
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
                  {t("subscription.choose")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Avantages additionnels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mt-12 sm:mt-16 max-w-4xl mx-auto">
          {[
            {
              icon: User,
              title: "Profil vérifié",
              description: "Badge de confiance sur votre profil",
            },
            {
              icon: BarChart3,
              title: "Analytics détaillés",
              description: "Suivez vos performances et optimisez",
            },
            {
              icon: Headphones,
              title: "Support dédié",
              description: "Assistance prioritaire 7j/7",
            },
          ].map((benefit, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 bg-pro-blue/10 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <benefit.icon className="w-5 h-5 sm:w-6 sm:h-6 text-pro-blue" />
              </div>
              <h3 className="font-semibold text-pro-gray mb-2 text-sm sm:text-base">
                {benefit.title}
              </h3>
              <p className="text-gray-600 text-xs sm:text-sm">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SubscriptionSection;
