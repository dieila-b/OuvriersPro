// src/components/SubscriptionSection.tsx
import React, { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
   * Plans futurs conservés côté structure,
   * mais totalement masqués dans l'affichage actuel.
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

  const goToProviderFlow = useCallback(() => {
    const target = USE_BECOME_PROVIDER_FLOW
      ? "/devenir-prestataire"
      : "/inscription-ouvrier";

    requestAnimationFrame(() => {
      navigate(target);
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      } catch {
        window.scrollTo(0, 0);
      }
    });
  }, [navigate]);

  /**
   * Bloc marketing central unique
   * => on sort complètement de la logique "forfaits / plans"
   */
  const marketingHighlights = useMemo(
    () => [
      {
        icon: CheckCircle2,
        title: cms(
          "pricing.marketing.v1t",
          "Votre profil visible en ligne",
          "Your profile visible online"
        ),
        desc: cms(
          "pricing.marketing.v1d",
          "Présentez votre activité, vos compétences et vos coordonnées dans un espace professionnel, clair et rassurant.",
          "Show your business, skills, and contact details in a professional, clear, and reassuring space."
        ),
      },
      {
        icon: ShieldCheck,
        title: cms(
          "pricing.marketing.v2t",
          "Plus de visibilité locale",
          "More local visibility"
        ),
        desc: cms(
          "pricing.marketing.v2d",
          "Soyez trouvé plus facilement par des clients qui recherchent votre métier près de chez eux.",
          "Be found more easily by clients looking for your trade near them."
        ),
      },
      {
        icon: Clock,
        title: cms(
          "pricing.marketing.v3t",
          "Mise en ligne rapide",
          "Fast onboarding"
        ),
        desc: cms(
          "pricing.marketing.v3d",
          "Complétez votre profil en quelques étapes et commencez rapidement à développer votre présence.",
          "Complete your profile in a few steps and quickly start growing your presence."
        ),
      },
    ],
    [cms]
  );

  const marketingBullets = useMemo(
    () => [
      cms(
        "pricing.marketing.b1",
        "Profil prestataire professionnel",
        "Professional provider profile"
      ),
      cms(
        "pricing.marketing.b2",
        "Présence dans les recherches",
        "Presence in search results"
      ),
      cms(
        "pricing.marketing.b3",
        "Valorisation de votre activité",
        "Enhanced presentation of your activity"
      ),
      cms(
        "pricing.marketing.b4",
        "Inscription simple et rapide",
        "Simple and fast onboarding"
      ),
    ],
    [cms]
  );

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

  /**
   * Conserve la structure technique pour l’avenir,
   * mais sans rien afficher des offres futures.
   */
  const hasFuturePlans = SHOW_MONTHLY || SHOW_YEARLY;

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

        <div className="flex justify-center">
          <Card className="relative w-full max-w-3xl overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.10)]">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-20 right-0 h-44 w-44 rounded-full bg-pro-blue/5 blur-3xl" />
              <div className="absolute -bottom-20 left-0 h-44 w-44 rounded-full bg-blue-100/40 blur-3xl" />
            </div>

            <CardContent className="relative p-5 sm:p-7 lg:p-8">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pro-blue/10 text-pro-blue">
                        <Sparkles className="h-6 w-6" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-xl font-bold tracking-tight text-pro-gray sm:text-2xl">
                          {cms(
                            "pricing.marketing.card_title",
                            "Présence ProxiServices",
                            "ProxiServices Presence"
                          )}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-gray-600">
                          {cms(
                            "pricing.marketing.card_desc",
                            "Créez votre profil professionnel, valorisez votre métier et commencez à recevoir des demandes de clients.",
                            "Create your professional profile, showcase your trade, and start receiving client requests."
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Badge className="rounded-full border border-blue-100 bg-pro-blue/10 px-3 py-1 text-pro-blue hover:bg-pro-blue/10">
                      {cms(
                        "pricing.marketing.badge",
                        "Idéal pour commencer",
                        "Perfect to get started"
                      )}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-4">
                  {marketingHighlights.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-2xl border border-transparent px-1 py-0.5"
                    >
                      <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                      <div className="min-w-0">
                        <div className="font-semibold text-pro-gray">{item.title}</div>
                        <div className="text-sm leading-relaxed text-gray-600">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 sm:p-5">
                  <div className="text-sm font-semibold text-pro-gray">
                    {cms(
                      "pricing.marketing.included",
                      "Ce que vous obtenez",
                      "What you get"
                    )}
                  </div>

                  <ul className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                    {marketingBullets.map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-pro-blue shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    className="h-12 w-full rounded-2xl bg-pro-blue text-sm font-semibold text-white shadow-[0_10px_24px_rgba(59,130,246,0.24)] hover:bg-pro-blue/90 sm:text-base"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      goToProviderFlow();
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      {cms(
                        "pricing.marketing.btn",
                        "Créer mon profil prestataire",
                        "Create my provider profile"
                      )}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </Button>

                  <p className="text-center text-xs leading-relaxed text-gray-500">
                    {cms(
                      "pricing.marketing.note",
                      "Rejoignez ProxiServices et présentez votre activité à des clients qui recherchent déjà vos services.",
                      "Join ProxiServices and present your activity to clients already searching for your services."
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {hasFuturePlans && (
          <div className="hidden" aria-hidden="true" />
        )}

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
