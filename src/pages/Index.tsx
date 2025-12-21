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

  const getHeaderOffset = () => {
    const headerEl = document.querySelector("header") as HTMLElement | null;
    return headerEl?.offsetHeight ?? 72;
  };

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const headerOffset = getHeaderOffset();
    const top = el.getBoundingClientRect().top + window.scrollY;
    const y = Math.max(top - headerOffset - 8, 0);

    window.scrollTo({ top: y, behavior: "smooth" });
  };

  // ✅ Si URL contient un hash (#subscription, #faq, #contact, etc.), on scrolle proprement
  useEffect(() => {
    const hash = window.location.hash?.replace("#", "");
    if (!hash) return;

    const timeout = setTimeout(() => {
      scrollToId(hash);
    }, 80);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔍 Quand on arrive sur /search ou /rechercher, on scrolle vers la section "search"
  useEffect(() => {
    const { pathname } = location;

    if (pathname === "/search" || pathname === "/rechercher") {
      const timeout = setTimeout(() => {
        scrollToId("search");
      }, 80);

      return () => clearTimeout(timeout);
    }

    // Si on revient sur la home "/", on remonte en haut
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [location]);

  return (
    <div className="min-h-screen w-full bg-white overflow-x-hidden flex flex-col">
      <Header />

      <main className="w-full flex-1">
        {/* HERO */}
        <HeroSection />

        {/* FEATURES (ne pas rajouter de py ici : FeaturesSection gère déjà ses paddings) */}
        <FeaturesSection />

        {/* RECHERCHE OUVRIERS */}
        <section
          id="search"
          className="w-full bg-white py-10 sm:py-14 lg:py-16 scroll-mt-24"
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
