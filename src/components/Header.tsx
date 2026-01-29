// src/components/Header.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Languages, User, Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "react-router-dom";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import ContactModal from "@/components/contact/ContactModal";

import ProxiLogo from "@/assets/logo-proxiservices.png";

const Header = () => {
  const { t, language, setLanguage } = useLanguage();
  const { user, isWorker } = useAuthProfile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const location = useLocation();

  const cms = (key: string, fallbackFr: string, fallbackEn: string) => {
    const v = t(key);
    if (!v || v === key) return language === "fr" ? fallbackFr : fallbackEn;
    return v;
  };

  useEffect(() => setMobileOpen(false), [location.pathname, location.search, location.hash]);

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

  // ✅ CTA Devenir prestataire => ouvre la même section (carte gratuit) via hash
  // Si ta section est sur /forfaits, remplace par "/forfaits#subscription"
  const becomeProviderHref = "/#subscription";

  const accountLabel = useMemo(() => {
    if (user) return cms("header.btn_account", "Mon compte", "My account");
    return cms("header.btn_login", "Se connecter", "Sign in");
  }, [user, language]); // eslint-disable-line react-hooks/exhaustive-deps

  const accountPath = useMemo(() => {
    if (!user) return "/mon-compte";
    if (isWorker) return "/espace-ouvrier";
    return "/espace-client";
  }, [user, isWorker]);

  const becomeProviderLabel = useMemo(() => {
    return cms("header.btn_become_provider", "Devenir Prestataire", "Become a Provider");
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <header className="sticky top-0 z-40 w-full max-w-full">
        {/* ✅ PAS de overflow-visible => rien ne déborde */}
        <div className="bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/75 border-b border-gray-200 overflow-hidden">
          <div className="w-full px-4 sm:px-6 lg:px-10">
            {/* ✅ header un peu plus haut pour rendre le logo lisible, sans débordement */}
            <div className="h-16 sm:h-[72px] min-w-0 flex items-center justify-between gap-3">
              {/* ✅ Logo moderne : bien visible, propre, et contenu */}
              <Link to="/" className="min-w-0 flex items-center shrink-0">
                <div className="inline-flex items-center rounded-xl bg-white ring-1 ring-black/5 shadow-sm px-2 py-1">
                  <img
                    src={ProxiLogo}
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
                  />
                </div>
              </Link>

              {/* Navigation Desktop (vide volontairement) */}
              <nav className="hidden md:flex" aria-hidden="true" />

              {/* Actions Desktop */}
              <div className="hidden md:flex min-w-0 items-center gap-2">
                {/* ✅ Devenir prestataire => même fenêtre/section que la capture */}
                <Link to={becomeProviderHref} className="min-w-0">
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

              {/* Mobile actions */}
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
                  onClick={() => setMobileOpen((v) => !v)}
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

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 bg-black/35"
              aria-label={cms("header.mobile_close.aria", "Fermer le menu", "Close menu")}
              onClick={() => setMobileOpen(false)}
            />

            <div className="absolute top-0 left-0 right-0 w-full bg-white border-b border-gray-200 shadow-lg">
              <div className="w-full px-4 sm:px-6 py-3">
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <span className="text-sm font-semibold text-pro-gray">
                    {cms("header.mobile_menu.title", "Menu", "Menu")}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setMobileOpen(false)} className="rounded-full">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="mt-3 flex flex-col gap-1 min-w-0">
                  {/* ✅ Devenir prestataire => même fenêtre/section que la capture */}
                  <Link
                    to={becomeProviderHref}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue min-w-0"
                  >
                    <span className="truncate font-medium">{becomeProviderLabel}</span>
                  </Link>

                  <div className="pt-2">
                    <Link to={accountPath} onClick={() => setMobileOpen(false)}>
                      <Button className="w-full rounded-full bg-pro-blue text-white hover:bg-pro-blue/90 flex items-center justify-center gap-2 whitespace-nowrap">
                        <User className="w-4 h-4" />
                        {accountLabel}
                      </Button>
                    </Link>
                  </div>

                  <div className="pb-2" />
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <ContactModal open={contactOpen} onOpenChange={setContactOpen} cooldownSeconds={30} />
    </>
  );
};

export default Header;
