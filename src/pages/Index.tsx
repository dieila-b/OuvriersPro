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
        if (!el) return;

        const headerEl = document.querySelector("header") as HTMLElement | null;
        const headerHeight = headerEl?.offsetHeight ?? 72;

        const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
        window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, []);

  const scrollToSearchSection = () => {
    const section = document.getElementById("search");
    if (!section) return;

    const headerEl = document.querySelector("header") as HTMLElement | null;
    const headerHeight = headerEl?.offsetHeight ?? 72;

    const top = section.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  };

  // 🔍 Quand on arrive sur /search ou /rechercher -> scroll vers section recherche
  useEffect(() => {
    const { pathname } = location;

    if (pathname === "/search" || pathname === "/rechercher") {
      const timeout = setTimeout(() => scrollToSearchSection(), 50);
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

        {/* FEATURES (⚠️ plus de wrapper qui rajoute du padding) */}
        <FeaturesSection />

        {/* RECHERCHE */}
        <section id="search" className="w-full scroll-mt-24">
          <WorkerSearchSection />
        </section>

        {/* ABONNEMENTS */}
        <section id="subscription" className="w-full scroll-mt-24">
          <SubscriptionSection />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
