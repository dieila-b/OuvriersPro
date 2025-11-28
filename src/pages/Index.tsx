// src/pages/Index.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WorkerSearchSection from "@/components/WorkerSearchSection";
import SubscriptionSection from "@/components/SubscriptionSection";
import Footer from "@/components/Footer";

const HEADER_OFFSET = 96; // hauteur approximative du header sticky
const EXTRA_SUBSCRIPTION_OFFSET = 520; // pour descendre sous la liste des ouvriers

const Index = () => {
  const location = useLocation();

  // Gestion centralisée de tous les hash (#search, #subscription, etc.)
  useEffect(() => {
    const hash = location.hash || window.location.hash;
    if (!hash) return;

    const id = hash.replace("#", "");
    const el = document.getElementById(id);
    if (!el) return;

    const rect = el.getBoundingClientRect();

    // Offset de base pour éviter que le titre soit caché par le header
    let offset = HEADER_OFFSET;

    // Cas particulier pour la section forfaits : on descend plus bas
    if (id === "subscription") {
      offset = -EXTRA_SUBSCRIPTION_OFFSET;
    }

    const y = rect.top + window.scrollY - offset;

    window.scrollTo({
      top: y,
      behavior: "smooth",
    });
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
