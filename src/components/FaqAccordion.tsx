// src/components/FaqAccordion.tsx
import React, { useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

type Category =
  | "all"
  | "home_services"
  | "health"
  | "it"
  | "tutoring"
  | "business"
  | "payments"
  | "account"
  | "reviews"
  | "security";

type FaqItem = {
  id: string;
  category: Exclude<Category, "all">;
  q: { fr: string; en: string };
  a: { fr: string; en: string };
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "what-is",
    category: "business",
    q: {
      fr: "Qu’est-ce que ProxiServices ?",
      en: "What is ProxiServices?",
    },
    a: {
      fr: "ProxiServices est une plateforme qui met en relation des clients (particuliers et entreprises) avec des prestataires vérifiés : artisans, médecins, informaticiens, répétiteurs, et bien d’autres services.",
      en: "ProxiServices is a marketplace that connects customers (individuals and businesses) with verified providers: home services, doctors, IT experts, tutors, and more.",
    },
  },
  {
    id: "how-search",
    category: "business",
    q: {
      fr: "Comment rechercher un prestataire ?",
      en: "How do I search for a provider?",
    },
    a: {
      fr: "Utilise la barre de recherche (métier/nom) et indique ton quartier si besoin. Tu peux ensuite affiner avec les filtres (région, ville, prix, note, etc.).",
      en: "Use the search bar (trade/name) and optionally enter your district. You can then refine results with filters (region, city, price, rating, etc.).",
    },
  },
  {
    id: "categories",
    category: "business",
    q: {
      fr: "Quels types de services sont disponibles ?",
      en: "What service categories are available?",
    },
    a: {
      fr: "Services à domicile (plomberie, électricité…), santé (médecins…), IT (développeurs, techniciens…), cours (répétiteurs…), et d’autres services professionnels.",
      en: "Home services (plumbing, electrical…), health (doctors…), IT (developers, technicians…), tutoring, and other professional services.",
    },
  },
  {
    id: "create-account",
    category: "account",
    q: { fr: "Dois-je créer un compte pour utiliser ProxiServices ?", en: "Do I need an account to use ProxiServices?" },
    a: {
      fr: "Tu peux parcourir et rechercher sans compte. Pour contacter un prestataire, laisser un avis, enregistrer des favoris ou gérer tes demandes, la connexion est requise.",
      en: "You can browse and search without an account. To contact providers, leave reviews, save favorites, or manage requests, you must sign in.",
    },
  },
  {
    id: "contact-provider",
    category: "business",
    q: { fr: "Comment contacter un prestataire ?", en: "How can I contact a provider?" },
    a: {
      fr: "Ouvre sa fiche et clique sur “Contacter”. Tu peux ensuite échanger via la messagerie intégrée.",
      en: "Open the provider profile and click “Contact”. You can then chat using the built-in messaging.",
    },
  },
  {
    id: "pricing",
    category: "payments",
    q: { fr: "Les tarifs sont-ils fixes ?", en: "Are prices fixed?" },
    a: {
      fr: "Chaque prestataire définit ses tarifs. Tu peux filtrer par prix maximum et comparer selon la note, l’expérience et la disponibilité.",
      en: "Each provider sets their own pricing. You can filter by max price and compare by rating, experience, and availability.",
    },
  },
  {
    id: "reviews",
    category: "reviews",
    q: { fr: "Comment laisser un avis ?", en: "How do I leave a review?" },
    a: {
      fr: "Après une prestation, va sur la fiche du prestataire et laisse une note + commentaire. Les avis aident la communauté et améliorent la confiance.",
      en: "After a service, go to the provider profile and leave a rating + comment. Reviews help the community and build trust.",
    },
  },
  {
    id: "safety",
    category: "security",
    q: { fr: "Comment ProxiServices sécurise la plateforme ?", en: "How does ProxiServices keep the platform safe?" },
    a: {
      fr: "Nous encourageons la vérification des profils, l’historique d’avis, et des échanges via la messagerie. Signale tout comportement suspect via le support.",
      en: "We promote profile verification, review history, and in-app messaging. Report any suspicious behavior via support.",
    },
  },
];

const CATEGORY_LABELS: Record<Category, { fr: string; en: string }> = {
  all: { fr: "Toutes", en: "All" },
  home_services: { fr: "Services à domicile", en: "Home services" },
  health: { fr: "Santé", en: "Health" },
  it: { fr: "Informatique", en: "IT" },
  tutoring: { fr: "Cours / Répétiteurs", en: "Tutoring" },
  business: { fr: "Général", en: "General" },
  payments: { fr: "Paiement / Tarifs", en: "Payments / Pricing" },
  account: { fr: "Compte", en: "Account" },
  reviews: { fr: "Avis", en: "Reviews" },
  security: { fr: "Sécurité", en: "Safety" },
};

export default function FaqAccordion() {
  const { language } = useLanguage();
  const [category, setCategory] = useState<Category>("all");

  const items = useMemo(() => {
    if (category === "all") return FAQ_ITEMS;
    return FAQ_ITEMS.filter((x) => x.category === category);
  }, [category]);

  return (
    <div className="w-full">
      {/* Filtre catégories */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => {
          const active = c === category;
          return (
            <Button
              key={c}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              className={active ? "bg-pro-blue hover:bg-blue-700" : ""}
              onClick={() => setCategory(c)}
            >
              {language === "fr" ? CATEGORY_LABELS[c].fr : CATEGORY_LABELS[c].en}
            </Button>
          );
        })}
      </div>

      {/* Accordion */}
      <Accordion type="single" collapsible className="w-full">
        {items.map((it) => (
          <AccordionItem key={it.id} value={it.id} className="border-b border-gray-200">
            <AccordionTrigger className="text-left text-pro-gray">
              {language === "fr" ? it.q.fr : it.q.en}
            </AccordionTrigger>
            <AccordionContent className="text-gray-600 leading-relaxed">
              {language === "fr" ? it.a.fr : it.a.en}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {items.length === 0 && (
        <div className="mt-6 text-sm text-gray-600">
          {language === "fr"
            ? "Aucune question pour cette catégorie pour le moment."
            : "No questions in this category yet."}
        </div>
      )}
    </div>
  );
}
