// src/pages/Index.tsx
import { useEffect } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WorkerSearchSection from "@/components/WorkerSearchSection";
import SubscriptionSection from "@/components/SubscriptionSection";
import Footer from "@/components/Footer";

const Index = () => {
  // Quand on arrive sur /#subscription, on scrolle automatiquement
  useEffect(() => {
    if (window.location.hash === "#subscription") {
      // petit délai pour laisser la page se rendre
      setTimeout(() => {
        const el = document.getElementById("subscription");
        if (el) {
          // On va un peu PLUS BAS que le début de la section
          const rect = el.getBoundingClientRect();
          const y = rect.top + window.scrollY + 80; // +80px vers le bas

          window.scrollTo({
            top: y,
            behavior: "smooth",
          });
        }
      }, 150);
    }
  }, []);

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

        {/* RECHERCHE OUVRIERS */}
        <section
          id="search"
          className="w-full bg-white py-10 sm:py-14 lg:py-16 scroll-mt-20"
        >
          <WorkerSearchSection />
        </section>

        {/* FORFAITS / ABONNEMENTS */}
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
