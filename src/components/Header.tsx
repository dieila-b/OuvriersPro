// src/components/Header.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Languages, User, Menu, X } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import ContactModal from "@/components/contact/ContactModal";
import ProxiLogo from "@/assets/logo-proxiservices.png";

type Role = "user" | "client" | "worker" | "admin";

const normalizeRole = (r: any): Role => {
  const v = String(r ?? "").toLowerCase().trim();
  if (v === "admin") return "admin";
  if (v === "worker" || v === "ouvrier" || v === "provider" || v === "prestataire") return "worker";
  if (v === "client" || v === "customer") return "client";
  return "user";
};

const Header = () => {
  const { t, language, setLanguage } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const [hasSession, setHasSession] = useState(false);
  const [role, setRole] = useState<Role>("user");

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

        setHasSession(!!u?.id);

        if (!u?.id) {
          setRole("user");
          return;
        }

        const metaRole = normalizeRole(u.user_metadata?.role ?? u.app_metadata?.role ?? null);

        const { data: row, error } = await supabase
          .from("op_users")
          .select("role")
          .eq("id", u.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.warn("[Header] op_users role fetch error:", error);
          setRole(metaRole);
        } else {
          setRole(normalizeRole(row?.role ?? metaRole));
        }
      } catch {
        if (!mounted) return;
        setHasSession(false);
        setRole("user");
      }
    };

    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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

  const MobileMenuPanel = mobileOpen ? (
    <div
      className="md:hidden min-w-0 shrink-0 flex items-center gap-2 rounded-2xl bg-gradient-to-b from-slate-50 to-white px-2 py-1 border border-slate-200/80 shadow-sm"
      style={{ pointerEvents: "auto" }}
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
            className="rounded-full"
            onClick={() => setMobileOpen(false)}
            style={{ touchAction: "manipulation" as any }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

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
        className="fixed top-0 left-0 right-0 z-40 w-full max-w-full overflow-x-hidden bg-white shadow-sm"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="w-full bg-white border-b border-gray-200 overflow-hidden">
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full whitespace-nowrap"
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
                      className="rounded-full flex items-center gap-1 whitespace-nowrap"
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

              <div className="md:hidden min-w-0 shrink-0 flex items-center gap-2">
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
        className="w-full shrink-0"
        style={{ height: "calc(env(safe-area-inset-top, 0px) + 86px)" }}
      />

      {MobileMenuPanel}

      <ContactModal open={contactOpen} onOpenChange={setContactOpen} cooldownSeconds={30} />
    </>
  );
};

export default Header;
