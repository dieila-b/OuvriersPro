// src/pages/Index.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import SubscriptionSection from "@/components/SubscriptionSection";
import Footer from "@/components/Footer";

const Index = () => {
  const location = useLocation();

  /**
   * Règle n°1:
   * Index = HOME seulement.
   * On gère uniquement:
   *  - scroll vers #subscription quand on vient avec ce hash
   *  - reset scroll en haut quand on arrive sur /
   *
   * ✅ On SUPPRIME tout comportement qui scrolle vers "search"
   * depuis /search ou /rechercher, car ce n’est pas la responsabilité
   * de la home.
   */
  useEffect(() => {
    // Si on arrive sur la home: on remonte en haut (sans animation)
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [location.pathname]);

  /**
   * Gestion du hash (ex: /#subscription)
   * - Pas d'offset artificiel énorme
   * - On tient compte d'un header sticky si besoin
   */
  useEffect(() => {
    if (location.pathname !== "/") return;

    const hash = (location.hash || "").replace("#", "");
    if (!hash) return;

    const timeout = window.setTimeout(() => {
      const el = document.getElementById(hash);
      if (!el) return;

      const headerEl = document.querySelector("header") as HTMLElement | null;
      const headerHeight = headerEl?.offsetHeight ?? 72;

      const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 12;

      window.scrollTo({
        top: Math.max(top, 0),
        left: 0,
        behavior: "smooth",
      });
    }, 100);

    return () => window.clearTimeout(timeout);
  }, [location.pathname, location.hash]);

  return (
    <div className="min-h-screen w-full bg-white overflow-x-hidden flex flex-col">
      <Header />

      <main className="w-full flex-1">
        {/* HERO: contient la zone de recherche */}
        <HeroSection />

        {/* FEATURES */}
        <section className="w-full bg-white py-10 sm:py-14 lg:py-16">
          <FeaturesSection />
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
