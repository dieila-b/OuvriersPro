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

const Header = () => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      {/* ⬇️ plus de `container`, mais un wrapper full-width + max-w */}
      <div className="w-full max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-pro-blue rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">OP</span>
            </div>
            <span className="text-xl font-bold text-pro-gray">OuvriersPro</span>
          </div>

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

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* CTA Devenir Ouvrier Pro (desktop) */}
            <a href="#subscription">
              <Button
                size="sm"
                className="hidden md:inline-flex bg-pro-blue text-white hover:bg-pro-blue/90"
              >
                Devenir Ouvrier Pro
              </Button>
            </a>

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

            {/* Mobile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden">
                  <Menu className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem asChild>
                  <a href="#search" className="flex items-center">
                    <Search className="w-4 h-4 mr-2" />
                    {t("nav.search")}
                  </a>
                </DropdownMenuItem>

                {/* CTA Devenir Ouvrier Pro (mobile) */}
                <DropdownMenuItem asChild className="cursor-pointer">
                  <a href="#subscription" className="flex items-center">
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
