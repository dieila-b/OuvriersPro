// src/App.tsx
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";

// Pages publiques
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import InscriptionOuvrier from "./pages/InscriptionOuvrier";
import WorkerDetail from "./pages/WorkerDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MonCompte from "./pages/MonCompte";

// ✅ Forfaits
import Forfaits from "./pages/Forfaits";

// ✅ FAQ + pages publiques
import Faq from "./pages/Faq";
import About from "./pages/About";
import Partners from "./pages/Partners";

// ✅ Pages légales
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import CookiesPolicy from "./pages/Cookies";

// ✅ Admin FAQ Questions
import AdminFaqQuestions from "./pages/AdminFaqQuestions";

// ✅ Admin: CMS Contenu du site
import AdminContent from "./pages/AdminContent";

// ✅ Admin: Signalements
import AdminReports from "./pages/AdminReports";

// Back-office Admin
import AdminOuvrierContacts from "./pages/AdminOuvrierContacts";
import AdminOuvrierInscriptions from "./pages/AdminOuvrierInscriptions";
import AdminDashboard from "./pages/AdminDashboard";
import AdminAds from "./pages/AdminAds";

// ✅ Admin Journal de connexions
import AdminLoginJournalPage from "./pages/admin/AdminLoginJournalPage";

// Espace ouvrier connecté
import WorkerDashboard from "./pages/WorkerDashboard";
import WorkerMessagesPage from "./pages/WorkerMessagesPage";
import WorkerReviewsPage from "./pages/WorkerReviews";

// Espace Client / Particulier
import ClientDashboard from "./pages/ClientDashboard";
import ClientProfile from "./pages/ClientProfile";
import ClientRequestsList from "./pages/ClientRequestsList";
import ClientMessagesPage from "./pages/ClientMessagesPage";
import ClientFavoritesList from "./pages/ClientFavoritesList";
import ClientReviews from "./pages/ClientReviews";
import ClientContactForm from "./pages/ClientContactForm";

// Protection routes
import PrivateRoute from "./components/PrivateRoute";

// ✅ Layout admin
import AdminLayout from "@/components/layout/AdminLayout";

const queryClient = new QueryClient();

function ScrollManager() {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash?.replace("#", "");
    if (!hash) return;

    const t = window.setTimeout(() => {
      const el = document.getElementById(hash);
      if (!el) return;

      const headerEl = document.querySelector("header") as HTMLElement | null;
      const headerHeight = headerEl?.offsetHeight ?? 72;

      const y = el.getBoundingClientRect().top + window.scrollY - headerHeight - 8;
      window.scrollTo({ top: Math.max(y, 0), behavior: "smooth" });
    }, 50);

    return () => window.clearTimeout(t);
  }, [location.pathname, location.hash]);

  return null;
}

/**
 * ✅ Journal de connexion (Supabase Edge Function) — non bloquant
 * - log sur SIGNED_IN / SIGNED_OUT + refresh
 * - envoie un meta enrichi (UA, timezone, locale, écran, referrer, URL)
 * - ne casse jamais l'app si la function n'existe pas / si erreur réseau
 *
 * IMPORTANT:
 * - L'IP et la géoloc fiables doivent être calculées côté Edge Function (headers CDN/proxy).
 * - Le front n'a souvent pas accès à l'IP publique (normal).
 */
function AuthAuditLogger() {
  useEffect(() => {
    const tryGetTimezone = () => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
      } catch {
        return null;
      }
    };

    const baseMeta = () => ({
      note: "client-side",
      client_time: new Date().toISOString(),
      timezone: tryGetTimezone(),
      locale: typeof navigator !== "undefined" ? navigator.language ?? null : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent ?? null : null,
      platform: typeof navigator !== "undefined" ? (navigator as any).platform ?? null : null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      href: typeof window !== "undefined" ? window.location.href : null,
      screen: typeof window !== "undefined"
        ? {
            w: window.innerWidth ?? null,
            h: window.innerHeight ?? null,
            sw: window.screen?.width ?? null,
            sh: window.screen?.height ?? null,
            dpr: (window.devicePixelRatio ?? null) as number | null,
          }
        : null,
    });

    const safeCall = async (payload: any) => {
      try {
        // ✅ Supabase Edge Function (recommandé)
        // IMPORTANT: invoke enverra les headers côté serveur (où l'IP est visible)
        const fn = (supabase as any)?.functions?.invoke;
        if (typeof fn === "function") {
          await fn("log-login", { body: payload });
          return;
        }

        // fallback (rare). On garde pour compat, mais souvent non utile sur Supabase hosting.
        await fetch("/functions/v1/log-login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        // silencieux
      }
    };

    const emit = (event: "login" | "logout" | "refresh", session: any | null) => {
      const u = session?.user;
      safeCall({
        event,
        success: true,
        user_id: u?.id ?? null,
        email: u?.email ?? null,
        source: "web",
        meta: baseMeta(),
      });
    };

    // refresh au chargement si session déjà présente
    supabase.auth
      .getSession()
      .then(({ data }) => {
        const s = data.session;
        if (!s?.user) return;
        emit("refresh", s);
      })
      .catch(() => {});

    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === "SIGNED_IN") emit("login", session);
      if (evt === "SIGNED_OUT") emit("logout", session);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}

const AppRoutes = () => (
  <>
    <ScrollManager />
    <AuthAuditLogger />

    <Routes>
      <Route path="/" element={<Index />} />

      <Route path="/search" element={<Index />} />
      <Route path="/rechercher" element={<Index />} />

      <Route path="/forfaits" element={<Forfaits />} />

      <Route path="/faq" element={<Faq />} />
      <Route path="/aide" element={<Faq />} />

      <Route path="/a-propos" element={<About />} />
      <Route path="/partenaires" element={<Partners />} />

      <Route path="/conditions" element={<Terms />} />
      <Route path="/confidentialite" element={<Privacy />} />
      <Route path="/cookies" element={<CookiesPolicy />} />

      <Route path="/mon-compte" element={<MonCompte />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/inscription-ouvrier" element={<InscriptionOuvrier />} />

      <Route
        path="/ouvrier/:id"
        element={
          <PrivateRoute allowedRoles={["user", "worker", "admin"]}>
            <WorkerDetail />
          </PrivateRoute>
        }
      />

      {/* 👥 Espace Client */}
      <Route
        path="/espace-client"
        element={
          <PrivateRoute allowedRoles={["user"]}>
            <ClientDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/mon-profil"
        element={
          <PrivateRoute allowedRoles={["user"]}>
            <ClientProfile />
          </PrivateRoute>
        }
      />
      <Route
        path="/mes-demandes"
        element={
          <PrivateRoute allowedRoles={["user"]}>
            <ClientRequestsList />
          </PrivateRoute>
        }
      />
      <Route
        path="/mes-echanges"
        element={
          <PrivateRoute allowedRoles={["user"]}>
            <ClientMessagesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/mes-avis"
        element={
          <PrivateRoute allowedRoles={["user"]}>
            <ClientReviews />
          </PrivateRoute>
        }
      />
      <Route
        path="/mes-favoris"
        element={
          <PrivateRoute allowedRoles={["user"]}>
            <ClientFavoritesList />
          </PrivateRoute>
        }
      />

      {/* 👷‍♂️ Espace prestataire */}
      <Route
        path="/espace-ouvrier"
        element={
          <PrivateRoute allowedRoles={["worker"]}>
            <WorkerDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/espace-ouvrier/messages"
        element={
          <PrivateRoute allowedRoles={["worker"]}>
            <WorkerMessagesPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/espace-ouvrier/avis"
        element={
          <PrivateRoute allowedRoles={["worker"]}>
            <WorkerReviewsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/clients/:clientId/contact"
        element={
          <PrivateRoute allowedRoles={["worker"]}>
            <ClientContactForm />
          </PrivateRoute>
        }
      />

      {/* 🛠️ Admin */}
      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />

        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="ouvrier-contacts" element={<AdminOuvrierContacts />} />
        <Route path="ouvriers" element={<AdminOuvrierInscriptions />} />
        <Route path="publicites" element={<AdminAds />} />
        <Route path="signalements" element={<AdminReports />} />
        <Route path="contenu" element={<AdminContent />} />
        <Route path="faq-questions" element={<AdminFaqQuestions />} />

        <Route path="journal-connexions" element={<AdminLoginJournalPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <div className="min-h-dvh w-full min-w-0 overflow-x-clip bg-white">
            <AppRoutes />
          </div>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
