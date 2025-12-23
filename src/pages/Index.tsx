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

  // ✅ utilitaire scroll (offset header sticky)
  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const headerEl = document.querySelector("header") as HTMLElement | null;
    const headerHeight = headerEl?.offsetHeight ?? 64;

    const y =
      el.getBoundingClientRect().top +
      window.scrollY -
      headerHeight -
      10;

    window.scrollTo({ top: Math.max(y, 0), behavior: "smooth" });
  };

  // ✅ si hash présent (ex: /#subscription)
  useEffect(() => {
    if (!window.location.hash) return;
    const id = window.location.hash.replace("#", "");
    const timeout = window.setTimeout(() => scrollToId(id), 120);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ routes /search et /rechercher => scroll vers section search
  useEffect(() => {
    const { pathname } = location;

    if (pathname === "/search" || pathname === "/rechercher") {
      const timeout = window.setTimeout(() => scrollToId("search"), 60);
      return () => window.clearTimeout(timeout);
    }

    // ✅ retour home : remet en haut (sans animation)
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [location.pathname]); // volontairement minimal

  return (
    // ✅ min-w-0 + overflow-x-clip = clé pour éviter “non responsive” sur certains layouts flex
    <div className="min-h-dvh w-full min-w-0 overflow-x-clip bg-white flex flex-col">
      <Header />

      {/* ✅ min-w-0 sur main aussi : évite les “largeurs imposées” par des enfants */}
      <main className="w-full flex-1 min-w-0">
        <HeroSection />

        <FeaturesSection />

        {/* ✅ Les ancres doivent être sur un bloc “neutre” (pas de padding parasite) */}
        <div
          id="search"
          className="w-full scroll-mt-20 sm:scroll-mt-24"
        >
          <WorkerSearchSection />
        </div>

        <div
          id="subscription"
          className="w-full scroll-mt-20 sm:scroll-mt-24"
        >
          <SubscriptionSection />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
