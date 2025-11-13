import React from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import FeaturesSection from '@/components/FeaturesSection';
import WorkerSearchSection from '@/components/WorkerSearchSection'; 
import SubscriptionSection from '@/components/SubscriptionSection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />

        {/* 🔎 Nouvelle section de recherche dynamique */}
        <WorkerSearchSection />

        <SubscriptionSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
