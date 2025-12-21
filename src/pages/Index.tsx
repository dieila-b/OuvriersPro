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
        if (el) {
          const rect = el.getBoundingClientRect();
          const EXTRA_OFFSET = 520;
          const y = rect.top + window.scrollY + EXTRA_OFFSET;

          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }, 150);

      return () => clearTimeout(timeout);
    }
  }, []);

  // ✅ Scroll précis vers la section "search"
  const scrollToSearchSection = () => {
    const section = document.getElementById("search");
    if (!section) return;

    const headerEl = document.querySelector("header") as HTMLElement | null;
    const headerHeight = headerEl?.offsetHeight ?? 72;

    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    const EXTRA = 1;
    const y = Math.max(sectionTop - headerHeight - EXTRA, 0);

    window.scrollTo({ top: y, behavior: "smooth" });
  };

  useEffect(() => {
    const { pathname } = location;

    if (pathname === "/search" || pathname === "/rechercher") {
      const timeout = setTimeout(() => {
        scrollToSearchSection();
      }, 50);

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
        <HeroSection />

        {/* ✅ IMPORTANT: pas de wrapper py-* ici (sinon double padding) */}
        <FeaturesSection />

        <section
          id="search"
          className="w-full bg-white pt-0 pb-10 sm:pb-14 lg:pb-16 scroll-mt-24"
        >
          <WorkerSearchSection />
        </section>

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
