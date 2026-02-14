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
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import ContactModal from "@/components/contact/ContactModal";

import ProxiLogo from "@/assets/logo-proxiservices.png";

// ✅ Cache-busting : change à chaque build (Vite)
const BUILD_TAG =
  // @ts-ignore
  (import.meta as any).env?.VITE_BUILD_TAG ||
  // fallback (dev)
  String(Date.now());

const Header = () => {
  const { t, language, setLanguage } = useLanguage();
  const { user, isWorker } = useAuthProfile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const cms = (key: string, fallbackFr: string, fallbackEn: string) => {
    const v = t(key);
    if (!v || v === key) return language === "fr" ? fallbackFr : fallbackEn;
    return v;
  };

  // ✅ Ferme le menu à chaque changement de route
  useEffect(() => setMobileOpen(false), [location.pathname, location.search, location.hash]);

  // ✅ Empêche le scroll derrière le menu
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
    if (user) return cms("header.btn_account", "Mon compte", "My account");
    return cms("header.btn_login", "Se connecter", "Sign in");
  }, [user, language]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Si pas connecté => login
  const accountPath = useMemo(() => {
    if (!user) return "/login";
    if (isWorker) return "/espace-ouvrier";
    return "/espace-client";
  }, [user, isWorker]);

  const becomeProviderLabel = useMemo(() => {
    return cms("header.btn_become_provider", "Devenir Prestataire", "Become a Provider");
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ URL versionnée pour casser le cache (Android/WebView inclus)
  const logoSrc = useMemo(() => `${ProxiLogo}?v=${encodeURIComponent(BUILD_TAG)}`, []);

  // ✅ Navigation robuste (ferme menu puis navigate)
  const go = useCallback(
    (to: string) => {
      setMobileOpen(false);
      // requestAnimationFrame évite certains taps “perdus” sur WebView
      requestAnimationFrame(() => navigate(to));
    },
    [navigate]
  );

  // ✅ Rend le portal uniquement quand le DOM est prêt (SSR-safe / preview-safe)
  const canPortal = typeof document !== "undefined" && !!document.body;

  const MobileOverlay = mobileOpen && canPortal
    ? createPortal(
        <div
          className="md:hidden fixed inset-0 z-[9999]"
          style={{ WebkitTapHighlightColor: "transparent" }}
          // ✅ Important : ne pas laisser les events remonter à des parents
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/35"
            onClick={() => setMobileOpen(false)}
            onPointerDown={() => setMobileOpen(false)}
            aria-label={cms("header.mobile_close.aria", "Fermer le menu", "Close menu")}
          />

          {/* Panel */}
          <div
            className="absolute top-0 left-0 right-0 w-full bg-white border-b border-gray-200 shadow-lg"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
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
                  onPointerDown={() => setMobileOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mt-3 flex flex-col gap-2 min-w-0">
                {/* Devenir prestataire */}
                <button
                  type="button"
                  className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue min-w-0 text-left"
                  onClick={() => go("/forfaits")}
                  onPointerDown={() => go("/forfaits")} // ✅ WebView: pointerdown parfois plus fiable que click
                >
                  <span className="truncate font-medium">{becomeProviderLabel}</span>
                </button>

                {/* Connexion / Compte */}
                <Button
                  type="button"
                  className="w-full rounded-full bg-pro-blue text-white hover:bg-pro-blue/90 flex items-center justify-center gap-2 whitespace-nowrap"
                  onClick={() => go(accountPath)}
                  onPointerDown={() => go(accountPath)}
                >
                  <User className="w-4 h-4" />
                  {accountLabel}
                </Button>

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
        <div className="bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/75 border-b border-gray-200 overflow-hidden">
          <div className="w-full px-4 sm:px-6 lg:px-10">
            <div className="h-16 sm:h-[72px] min-w-0 flex items-center justify-between gap-3">
              <Link to="/" className="min-w-0 flex items-center shrink-0">
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
              </Link>

              <nav className="hidden md:flex" aria-hidden="true" />

              {/* DESKTOP */}
              <div className="hidden md:flex min-w-0 items-center gap-2">
                <Link to="/forfaits" className="min-w-0">
                  <Button variant="outline" size="sm" className="rounded-full whitespace-nowrap">
                    {becomeProviderLabel}
                  </Button>
                </Link>

                <Link to={accountPath} className="min-w-0">
                  <Button
                    size="sm"
                    className="rounded-full bg-pro-blue text-white hover:bg-pro-blue/90 flex items-center gap-2 whitespace-nowrap shadow-sm"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden lg:inline">{accountLabel}</span>
                    <span className="lg:hidden">{cms("header.btn_account_short", "Compte", "Account")}</span>
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full flex items-center gap-1 whitespace-nowrap"
                      aria-label={cms("header.lang.aria", "Changer de langue", "Change language")}
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
                    <Button variant="outline" size="sm" className="rounded-full flex items-center gap-1 whitespace-nowrap">
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
                  onPointerDown={() => setMobileOpen((v) => !v)} // ✅ WebView
                  aria-label={cms("header.mobile_menu.aria", "Menu mobile", "Mobile menu")}
                  className="rounded-full px-3 whitespace-nowrap"
                >
                  {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="h-1 w-full bg-gradient-to-r from-pro-blue/90 via-blue-600/90 to-pro-blue/90" />
        </div>
      </header>

      {/* ✅ Portal overlay rendu au niveau BODY */}
      {MobileOverlay}

      <ContactModal open={contactOpen} onOpenChange={setContactOpen} cooldownSeconds={30} />
    </>
  );
};

export default Header;
