// src/pages/Index.tsx
import React from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WorkerSearchSection from "@/components/WorkerSearchSection";
import SubscriptionSection from "@/components/SubscriptionSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen w-full bg-white overflow-x-hidden flex flex-col">
      <Header />

      {/* important: main full width sans wrappers bloquants */}
      <main className="w-full flex-1">
        {/* Hero (gère déjà son background + padding responsive) */}
        <HeroSection />

        {/* Pourquoi nous choisir (gère son layout) */}
        <section className="w-full bg-white">
          <FeaturesSection />
        </section>

        {/* Recherche d’ouvriers */}
        {/* ⚠️ ne pas remettre id="search" si WorkerSearchSection l’a déjà.
            Sinon garde ici pour l’ancre. */}
        <section id="search" className="w-full bg-white">
          <WorkerSearchSection />
        </section>

        {/* Formules d’abonnement */}
        <section
          id="subscription"
          className="w-full bg-gradient-to-br from-gray-50 to-gray-100"
        >
          <SubscriptionSection />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
