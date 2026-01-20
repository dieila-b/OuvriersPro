// src/App.tsx
import { useEffect, useRef } from "react";
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

/**
 * ✅ Scroll manager:
 * - gère /#anchor proprement avec header sticky
 */
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
 *
 * Règles:
 * - on envoie exactement: { event, success, email, source, meta }
 * - IP/localisation: pas depuis navigateur -> Edge Function lit headers CDN
 *
 * Robustesse:
 * - 1) supabase.functions.invoke("log-login")
 * - 2) fallback ABSOLU vers `${SUPABASE_URL}/functions/v1/log-login` (toujours Edge Supabase)
 */
function AuthAuditLogger() {
  const didInitRef = useRef(false);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const LOG_REFRESH = false; // mets true si tu veux tracer refresh (souvent bruyant)
    const SUPABASE_URL =
      (import.meta as any)?.env?.VITE_SUPABASE_URL ||
      (globalThis as any)?.VITE_SUPABASE_URL ||
      "";

    const getTimeZone = () => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
      } catch {
        return null;
      }
    };

    const baseMeta = () => ({
      note: "client-side",
      user_id: null as string | null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      lang: typeof navigator !== "undefined" ? navigator.language : null,
      tz: getTimeZone(),
      screen: typeof window !== "undefined" ? { w: window.innerWidth, h: window.innerHeight } : null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      href: typeof window !== "undefined" ? window.location.href : null,
    });

    const invokeEdge = async (payload: any) => {
      const fn = (supabase as any)?.functions?.invoke;
      if (typeof fn !== "function") {
        throw new Error("supabase.functions.invoke indisponible");
      }
      const { error } = await fn("log-login", { body: payload });
      if (error) {
        throw error;
      }
    };

    const fetchEdgeAbsolute = async (payload: any) => {
      if (!SUPABASE_URL) {
        throw new Error("VITE_SUPABASE_URL manquant (fallback edge impossible)");
      }

      // IMPORTANT: on reste sur Edge Function Supabase, mais URL absolue
      const url = `${String(SUPABASE_URL).replace(/\/+$/, "")}/functions/v1/log-login`;

      const { data: s } = await supabase.auth.getSession();
      const accessToken = s.session?.access_token ?? null;

      const headers: Record<string, string> = {
        "content-type": "application/json",
        // apikey (anon) est automatiquement injecté par supabase-js côté invoke,
        // ici on reste minimal: Authorization si dispo (pas obligatoire selon ta function)
      };
      if (accessToken) headers["authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        // évite que la requête soit “coupée” sur navigation rapide
        keepalive: true,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`log-login HTTP ${res.status} ${txt || ""}`.trim());
      }
    };

    const safeCall = async (payload: {
      event: string;
      success: boolean;
      email: string | null;
      source: string;
      meta?: any;
    }) => {
      try {
        await invokeEdge(payload);
      } catch (e) {
        // On loggue en console pour diagnostiquer
        console.warn("[AuthAuditLogger] invoke log-login failed, trying absolute fetch:", e);
        try {
          await fetchEdgeAbsolute(payload);
        } catch (e2) {
          console.warn("[AuthAuditLogger] absolute fetch log-login failed:", e2);
        }
      }
    };

    const log = async (event: "login" | "logout" | "refresh", session: any) => {
      const email = session?.user?.email ?? null;
      const userId = session?.user?.id ?? null;

      await safeCall({
        event,
        success: true,
        email,
        source: "web",
        meta: {
          ...baseMeta(),
          user_id: userId,
        },
      });
    };

    if (LOG_REFRESH) {
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (!data?.session?.user) return;
          return log("refresh", data.session);
        })
        .catch(() => {});
    }

    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === "SIGNED_IN") {
        void log("login", session);
      } else if (evt === "SIGNED_OUT") {
        void log("logout", session);
      }
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
      {/* Public */}
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

      {/* Client */}
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

      {/* Worker */}
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

      {/* Admin */}
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

      {/* 404 */}
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
