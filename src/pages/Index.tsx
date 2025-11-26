// src/pages/Index.tsx
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";

import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WorkerSearchSection from "@/components/WorkerSearchSection";
import SubscriptionSection from "@/components/SubscriptionSection";
import Footer from "@/components/Footer";

const Index: React.FC = () => {
  const location = useLocation();

  // Si on arrive avec ?scroll=subscription, on descend automatiquement
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("scroll") === "subscription") {
      // On laisse le temps au DOM de se rendre
      setTimeout(() => {
        const el = document.getElementById("subscription");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 0);
    }
  }, [location]);

  return (
    <div className="min-h-screen w-full bg-white overflow-x-hidden flex flex-col">
      <Header />

      {/* Main full width */}
      <main className="w-full flex-1">
        {/* HERO : contient la zone de recherche */}
        <HeroSection />

        {/* FEATURES */}
        <section className="w-full bg-white py-10 sm:py-14 lg:py-16">
          <FeaturesSection />
        </section>

        {/* RECHERCHE OUVRIERS (aperçu / section) */}
        <section
          id="search"
          className="w-full bg-white py-10 sm:py-14 lg:py-16 scroll-mt-20"
        >
          <WorkerSearchSection />
        </section>

        {/* ABONNEMENTS */}
        <section
          id="subscription"
          className="w-full bg-gradient-to-br from-gray-50 to-gray-100 py-10 sm:py-14 lg:py-16 scroll-mt-20"
        >
          <SubscriptionSection />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
