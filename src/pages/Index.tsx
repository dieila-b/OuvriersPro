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

  // ✅ Mesure réelle des overlays en haut (header + barres sticky/fixed)
  const getTopOverlayOffset = () => {
    const samplesX = [20, Math.floor(window.innerWidth / 2), window.innerWidth - 20];
    const yProbe = 6;

    let maxBottom = 0;

    const consider = (el: Element | null) => {
      if (!el) return;
      let cur: Element | null = el;

      while (cur) {
        const cs = window.getComputedStyle(cur as HTMLElement);
        const pos = cs.position;

        if (pos === "fixed" || pos === "sticky") {
          const r = (cur as HTMLElement).getBoundingClientRect();
          // élément collant en haut
          if (r.top <= 0 && r.height > 0) {
            maxBottom = Math.max(maxBottom, r.bottom);
          }
        }

        cur = cur.parentElement;
      }
    };

    for (const x of samplesX) {
      consider(document.elementFromPoint(x, yProbe));
    }

    // fallback header (au cas où elementFromPoint ne capte pas bien)
    const headerEl = document.querySelector("header") as HTMLElement | null;
    if (headerEl) {
      const r = headerEl.getBoundingClientRect();
      if (r.height > 0) maxBottom = Math.max(maxBottom, r.bottom);
    }

    return Math.max(0, Math.round(maxBottom));
  };

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

  // ✅ 2) Scroll ancres (#search, #subscription...) sur l’accueil (sans “vide” au-dessus)
  useEffect(() => {
    if (!isHomeRoute) return;
    if (!location.hash) return;

    const id = location.hash.replace("#", "");
    const el = document.getElementById(id);
    if (!el) return;

    const desiredGap = 6;

    const doScroll = () => {
      const overlay = getTopOverlayOffset();
      const targetTop = overlay + desiredGap;

      const rect = el.getBoundingClientRect();
      const delta = rect.top - targetTop;

      if (Math.abs(delta) > 1) {
        window.scrollBy({ top: delta, behavior: "auto" });
      }
    };

    const timeout = window.setTimeout(() => {
      // 1) scroll standard
      el.scrollIntoView({ block: "start", behavior: "smooth" });

      // 2) correction après layout (double RAF + micro-timeout)
      requestAnimationFrame(() => {
        doScroll();
        requestAnimationFrame(doScroll);
      });

      window.setTimeout(doScroll, 80);
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

          {/* ✅ Optionnel: enlever scroll-mt pour éviter tout offset additionnel */}
          <div id="search" className="w-full">
            <WorkerSearchSection />
          </div>

          <div id="subscription" className="w-full">
            <SubscriptionSection />
          </div>
        </>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
