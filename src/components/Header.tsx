// src/components/Header.tsx
import React, { useState } from "react";
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

const HEADER_OFFSET = 96; // hauteur approximative du header sticky

const Header = () => {
  const { language, setLanguage, t } = useLanguage();
  const { user, isAdmin, isWorker } = useAuthProfile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const closeMobile = () => setMobileOpen(false);

  // Libellé du bouton compte
  const accountLabel = user
    ? language === "fr"
      ? "Mon compte"
      : "My account"
    : language === "fr"
    ? "Se connecter"
    : "Sign in";

  // Destination selon le rôle
  const accountPath = user
    ? isAdmin
      ? "/admin/dashboard"
      : isWorker
      ? "/espace-ouvrier"
      : "/espace-client" // client / particulier par défaut
    : "/mon-compte";

  // Scroll lissé vers une section de la home
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const y = rect.top + window.scrollY - HEADER_OFFSET;

    window.scrollTo({
      top: y,
      behavior: "smooth",
    });
  };

  // Gestion clics sur Rechercher / FAQ / Contact
  const handleNavClick = (sectionId: string) => {
    if (location.pathname === "/") {
      // On est déjà sur la home → scroll direct
      scrollToSection(sectionId);
    } else {
      // On change de route vers la home avec un hash
      navigate(`/#${sectionId}`);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      {/* wrapper full-width + max-w */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-pro-blue rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">OP</span>
            </div>
            <span className="text-lg sm:text-xl font-bold text-pro-gray">
              OuvriersPro
            </span>
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            <button
              type="button"
              onClick={() => handleNavClick("search")}
              className="text-pro-gray hover:text-pro-blue transition-colors"
            >
              {t("nav.search")}
            </button>
            <button
              type="button"
              onClick={() => handleNavClick("faq")}
              className="text-pro-gray hover:text-pro-blue transition-colors"
            >
              {t("nav.faq")}
            </button>
            <button
              type="button"
              onClick={() => handleNavClick("contact")}
              className="text-pro-gray hover:text-pro-blue transition-colors"
            >
              {t("nav.contact")}
            </button>
          </nav>

          {/* Actions Desktop */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Lien Admin discret si role = admin */}
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                Admin
              </Link>
            )}

            {/* CTA Compte : "Se connecter" (non loggé) / "Mon compte" (loggé) */}
            <Link to={accountPath}>
              <Button
                size="sm"
                className="bg-pro-blue text-white hover:bg-pro-blue/90 flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                {accountLabel}
              </Button>
            </Link>

            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <Languages className="w-4 h-4" />
                  <span className="uppercase">{language}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem
                  onClick={() => setLanguage("fr")}
                  className="cursor-pointer"
                >
                  🇫🇷 Français
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLanguage("en")}
                  className="cursor-pointer"
                >
                  🇬🇧 English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center gap-2">
            {/* Language Switcher mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  <Languages className="w-4 h-4" />
                  <span className="uppercase">{language}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem
                  onClick={() => setLanguage("fr")}
                  className="cursor-pointer"
                >
                  🇫🇷 Français
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLanguage("en")}
                  className="cursor-pointer"
                >
                  🇬🇧 English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Hamburger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Menu mobile"
            >
              {mobileOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white">
          <div className="w-full max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                handleNavClick("search");
                closeMobile();
              }}
              className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue"
            >
              <SearchIcon className="w-4 h-4" />
              {t("nav.search")}
            </button>

            <button
              type="button"
              onClick={() => {
                handleNavClick("faq");
                closeMobile();
              }}
              className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue"
            >
              {t("nav.faq")}
            </button>

            <button
              type="button"
              onClick={() => {
                handleNavClick("contact");
                closeMobile();
              }}
              className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue"
            >
              {t("nav.contact")}
            </button>

            {/* Lien Admin mobile */}
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                onClick={closeMobile}
                className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue"
              >
                <User className="w-4 h-4" />
                Admin
              </Link>
            )}

            {/* CTA mobile Compte */}
            <Link to={accountPath} onClick={closeMobile} className="pt-2">
              <Button className="w-full bg-pro-blue text-white hover:bg-pro-blue/90 flex items-center justify-center gap-2">
                <User className="w-4 h-4" />
                {accountLabel}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
