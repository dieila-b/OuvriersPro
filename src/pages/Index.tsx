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

  const isSearchRoute = location.pathname === "/search" || location.pathname === "/rechercher";
  const isHomeRoute = location.pathname === "/";

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

  // 1) Sur /search (ou /rechercher) : on affiche DIRECTEMENT la section recherche (sans Hero/Features)
  //    + on remonte en haut (donc plus d'espace “au-dessus” lié au scroll et aux sections précédentes)
  useEffect(() => {
    if (!isSearchRoute) return;

    // transmettre les filtres si présents
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

    // important : top=0, pas de scroll “intermédiaire”
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [isSearchRoute, searchPayload]);

  // 2) Ancres (#search, #subscription, etc.) uniquement utiles sur l'accueil
  useEffect(() => {
    if (!isHomeRoute) return;
    if (!location.hash) return;

    const id = location.hash.replace("#", "");
    const el = document.getElementById(id);
    if (!el) return;

    const headerEl = document.querySelector("header") as HTMLElement | null;
    const headerHeight = headerEl?.offsetHeight ?? 72;

    const y = el.getBoundingClientRect().top + window.scrollY - headerHeight - 8;
    const timeout = window.setTimeout(() => {
      window.scrollTo({ top: Math.max(y, 0), behavior: "smooth" });
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [isHomeRoute, location.hash]);

  // 3) Accueil : remonter en haut
  useEffect(() => {
    if (!isHomeRoute) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [isHomeRoute]);

  return (
    <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-white flex flex-col">
      <Header />

      <main className="w-full flex-1 min-w-0">
        {isSearchRoute ? (
          // ✅ Page “Recherche” : on démarre directement sur WorkerSearchSection
          <WorkerSearchSection />
        ) : (
          // ✅ Accueil : Hero + Features + Recherche + Subscription
          <>
            <HeroSection />

            <FeaturesSection />

            <div id="search" className="w-full scroll-mt-20 sm:scroll-mt-24">
              <WorkerSearchSection />
            </div>

            <div id="subscription" className="w-full scroll-mt-20 sm:scroll-mt-24">
              <SubscriptionSection />
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Index;
