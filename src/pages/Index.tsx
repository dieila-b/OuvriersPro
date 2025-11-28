// src/pages/Index.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WorkerSearchSection from "@/components/WorkerSearchSection";
import SubscriptionSection from "@/components/SubscriptionSection";
import Footer from "@/components/Footer";

const Index = () => {
  const location = useLocation();

  // 🎯 Gestion générale des ancres (#search, #subscription, etc.)
  useEffect(() => {
    const hash = location.hash || window.location.hash;
    if (!hash) return;

    const targetId = hash.replace("#", "");

    setTimeout(() => {
      const el = document.getElementById(targetId);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      let y: number;

      if (targetId === "subscription") {
        // Cas spécifique : tu souhaitais descendre sous la liste des ouvriers
        const EXTRA_OFFSET = 520;
        y = rect.top + window.scrollY + EXTRA_OFFSET;
      } else {
        // Pour #search (et autres sections), on tient compte de l'en-tête sticky
        const HEADER_OFFSET = 96; // ~ hauteur du header
        y = rect.top + window.scrollY - HEADER_OFFSET;
      }

      window.scrollTo({
        top: y,
        behavior: "smooth",
      });
    }, 100);
  }, [location.hash]);

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

        {/* RECHERCHE OUVRIERS : "Trouvez votre professionnel" */}
        <section
          id="search"
          className="w-full bg-white py-10 sm:py-14 lg:py-16 scroll-mt-20"
        >
          <WorkerSearchSection />
        </section>

        {/* ABONNEMENTS / FORFAITS */}
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
