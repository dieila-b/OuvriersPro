// src/components/Header.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Languages, Search as SearchIcon, User, Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthProfile } from "@/hooks/useAuthProfile";

const Header = () => {
  const { language, setLanguage, t } = useLanguage();
  const { user, isAdmin, isWorker } = useAuthProfile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

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

  const accountLabel = useMemo(() => {
    if (user) return language === "fr" ? "Mon compte" : "My account";
    return language === "fr" ? "Se connecter" : "Sign in";
  }, [user, language]);

  const accountPath = useMemo(() => {
    if (!user) return "/mon-compte";
    if (isAdmin) return "/admin/dashboard";
    if (isWorker) return "/espace-ouvrier";
    return "/espace-client";
  }, [user, isAdmin, isWorker]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const headerEl = document.querySelector("header") as HTMLElement | null;
    const headerHeight = headerEl?.offsetHeight ?? 64;

    const y = el.getBoundingClientRect().top + window.scrollY - headerHeight - 10;
    window.scrollTo({ top: Math.max(y, 0), behavior: "smooth" });
  };

  const handleSearchClick = () => {
    if (location.pathname === "/") scrollToSection("search");
    else navigate("/#search");
  };

  const handleNavClickSection = (sectionId: string) => {
    if (location.pathname === "/") scrollToSection(sectionId);
    else navigate(`/#${sectionId}`);
  };

  // ✅ FAQ = page dédiée (pas un scroll d’ancre)
  const handleFaqClick = () => {
    if (location.pathname === "/faq" || location.pathname === "/aide") return;
    navigate("/faq");
  };

  const NavLinkButton = ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 text-sm font-medium text-pro-gray hover:text-pro-blue transition-colors whitespace-nowrap"
    >
      {children}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 w-full max-w-full bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="h-14 sm:h-16 min-w-0 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link to="/" className="min-w-0 flex items-center gap-2">
            <div className="w-10 h-10 bg-pro-blue rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">PS</span>
            </div>
            <span className="text-base sm:text-xl font-bold text-pro-gray truncate">
              ProxiServices
            </span>
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex min-w-0 items-center gap-6">
            <NavLinkButton onClick={handleSearchClick}>{t("nav.search")}</NavLinkButton>

            {/* ✅ FIX: FAQ -> /faq */}
            <NavLinkButton onClick={handleFaqClick}>{t("nav.faq")}</NavLinkButton>

            <NavLinkButton onClick={() => handleNavClickSection("contact")}>{t("nav.contact")}</NavLinkButton>
          </nav>

          {/* Actions Desktop */}
          <div className="hidden md:flex min-w-0 items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors whitespace-nowrap"
              >
                Admin
              </Link>
            )}

            <Link to={accountPath} className="min-w-0">
              <Button
                size="sm"
                className="bg-pro-blue text-white hover:bg-pro-blue/90 flex items-center gap-2 whitespace-nowrap"
              >
                <User className="w-4 h-4" />
                <span className="hidden lg:inline">{accountLabel}</span>
                <span className="lg:hidden">{language === "fr" ? "Compte" : "Account"}</span>
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1 whitespace-nowrap">
                  <Languages className="w-4 h-4" />
                  <span className="uppercase">{language}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem onClick={() => setLanguage("fr")} className="cursor-pointer">
                  Français
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("en")} className="cursor-pointer">
                  English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile actions */}
          <div className="md:hidden min-w-0 flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1 whitespace-nowrap">
                  <Languages className="w-4 h-4" />
                  <span className="uppercase">{language}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem onClick={() => setLanguage("fr")} className="cursor-pointer">
                  Français
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("en")} className="cursor-pointer">
                  English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu mobile"
              className="whitespace-nowrap"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label="Fermer le menu"
            onClick={() => setMobileOpen(false)}
          />

          <div className="absolute top-0 left-0 right-0 w-full bg-white border-b border-gray-200 shadow-lg">
            <div className="w-full px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between gap-3 min-w-0">
                <span className="text-sm font-semibold text-pro-gray">
                  {language === "fr" ? "Menu" : "Menu"}
                </span>
                <Button variant="outline" size="sm" onClick={() => setMobileOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mt-3 flex flex-col gap-1 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    handleSearchClick();
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue min-w-0"
                >
                  <SearchIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{t("nav.search")}</span>
                </button>

                {/* ✅ FIX: FAQ -> /faq */}
                <button
                  type="button"
                  onClick={() => {
                    handleFaqClick();
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue min-w-0"
                >
                  <span className="truncate">{t("nav.faq")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleNavClickSection("contact");
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue min-w-0"
                >
                  <span className="truncate">{t("nav.contact")}</span>
                </button>

                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue min-w-0"
                  >
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Admin</span>
                  </Link>
                )}

                <div className="pt-2">
                  <Link to={accountPath} onClick={() => setMobileOpen(false)}>
                    <Button className="w-full bg-pro-blue text-white hover:bg-pro-blue/90 flex items-center justify-center gap-2 whitespace-nowrap">
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
  );
};

export default Header;
