// src/pages/Index.tsx
import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import WorkerSearchSection from "@/components/WorkerSearchSection";
import SubscriptionSection from "@/components/SubscriptionSection";
import Footer from "@/components/Footer";

type SearchPayload = {
  keyword?: string;
  district?: string;
  lat?: string;
  lng?: string;
  near?: string;
};

const Index = () => {
  const location = useLocation();

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const headerEl = document.querySelector("header") as HTMLElement | null;
    const headerHeight = headerEl?.offsetHeight ?? 72;

    const y = el.getBoundingClientRect().top + window.scrollY - headerHeight - 8;
    window.scrollTo({ top: Math.max(y, 0), behavior: "smooth" });
  };

  const searchPayload: SearchPayload = useMemo(() => {
    const p = new URLSearchParams(location.search);
    const payload: SearchPayload = {};

    const keyword = p.get("keyword")?.trim();
    const district = p.get("district")?.trim();
    const lat = p.get("lat")?.trim();
    const lng = p.get("lng")?.trim();
    const near = p.get("near")?.trim();

    if (keyword) payload.keyword = keyword;
    if (district) payload.district = district;
    if (lat) payload.lat = lat;
    if (lng) payload.lng = lng;
    if (near) payload.near = near;

    return payload;
  }, [location.search]);

  // 1) Gestion des ancres (#search, #subscription, etc.)
  useEffect(() => {
    if (!location.hash) return;

    const id = location.hash.replace("#", "");
    const timeout = window.setTimeout(() => scrollToId(id), 120);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash]);

  // 2) Navigation /search ou /rechercher : scroll vers section search + transmission des filtres
  useEffect(() => {
    const { pathname } = location;

    const isSearchRoute = pathname === "/search" || pathname === "/rechercher";

    if (isSearchRoute) {
      // ✅ Transmettre les filtres (si présents) à WorkerSearchSection
      // - via sessionStorage (fallback)
      // - via event global (optionnel)
      const hasAny =
        !!searchPayload.keyword ||
        !!searchPayload.district ||
        !!searchPayload.lat ||
        !!searchPayload.lng ||
        !!searchPayload.near;

      if (hasAny) {
        try {
          sessionStorage.setItem("op:last_search", JSON.stringify(searchPayload));
        } catch {
          // ignore
        }

        try {
          window.dispatchEvent(
            new CustomEvent("op:search", {
              detail: searchPayload,
            })
          );
        } catch {
          // ignore
        }
      }

      // ✅ Toujours scroller vers la zone des résultats
      const timeout = window.setTimeout(() => scrollToId("search"), 80);
      return () => window.clearTimeout(timeout);
    }

    // 3) Accueil : remonter en haut
    if (pathname === "/") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [location.pathname, searchPayload]);

  return (
    <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-white flex flex-col">
      <Header />

      <main className="w-full flex-1 min-w-0">
        <HeroSection />

        <FeaturesSection />

        <div id="search" className="w-full scroll-mt-20 sm:scroll-mt-24">
          <WorkerSearchSection />
        </div>

        <div id="subscription" className="w-full scroll-mt-20 sm:scroll-mt-24">
          <SubscriptionSection />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
