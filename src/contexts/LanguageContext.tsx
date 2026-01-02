// src/contexts/LanguageContext.tsx
import React, { createContext, useContext, useState, ReactNode } from "react";

type Language = "fr" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  fr: {
    // Header
    "nav.search": "Rechercher",
    "nav.subscribe": "S'abonner",
    "nav.faq": "FAQ",
    "nav.contact": "Contact",

    // Home page (✅ plus général + ✅ marque ProxiServices)
    "home.title": "Trouvez le bon professionnel pour votre besoin",
    "home.subtitle": "Connectez-vous avec des prestataires qualifiés près de chez vous",
    "home.search.placeholder": "Rechercher un métier ou service...",
    "home.quartier.placeholder": "Quartier",
    "home.location.placeholder": "Votre ville ou code postal",
    "home.search.button": "Rechercher",

    "home.features.title": "Pourquoi choisir ProxiServices ?",
    "home.features.quality.title": "Professionnels vérifiés",
    "home.features.quality.desc": "Des prestataires évalués pour des prestations fiables",
    "home.features.local.title": "Proximité garantie",
    "home.features.local.desc": "Trouvez rapidement un prestataire dans votre zone",
    "home.features.contact.title": "Contact direct",
    "home.features.contact.desc": "Échangez directement avec les prestataires",

    // Search page
    "search.title": "Trouvez votre professionnel",
    "search.filters": "Filtres",
    "search.trade": "Métier",
    "search.location": "Localisation",
    "search.price": "Prix par heure",
    "search.rating": "Note minimum",
    "search.results": "résultats trouvés",

    // Profile (labels génériques, tu peux les garder)
    "profile.contact": "Contacter",
    "profile.hourly.rate": "Tarif horaire",
    "profile.service.area": "Zone d'intervention",
    "profile.experience": "Expérience",
    "profile.reviews": "Avis clients",
    "profile.years": "ans d'expérience",

    // Subscription (✅ marque ProxiServices)
    "subscription.title": "Rejoignez ProxiServices",
    "subscription.subtitle": "Développez votre activité avec plus de visibilité",
    "subscription.monthly": "Mensuel",
    "subscription.yearly": "Annuel",
    "subscription.month": "mois",
    "subscription.year": "an",
    "subscription.features.profile": "Profil professionnel complet",
    "subscription.features.unlimited": "Contacts clients illimités",
    "subscription.features.stats": "Statistiques détaillées",
    "subscription.features.support": "Support prioritaire",
    "subscription.choose": "Choisir ce plan",

    // Common
    "common.euro": "€",
    "common.loading": "Chargement...",
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
  },
  en: {
    // Header
    "nav.search": "Search",
    "nav.subscribe": "Subscribe",
    "nav.faq": "FAQ",
    "nav.contact": "Contact",

    // Home page (✅ more general + ✅ brand ProxiServices)
    "home.title": "Find the right professional for your needs",
    "home.subtitle": "Connect with qualified providers near you",
    "home.search.placeholder": "Search for a trade or service...",
    "home.quartier.placeholder": "District",
    "home.location.placeholder": "Your city or postal code",
    "home.search.button": "Search",

    "home.features.title": "Why choose ProxiServices?",
    "home.features.quality.title": "Verified professionals",
    "home.features.quality.desc": "Rated providers for reliable services",
    "home.features.local.title": "Local proximity",
    "home.features.local.desc": "Quickly find a provider in your area",
    "home.features.contact.title": "Direct contact",
    "home.features.contact.desc": "Chat directly with providers",

    // Search page
    "search.title": "Find your professional",
    "search.filters": "Filters",
    "search.trade": "Trade",
    "search.location": "Location",
    "search.price": "Price per hour",
    "search.rating": "Minimum rating",
    "search.results": "results found",

    // Profile
    "profile.contact": "Contact",
    "profile.hourly.rate": "Hourly rate",
    "profile.service.area": "Service area",
    "profile.experience": "Experience",
    "profile.reviews": "Customer reviews",
    "profile.years": "years of experience",

    // Subscription (✅ brand ProxiServices)
    "subscription.title": "Join ProxiServices",
    "subscription.subtitle": "Grow your business with more visibility",
    "subscription.monthly": "Monthly",
    "subscription.yearly": "Yearly",
    "subscription.month": "month",
    "subscription.year": "year",
    "subscription.features.profile": "Complete professional profile",
    "subscription.features.unlimited": "Unlimited customer contacts",
    "subscription.features.stats": "Detailed statistics",
    "subscription.features.support": "Priority support",
    "subscription.choose": "Choose this plan",

    // Common
    "common.euro": "€",
    "common.loading": "Loading...",
    "common.save": "Save",
    "common.cancel": "Cancel",
  },
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("fr");

  const t = (key: string): string => {
    const dict = translations[language] as Record<string, string>;
    return dict[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
