// src/pages/Index.tsx
import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

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

  const hasAnySearchParam = useMemo(() => {
    return (
      !!searchPayload.keyword ||
      !!searchPayload.district ||
      !!searchPayload.lat ||
      !!searchPayload.lng ||
      !!searchPayload.near
    );
  }, [searchPayload]);

  // ✅ 0) Si on est sur /search ou /rechercher : on redirige vers l’accueil + #search
  // => un refresh ne te laissera plus “bloqué” sur la page recherche
  useEffect(() => {
    if (!isSearchRoute) return;
    if (redirectedRef.current) return;

    redirectedRef.current = true;

    // on conserve les filtres dans sessionStorage (utile pour pré-remplir)
    if (hasAnySearchParam) {
      try {
        sessionStorage.setItem("op:last_search", JSON.stringify(searchPayload));
      } catch {
        // ignore
      }
    }

    // on remplace l’URL /search?... par /?...#search (donc refresh = accueil)
    const target = `/${location.search || ""}#search`;
    navigate(target, { replace: true });
  }, [isSearchRoute, hasAnySearchParam, searchPayload, location.search, navigate]);

  // ✅ 1) Quand on arrive sur l’accueil avec #search + params : on notifie WorkerSearchSection
  useEffect(() => {
    if (!isHomeRoute) return;
    if (location.hash !== "#search") return;
    if (!hasAnySearchParam) return;

    try {
      window.dispatchEvent(
        new CustomEvent("op:search", {
          detail: searchPayload,
        })
      );
    } catch {
      // ignore
    }
  }, [isHomeRoute, location.hash, hasAnySearchParam, searchPayload]);

  // ✅ 2) Scroll ancres (#search, #subscription...) sur l’accueil
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

  // ✅ 3) Accueil : remonter en haut si pas d’ancre
  useEffect(() => {
    if (!isHomeRoute) return;
    if (location.hash) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [isHomeRoute, location.hash]);

  return (
    <div className="min-h-dvh w-full min-w-0 overflow-x-hidden bg-white flex flex-col">
      <Header />

      <main className="w-full flex-1 min-w-0">
        {/* ✅ On n’affiche PLUS un “mode /search” séparé.
            Tout passe par l’accueil + ancre #search */}
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
      </main>

      <Footer />
    </div>
  );
};

export default Index;
