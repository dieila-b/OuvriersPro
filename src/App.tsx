// src/App.tsx
import React, { useEffect, useMemo, useRef, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Capacitor } from "@capacitor/core";

// ✅ UI Mode global
import { UiModeProvider, useUiModeCtx } from "@/contexts/UiModeContext";

// Protection routes
import PrivateRoute from "./components/PrivateRoute";

// ✅ Layout admin
import AdminLayout from "@/components/layout/AdminLayout";

/**
 * ✅ Lazy pages
 */
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const InscriptionOuvrier = lazy(() => import("./pages/InscriptionOuvrier"));
const WorkerDetail = lazy(() => import("./pages/WorkerDetail"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const MonCompte = lazy(() => import("./pages/MonCompte"));

const Forfaits = lazy(() => import("./pages/Forfaits"));
const Faq = lazy(() => import("./pages/Faq"));
const About = lazy(() => import("./pages/About"));
const Partners = lazy(() => import("./pages/Partners"));

const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const CookiesPolicy = lazy(() => import("./pages/Cookies"));

const AdminFaqQuestions = lazy(() => import("./pages/AdminFaqQuestions"));
const AdminContent = lazy(() => import("./pages/AdminContent"));
const AdminReports = lazy(() => import("./pages/AdminReports"));

const AdminOuvrierContacts = lazy(() => import("./pages/AdminOuvrierContacts"));
const AdminOuvrierInscriptions = lazy(() => import("./pages/AdminOuvrierInscriptions"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminAds = lazy(() => import("./pages/AdminAds"));

const AdminLoginJournalPage = lazy(() => import("./pages/admin/AdminLoginJournalPage"));
const AdminReviewsModerationPage = lazy(() => import("./pages/admin/AdminReviewsModerationPage"));

const WorkerDashboard = lazy(() => import("./pages/WorkerDashboard"));
const WorkerMessagesPage = lazy(() => import("./pages/WorkerMessagesPage"));
const WorkerReviewsPage = lazy(() => import("./pages/WorkerReviews"));

const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ClientProfile = lazy(() => import("./pages/ClientProfile"));
const ClientRequestsList = lazy(() => import("./pages/ClientRequestsList"));
const ClientMessagesPage = lazy(() => import("./pages/ClientMessagesPage"));
const ClientFavoritesList = lazy(() => import("./pages/ClientFavoritesList"));
const ClientReviews = lazy(() => import("./pages/ClientReviews"));
const ClientContactForm = lazy(() => import("./pages/ClientContactForm"));

/**
 * ✅ QueryClient optimisé
 */
const useAppQueryClient = () =>
  useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 10 * 60_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: 1,
          },
          mutations: { retry: 0 },
        },
      }),
    []
  );

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
 * ✅ Journal de connexion — non bloquant
 */
function AuthAuditLogger() {
  const didInitRef = useRef(false);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    const DEBUG = true;
    const COOLDOWN_MS = 10 * 60 * 1000;
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
        const { data, error } = await supabase.functions.invoke("log-login", { body: payload });
        if (error) {
          console.error("[AuthAuditLogger] log-login error:", error);
        } else {
          console.log("[AuthAuditLogger] log-login success:", data);
        }
      } catch (e) {
        console.error("[AuthAuditLogger] invoke exception:", e);
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

      if (!session?.user) return;

      if (event === "refresh" && !shouldLogRefresh()) return;

      return safeInvoke({
        event,
        success: true,
        email,
        source: "web",
        meta: baseMeta(userId, reason),
      });
    };

    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === "SIGNED_IN") log("login", session, "SIGNED_IN");
      else if (evt === "SIGNED_OUT") {
        safeInvoke({
          event: "logout",
          success: true,
          email: session?.user?.email ?? null,
          source: "web",
          meta: baseMeta(session?.user?.id ?? null, "SIGNED_OUT"),
        });
      } else if (evt === "INITIAL_SESSION") {
        if (session?.user) log("refresh", session, "INITIAL_SESSION");
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}

/**
 * ✅ Badge debug (NE PAS afficher sur Desktop web)
 * - S'affiche uniquement si:
 *   - on est en Capacitor (native=true)
 *   - et ?uiDebug=1
 *   - et en DEV
 */
function UiDebugBadge() {
  const { isMobileUI, debug } = useUiModeCtx();
  if (!debug) return null;

  const isNative = (() => {
    try {
      return Capacitor?.isNativePlatform?.() ?? false;
    } catch {
      return false;
    }
  })();

  const show = isNative && import.meta.env.DEV && new URLSearchParams(window.location.search).has("uiDebug");
  if (!show) return null;

  return (
    <div className="fixed top-2 left-2 z-[9999]">
      <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600 shadow-sm">
        <span className="font-semibold">UI:</span>
        <span className={isMobileUI ? "text-emerald-700" : "text-indigo-700"}>
          {isMobileUI ? "MOBILE" : "DESKTOP"}
        </span>
        <span className="text-slate-400">|</span>
        <span>native={String(debug.native)}</span>
        <span className="text-slate-400">|</span>
        <span>forcedDesktopInApp={String(debug.forcedDesktopInApp)}</span>
        <span className="text-slate-400">|</span>
        <span>eff={debug.effWidth}px</span>
        <span>inner={debug.innerWidth}px</span>
        <span>doc={debug.docWidth}px</span>
        <span>vv={debug.vvWidth ?? "—"}px</span>
        <span>dpr={debug.dpr}</span>
      </div>
    </div>
  );
}

const AppRoutes = () => (
  <>
    <ScrollManager />
    <AuthAuditLogger />
    <UiDebugBadge />

    <Suspense fallback={<div className="p-6 text-gray-600">Chargement…</div>}>
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
          <Route path="moderation-avis" element={<AdminReviewsModerationPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </>
);

/**
 * ✅ Wrapper viewport desktop: on applique le "fake desktop viewport"
 * UNIQUEMENT quand on est en Capacitor native.
 * (Sur le web, on ne touche à rien => ton Desktop redevient normal)
 */
function DesktopViewport({ children }: { children: React.ReactNode }) {
  const { isDesktopUI } = useUiModeCtx();

  const isNative = (() => {
    try {
      return Capacitor?.isNativePlatform?.() ?? false;
    } catch {
      return false;
    }
  })();

  const DESKTOP_WIDTH = 1200;

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-ui-native", isNative ? "true" : "false");
  }, [isNative]);

  useEffect(() => {
    if (!isNative) return;

    const html = document.documentElement;
    html.style.setProperty("--ui-desktop-width", `${DESKTOP_WIDTH}px`);

    const computeScale = () => {
      const eff =
        Math.min(
          window.innerWidth || Infinity,
          document.documentElement?.clientWidth || Infinity,
          window.visualViewport?.width || Infinity,
          window.screen?.width || Infinity
        ) || 9999;

      const scale = isDesktopUI ? Math.min(1, Math.max(0.35, eff / DESKTOP_WIDTH)) : 1;
      html.style.setProperty("--ui-scale", String(scale));
    };

    computeScale();
    window.addEventListener("resize", computeScale);
    window.visualViewport?.addEventListener("resize", computeScale);

    return () => {
      window.removeEventListener("resize", computeScale);
      window.visualViewport?.removeEventListener("resize", computeScale);
    };
  }, [isDesktopUI, isNative]);

  return (
    <div id="ui-desktop-viewport" data-ui-viewport={isDesktopUI ? "desktop" : "mobile"}>
      {children}
    </div>
  );
}

const App = () => {
  const queryClient = useAppQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <UiModeProvider>
            <Toaster />
            <Sonner />
            <DesktopViewport>
              <div className="min-h-dvh w-full min-w-0 overflow-x-clip bg-white">
                <AppRoutes />
              </div>
            </DesktopViewport>
          </UiModeProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
