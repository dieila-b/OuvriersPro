// src/components/SubscriptionSection.tsx
import React, { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  BarChart3,
  Headphones,
  User,
} from "lucide-react";

const SubscriptionSection = () => {
  const { t, language } = useLanguage();

  /**
   * ✅ Plans payants masqués provisoirement
   * Pour réactiver plus tard: passer ces flags à true.
   */
  const SHOW_MONTHLY = false;
  const SHOW_YEARLY = false;

  /**
   * ✅ CTA Flow
   * - true  => CTA vers /devenir-prestataire (⚠️ route doit exister)
   * - false => CTA vers /inscription-ouvrier (direct) ✅
   */
  const USE_BECOME_PROVIDER_FLOW = false;

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

  const goToProviderFlow = (planCode: string) => {
    const qs = `?plan=${encodeURIComponent(planCode)}`;
    const target = USE_BECOME_PROVIDER_FLOW ? `/devenir-prestataire${qs}` : `/inscription-ouvrier${qs}`;
    window.location.assign(target);
  };

  const plans = useMemo(() => {
    const all = [
      {
        code: "FREE" as const,
        name: cms("pricing.plan.free.name", "Gratuit", "Free"),
        price: parseAmount(cms("pricing.plan.free.price", "0", "0"), 0),
        period: cms("pricing.plan.free.period", "mois", "month"),
        popular: false,
        isFree: true,
        description: cms(
          "pricing.plan.free.desc",
          "Pour créer votre profil et apparaître dans les recherches.",
          "Create your profile and appear in search results."
        ),
        valuePoints: [
          {
            icon: CheckCircle2,
            title: cms("pricing.plan.free.v1t", "Votre profil en ligne", "Your online profile"),
            desc: cms(
              "pricing.plan.free.v1d",
              "Présentez votre métier, votre zone et vos infos de contact.",
              "Show your trade, service area and contact info."
            ),
          },
          {
            icon: ShieldCheck,
            title: cms("pricing.plan.free.v2t", "Apparition dans les recherches", "Shown in search results"),
            desc: cms(
              "pricing.plan.free.v2d",
              "Les clients vous trouvent par métier et quartier.",
              "Clients can find you by trade and area."
            ),
          },
          {
            icon: Clock,
            title: cms("pricing.plan.free.v3t", "Mise en route rapide", "Fast setup"),
            desc: cms(
              "pricing.plan.free.v3d",
              "Profil simplifié pour démarrer en quelques minutes.",
              "Simple setup to get started in minutes."
            ),
          },
        ],
        limits: [
          cms("pricing.plan.free.f1", "1 métier affiché", "1 listed trade"),
          cms("pricing.plan.free.f2", "Profil simplifié", "Simplified profile"),
          cms("pricing.plan.free.f3", "Contacts limités (pour tester)", "Limited contacts (to try)"),
          cms("pricing.plan.free.f4", "Pas de mise en avant (bientôt)", "No boost (coming soon)"),
        ],
        btn: cms("pricing.plan.free.btn", "Créer mon profil gratuitement", "Create my profile for free"),
      },
      {
        code: "MONTHLY" as const,
        name: cms("pricing.plan.monthly.name", "Mensuel", "Monthly"),
        price: parseAmount(cms("pricing.plan.monthly.price", "5000", "5000"), 5000),
        period: cms("pricing.plan.monthly.period", "mois", "month"),
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
        code: "YEARLY" as const,
        name: cms("pricing.plan.yearly.name", "Annuel", "Yearly"),
        price: parseAmount(cms("pricing.plan.yearly.price", "50000", "50000"), 50000),
        period: cms("pricing.plan.yearly.period", "an", "year"),
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

    return all.filter((p) => {
      if (p.code === "MONTHLY") return SHOW_MONTHLY;
      if (p.code === "YEARLY") return SHOW_YEARLY;
      return true;
    });
  }, [language, t]);

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

  const onlyFree = plans.length === 1 && plans[0].code === "FREE";
  const gridClass = onlyFree
    ? "flex justify-center"
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 min-w-0";

  const currency = cms("pricing.currency", "FG", "GNF");

  return (
    <section id="subscription" className="w-full py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full px-4 sm:px-6 lg:px-10 2xl:px-16 min-w-0">
        <div className="text-center mb-10 sm:mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm shadow-sm">
            <Sparkles className="h-4 w-4 text-pro-blue" />
            <span className="font-medium text-pro-gray">
              {cms("pricing.section.kicker", "Rejoignez ProxiServices", "Join ProxiServices")}
            </span>
          </div>

          <h2 className="mt-4 text-2xl sm:text-3xl md:text-4xl font-extrabold text-pro-gray mb-3 sm:mb-4">
            {cms(
              "pricing.section.title",
              "Développez votre activité avec plus de visibilité",
              "Grow your business with more visibility"
            )}
          </h2>

          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto">
            {cms(
              "pricing.section.subtitle",
              "Commencez gratuitement, publiez votre métier et recevez vos premiers contacts.",
              "Start for free, publish your trade and get your first leads."
            )}
          </p>
        </div>

        <div className={gridClass}>
          {plans.map((plan, index) => {
            const isFreePlan = (plan as any).isFree;
            const isOnlyFreeCard = onlyFree && plan.code === "FREE";

            return (
              <Card
                key={index}
                className={[
                  "relative overflow-hidden transition-transform md:hover:scale-[1.01] rounded-2xl border-gray-200",
                  isOnlyFreeCard ? "w-full max-w-2xl shadow-xl" : plan.popular ? "ring-2 ring-pro-blue shadow-xl" : "shadow-lg",
                ].join(" ")}
              >
                {isOnlyFreeCard && (
                  <div className="absolute top-4 right-4">
                    <Badge className="rounded-full bg-pro-blue/10 text-pro-blue hover:bg-pro-blue/10">
                      {cms("pricing.plan.free.badge", "Idéal pour démarrer", "Best to start")}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pt-6 pb-4">
                  <CardTitle className="text-xl sm:text-2xl font-bold text-pro-gray">{plan.name}</CardTitle>

                  {(plan as any).description && <p className="mt-1 text-sm text-gray-600">{(plan as any).description}</p>}

                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-extrabold text-pro-blue leading-none">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-lg sm:text-xl font-semibold text-pro-blue">{currency}</span>
                    </div>
                    <div className="text-sm text-gray-600">/{plan.period}</div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {isFreePlan && (plan as any).valuePoints ? (
                    <div className="space-y-5">
                      <div className="grid gap-3">
                        {(plan as any).valuePoints.map((vp: { icon: any; title: string; desc: string }, i: number) => (
                          <div key={i} className="flex items-start gap-3">
                            <vp.icon className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <div className="font-semibold text-pro-gray">{vp.title}</div>
                              <div className="text-sm text-gray-600">{vp.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl border bg-gray-50 p-4">
                        <div className="text-sm font-semibold text-pro-gray">
                          {cms("pricing.plan.free.included", "Inclus dans Gratuit", "Included in Free")}
                        </div>
                        <ul className="mt-2 grid gap-2 text-sm text-gray-700">
                          {(plan as any).limits.map((item: string, i: number) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-pro-blue" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                      {(plan as any).features?.map((feature: string, featureIndex: number) => (
                        <li key={featureIndex} className="flex items-center">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                          <span className="text-gray-700 text-sm sm:text-base">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Button
                    className="w-full h-11 rounded-xl text-sm sm:text-base bg-pro-blue hover:bg-pro-blue/90 text-white"
                    onClick={() => goToProviderFlow(plan.code)}
                  >
                    <span className="inline-flex items-center gap-2">
                      {plan.btn}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Button>

                  {plan.isFree && (
                    <p className="mt-3 text-center text-xs text-gray-500">
                      {cms(
                        "pricing.plan.free.note",
                        "Aucun paiement requis. Vous pourrez passer à une formule supérieure dès qu’elle sera disponible.",
                        "No payment required. You can upgrade later when Pro plans are available."
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {onlyFree && (
          <div className="mt-8 mx-auto max-w-2xl">
            <div className="rounded-2xl border bg-white p-4 shadow-sm text-center">
              <div className="font-semibold text-pro-gray">
                {cms("pricing.comingsoon.title", "Bientôt : formules Pro", "Coming soon: Pro plans")}
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {cms(
                  "pricing.comingsoon.desc",
                  "Mise en avant, plusieurs métiers, contacts illimités, badge vérifié… (en préparation).",
                  "Boost, multiple trades, unlimited leads, verified badge… (in progress)."
                )}
              </p>
            </div>
          </div>
        )}

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
