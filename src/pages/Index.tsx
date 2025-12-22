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

  // ✅ scroll vers subscription si hash présent
  useEffect(() => {
    if (window.location.hash === "#subscription") {
      const timeout = setTimeout(() => {
        const el = document.getElementById("subscription");
        if (!el) return;

        const headerEl = document.querySelector("header") as HTMLElement | null;
        const headerHeight = headerEl?.offsetHeight ?? 64;

        const y =
          el.getBoundingClientRect().top + window.scrollY - headerHeight - 10;

        window.scrollTo({ top: Math.max(y, 0), behavior: "smooth" });
      }, 150);

      return () => clearTimeout(timeout);
    }
  }, []);

  const scrollToSearchSection = () => {
    const section = document.getElementById("search");
    if (!section) return;

    const headerEl = document.querySelector("header") as HTMLElement | null;
    const headerHeight = headerEl?.offsetHeight ?? 64;

    const y =
      section.getBoundingClientRect().top + window.scrollY - headerHeight - 10;

    window.scrollTo({ top: Math.max(y, 0), behavior: "smooth" });
  };

  useEffect(() => {
    const { pathname } = location;

    if (pathname === "/search" || pathname === "/rechercher") {
      const timeout = setTimeout(scrollToSearchSection, 50);
      return () => clearTimeout(timeout);
    }

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

        {/* ✅ IMPORTANT: plus de wrapper <section> avec py-xx autour
            car chaque composant a déjà son propre <section> */}
        <FeaturesSection />

        {/* ✅ Wrapper neutre seulement pour l’ID + scroll */}
        <div id="search" className="scroll-mt-24">
          <WorkerSearchSection />
        </div>

        <div id="subscription" className="scroll-mt-24">
          <SubscriptionSection />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
