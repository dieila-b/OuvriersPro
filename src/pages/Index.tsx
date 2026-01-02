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

  const isSearchRoute = useMemo(() => {
    const p = location.pathname;
    return p === "/search" || p === "/rechercher";
  }, [location.pathname]);

  const scrollToId = (id: string, behavior: ScrollBehavior = "auto") => {
    const el = document.getElementById(id);
    if (!el) return;

    const headerEl = document.querySelector("header") as HTMLElement | null;
    const headerHeight = headerEl?.offsetHeight ?? 72;

    const y = el.getBoundingClientRect().top + window.scrollY - headerHeight - 8;
    window.scrollTo({ top: Math.max(y, 0), behavior });
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

  // 1) Gestion des ancres (#worker-search, #subscription, etc.)
  useEffect(() => {
    if (!location.hash) return;

    const id = location.hash.replace("#", "");
    const t = window.setTimeout(() => scrollToId(id, "smooth"), 80);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.hash]);

  // 2) /search ou /rechercher : on AFFICHERA directement la section (sans Hero/Features)
  //    + on transmet les filtres au WorkerSearchSection (sessionStorage + event)
  useEffect(() => {
    if (!isSearchRoute) return;

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

    // Comme on masque Hero/Features sur /search, on force l’arrivée propre en haut de la section
    const t = window.setTimeout(() => scrollToId("worker-search", "auto"), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearchRoute, searchPayload]);

  // 3) Accueil "/" : remonter en haut
  useEffect(() => {
    if (location.pathname === "/") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [location.pathname]);

  return (
    <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-white flex flex-col">
      <Header />

      <main className="w-full flex-1 min-w-0">
        {/* Sur /search (/rechercher) on enlève Hero + Features pour arriver DIRECTEMENT sur la recherche */}
        {!isSearchRoute && (
          <>
            <HeroSection />
            <FeaturesSection />
          </>
        )}

        <div id="worker-search" className="w-full scroll-mt-20 sm:scroll-mt-24">
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
