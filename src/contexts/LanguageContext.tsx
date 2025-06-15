
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  fr: {
    // Header
    'nav.search': 'Rechercher',
    'nav.subscribe': 'S\'abonner',
    'nav.faq': 'FAQ',
    'nav.contact': 'Contact',
    
    // Home page
    'home.title': 'Trouvez le bon ouvrier pour vos travaux',
    'home.subtitle': 'Connectez-vous avec des professionnels qualifiés près de chez vous',
    'home.search.placeholder': 'Rechercher un métier ou service...',
    'home.location.placeholder': 'Votre ville ou code postal',
    'home.search.button': 'Rechercher',
    'home.features.title': 'Pourquoi choisir OuvriersPro ?',
    'home.features.quality.title': 'Professionnels vérifiés',
    'home.features.quality.desc': 'Tous nos ouvriers sont contrôlés et certifiés',
    'home.features.local.title': 'Proximité garantie',
    'home.features.local.desc': 'Trouvez des professionnels dans votre région',
    'home.features.contact.title': 'Contact direct',
    'home.features.contact.desc': 'Échangez directement avec les artisans',
    
    // Search page
    'search.title': 'Trouvez votre professionnel',
    'search.filters': 'Filtres',
    'search.trade': 'Métier',
    'search.location': 'Localisation',
    'search.price': 'Prix par heure',
    'search.rating': 'Note minimum',
    'search.results': 'résultats trouvés',
    
    // Worker profile
    'profile.contact': 'Contacter',
    'profile.hourly.rate': 'Tarif horaire',
    'profile.service.area': 'Zone d\'intervention',
    'profile.experience': 'Expérience',
    'profile.reviews': 'Avis clients',
    'profile.years': 'ans d\'expérience',
    
    // Subscription
    'subscription.title': 'Rejoignez OuvriersPro',
    'subscription.subtitle': 'Développez votre activité avec plus de visibilité',
    'subscription.monthly': 'Mensuel',
    'subscription.yearly': 'Annuel',
    'subscription.month': 'mois',
    'subscription.year': 'an',
    'subscription.features.profile': 'Profil professionnel complet',
    'subscription.features.unlimited': 'Contacts clients illimités',
    'subscription.features.stats': 'Statistiques détaillées',
    'subscription.features.support': 'Support prioritaire',
    'subscription.choose': 'Choisir ce plan',
    
    // Common
    'common.euro': '€',
    'common.loading': 'Chargement...',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
  },
  en: {
    // Header
    'nav.search': 'Search',
    'nav.subscribe': 'Subscribe',
    'nav.faq': 'FAQ',
    'nav.contact': 'Contact',
    
    // Home page
    'home.title': 'Find the right professional for your projects',
    'home.subtitle': 'Connect with qualified professionals near you',
    'home.search.placeholder': 'Search for a trade or service...',
    'home.location.placeholder': 'Your city or postal code',
    'home.search.button': 'Search',
    'home.features.title': 'Why choose OuvriersPro?',
    'home.features.quality.title': 'Verified professionals',
    'home.features.quality.desc': 'All our workers are checked and certified',
    'home.features.local.title': 'Local proximity',
    'home.features.local.desc': 'Find professionals in your area',
    'home.features.contact.title': 'Direct contact',
    'home.features.contact.desc': 'Communicate directly with craftsmen',
    
    // Search page
    'search.title': 'Find your professional',
    'search.filters': 'Filters',
    'search.trade': 'Trade',
    'search.location': 'Location',
    'search.price': 'Price per hour',
    'search.rating': 'Minimum rating',
    'search.results': 'results found',
    
    // Worker profile
    'profile.contact': 'Contact',
    'profile.hourly.rate': 'Hourly rate',
    'profile.service.area': 'Service area',
    'profile.experience': 'Experience',
    'profile.reviews': 'Customer reviews',
    'profile.years': 'years of experience',
    
    // Subscription
    'subscription.title': 'Join OuvriersPro',
    'subscription.subtitle': 'Grow your business with more visibility',
    'subscription.monthly': 'Monthly',
    'subscription.yearly': 'Yearly',
    'subscription.month': 'month',
    'subscription.year': 'year',
    'subscription.features.profile': 'Complete professional profile',
    'subscription.features.unlimited': 'Unlimited customer contacts',
    'subscription.features.stats': 'Detailed statistics',
    'subscription.features.support': 'Priority support',
    'subscription.choose': 'Choose this plan',
    
    // Common
    'common.euro': '€',
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
  }
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('fr');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['fr']] || key;
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
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
