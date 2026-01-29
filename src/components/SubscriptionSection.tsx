// src/components/SubscriptionSection.tsx
import React, { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles, ArrowRight } from "lucide-react";

const SubscriptionSection = () => {
  const { t, language } = useLanguage();

  const SHOW_MONTHLY = false;
  const SHOW_YEARLY = false;

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

  const plans = useMemo(() => {
    const all = [
      {
        code: "FREE" as const,
        name: cms("pricing.plan.free.name", "Gratuit", "Free"),
        price: parseAmount(cms("pricing.plan.free.price", "0", "0"), 0),
        period: cms("pricing.plan.free.period", "mois", "month"),
        popular: true, // ✅ on met en avant le seul plan
        isFree: true,
        intro: cms(
          "pricing.plan.free.intro",
          "Pour créer votre profil et apparaître dans les recherches.",
          "Create your profile and appear in searches."
        ),
        highlights: [
          {
            title: cms("pricing.plan.free.h1", "Votre profil en ligne", "Your profile online"),
            desc: cms(
              "pricing.plan.free.h1d",
              "Présentez votre métier, votre zone et vos infos de contact.",
              "Show your trade, area and contact details."
            ),
          },
          {
            title: cms("pricing.plan.free.h2", "Apparition dans les recherches", "Appear in searches"),
            desc: cms(
              "pricing.plan.free.h2d",
              "Les clients vous trouvent par métier et quartier.",
              "Clients find you by trade and area."
            ),
          },
          {
            title: cms("pricing.plan.free.h3", "Mise en route rapide", "Quick start"),
            desc: cms(
              "pricing.plan.free.h3d",
              "Profil simplifié pour démarrer en quelques minutes.",
              "A simplified profile to start in minutes."
            ),
          },
        ],
        includedTitle: cms("pricing.plan.free.included", "Inclus dans Gratuit", "Included in Free"),
        features: [
          cms("pricing.plan.free.f1", "1 métier affiché", "1 listed trade"),
          cms("pricing.plan.free.f2", "Profil simplifié", "Simplified profile"),
          cms("pricing.plan.free.f3", "Contacts limités (pour tester)", "Limited contacts (to try)"),
          cms("pricing.plan.free.f4", "Pas de mise en avant (bientôt)", "No highlight (soon)"),
        ],
        cta: cms(
          "pricing.plan.free.btn",
          "Choisir ce plan",
          "Choose this plan"
        ),
      },
      {
        code: "MONTHLY" as const,
        name: cms("pricing.plan.monthly.name", "Mensuel", "Monthly"),
        price: parseAmount(cms("pricing.plan.monthly.price", "5000", "5000"), 5000),
        period: cms("pricing.plan.monthly.period", "mois", "month"),
        popular: true,
        isFree: false,
        features: [],
        cta: cms("pricing.plan.monthly.btn", "Choisir ce plan", "Choose this plan"),
      },
      {
        code: "YEARLY" as const,
        name: cms("pricing.plan.yearly.name", "Annuel", "Yearly"),
        price: parseAmount(cms("pricing.plan.yearly.price", "50000", "50000"), 50000),
        period: cms("pricing.plan.yearly.period", "an", "year"),
        popular: false,
        isFree: false,
        features: [],
        cta: cms("pricing.plan.yearly.btn", "Choisir ce plan", "Choose this plan"),
      },
    ];

    return all.filter((p) => {
      if (p.code === "MONTHLY") return SHOW_MONTHLY;
      if (p.code === "YEARLY") return SHOW_YEARLY;
      return true;
    });
  }, [language, t]);

  const onlyFree = plans.length === 1 && plans[0].code === "FREE";

  return (
    <section id="subscription" className="w-full py-12 sm:py-16 lg:py-20 bg-gray-50">
      {/* ✅ même “espace” que ta page forfait: centré + largeur fixe */}
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-pro-gray">
              {cms("pricing.section.title", "Choisissez votre forfait", "Choose your plan")}
            </h2>
            <p className="mt-2 text-sm sm:text-base md:text-lg text-gray-600">
              {cms(
                "pricing.section.subtitle",
                "Sélectionnez un forfait pour accéder au formulaire d'inscription prestataire.",
                "Select a plan to access the provider signup form."
              )}
            </p>
          </div>

          <div className={onlyFree ? "flex justify-center" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"}>
            {plans.map((plan) => (
              <Card
                key={plan.code}
                className={[
                  "w-full",
                  onlyFree ? "max-w-3xl" : "",
                  "shadow-lg border border-gray-200",
                ].join(" ")}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-xl sm:text-2xl font-bold text-pro-gray">
                      {plan.name}
                    </CardTitle>

                    {plan.isFree && (
                      <Badge className="bg-pro-blue/10 text-pro-blue border border-pro-blue/20">
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        {cms("pricing.plan.free.tag", "Idéal pour démarrer", "Best to start")}
                      </Badge>
                    )}
                  </div>

                  {("intro" in plan) && (plan as any).intro && (
                    <p className="text-sm text-gray-600 mt-2">
                      {(plan as any).intro}
                    </p>
                  )}

                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div className="flex items-end gap-2">
                      <span className="text-4xl sm:text-5xl font-bold text-pro-blue">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-xl sm:text-2xl font-semibold text-pro-blue">FG</span>
                    </div>

                    <div className="text-gray-600 text-sm sm:text-base">
                      /{("period" in plan) ? (plan as any).period : cms("pricing.period", "mois", "month")}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* ✅ Blocs “à la capture” */}
                  {"highlights" in plan && Array.isArray((plan as any).highlights) && (
                    <div className="space-y-4 mb-6">
                      {(plan as any).highlights.map((h: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-pro-gray">{h.title}</div>
                            <div className="text-sm text-gray-600">{h.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ✅ Encadré “Inclus” */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="font-semibold text-pro-gray mb-3">
                      {"includedTitle" in plan ? (plan as any).includedTitle : cms("pricing.included", "Inclus", "Included")}
                    </div>

                    <ul className="space-y-2">
                      {(plan.features ?? []).map((f, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="mt-2 h-2 w-2 rounded-full bg-pro-blue flex-shrink-0" />
                          <span className="text-sm text-gray-700">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* ✅ CTA => /forfaits (même page que ta capture) */}
                  <div className="mt-6">
                    <Button
                      className="w-full rounded-xl py-6 text-base font-semibold bg-pro-blue hover:bg-pro-blue/90"
                      onClick={() => {
                        window.location.href = "/forfaits";
                      }}
                    >
                      {cms("pricing.plan.free.cta", "Choisir ce plan", "Choose this plan")}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>

                    <p className="mt-3 text-xs sm:text-sm text-gray-500 text-center">
                      {cms(
                        "pricing.plan.free.note",
                        "Aucun paiement requis. Vous pourrez passer à une formule supérieure dès qu’elle sera disponible.",
                        "No payment required. You can upgrade as soon as higher plans are available."
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ✅ bandeau “Bientôt Pro” comme la capture */}
          <div className="mt-10 flex justify-center">
            <div className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-4 text-center">
              <div className="font-semibold text-pro-gray">
                {cms("pricing.soon.title", "Bientôt : formules Pro", "Coming soon: Pro plans")}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {cms(
                  "pricing.soon.desc",
                  "Mise en avant, plusieurs métiers, contacts illimités, badge vérifié… (en préparation).",
                  "Highlights, multiple trades, unlimited contacts, verified badge… (in progress)."
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default SubscriptionSection;
