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
  MapPin,
} from "lucide-react";

const SubscriptionSection = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const SHOW_MONTHLY = false;
  const SHOW_YEARLY = false;
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
        icon: MapPin,
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

  const hasFuturePlans = SHOW_MONTHLY || SHOW_YEARLY;

  return (
    <section
      id="subscription"
      className="w-full bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_45%,#f5f8fc_100%)] py-14 sm:py-16 lg:py-20"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:px-16">
        <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-12 lg:mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-700 shadow-sm sm:text-sm">
            <Sparkles className="h-4 w-4" />
            <span>
              {cms(
                "pricing.section.kicker",
                "Rejoignez ProxiServices",
                "Join ProxiServices"
              )}
            </span>
          </div>

          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            {cms(
              "pricing.section.title",
              "Développez votre activité avec plus de visibilité",
              "Grow your business with more visibility"
            )}
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base md:text-lg">
            {cms(
              "pricing.section.subtitle",
              "Publiez votre métier, inspirez confiance et recevez vos premiers contacts qualifiés.",
              "Publish your trade, build trust, and start receiving qualified leads."
            )}
          </p>
        </div>

        <div className="relative mx-auto flex max-w-5xl justify-center">
          <div className="absolute -top-10 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="absolute right-0 top-1/3 h-40 w-40 rounded-full bg-indigo-300/10 blur-3xl" />

          <Card className="relative w-full overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.12)]">
            <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(37,99,235,0.08)_0%,rgba(255,255,255,0)_100%)]" />
            <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-sky-300/10 blur-3xl" />

            <CardContent className="relative p-5 sm:p-7 lg:p-9">
              <div className="flex flex-col gap-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100">
                        <Sparkles className="h-6 w-6" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                          {cms(
                            "pricing.marketing.card_title",
                            "Présence ProxiServices",
                            "ProxiServices Presence"
                          )}
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
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
                    <Badge className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-50">
                      {cms(
                        "pricing.marketing.badge",
                        "Idéal pour commencer",
                        "Perfect to get started"
                      )}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {marketingHighlights.map((item, i) => (
                    <div
                      key={i}
                      className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
                    >
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-700 ring-1 ring-slate-100">
                        <item.icon className="h-5 w-5" />
                      </div>

                      <div className="text-base font-semibold text-slate-900">
                        {item.title}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">
                        {item.desc}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-[24px] border border-blue-100 bg-blue-50/50 p-5">
                  <div className="text-sm font-semibold text-slate-900">
                    {cms(
                      "pricing.marketing.included",
                      "Ce que vous obtenez",
                      "What you get"
                    )}
                  </div>

                  <ul className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                    {marketingBullets.map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    className="h-14 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(37,99,235,0.24)] hover:from-blue-700 hover:to-blue-700 sm:text-base"
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

                  <p className="text-center text-xs leading-6 text-slate-500 sm:text-sm">
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

        {hasFuturePlans && <div className="hidden" aria-hidden="true" />}

        <div className="mt-10 grid grid-cols-1 gap-5 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="rounded-[26px] border border-slate-200 bg-white p-6 text-center shadow-[0_12px_34px_rgba(15,23,42,0.06)]"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <benefit.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-base font-bold tracking-tight text-slate-900">
                {benefit.title}
              </h3>
              <p className="text-sm leading-6 text-slate-600">
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
