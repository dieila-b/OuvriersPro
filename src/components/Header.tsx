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

  // ✅ fermeture menu mobile quand on change de route
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search, location.hash]);

  // ✅ lock scroll quand menu mobile ouvert
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

  // ✅ scroll précis (utilise la hauteur réelle du header sticky)
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const headerEl = document.querySelector("header") as HTMLElement | null;
    const headerHeight = headerEl?.offsetHeight ?? 72;

    const y = el.getBoundingClientRect().top + window.scrollY - headerHeight - 8;
    window.scrollTo({ top: Math.max(y, 0), behavior: "smooth" });
  };

  const handleSearchClick = () => {
    // ✅ recherche = section "search" sur la home, pas /search
    if (location.pathname === "/") {
      scrollToSection("search");
    } else {
      navigate("/#search");
    }
  };

  const handleNavClickSection = (sectionId: string) => {
    if (location.pathname === "/") {
      scrollToSection(sectionId);
    } else {
      navigate(`/#${sectionId}`);
    }
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
      className="text-sm font-medium text-pro-gray hover:text-pro-blue transition-colors"
    >
      {children}
    </button>
  );

  return (
    <header className="bg-white/95 backdrop-blur border-b border-gray-200 sticky top-0 z-50">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 bg-pro-blue rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">OP</span>
            </div>
            <span className="text-base sm:text-xl font-bold text-pro-gray truncate">
              OuvriersPro
            </span>
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLinkButton onClick={handleSearchClick}>{t("nav.search")}</NavLinkButton>
            <NavLinkButton onClick={() => handleNavClickSection("faq")}>{t("nav.faq")}</NavLinkButton>
            <NavLinkButton onClick={() => handleNavClickSection("contact")}>{t("nav.contact")}</NavLinkButton>
          </nav>

          {/* Actions Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                Admin
              </Link>
            )}

            <Link to={accountPath}>
              <Button
                size="sm"
                className="bg-pro-blue text-white hover:bg-pro-blue/90 flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                <span className="hidden lg:inline">{accountLabel}</span>
                <span className="lg:hidden">{language === "fr" ? "Compte" : "Account"}</span>
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Languages className="w-4 h-4" />
                  <span className="uppercase">{language}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem onClick={() => setLanguage("fr")} className="cursor-pointer">
                  🇫🇷 Français
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("en")} className="cursor-pointer">
                  🇬🇧 English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Languages className="w-4 h-4" />
                  <span className="uppercase">{language}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem onClick={() => setLanguage("fr")} className="cursor-pointer">
                  🇫🇷 Français
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("en")} className="cursor-pointer">
                  🇬🇧 English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu mobile"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* ✅ Mobile overlay + panel (évite les scrolls/bugs et rend propre sur tous écrans) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          {/* overlay */}
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label="Fermer le menu"
            onClick={() => setMobileOpen(false)}
          />
          {/* panel */}
          <div className="absolute top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-lg">
            <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-pro-gray">
                  {language === "fr" ? "Menu" : "Menu"}
                </span>
                <Button variant="outline" size="sm" onClick={() => setMobileOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mt-3 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    handleSearchClick();
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue"
                >
                  <SearchIcon className="w-4 h-4" />
                  {t("nav.search")}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleNavClickSection("faq");
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue"
                >
                  {t("nav.faq")}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleNavClickSection("contact");
                    setMobileOpen(false);
                  }}
                  className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue"
                >
                  {t("nav.contact")}
                </button>

                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue"
                  >
                    <User className="w-4 h-4" />
                    Admin
                  </Link>
                )}

                <div className="pt-2">
                  <Link to={accountPath} onClick={() => setMobileOpen(false)}>
                    <Button className="w-full bg-pro-blue text-white hover:bg-pro-blue/90 flex items-center justify-center gap-2">
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
