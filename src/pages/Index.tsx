import React from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import SearchSection from '@/components/SearchSection';
import SubscriptionSection from '@/components/SubscriptionSection';
import WorkerSearchSection from '@/components/WorkerSearchSection'; // ✅ AJOUT ICI
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main>
        <HeroSection />

        {/* 🔍 Nouvelle section de recherche ciblée ouvriers */}
        <WorkerSearchSection />

        <FeaturesSection />

        {/* Section recherche actuelle (si tu veux garder les deux) */}
        <SearchSection />

        {/* Section des formules : Gratuit / Mensuel / Annuel */}
        <SubscriptionSection />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
