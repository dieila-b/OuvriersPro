// src/App.tsx
import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";

// ✅ IMPORTANT : utiliser UN SEUL client Supabase partout
// (Lovable utilise souvent "@/integrations/supabase/client")
import { supabase } from "@/integrations/supabase/client";

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
 * ✅ Logger Edge Function (Supabase) — fiable
 * - écoute SIGNED_IN / SIGNED_OUT
 * - + fallback : surveille la session toutes les 2s (au cas où événement raté)
 * - envoie uniquement { event, success, email, source, meta }
 */
function AuthAuditLogger() {
  const didInitRef = useRef(false);
  const lastSessionKeyRef = useRef<string>(""); // pour détecter changement (login/logout)

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const DEBUG = true; // mets false quand c’est OK

    const getTimeZone = () => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
      } catch {
        return null;
      }
    };

    const baseMeta = (userId: string | null) => ({
      note: "client-side",
      user_id: userId,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      lang: typeof navigator !== "undefined" ? navigator.language : null,
      tz: getTimeZone(),
      screen: typeof window !== "undefined" ? { w: window.innerWidth, h: window.innerHeight } : null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      href: typeof window !== "undefined" ? window.location.href : null,
    });

    const safeCall = async (payload: {
      event: "login" | "logout";
      success: boolean;
      email: string | null;
      source: "web";
      meta: any;
    }) => {
      try {
        const fn = (supabase as any)?.functions?.invoke;
        if (typeof fn !== "function") {
          if (DEBUG) console.warn("[AuthAuditLogger] functions.invoke indisponible sur ce client Supabase.");
          return;
        }

        if (DEBUG) console.log("[AuthAuditLogger] invoking log-login", payload);

        const { data, error } = await fn("log-login", { body: payload });

        if (error) {
          console.warn("[AuthAuditLogger] log-login error:", error);
        } else if (DEBUG) {
          console.log("[AuthAuditLogger] log-login OK:", data);
        }
      } catch (e) {
        console.warn("[AuthAuditLogger] log-login invoke failed:", e);
      }
    };

    const logLogin = (session: any) => {
      const email = session?.user?.email ?? null;
      const userId = session?.user?.id ?? null;
      return safeCall({
        event: "login",
        success: true,
        email,
        source: "web",
        meta: baseMeta(userId),
      });
    };

    const logLogout = (prevEmail: string | null, prevUserId: string | null) => {
      return safeCall({
        event: "logout",
        success: true,
        email: prevEmail,
        source: "web",
        meta: baseMeta(prevUserId),
      });
    };

    // 1) écoute événements
    const { data: sub } = supabase.auth.onAuthStateChange(async (evt, session) => {
      if (DEBUG) console.log("[AuthAuditLogger] auth event:", evt, session?.user?.email);

      const sessionKey =
        session?.user?.id && session?.access_token ? `${session.user.id}:${session.access_token.slice(0, 16)}` : "";

      if (evt === "SIGNED_IN") {
        lastSessionKeyRef.current = sessionKey;
        await logLogin(session);
      }

      if (evt === "SIGNED_OUT") {
        // on ne connait pas toujours l’email à cet instant, mais on essaie via last session
        lastSessionKeyRef.current = "";
        await logLogout(null, null);
      }
    });

    // 2) fallback : poll session (si on rate SIGNED_IN)
    let prevEmail: string | null = null;
    let prevUserId: string | null = null;

    const poll = async () => {
      const { data } = await supabase.auth.getSession();
      const s = data?.session ?? null;

      const email = s?.user?.email ?? null;
      const userId = s?.user?.id ?? null;

      const sessionKey =
        s?.user?.id && s?.access_token ? `${s.user.id}:${s.access_token.slice(0, 16)}` : "";

      // login détecté (nouvelle session)
      if (sessionKey && sessionKey !== lastSessionKeyRef.current) {
        lastSessionKeyRef.current = sessionKey;
        if (DEBUG) console.log("[AuthAuditLogger] poll detected login", email);
        await logLogin(s);
      }

      // logout détecté (session disparue)
      if (!sessionKey && lastSessionKeyRef.current) {
        if (DEBUG) console.log("[AuthAuditLogger] poll detected logout");
        lastSessionKeyRef.current = "";
        await logLogout(prevEmail, prevUserId);
      }

      prevEmail = email;
      prevUserId = userId;
    };

    // poll toutes les 2s
    const t = window.setInterval(() => {
      poll().catch(() => {});
    }, 2000);

    // poll initial immédiat
    poll().catch(() => {});

    return () => {
      sub.subscription.unsubscribe();
      window.clearInterval(t);
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
