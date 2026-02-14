// src/App.tsx
import React, { useEffect, useMemo, useRef, Suspense, lazy } from "react";
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
  BrowserRouter,
  HashRouter,
} from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Capacitor } from "@capacitor/core";

// ✅ UI Mode global
import { UiModeProvider, useUiModeCtx } from "@/contexts/UiModeContext";

// ✅ Tap Inspector (debug)
import TapInspector from "@/components/debug/TapInspector";

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
 * ✅ Détection native ULTRA robuste (Capacitor + localhost fallback)
 * Objectif: ne JAMAIS repasser en BrowserRouter sur téléphone.
 */
const isNativeRuntime = () => {
  const wCap = (() => {
    try {
      return (window as any)?.Capacitor ?? null;
    } catch {
      return null;
    }
  })();

  try {
    if (Capacitor?.isNativePlatform?.()) return true;
  } catch {}

  try {
    if (wCap?.isNativePlatform?.()) return true;
  } catch {}

  try {
    const p = window.location?.protocol ?? "";
    if (p === "capacitor:" || p === "file:") return true;
  } catch {}

  // ✅ Cas fréquent sur device : http://localhost (Capacitor local server)
  try {
    const { hostname, protocol } = window.location;
    if (wCap && protocol === "http:" && hostname === "localhost") return true;
  } catch {}

  try {
    const gp = (Capacitor as any)?.getPlatform?.();
    if (gp && gp !== "web") return true;
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

/**
 * ✅ Intercepteur global SAFE (Natif uniquement)
 * But: empêcher les reload WebView si un <a href="/..."> traîne quelque part,
 * SANS casser les onClick des boutons / overlays.
 */
function GlobalLinkInterceptor() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeRuntime()) return;

    const shouldIgnore = (anchor: HTMLAnchorElement, href: string) => {
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

      if (anchor.hasAttribute("download")) return true;
      if ((anchor.getAttribute("rel") || "").includes("external")) return true;

      return false;
    };

    const normalizeHref = (href: string) => {
      if (href.startsWith("#/")) return href.slice(1); // => "/route"
      return href;
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      let href = anchor.getAttribute("href") || "";
      if (!href) return;

      if (shouldIgnore(anchor, href)) return;

      href = normalizeHref(href);

      if (href.startsWith("/") || href.startsWith("#")) {
        e.preventDefault();
        requestAnimationFrame(() => navigate(href));
      }
    };

    document.addEventListener("click", handleClick, false);
    return () => document.removeEventListener("click", handleClick, false);
  }, [navigate]);

  return null;
}

/**
 * ✅ Guard natif anti-404 (téléphone réel)
 */
function NativeRoutingGuard() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeRuntime()) return;

    try {
      const u = new URL(window.location.href);
      const hasHashRoute = (u.hash || "").startsWith("#/");

      if (!u.hash || u.hash === "#") {
        u.hash = "#/";
        window.history.replaceState({}, "", u.toString());
      }

      if (!hasHashRoute) {
        const path = (u.pathname || "/").replace(/\/+$/, "") || "/";
        if (path !== "/") {
          u.hash = `#${path}`;
          u.pathname = "/";
          window.history.replaceState({}, "", u.toString());
          navigate(path, { replace: true });
        }
      }
    } catch {}

    let removeListener: null | (() => void) = null;

    (async () => {
      try {
        const capAppMod = "@capacitor/app";
        const capBrowserMod = "@capacitor/browser";

        const mod: any = await import(/* @vite-ignore */ capAppMod);
        const CapApp = mod?.App;
        if (!CapApp?.addListener) return;

        const sub = CapApp.addListener("appUrlOpen", async (event: any) => {
          try {
            const incoming = event?.url || "";
            if (!incoming) return;

            if (incoming.startsWith("http://") || incoming.startsWith("https://")) {
              try {
                const b: any = await import(/* @vite-ignore */ capBrowserMod);
                if (b?.Browser?.open) await b.Browser.open({ url: incoming });
                else window.open(incoming, "_blank");
              } catch {
                window.open(incoming, "_blank");
              }
              return;
            }

            const u = new URL(incoming);
            const path = (u.pathname || "/").replace(/\/+$/, "") || "/";
            if (path && path !== "/") navigate(path, { replace: true });
            else navigate("/", { replace: true });
          } catch {}
        });

        removeListener = () => sub.remove();
      } catch {}
    })();

    return () => {
      if (removeListener) removeListener();
    };
  }, [navigate]);

  return null;
}

const AppRoutes = () => (
  <>
    {/* ✅ DEBUG: inspect taps ONLY in native + dev */}
    {isNativeRuntime() && import.meta.env.DEV ? <TapInspector /> : null}

    <ScrollManager />
    <AuthAuditLogger />
    <UiDebugBadge />
    <GlobalLinkInterceptor />
    <NativeRoutingGuard />

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
            <PrivateRoute allowedRoles={["user", "worker", "admin"]}>
              <MonCompte />
            </PrivateRoute>
          }
        />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

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
 * ✅ Router natif vs web (fix 404 Capacitor)
 */
function RouterSwitch({ children }: { children: React.ReactNode }) {
  const isNative = isNativeRuntime();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.setAttribute("data-ui-native", isNative ? "true" : "false");

    if (!isNative) return;

    html.setAttribute("data-ui-mode", "mobile");

    const hardReset = () => {
      html.style.setProperty("--ui-scale", "1");
      html.style.setProperty("--ui-desktop-width", "100%");

      (body.style as any).zoom = "1";

      const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
      if (meta) meta.setAttribute("content", "width=device-width, initial-scale=1, viewport-fit=cover");
    };

    hardReset();
    const t1 = window.setTimeout(hardReset, 300);
    const t2 = window.setTimeout(hardReset, 1200);

    window.addEventListener("resize", hardReset);
    window.visualViewport?.addEventListener?.("resize", hardReset);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", hardReset);
      window.visualViewport?.removeEventListener?.("resize", hardReset);
    };
  }, [isNative]);

  if (import.meta.env.DEV) {
    console.info(`[RouterSwitch] isNative=${isNative}, href=${window.location?.href}`);
  }

  const Router = isNative ? HashRouter : BrowserRouter;
  return <Router>{children}</Router>;
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
