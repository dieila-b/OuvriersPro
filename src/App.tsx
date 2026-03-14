// src/App.tsx
import React, { useEffect, useMemo, useRef, Suspense, lazy, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Routes,
  Route,
  useLocation,
  useNavigate,
  Navigate,
  HashRouter,
  BrowserRouter,
} from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Capacitor } from "@capacitor/core";

import { UiModeProvider, useUiModeCtx } from "@/contexts/UiModeContext";

import NativeIncidentProbe from "@/components/debug/NativeIncidentProbe";
import TapInspector from "@/components/TapInspector";
import PrivateRoute from "./components/PrivateRoute";
import AdminLayout from "@/components/layout/AdminLayout";

/**
 * ✅ Retry wrapper for lazy imports — handles stale chunk errors
 */
const lazyRetry = (factory: () => Promise<any>, retries = 2): ReturnType<typeof lazy> =>
  lazy(async () => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await factory();
      } catch (err) {
        if (i < retries) {
          console.warn(`[lazyRetry] Chunk load failed, retrying (${i + 1}/${retries})...`);
          await new Promise((r) => setTimeout(r, 500 * (i + 1)));
        } else {
          console.error("[lazyRetry] All retries failed, reloading page...", err);
          window.location.reload();
          return new Promise(() => {});
        }
      }
    }
    return factory();
  });

const Index = lazyRetry(() => import("./pages/Index"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const InscriptionOuvrier = lazyRetry(() => import("./pages/InscriptionOuvrier"));
const WorkerDetail = lazyRetry(() => import("./pages/WorkerDetail"));
const Login = lazyRetry(() => import("./pages/Login"));
const Register = lazyRetry(() => import("./pages/Register"));
const MonCompte = lazyRetry(() => import("./pages/MonCompte"));
const TapTest = lazyRetry(() => import("./pages/TapTest"));

const Forfaits = lazyRetry(() => import("./pages/Forfaits"));
const Faq = lazyRetry(() => import("./pages/Faq"));
const About = lazyRetry(() => import("./pages/About"));
const Partners = lazyRetry(() => import("./pages/Partners"));

const Terms = lazyRetry(() => import("./pages/Terms"));
const Privacy = lazyRetry(() => import("./pages/Privacy"));
const CookiesPolicy = lazyRetry(() => import("./pages/Cookies"));

const AdminFaqQuestions = lazyRetry(() => import("./pages/AdminFaqQuestions"));
const AdminContent = lazyRetry(() => import("./pages/AdminContent"));
const AdminReports = lazyRetry(() => import("./pages/AdminReports"));

const AdminOuvrierContacts = lazyRetry(() => import("./pages/AdminOuvrierContacts"));
const AdminOuvrierInscriptions = lazyRetry(() => import("./pages/AdminOuvrierInscriptions"));
const AdminDashboard = lazyRetry(() => import("./pages/AdminDashboard"));
const AdminAds = lazyRetry(() => import("./pages/AdminAds"));

const AdminLoginJournalPage = lazyRetry(() => import("./pages/admin/AdminLoginJournalPage"));
const AdminReviewsModerationPage = lazyRetry(() => import("./pages/admin/AdminReviewsModerationPage"));

const WorkerDashboard = lazyRetry(() => import("./pages/WorkerDashboard"));
const WorkerMessagesPage = lazyRetry(() => import("./pages/WorkerMessagesPage"));
const WorkerReviewsPage = lazyRetry(() => import("./pages/WorkerReviews"));

const ClientDashboard = lazyRetry(() => import("./pages/ClientDashboard"));
const ClientProfile = lazyRetry(() => import("./pages/ClientProfile"));
const ClientRequestsList = lazyRetry(() => import("./pages/ClientRequestsList"));
const ClientMessagesPage = lazyRetry(() => import("./pages/ClientMessagesPage"));
const ClientFavoritesList = lazyRetry(() => import("./pages/ClientFavoritesList"));
const ClientReviews = lazyRetry(() => import("./pages/ClientReviews"));
const ClientContactForm = lazyRetry(() => import("./pages/ClientContactForm"));

/**
 * ✅ Détection native robuste (Capacitor / WebView)
 */
const isNativeRuntime = () => {
  try {
    const sp = new URLSearchParams(window.location.search || "");
    if (sp.get("forceNative") === "1") return true;
  } catch {}

  try {
    if (Capacitor?.isNativePlatform?.()) return true;
  } catch {}

  try {
    const p = window.location?.protocol ?? "";
    if (p === "capacitor:" || p === "file:") return true;

    const gp = (Capacitor as any)?.getPlatform?.();
    if (gp && gp !== "web") return true;

    const host = window.location?.hostname ?? "";
    if (host === "localhost") return true;

    const ua = navigator?.userAgent ?? "";
    if (ua.includes("wv") || ua.includes("Capacitor")) return true;

    if (p === "https:" && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) return true;
  } catch {}

  return false;
};

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

  // Sur Web (BrowserRouter): location.hash sert aux ancres
  // Sur Native (HashRouter): location.hash est géré par le router, donc on évite le scroll-to-anchor automatique.
  const isNative = isNativeRuntime();

  useEffect(() => {
    if (isNative) return;

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
  }, [location.pathname, location.hash, isNative]);

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

    const COOLDOWN_MS = 10 * 60 * 1000;
    const LS_KEY = "op_login_journal:last_refresh";
    const isNative = isNativeRuntime();

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
      source: "web" | "native";
      meta: any;
    }) => {
      try {
        const { data, error } = await supabase.functions.invoke("log-login", { body: payload });
        if (error) console.error("[AuthAuditLogger] log-login error:", error);
        else console.log("[AuthAuditLogger] log-login success:", data);
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
        source: isNative ? "native" : "web",
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
          source: isNative ? "native" : "web",
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
 */
function UiDebugBadge() {
  const { isMobileUI, debug } = useUiModeCtx();
  if (!debug) return null;

  const isNative = isNativeRuntime();
  const show =
    isNative && import.meta.env.DEV && new URLSearchParams(window.location.search).has("uiDebug");
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
        <span className="text-slate-400">|</span>
        <span>inner={debug.innerWidth}px</span>
        <span className="text-slate-400">|</span>
        <span>doc={debug.docWidth}px</span>
        <span className="text-slate-400">|</span>
        <span>vv={debug.vvWidth ?? "—"}px</span>
        <span>dpr={debug.dpr}</span>
      </div>
    </div>
  );
}

/**
 * ✅ Intercepteur global (Natif uniquement)
 * - Intercepte les <a href="/..."> pour les router en SPA via navigate()
 * - Evite les reload/404
 */
function GlobalLinkInterceptor() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeRuntime()) return;

    const shouldIgnore = (anchor: HTMLAnchorElement, href: string) => {
      if (anchor.dataset.noNativeIntercept === "1") return true;

      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("blob:") ||
        href.startsWith("data:") ||
        anchor.target === "_blank"
      )
        return true;

<<<<<<< HEAD
      if (anchor.hasAttribute("download")) return true;
      if ((anchor.getAttribute("rel") || "").includes("external")) return true;

      return false;
    };

    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;

      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      let href = anchor.getAttribute("href") || "";
      if (!href) return;

      if (shouldIgnore(anchor, href)) return;

      // ✅ HashRouter côté natif: on ne garde que des paths "/..."
      // (si quelqu’un met "#/login", on le convertit)
      if (href.startsWith("#/")) href = href.slice(1);

      if (href.startsWith("/")) {
        e.preventDefault();
        requestAnimationFrame(() => navigate(href));
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
=======
      if (href.startsWith("/") || href.startsWith("#")) {
        e.preventDefault();
        e.stopPropagation();
        navigate(href);
      }
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
>>>>>>> 7bd77d7 (Fix Capacitor mobile UI scaling (remove desktop viewport scale))
  }, [navigate]);

  return null;
}

/**
 * ✅ TapInspector Gate
 */
function TapInspectorGate() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isNative = isNativeRuntime();

    const readTap = () => {
      if (!isNative) return false;

      const sp = new URLSearchParams(window.location.search || "");
      const tapSearch = sp.get("tap") === "1" || sp.get("forceTap") === "1";

      const hash = window.location.hash || "";
      const q = hash.includes("?") ? hash.split("?")[1] : "";
      const hp = new URLSearchParams(q);
      const tapHash = hp.get("tap") === "1" || hp.get("forceTap") === "1";

      let tapLS = false;
      try {
        tapLS = localStorage.getItem("tap") === "1";
      } catch {}

      return tapSearch || tapHash || tapLS;
    };

    const apply = () => setEnabled(readTap());

    apply();
    window.addEventListener("hashchange", apply);
    window.addEventListener("popstate", apply);

    return () => {
      window.removeEventListener("hashchange", apply);
      window.removeEventListener("popstate", apply);
    };
  }, []);

  if (!enabled) return null;
  return <TapInspector />;
}

const AppRoutes = () => (
  <>
    <NativeIncidentProbe />
    <ScrollManager />
    <AuthAuditLogger />
    <UiDebugBadge />
    <GlobalLinkInterceptor />
    <TapInspectorGate />


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

        <Route
          path="/mon-compte"
          element={
            <PrivateRoute allowedRoles={["user", "client", "worker", "admin"]}>
              <MonCompte />
            </PrivateRoute>
          }
        />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/__tap-test" element={<TapTest />} />

        {/* Aliases */}
        <Route path="/inscription" element={<Navigate to="/register" replace />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />
        <Route path="/sign-up" element={<Navigate to="/register" replace />} />
        <Route path="/creer-profil" element={<Navigate to="/register" replace />} />
        <Route path="/creation-profil" element={<Navigate to="/register" replace />} />
        <Route path="/creer-mon-profil" element={<Navigate to="/register" replace />} />

        <Route path="/forfaits/inscription-ouvrier" element={<Navigate to="/inscription-ouvrier" replace />} />
        <Route path="/forfaits/inscription-ouvrier/*" element={<Navigate to="/inscription-ouvrier" replace />} />

        <Route path="/devenir-prestataire" element={<InscriptionOuvrier />} />
        <Route path="/devenir-prestataire/*" element={<Navigate to="/inscription-ouvrier" replace />} />
        <Route path="/forfaits/devenir-prestataire" element={<Navigate to="/inscription-ouvrier" replace />} />

        <Route path="/inscription-ouvrier" element={<InscriptionOuvrier />} />
        <Route path="/inscription-ouvrier/*" element={<Navigate to="/inscription-ouvrier" replace />} />

        <Route
          path="/ouvrier/:id"
          element={
            <PrivateRoute allowedRoles={["user", "client", "worker", "admin"]}>
              <WorkerDetail />
            </PrivateRoute>
          }
        />

        {/* Client */}
        <Route
          path="/espace-client"
          element={
            <PrivateRoute allowedRoles={["user", "client"]}>
              <ClientDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/mon-profil"
          element={
            <PrivateRoute allowedRoles={["user", "client"]}>
              <ClientProfile />
            </PrivateRoute>
          }
        />
        <Route
          path="/mes-demandes"
          element={
            <PrivateRoute allowedRoles={["user", "client"]}>
              <ClientRequestsList />
            </PrivateRoute>
          }
        />
        <Route
          path="/mes-echanges"
          element={
            <PrivateRoute allowedRoles={["user", "client"]}>
              <ClientMessagesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/mes-avis"
          element={
            <PrivateRoute allowedRoles={["user", "client"]}>
              <ClientReviews />
            </PrivateRoute>
          }
        />
        <Route
          path="/mes-favoris"
          element={
            <PrivateRoute allowedRoles={["user", "client"]}>
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
<<<<<<< HEAD
 * ✅ Router stable:
 * - Web: BrowserRouter (URLs propres /login)
 * - Native (Capacitor): HashRouter (stable en file:// et WebView)
 */
function RouterSwitch({ children }: { children: React.ReactNode }) {
  const native = isNativeRuntime();
  return native ? <HashRouter>{children}</HashRouter> : <BrowserRouter>{children}</BrowserRouter>;
=======
 * ✅ Router natif vs web (fix 404 Capacitor)
 * + ✅ force MOBILE en natif (évite le zoom-out / mode desktop)
 */
function RouterSwitch({ children }: { children: React.ReactNode }) {
  const isNative = isNativeRuntime();

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-ui-native", isNative ? "true" : "false");

    if (isNative) {
      // 🔒 verrouille mobile en app (même si UiModeContext veut mettre desktop)
      html.setAttribute("data-ui-mode", "mobile");
      html.style.setProperty("--ui-scale", "1");
      html.style.setProperty("--ui-desktop-width", "100%");
    }
  }, [isNative]);

  if (import.meta.env.DEV) {
    console.info(
      `[RouterSwitch] isNative=${isNative}, protocol=${window.location?.protocol}, hostname=${window.location?.hostname}`
    );
  }

  const Router = isNative ? HashRouter : BrowserRouter;
  return <Router>{children}</Router>;
>>>>>>> 7bd77d7 (Fix Capacitor mobile UI scaling (remove desktop viewport scale))
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
            <RouterSwitch>
              <div className="min-h-dvh w-full min-w-0 overflow-x-clip bg-white">
                <AppRoutes />
              </div>
            </RouterSwitch>
          </UiModeProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
