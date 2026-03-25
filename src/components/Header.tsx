// src/components/Header.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Languages,
  User,
  Menu,
  X,
  WifiOff,
  Clock3,
  CheckCircle2,
  RefreshCw,
  MessageCircle,
  ClipboardList,
  Heart,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useNetworkStatus } from "@/services/networkService";
import { localStore } from "@/services/localStore";
import { authCache } from "@/services/authCache";
import ContactModal from "@/components/contact/ContactModal";
import ProxiLogo from "@/assets/logo-proxiservices.png";

type Role = "user" | "client" | "worker" | "admin";

type OfflineQueueItem = {
  id: string;
  action_type:
    | "CREATE_CONTACT_REQUEST"
    | "ADD_FAVORITE"
    | "REMOVE_FAVORITE"
    | "SEND_CLIENT_MESSAGE";
  table_name: "op_ouvrier_contacts" | "op_ouvrier_favorites" | "op_client_worker_messages";
  payload_json: Record<string, any>;
  created_at: string;
  status: "pending";
  retry_count: number;
};

const OFFLINE_QUEUE_KEY = "offline_queue_v1";

const normalizeRole = (r: any): Role => {
  const v = String(r ?? "").toLowerCase().trim();
  if (v === "admin") return "admin";
  if (v === "worker" || v === "ouvrier" || v === "provider" || v === "prestataire") return "worker";
  if (v === "client" || v === "customer") return "client";
  return "user";
};

const HEADER_LIGHT_BLUE = "#EEF5FF";
const HEADER_BORDER_BLUE = "#D9E7FF";

const Header = () => {
  const { t, language, setLanguage } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { connected, initialized } = useNetworkStatus();

  const [hasSession, setHasSession] = useState(false);
  const [role, setRole] = useState<Role>("user");
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingMessagesCount, setPendingMessagesCount] = useState(0);
  const [pendingFavoritesCount, setPendingFavoritesCount] = useState(0);
  const syncPollRef = useRef<number | null>(null);

  const cms = (key: string, fallbackFr: string, fallbackEn: string) => {
    const v = t(key);
    if (!v || v === key) return language === "fr" ? fallbackFr : fallbackEn;
    return v;
  };

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const u = data?.session?.user ?? null;

        if (!mounted) return;

        const fallbackUserId = await authCache.getUserId();
        const finalUserId = u?.id ?? fallbackUserId ?? null;

        setResolvedUserId(finalUserId);
        setHasSession(!!finalUserId);

        if (!finalUserId) {
          setRole("user");
          return;
        }

        const metaRole = normalizeRole(u?.user_metadata?.role ?? u?.app_metadata?.role ?? null);

        if (!connected || !u?.id) {
          const cachedRole = await authCache.getRole();
          if (!mounted) return;
          setRole(normalizeRole(cachedRole ?? metaRole));
          return;
        }

        const { data: row, error } = await supabase
          .from("op_users")
          .select("role")
          .eq("id", u.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.warn("[Header] op_users role fetch error:", error);
          const cachedRole = await authCache.getRole();
          if (!mounted) return;
          setRole(normalizeRole(cachedRole ?? metaRole));
        } else {
          setRole(normalizeRole(row?.role ?? metaRole));
        }
      } catch {
        if (!mounted) return;
        const fallbackUserId = await authCache.getUserId();
        const fallbackRole = await authCache.getRole();

        if (!mounted) return;
        setResolvedUserId(fallbackUserId ?? null);
        setHasSession(!!fallbackUserId);
        setRole(normalizeRole(fallbackRole));
      }
    };

    void refresh();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [connected]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const refreshSyncSummary = useCallback(async () => {
    try {
      const userId = resolvedUserId ?? (await authCache.getUserId());

      if (!userId) {
        setPendingRequestsCount(0);
        setPendingMessagesCount(0);
        setPendingFavoritesCount(0);
        return;
      }

      const queue = (await localStore.get<OfflineQueueItem[]>(OFFLINE_QUEUE_KEY)) || [];

      const scopedQueue = queue.filter((item) => {
        if (item.status !== "pending") return false;
        const payloadUserId = item.payload_json?.user_id;
        return String(payloadUserId || userId) === String(userId);
      });

      const pendingRequests = scopedQueue.filter(
        (item) => item.action_type === "CREATE_CONTACT_REQUEST"
      ).length;

      const pendingMessages = scopedQueue.filter(
        (item) => item.action_type === "SEND_CLIENT_MESSAGE"
      ).length;

      const pendingFavorites = scopedQueue.filter(
        (item) => item.action_type === "ADD_FAVORITE" || item.action_type === "REMOVE_FAVORITE"
      ).length;

      setPendingRequestsCount(pendingRequests);
      setPendingMessagesCount(pendingMessages);
      setPendingFavoritesCount(pendingFavorites);
    } catch (error) {
      console.error("[Header] refreshSyncSummary error:", error);
      setPendingRequestsCount(0);
      setPendingMessagesCount(0);
      setPendingFavoritesCount(0);
    }
  }, [resolvedUserId]);

  useEffect(() => {
    if (!initialized) return;

    void refreshSyncSummary();

    const onRefresh = () => {
      void refreshSyncSummary();
    };

    window.addEventListener("focus", onRefresh);
    window.addEventListener("storage", onRefresh);
    document.addEventListener("visibilitychange", onRefresh);

    return () => {
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("storage", onRefresh);
      document.removeEventListener("visibilitychange", onRefresh);
    };
  }, [initialized, refreshSyncSummary]);

  useEffect(() => {
    if (syncPollRef.current != null) {
      window.clearInterval(syncPollRef.current);
      syncPollRef.current = null;
    }

    if (!initialized) return;

    syncPollRef.current = window.setInterval(() => {
      void refreshSyncSummary();
    }, 3500);

    return () => {
      if (syncPollRef.current != null) {
        window.clearInterval(syncPollRef.current);
        syncPollRef.current = null;
      }
    };
  }, [initialized, refreshSyncSummary]);

  const accountLabel = useMemo(() => {
    if (hasSession) return cms("header.btn_account", "Mon compte", "My account");
    return cms("header.btn_login", "Se connecter", "Sign in");
  }, [hasSession, language]); // eslint-disable-line react-hooks/exhaustive-deps

  const accountPath = useMemo(() => {
    if (!hasSession) return "/login";
    if (role === "admin") return "/admin";
    if (role === "worker") return "/espace-ouvrier";
    return "/espace-client";
  }, [hasSession, role]);

  const becomeProviderLabel = useMemo(() => {
    return cms("header.btn_become_provider", "Devenir Prestataire", "Become a Provider");
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const logoSrc = useMemo(() => ProxiLogo, []);

  const lastNavAtRef = useRef(0);
  const lastToggleAtRef = useRef(0);

  const go = useCallback(
    (to: string) => {
      navigate(to);
    },
    [navigate]
  );

  const safeGo = useCallback(
    (to: string, _label?: string, fromMobileMenu = false) => {
      const now = Date.now();
      if (now - lastNavAtRef.current < 450) return;
      lastNavAtRef.current = now;

      const isNative = (() => {
        try {
          if (Capacitor?.isNativePlatform?.()) return true;
        } catch {}

        try {
          const wCap = (window as any)?.Capacitor;
          if (wCap?.isNativePlatform?.()) return true;
        } catch {}

        try {
          const p = window.location?.protocol ?? "";
          if (p === "capacitor:" || p === "file:") return true;
        } catch {}

        return (
          typeof document !== "undefined" &&
          document.documentElement?.getAttribute("data-ui-native") === "true"
        );
      })();

      try {
        go(to);
      } catch {}

      if (fromMobileMenu) {
        window.setTimeout(() => {
          setMobileOpen(false);
        }, 60);
      }

      window.setTimeout(() => {
        try {
          if (isNative) {
            const wantHash = `#${to.startsWith("/") ? to : `/${to}`}`;
            if (window.location.hash !== wantHash) {
              window.location.hash = wantHash;
            }
          } else if (window.location.pathname !== to) {
            window.location.assign(to);
          }
        } catch {}
      }, 0);
    },
    [go]
  );

  const toggleMobileMenu = useCallback(() => {
    const now = Date.now();
    if (now - lastToggleAtRef.current < 450) return;
    lastToggleAtRef.current = now;
    setMobileOpen((v) => !v);
  }, []);

  const totalPending = pendingRequestsCount + pendingMessagesCount + pendingFavoritesCount;
  const hasPendingSync = totalPending > 0;

  const syncLabel = hasPendingSync
    ? language === "fr"
      ? `${totalPending} en attente`
      : `${totalPending} pending`
    : language === "fr"
    ? "Synchronisé"
    : "Synced";

  const syncDetailRequests =
    pendingRequestsCount > 0
      ? language === "fr"
        ? `${pendingRequestsCount} demande${pendingRequestsCount > 1 ? "s" : ""}`
        : `${pendingRequestsCount} request${pendingRequestsCount > 1 ? "s" : ""}`
      : null;

  const syncDetailMessages =
    pendingMessagesCount > 0
      ? language === "fr"
        ? `${pendingMessagesCount} message${pendingMessagesCount > 1 ? "s" : ""}`
        : `${pendingMessagesCount} message${pendingMessagesCount > 1 ? "s" : ""}`
      : null;

  const syncDetailFavorites =
    pendingFavoritesCount > 0
      ? language === "fr"
        ? `${pendingFavoritesCount} favori${pendingFavoritesCount > 1 ? "s" : ""}`
        : `${pendingFavoritesCount} favorite${pendingFavoritesCount > 1 ? "s" : ""}`
      : null;

  const DesktopSyncBadge = hasSession ? (
    <div
      className={`hidden lg:inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium border whitespace-nowrap ${
        hasPendingSync
          ? "bg-amber-50 text-amber-700 border-amber-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200"
      }`}
      title={
        hasPendingSync
          ? [syncDetailRequests, syncDetailMessages, syncDetailFavorites].filter(Boolean).join(" • ")
          : language === "fr"
          ? "Aucune action en attente"
          : "No action pending"
      }
    >
      {!connected ? (
        <WifiOff className="w-3.5 h-3.5" />
      ) : hasPendingSync ? (
        <Clock3 className="w-3.5 h-3.5" />
      ) : (
        <CheckCircle2 className="w-3.5 h-3.5" />
      )}
      <span>{syncLabel}</span>
    </div>
  ) : null;

  const MobileMenuPanel = mobileOpen ? (
    <div
      className="md:hidden min-w-0 shrink-0 flex items-center gap-2 rounded-2xl px-2 py-1 border shadow-sm"
      style={{ pointerEvents: "auto", backgroundColor: HEADER_LIGHT_BLUE, borderColor: HEADER_BORDER_BLUE }}
    >
      <div className="w-full px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <span className="text-sm font-semibold text-foreground">
            {cms("header.mobile_menu.title", "Menu", "Menu")}
          </span>

          <Button
            variant="outline"
            size="sm"
            type="button"
            className="rounded-full bg-white"
            onClick={() => setMobileOpen(false)}
            style={{ touchAction: "manipulation" as any }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {hasSession && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold text-slate-900">
                {language === "fr" ? "État de synchronisation" : "Sync status"}
              </div>

              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold border ${
                  hasPendingSync
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {!connected ? (
                  <WifiOff className="w-3 h-3" />
                ) : hasPendingSync ? (
                  <RefreshCw className="w-3 h-3" />
                ) : (
                  <CheckCircle2 className="w-3 h-3" />
                )}
                {syncLabel}
              </div>
            </div>

            {(syncDetailRequests || syncDetailMessages || syncDetailFavorites) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {syncDetailRequests && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600">
                    <ClipboardList className="w-3 h-3" />
                    {syncDetailRequests}
                  </div>
                )}
                {syncDetailMessages && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600">
                    <MessageCircle className="w-3 h-3" />
                    {syncDetailMessages}
                  </div>
                )}
                {syncDetailFavorites && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600">
                    <Heart className="w-3 h-3" />
                    {syncDetailFavorites}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-3 min-w-0">
          <button
            type="button"
            className="w-full text-left py-2 font-medium text-foreground hover:text-primary"
            style={{ touchAction: "manipulation" as any, pointerEvents: "auto" }}
            onClick={() => {
              safeGo("/inscription-ouvrier", "become_provider_mobile", true);
            }}
          >
            {becomeProviderLabel}
          </button>

          <button
            type="button"
            className="w-full rounded-full bg-primary text-primary-foreground py-3 font-semibold flex items-center justify-center gap-2 whitespace-nowrap"
            style={{ touchAction: "manipulation" as any, pointerEvents: "auto" }}
            onClick={() => {
              safeGo(accountPath, "account_mobile", true);
            }}
          >
            <User className="w-4 h-4" />
            {accountLabel}
          </button>

          <div className="h-1" />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-40 w-full max-w-full overflow-x-hidden shadow-sm"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          backgroundColor: HEADER_LIGHT_BLUE,
        }}
      >
        <div
          className="w-full overflow-hidden"
          style={{
            backgroundColor: HEADER_LIGHT_BLUE,
            borderBottom: `1px solid ${HEADER_BORDER_BLUE}`,
          }}
        >
          <div className="w-full px-4 sm:px-6 lg:px-10 min-w-0">
            <div className="h-20 sm:h-[88px] min-w-0 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => go("/")}
                className="min-w-0 flex-1 max-w-[58%] sm:max-w-none flex items-center text-left"
                style={{
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation" as any,
                }}
                aria-label={cms("brand.name", "ProxiServices", "ProxiServices")}
              >
                <img
                  src={logoSrc}
                  alt={cms("brand.name", "ProxiServices", "ProxiServices")}
                  className="h-11 sm:h-14 w-auto max-w-[50vw] sm:max-w-[340px] md:max-w-[420px] object-contain select-none"
                  loading="eager"
                  decoding="async"
                  // @ts-ignore
                  fetchpriority="high"
                />
              </button>

              <nav className="hidden md:flex" aria-hidden="true" />

              <div className="hidden md:flex min-w-0 items-center gap-2">
                {DesktopSyncBadge}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full whitespace-nowrap bg-white"
                  onClick={() => safeGo("/inscription-ouvrier", "become_provider_desktop")}
                  style={{ touchAction: "manipulation" as any }}
                >
                  {becomeProviderLabel}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  className="rounded-full bg-pro-blue text-white hover:bg-pro-blue/90 flex items-center gap-2 whitespace-nowrap shadow-sm"
                  onClick={() => safeGo(accountPath, "account_desktop")}
                  style={{ touchAction: "manipulation" as any }}
                >
                  <User className="w-4 h-4" />
                  <span className="hidden lg:inline">{accountLabel}</span>
                  <span className="lg:hidden">
                    {cms("header.btn_account_short", "Compte", "Account")}
                  </span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full flex items-center gap-1 whitespace-nowrap bg-white"
                      aria-label={cms("header.lang.aria", "Changer de langue", "Change language")}
                      type="button"
                      style={{ touchAction: "manipulation" as any }}
                    >
                      <Languages className="w-4 h-4" />
                      <span className="uppercase">{language}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white">
                    <DropdownMenuItem onClick={() => setLanguage("fr")} className="cursor-pointer">
                      {cms("header.lang.fr", "Français", "French")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLanguage("en")} className="cursor-pointer">
                      {cms("header.lang.en", "English", "English")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div
                className="md:hidden min-w-0 shrink-0 flex items-center gap-2"
                style={{ backgroundColor: HEADER_LIGHT_BLUE }}
              >
                {hasSession && (
                  <div
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold border ${
                      hasPendingSync
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                    title={syncLabel}
                  >
                    {!connected ? (
                      <WifiOff className="w-3 h-3" />
                    ) : hasPendingSync ? (
                      <Clock3 className="w-3 h-3" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                  </div>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-full px-3 flex items-center gap-1 whitespace-nowrap bg-white"
                      type="button"
                      style={{ touchAction: "manipulation" as any }}
                    >
                      <Languages className="w-4 h-4" />
                      <span className="uppercase text-xs">{language}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white">
                    <DropdownMenuItem onClick={() => setLanguage("fr")} className="cursor-pointer">
                      {cms("header.lang.fr", "Français", "French")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLanguage("en")} className="cursor-pointer">
                      {cms("header.lang.en", "English", "English")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={toggleMobileMenu}
                  aria-label={cms("header.mobile_menu.aria", "Menu mobile", "Mobile menu")}
                  className="h-9 rounded-full px-3 whitespace-nowrap bg-white"
                  style={{ touchAction: "manipulation" as any }}
                >
                  {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="h-1.5 w-full bg-gradient-to-r from-pro-blue via-blue-600 to-pro-blue" />
        </div>
      </header>

      <div
        aria-hidden
        className="w-full shrink-0 sm:hidden"
        style={{ height: "calc(env(safe-area-inset-top, 0px) + 44px)" }}
      />
      <div aria-hidden className="hidden w-full shrink-0 sm:block" style={{ height: "88px" }} />

      {MobileMenuPanel}

      <ContactModal open={contactOpen} onOpenChange={setContactOpen} cooldownSeconds={30} />
    </>
  );
};

export default Header;
