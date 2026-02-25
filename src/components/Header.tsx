// src/components/Header.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Languages, User, Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import ContactModal from "@/components/contact/ContactModal";

import ProxiLogo from "@/assets/logo-proxiservices.png";

// Cache-busting : change à chaque build (Vite)
const BUILD_TAG =
  // @ts-ignore
  (import.meta as any).env?.VITE_BUILD_TAG ||
  String(Date.now());

const Header = () => {
  const { t, language, setLanguage } = useLanguage();

  // ⚠️ On garde ton hook pour isWorker, mais on n'utilise plus user comme "source de vérité"
  const { isWorker } = useAuthProfile();

  // ✅ Source de vérité auth: session Supabase
  const [hasSession, setHasSession] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const cms = (key: string, fallbackFr: string, fallbackEn: string) => {
    const v = t(key);
    if (!v || v === key) return language === "fr" ? fallbackFr : fallbackEn;
    return v;
  };

  // ✅ Sync session
  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setHasSession(!!data?.session?.user);
      } catch {
        if (!mounted) return;
        setHasSession(false);
      }
    };

    refresh();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!mounted) return;
      setHasSession(!!session?.user);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Ferme le menu à chaque changement de route
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search, location.hash]);

  // Empêche le scroll derrière le menu
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
    // ✅ si pas de session => login DIRECT
    if (!hasSession) return "/login";
    // ✅ si session => dashboard selon rôle
    if (isWorker) return "/espace-ouvrier";
    return "/espace-client";
  }, [hasSession, isWorker]);

  const becomeProviderLabel = useMemo(() => {
    return cms("header.btn_become_provider", "Devenir Prestataire", "Become a Provider");
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const logoSrc = useMemo(() => `${ProxiLogo}?v=${encodeURIComponent(BUILD_TAG)}`, []);

  /**
   * ✅ Navigation fiable partout (Web + Android WebView)
   */
  const go = useCallback(
    (to: string) => {
      setMobileOpen(false);
      navigate(to);
    },
    [navigate]
  );

  const canPortal = typeof document !== "undefined" && !!document.body;

  const MobileOverlay =
    canPortal
      ? createPortal(
          <div
            className="md:hidden fixed inset-0 z-[9999]"
            style={{
              WebkitTapHighlightColor: "transparent",
              pointerEvents: mobileOpen ? "auto" : "none",
            }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/35"
              style={{ pointerEvents: mobileOpen ? "auto" : "none" }}
              aria-label={cms("header.mobile_close.aria", "Fermer le menu", "Close menu")}
              onClick={() => setMobileOpen(false)}
            />

            {/* Panel */}
            <div
              className="absolute top-0 left-0 right-0 w-full bg-white border-b border-gray-200 shadow-lg"
              style={{ pointerEvents: mobileOpen ? "auto" : "none" }}
            >
              <div className="w-full px-4 sm:px-6 py-3">
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <span className="text-sm font-semibold text-pro-gray">
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
                    className="w-full text-left py-2 font-medium text-pro-gray hover:text-pro-blue"
                    style={{ touchAction: "manipulation" as any }}
                    onClick={() => go("/forfaits")}
                  >
                    {becomeProviderLabel}
                  </button>

                  <button
                    type="button"
                    className="w-full rounded-full bg-pro-blue text-white py-3 font-semibold flex items-center justify-center gap-2 whitespace-nowrap"
                    style={{ touchAction: "manipulation" as any }}
                    onClick={() => go(accountPath)}
                  >
                    <User className="w-4 h-4" />
                    {accountLabel}
                  </button>

                  <div className="h-1" />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <header className="sticky top-0 z-40 w-full max-w-full">
        <div className="bg-white border-b border-gray-200 overflow-hidden">
          <div className="w-full px-4 sm:px-6 lg:px-10">
            <div className="h-16 sm:h-[72px] min-w-0 flex items-center justify-between gap-3">
              {/* Logo */}
              <button
                type="button"
                onClick={() => go("/")}
                className="min-w-0 flex items-center shrink-0 text-left"
                style={{
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation" as any,
                }}
                aria-label={cms("brand.name", "ProxiServices", "ProxiServices")}
              >
                <div className="inline-flex items-center rounded-xl bg-white ring-1 ring-black/5 shadow-sm px-2 py-1">
                  <img
                    src={logoSrc}
                    alt={cms("brand.name", "ProxiServices", "ProxiServices")}
                    className="
                      h-12 sm:h-14
                      w-auto
                      max-w-[280px] sm:max-w-[340px] md:max-w-[420px]
                      object-contain
                      select-none
                    "
                    loading="eager"
                    decoding="async"
                    // @ts-ignore
                    fetchpriority="high"
                  />
                </div>
              </button>

              <nav className="hidden md:flex" aria-hidden="true" />

              {/* DESKTOP */}
              <div className="hidden md:flex min-w-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full whitespace-nowrap"
                  onClick={() => go("/forfaits")}
                  style={{ touchAction: "manipulation" as any }}
                >
                  {becomeProviderLabel}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  className="rounded-full bg-pro-blue text-white hover:bg-pro-blue/90 flex items-center gap-2 whitespace-nowrap shadow-sm"
                  onClick={() => go(accountPath)}
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

              {/* MOBILE */}
              <div className="md:hidden min-w-0 flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full flex items-center gap-1 whitespace-nowrap"
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

                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setMobileOpen((v) => !v)}
                  aria-label={cms("header.mobile_menu.aria", "Menu mobile", "Mobile menu")}
                  className="rounded-full px-3 whitespace-nowrap"
                  style={{ touchAction: "manipulation" as any }}
                >
                  {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="h-1 w-full bg-gradient-to-r from-pro-blue/90 via-blue-600/90 to-pro-blue/90" />
        </div>
      </header>

      {MobileOverlay}

      <ContactModal open={contactOpen} onOpenChange={setContactOpen} cooldownSeconds={30} />
    </>
  );
};

export default Header;
