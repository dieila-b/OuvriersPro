import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Languages, Search, User, Menu } from "lucide-react";
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

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      {/* wrapper full-width + max-w */}
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-pro-blue rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-base sm:text-lg">OP</span>
            </div>
            <span className="text-base sm:text-lg md:text-xl font-bold text-pro-gray">OuvriersPro</span>
          </div>

          {/* Navigation Desktop */}
          <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
            <a
              href="#search"
              className="text-sm xl:text-base text-pro-gray hover:text-pro-blue transition-colors"
            >
              {t("nav.search")}
            </a>
            <a
              href="#faq"
              className="text-sm xl:text-base text-pro-gray hover:text-pro-blue transition-colors"
            >
              {t("nav.faq")}
            </a>
            <a
              href="#contact"
              className="text-sm xl:text-base text-pro-gray hover:text-pro-blue transition-colors"
            >
              {t("nav.contact")}
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Bouton Admin : visible uniquement si role = admin (desktop) */}
            {isAdmin && (
              <Link
                to="/admin/ouvrier-contacts"
                className="hidden lg:inline-flex items-center rounded-full border border-gray-300 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                Admin
              </Link>
            )}

            {/* CTA Devenir Ouvrier Pro (desktop) */}
            <a href="#subscription" className="hidden lg:block">
              <Button
                size="sm"
                className="bg-pro-blue text-white hover:bg-pro-blue/90 text-xs sm:text-sm px-3 sm:px-4"
              >
                <span className="hidden xl:inline">Devenir Ouvrier Pro</span>
                <span className="xl:hidden">Inscription</span>
              </Button>
            </a>

            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-1 px-2 sm:px-3"
                >
                  <Languages className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="uppercase text-xs sm:text-sm">{language}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white z-50">
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

            {/* Mobile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden px-2 sm:px-3">
                  <Menu className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white z-50 w-48">
                <DropdownMenuItem asChild>
                  <a href="#search" className="flex items-center">
                    <Search className="w-4 h-4 mr-2" />
                    {t("nav.search")}
                  </a>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <a href="#faq" className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    FAQ
                  </a>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <a href="#contact" className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Contact
                  </a>
                </DropdownMenuItem>

                {/* Lien Admin dans le menu mobile – visible seulement si admin */}
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/ouvrier-contacts" className="flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                )}

                {/* CTA Devenir Ouvrier Pro (mobile) */}
                <DropdownMenuItem asChild className="cursor-pointer">
                  <a href="#subscription" className="flex items-center font-medium text-pro-blue">
                    <User className="w-4 h-4 mr-2" />
                    Devenir Ouvrier Pro
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
