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

  // 🎯 Scroll automatique vers la section forfaits quand on arrive sur /#subscription
  useEffect(() => {
    if (window.location.hash === "#subscription") {
      setTimeout(() => {
        const el = document.getElementById("subscription");
        if (el) {
          const rect = el.getBoundingClientRect();

          // 🔧 Offset plus fort pour descendre sous la liste des ouvriers
          const EXTRA_OFFSET = 520; // ajuste si besoin
          const y = rect.top + window.scrollY + EXTRA_OFFSET;

          window.scrollTo({
            top: y,
            behavior: "smooth",
          });
        }
      }, 150);
    }
  }, []);

  // 🔍 Quand on arrive sur /search, on scrolle directement sur "Trouvez votre professionnel"
  useEffect(() => {
    if (location.pathname === "/search") {
      const el = document.getElementById("search");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [location.pathname]);

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
