// src/components/SubscriptionSection.tsx
import React, { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  /**
   * Plans additionnels masqués pour le moment.
   * On garde la structure, mais l'affichage reste centré sur l'inscription prestataire.
   */
  const SHOW_MONTHLY = false;
  const SHOW_YEARLY = false;

  /**
   * CTA Flow
   * - true  => CTA vers /devenir-prestataire
   * - false => CTA vers /inscription-ouvrier
   */
  const USE_BECOME_PROVIDER_FLOW = false;

  const cms = useCallback(
    (key: string, fallbackFr: string, fallbackEn: string) => {
      const v = t(key);
      if (!v || v === key) return language === "fr" ? fallbackFr : fallbackEn;
      return v;
    },
    [t, language]
  );

  const goToProviderFlow = useCallback(
    (planCode: string) => {
      const qs = `?plan=${encodeURIComponent(planCode)}`;
      const target = USE_BECOME_PROVIDER_FLOW
        ? `/devenir-prestataire${qs}`
        : `/inscription-ouvrier${qs}`;

      requestAnimationFrame(() => {
        navigate(target);
        try {
          window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        } catch {
          window.scrollTo(0, 0);
        }
      });
    },
    [navigate]
  );

  const plans = useMemo(() => {
    const all = [
      {
        code: "FREE" as const,
        name: cms(
          "pricing.plan.free.name",
          "Présence ProxiServices",
          "ProxiServices Presence"
        ),
        popular: false,
        isFree: true,
        description: cms(
          "pricing.plan.free.desc",
          "Créez votre profil professionnel, valorisez votre métier et commencez à recevoir des demandes de clients.",
          "Create your professional profile, showcase your trade, and start receiving client requests."
        ),
        valuePoints: [
          {
            icon: CheckCircle2,
            title: cms(
              "pricing.plan.free.v1t",
              "Votre profil visible en ligne",
              "Your profile visible online"
            ),
            desc: cms(
              "pricing.plan.free.v1d",
              "Présentez votre activité, vos compétences et vos informations essentielles avec un rendu professionnel.",
              "Present your business, skills, and key information with a professional look."
            ),
          },
          {
            icon: ShieldCheck,
            title: cms(
              "pricing.plan.free.v2t",
              "Plus de visibilité locale",
              "More local visibility"
            ),
            desc: cms(
              "pricing.plan.free.v2d",
              "Soyez trouvé plus facilement par des clients qui recherchent votre métier près de chez eux.",
              "Be discovered more easily by clients looking for your trade nearby."
            ),
          },
          {
            icon: Clock,
            title: cms(
              "pricing.plan.free.v3t",
              "Mise en ligne rapide",
              "Fast online setup"
            ),
            desc: cms(
              "pricing.plan.free.v3d",
              "Complétez votre profil en quelques étapes et commencez rapidement à développer votre présence.",
              "Complete your profile in a few steps and quickly grow your presence."
            ),
          },
        ],
        limits: [
          cms(
            "pricing.plan.free.f1",
            "Profil prestataire professionnel",
            "Professional provider profile"
          ),
          cms(
            "pricing.plan.free.f2",
            "Présence dans les recherches",
            "Presence in search results"
          ),
          cms(
            "pricing.plan.free.f3",
            "Mise en avant de votre activité",
            "Showcase your activity"
          ),
          cms(
            "pricing.plan.free.f4",
            "Accès simple et rapide à l’inscription",
            "Simple and fast onboarding access"
          ),
        ],
        btn: cms(
          "pricing.plan.free.btn",
          "Créer mon profil prestataire",
          "Create my provider profile"
        ),
      },
      {
        code: "MONTHLY" as const,
        name: cms("pricing.plan.monthly.name", "Mensuel", "Monthly"),
        popular: true,
        isFree: false,
        features: [
          cms(
            "pricing.plan.monthly.f1",
            "Profil professionnel complet",
            "Full professional profile"
          ),
          cms(
            "pricing.plan.monthly.f2",
            "Contacts clients illimités",
            "Unlimited client contacts"
          ),
          cms(
            "pricing.plan.monthly.f3",
            "Statistiques détaillées",
            "Detailed analytics"
          ),
          cms(
            "pricing.plan.monthly.f4",
            "Support prioritaire",
            "Priority support"
          ),
        ],
        savings: cms(
          "pricing.plan.monthly.ribbon",
          "Sans engagement",
          "No commitment"
        ),
        badge: cms("pricing.plan.monthly.badge", "Populaire", "Popular"),
        btn: cms("pricing.plan.monthly.btn", "Choisir ce plan", "Choose this plan"),
      },
      {
        code: "YEARLY" as const,
        name: cms("pricing.plan.yearly.name", "Annuel", "Yearly"),
        popular: false,
        isFree: false,
        features: [
          cms(
            "pricing.plan.yearly.f1",
            "Profil professionnel complet",
            "Full professional profile"
          ),
          cms(
            "pricing.plan.yearly.f2",
            "Contacts clients illimités",
            "Unlimited client contacts"
          ),
          cms(
            "pricing.plan.yearly.f3",
            "Statistiques détaillées",
            "Detailed analytics"
          ),
          cms(
            "pricing.plan.yearly.f4",
            "Support prioritaire",
            "Priority support"
          ),
        ],
        savings: cms(
          "pricing.plan.yearly.ribbon",
          "2 mois offerts",
          "2 months free"
        ),
        btn: cms("pricing.plan.yearly.btn", "Choisir ce plan", "Choose this plan"),
      },
    ];

    return all.filter((p) => {
      if (p.code === "MONTHLY") return SHOW_MONTHLY;
      if (p.code === "YEARLY") return SHOW_YEARLY;
      return true;
    });
  }, [cms]);

  const benefits = useMemo(
    () => [
      {
        icon: User,
        title: cms("pricing.benefit1.title", "Profil vérifié", "Verified profile"),
        description: cms(
          "pricing.benefit1.desc",
          "Renforcez la confiance avec une présentation professionnelle de votre activité.",
          "Build trust with a professional presentation of your activity."
        ),
      },
      {
        icon: BarChart3,
        title: cms(
          "pricing.benefit2.title",
          "Analytics détaillés",
          "Detailed analytics"
        ),
        description: cms(
          "pricing.benefit2.desc",
          "Suivez vos performances et optimisez votre visibilité.",
          "Track your performance and optimize your visibility."
        ),
      },
      {
        icon: Headphones,
        title: cms("pricing.benefit3.title", "Support dédié", "Dedicated support"),
        description: cms(
          "pricing.benefit3.desc",
          "Bénéficiez d’un accompagnement réactif pour avancer sereinement.",
          "Get responsive support to move forward with confidence."
        ),
      },
    ],
    [cms]
  );

  const onlyFree = plans.length === 1 && plans[0].code === "FREE";
  const gridClass = onlyFree
    ? "flex justify-center"
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 min-w-0";

  return (
    <section
      id="subscription"
      className="w-full bg-gradient-to-br from-gray-50 to-gray-100 py-12 sm:py-16 lg:py-20"
    >
      <div className="w-full min-w-0 px-4 sm:px-6 lg:px-10 2xl:px-16">
        <div className="mb-10 text-center sm:mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-sm shadow-sm">
            <Sparkles className="h-4 w-4 text-pro-blue" />
            <span className="font-medium text-pro-gray">
              {cms(
                "pricing.section.kicker",
                "Rejoignez ProxiServices",
                "Join ProxiServices"
              )}
            </span>
          </div>

          <h2 className="mt-4 mb-3 text-2xl font-extrabold text-pro-gray sm:mb-4 sm:text-3xl md:text-4xl">
            {cms(
              "pricing.section.title",
              "Développez votre activité avec plus de visibilité",
              "Grow your business with more visibility"
            )}
          </h2>

          <p className="mx-auto max-w-3xl text-sm text-gray-600 sm:text-base md:text-lg">
            {cms(
              "pricing.section.subtitle",
              "Publiez votre métier, inspirez confiance et recevez vos premiers contacts qualifiés.",
              "Publish your trade, build trust, and start receiving qualified leads."
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
                  "relative overflow-hidden rounded-2xl border-gray-200 transition-transform md:hover:scale-[1.01]",
                  isOnlyFreeCard
                    ? "w-full max-w-2xl shadow-xl"
                    : plan.popular
                    ? "ring-2 ring-pro-blue shadow-xl"
                    : "shadow-lg",
                ].join(" ")}
              >
                {isOnlyFreeCard && (
                  <div className="absolute top-4 right-4">
                    <Badge className="rounded-full bg-pro-blue/10 text-pro-blue hover:bg-pro-blue/10">
                      {cms(
                        "pricing.plan.free.badge",
                        "Idéal pour commencer",
                        "Perfect to get started"
                      )}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pt-6 pb-4">
                  <CardTitle className="text-xl font-bold text-pro-gray sm:text-2xl">
                    {plan.name}
                  </CardTitle>

                  {(plan as any).description && (
                    <p className="mt-1 text-sm text-gray-600">
                      {(plan as any).description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  {isFreePlan && (plan as any).valuePoints ? (
                    <div className="space-y-5">
                      <div className="grid gap-3">
                        {(plan as any).valuePoints.map(
                          (
                            vp: { icon: any; title: string; desc: string },
                            i: number
                          ) => (
                            <div key={i} className="flex items-start gap-3">
                              <vp.icon className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                              <div className="min-w-0">
                                <div className="font-semibold text-pro-gray">
                                  {vp.title}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {vp.desc}
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>

                      <div className="rounded-xl border bg-gray-50 p-4">
                        <div className="text-sm font-semibold text-pro-gray">
                          {cms(
                            "pricing.plan.free.included",
                            "Ce que vous obtenez",
                            "What you get"
                          )}
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
                    <ul className="mb-6 space-y-3 sm:mb-8 sm:space-y-4">
                      {(plan as any).features?.map(
                        (feature: string, featureIndex: number) => (
                          <li key={featureIndex} className="flex items-center">
                            <CheckCircle2 className="mr-3 h-5 w-5 flex-shrink-0 text-green-600" />
                            <span className="text-sm text-gray-700 sm:text-base">
                              {feature}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  )}

                  <Button
                    type="button"
                    className="h-11 w-full rounded-xl bg-pro-blue text-sm text-white hover:bg-pro-blue/90 sm:text-base"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      goToProviderFlow(plan.code);
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      {plan.btn}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 grid min-w-0 grid-cols-1 gap-6 sm:mt-14 sm:grid-cols-2 sm:gap-8 lg:mt-16 lg:grid-cols-3">
          {benefits.map((benefit, index) => (
            <div key={index} className="min-w-0 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-pro-blue/10">
                <benefit.icon className="h-6 w-6 text-pro-blue" />
              </div>
              <h3 className="mb-2 text-sm font-semibold text-pro-gray sm:text-base">
                {benefit.title}
              </h3>
              <p className="text-xs text-gray-600 sm:text-sm">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SubscriptionSection;
