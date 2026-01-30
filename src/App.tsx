// src/App.tsx
import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
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

// ✅ Admin Modération avis (NOUVEAU)
import AdminReviewsModerationPage from "./pages/admin/AdminReviewsModerationPage";

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
 *
 * Fix:
 * - On log "refresh" sur INITIAL_SESSION (avec anti-spam).
 * - On log "login" sur SIGNED_IN.
 * - On log "logout" sur SIGNED_OUT.
 *
 * IMPORTANT:
 * - On ne jette JAMAIS d'erreur (ne doit pas casser l'UI).
 */
function AuthAuditLogger() {
  const didInitRef = useRef(false);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const DEBUG = true; // Activé pour debug
    const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
    const LS_KEY = "op_login_journal:last_refresh";

    const getTimeZone = () => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
      } catch {
        return null;
      }
    };

    const baseMeta = (userId: string | null, reason?: string) => ({
      note: "client-side",
      user_id: userId,
      reason: reason ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      lang: typeof navigator !== "undefined" ? navigator.language : null,
      tz: getTimeZone(),
      screen: typeof window !== "undefined" ? { w: window.innerWidth, h: window.innerHeight } : null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      href: typeof window !== "undefined" ? window.location.href : null,
    });

    const safeInvoke = async (payload: {
      event: "login" | "logout" | "refresh";
      success: boolean;
      email: string | null;
      source: "web";
      meta: any;
    }) => {
      try {
        console.log("[AuthAuditLogger] Invoking log-login with payload:", payload);

        const { data, error } = await supabase.functions.invoke("log-login", { body: payload });

        if (error) {
          console.error("[AuthAuditLogger] log-login error:", {
            message: error.message ?? String(error),
            name: (error as any).name ?? "Unknown",
            details: (error as any).details ?? null,
            hint: (error as any).hint ?? null,
            status: (error as any).status ?? null,
            raw: error,
          });
        } else {
          console.log("[AuthAuditLogger] log-login success:", data);
        }
      } catch (e: any) {
        console.error("[AuthAuditLogger] log-login invoke exception:", {
          message: e?.message ?? String(e),
          name: e?.name ?? "Exception",
          stack: e?.stack ?? null,
        });
      }
    };

    const shouldLogRefresh = () => {
      try {
        const last = Number(localStorage.getItem(LS_KEY) || "0");
        const now = Date.now();
        if (now - last < COOLDOWN_MS) return false;
        localStorage.setItem(LS_KEY, String(now));
        return true;
      } catch {
        return true;
      }
    };

    const log = (event: "login" | "logout" | "refresh", session: any, reason: string) => {
      const email = session?.user?.email ?? null;
      const userId = session?.user?.id ?? null;

      if (!session?.user) {
        if (DEBUG) console.log("[AuthAuditLogger] skip - no user in session");
        return;
      }

      if (event === "refresh" && !shouldLogRefresh()) {
        if (DEBUG) console.log("[AuthAuditLogger] skip refresh cooldown");
        return;
      }

      if (DEBUG) console.log(`[AuthAuditLogger] logging ${event} for ${email}`);

      return safeInvoke({
        event,
        success: true,
        email,
        source: "web",
        meta: baseMeta(userId, reason),
      });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      console.log("[AuthAuditLogger] auth event:", evt, "session:", !!session);

      if (evt === "SIGNED_IN") {
        log("login", session, "SIGNED_IN");
      } else if (evt === "SIGNED_OUT") {
        safeInvoke({
          event: "logout",
          success: true,
          email: session?.user?.email ?? null,
          source: "web",
          meta: baseMeta(session?.user?.id ?? null, "SIGNED_OUT"),
        });
      } else if (evt === "INITIAL_SESSION") {
        if (session?.user) {
          log("refresh", session, "INITIAL_SESSION");
        }
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

        {/* ✅ NOUVEAU: Modération avis */}
        <Route path="moderation-avis" element={<AdminReviewsModerationPage />} />
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
        <Toaster />
        <Sonner />
        <div className="min-h-dvh w-full min-w-0 overflow-x-clip bg-white">
          <AppRoutes />
        </div>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
