// src/components/Header.tsx
import React, { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Languages, Search, User, Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { useAuthProfile } from "@/hooks/useAuthProfile";

const Header = () => {
  const { language, setLanguage, t } = useLanguage();
  const { isAdmin } = useAuthProfile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  const accountLabel = language === "fr" ? "Mon compte" : "My account";

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
            <a
              href="#search"
              className="text-pro-gray hover:text-pro-blue transition-colors"
            >
              {t("nav.search")}
            </a>
            <a
              href="#faq"
              className="text-pro-gray hover:text-pro-blue transition-colors"
            >
              {t("nav.faq")}
            </a>
            <a
              href="#contact"
              className="text-pro-gray hover:text-pro-blue transition-colors"
            >
              {t("nav.contact")}
            </a>
          </nav>

          {/* Actions Desktop */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Bouton Admin : visible uniquement si role = admin */}
            {isAdmin && (
              <Link
                to="/admin/ouvrier-contacts"
                className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                Admin
              </Link>
            )}

            {/* CTA Mon compte (remplace Devenir Ouvrier Pro) */}
            <Link to="/mon-compte">
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
            <a
              href="#search"
              onClick={closeMobile}
              className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue"
            >
              <Search className="w-4 h-4" />
              {t("nav.search")}
            </a>

            <a
              href="#faq"
              onClick={closeMobile}
              className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue"
            >
              {t("nav.faq")}
            </a>

            <a
              href="#contact"
              onClick={closeMobile}
              className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue"
            >
              {t("nav.contact")}
            </a>

            {/* Admin mobile */}
            {isAdmin && (
              <Link
                to="/admin/ouvrier-contacts"
                onClick={closeMobile}
                className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue"
              >
                <User className="w-4 h-4" />
                Admin
              </Link>
            )}

            {/* CTA mobile Mon compte */}
            <Link to="/mon-compte" onClick={closeMobile} className="pt-2">
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
