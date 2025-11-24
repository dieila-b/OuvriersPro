import React from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WorkerSearchSection from "@/components/WorkerSearchSection";
import SubscriptionSection from "@/components/SubscriptionSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen w-full bg-white">
      <Header />

      <main className="w-full overflow-x-hidden">
        {/* Hero en pleine largeur */}
        <section className="w-full bg-pro-blue text-white overflow-hidden">
          <HeroSection />
        </section>

        {/* Bloc "Pourquoi nous choisir" */}
        <section className="w-full bg-white overflow-hidden">
          <FeaturesSection />
        </section>

        {/* Recherche d'ouvriers */}
        <section id="search" className="w-full bg-white overflow-hidden">
          <WorkerSearchSection />
        </section>

        {/* Formules d'abonnement */}
        <section id="subscription" className="w-full bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          <SubscriptionSection />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
