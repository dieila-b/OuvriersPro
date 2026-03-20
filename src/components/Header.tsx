// src/components/Header.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Languages, User, Menu, X, Sparkles } from "lucide-react";
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

const HEADER_LIGHT = "rgba(248,250,252,0.88)";
const HEADER_BORDER = "rgba(148,163,184,0.18)";

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

  return (
    <>
      <header
        className="fixed left-0 right-0 top-0 z-50 w-full border-b backdrop-blur-xl"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          background: HEADER_LIGHT,
          borderColor: HEADER_BORDER,
          boxShadow: "0 10px 40px rgba(15, 23, 42, 0.06)",
        }}
      >
        <div className="mx-auto w-full px-4 sm:px-6 lg:px-10">
          <div className="flex h-[74px] items-center justify-between gap-3 sm:h-[82px]">
            <button
              type="button"
              onClick={() => go("/")}
              className="min-w-0 flex items-center text-left"
              style={{
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation" as any,
              }}
              aria-label={cms("brand.name", "ProxiServices", "ProxiServices")}
            >
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-blue-100 bg-white/90 px-2 py-1 shadow-sm">
                  <img
                    src={logoSrc}
                    alt={cms("brand.name", "ProxiServices", "ProxiServices")}
                    className="h-10 w-auto object-contain sm:h-12"
                    loading="eager"
                    decoding="async"
                    // @ts-ignore
                    fetchpriority="high"
                  />
                </div>

                <div className="hidden lg:block">
                  <div className="text-sm font-bold tracking-tight text-slate-900">
                    {cms("brand.name", "ProxiServices", "ProxiServices")}
                  </div>
                  <div className="text-xs text-slate-500">
                    {cms(
                      "header.brand.tagline",
                      "Marketplace de services locale, moderne et fiable",
                      "Modern and trusted local services marketplace"
                    )}
                  </div>
                </div>
              </div>
            </button>

            <div className="hidden items-center gap-2 md:flex">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-full border-slate-200 bg-white px-4 text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={() => safeGo("/inscription-ouvrier", "become_provider_desktop")}
                style={{ touchAction: "manipulation" as any }}
              >
                <Sparkles className="mr-2 h-4 w-4 text-blue-600" />
                {becomeProviderLabel}
              </Button>

              <Button
                type="button"
                size="sm"
                className="h-10 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 px-4 text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)] hover:from-blue-700 hover:to-blue-700"
                onClick={() => safeGo(accountPath, "account_desktop")}
                style={{ touchAction: "manipulation" as any }}
              >
                <User className="mr-2 h-4 w-4" />
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
                    className="h-10 rounded-full border-slate-200 bg-white px-3 shadow-sm"
                    aria-label={cms("header.lang.aria", "Changer de langue", "Change language")}
                    type="button"
                    style={{ touchAction: "manipulation" as any }}
                  >
                    <Languages className="mr-1.5 h-4 w-4" />
                    <span className="uppercase">{language}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl border-slate-200 bg-white p-1 shadow-xl">
                  <DropdownMenuItem onClick={() => setLanguage("fr")} className="cursor-pointer rounded-xl">
                    {cms("header.lang.fr", "Français", "French")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("en")} className="cursor-pointer rounded-xl">
                    {cms("header.lang.en", "English", "English")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2 md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-full border-slate-200 bg-white px-3 shadow-sm"
                    type="button"
                    style={{ touchAction: "manipulation" as any }}
                  >
                    <Languages className="mr-1 h-4 w-4" />
                    <span className="text-xs uppercase">{language}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl border-slate-200 bg-white p-1 shadow-xl">
                  <DropdownMenuItem onClick={() => setLanguage("fr")} className="cursor-pointer rounded-xl">
                    {cms("header.lang.fr", "Français", "French")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLanguage("en")} className="cursor-pointer rounded-xl">
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
                className="h-10 rounded-full border-slate-200 bg-white px-3 shadow-sm"
                style={{ touchAction: "manipulation" as any }}
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="h-[2px] w-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-500" />
      </header>

      <div
        aria-hidden
        className="w-full shrink-0 sm:hidden"
        style={{ height: "calc(env(safe-area-inset-top, 0px) + 74px)" }}
      />
      <div aria-hidden className="hidden w-full shrink-0 sm:block" style={{ height: "82px" }} />

      {mobileOpen && (
        <div className="fixed inset-x-0 top-[74px] z-40 px-4 sm:hidden">
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white/95 shadow-[0_25px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl">
            <div className="border-b border-slate-100 px-4 py-4">
              <div className="text-sm font-semibold text-slate-900">
                {cms("header.mobile_menu.title", "Menu", "Menu")}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {cms(
                  "header.mobile_menu.subtitle",
                  "Accédez rapidement à votre compte et à l’espace prestataire.",
                  "Quick access to your account and provider area."
                )}
              </div>
            </div>

            <div className="space-y-3 p-4">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-2xl border-slate-200 bg-slate-50 text-slate-800"
                onClick={() => safeGo("/inscription-ouvrier", "become_provider_mobile", true)}
                style={{ touchAction: "manipulation" as any }}
              >
                <Sparkles className="mr-2 h-4 w-4 text-blue-600" />
                {becomeProviderLabel}
              </Button>

              <Button
                type="button"
                className="h-11 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]"
                onClick={() => safeGo(accountPath, "account_mobile", true)}
                style={{ touchAction: "manipulation" as any }}
              >
                <User className="mr-2 h-4 w-4" />
                {accountLabel}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ContactModal open={contactOpen} onOpenChange={setContactOpen} cooldownSeconds={30} />
    </>
  );
};

export default Header;
