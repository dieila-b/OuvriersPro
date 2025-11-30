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
      const timeout = setTimeout(() => {
        const el = document.getElementById("subscription");
        if (el) {
          const rect = el.getBoundingClientRect();
          const EXTRA_OFFSET = 520; // uniquement pour les forfaits
          const y = rect.top + window.scrollY + EXTRA_OFFSET;

          window.scrollTo({
            top: y,
            behavior: "smooth",
          });
        }
      }, 150);

      return () => clearTimeout(timeout);
    }
  }, []);

  // 👉 Scroll précis vers la section "search"
  const scrollToSearchSection = () => {
    const section = document.getElementById("search");
    if (!section) return;

    // Hauteur réelle du header sticky
    const headerEl = document.querySelector("header") as HTMLElement | null;
    const headerHeight = headerEl?.offsetHeight ?? 72;

    // Position absolue de la section sur la page
    const rect = section.getBoundingClientRect();
    const sectionTop = rect.top + window.scrollY;

    // Offset NEGATIF pour supprimer le liseré blanc
    const EXTRA = 40; // ajuste à 30 / 50 si besoin
    const y = sectionTop - headerHeight - EXTRA;

    window.scrollTo({
      top: y,
      behavior: "smooth",
    });
  };

  // 🔍 Quand on arrive sur /search ou /rechercher,
  // on scrolle directement sur "Trouvez votre professionnel"
  useEffect(() => {
    const { pathname } = location;

    if (pathname === "/search" || pathname === "/rechercher") {
      const timeout = setTimeout(() => {
        scrollToSearchSection();
      }, 50);

      return () => clearTimeout(timeout);
    }

    // Si on revient sur la home "/", on remonte en haut de la page
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
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

        {/* RECHERCHE OUVRIERS : "Trouvez votre professionnel" */}
        <section
          id="search"
          // plus aucun padding top pour éviter le blanc
          className="w-full bg-white pt-0 pb-10 sm:pt-0 sm:pb-14 lg:pt-0 lg:pb-16"
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
