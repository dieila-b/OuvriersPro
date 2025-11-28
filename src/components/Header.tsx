// src/components/Header.tsx
import React, { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Languages, Search, User, Menu, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "react-router-dom";
import { useAuthProfile } from "@/hooks/useAuthProfile";
import { supabase } from "@/lib/supabase";

const Header = () => {
  const { language, setLanguage, t } = useLanguage();
  const { isAdmin } = useAuthProfile(); // on garde ton hook pour l'admin
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const closeMobile = () => setMobileOpen(false);

  // Chargement user + rôle depuis Supabase
  useEffect(() => {
    const loadUserAndRole = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user ?? null;

      setIsLoggedIn(!!user);

      if (user) {
        const { data: profile } = await supabase
          .from("op_users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        setRole((profile?.role as string) || "user");
      } else {
        setRole(null);
      }
    };

    // initial
    loadUserAndRole();

    // écoute des changements d'auth
    const { data: listener } = supabase.auth.onAuthStateChange(
      () => loadUserAndRole()
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const accountLabel = !isLoggedIn
    ? language === "fr"
      ? "Se connecter"
      : "Log in"
    : language === "fr"
    ? "Mon compte"
    : "My account";

  const handleAccountClick = () => {
    if (!isLoggedIn) {
      // non connecté → page Mon compte (connexion / création)
      navigate("/mon-compte");
      return;
    }

    // connecté → on route selon le rôle
    if (isAdmin) {
      navigate("/admin/dashboard");
    } else if (role === "worker") {
      navigate("/espace-ouvrier");
    } else {
      // user, ou tout autre rôle par défaut
      navigate("/espace-client");
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
              <Button
                type="button"
                onClick={() => navigate("/admin/dashboard")}
                className="inline-flex items-center rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                variant="outline"
              >
                Admin
              </Button>
            )}

            {/* CTA Mon compte / Se connecter */}
            <Button
              size="sm"
              type="button"
              onClick={handleAccountClick}
              className="bg-pro-blue text-white hover:bg-pro-blue/90 flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              {accountLabel}
            </Button>

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
              <Button
                type="button"
                onClick={() => {
                  closeMobile();
                  navigate("/admin/dashboard");
                }}
                className="flex items-center gap-2 py-2 text-pro-gray hover:text-pro-blue"
                variant="ghost"
              >
                <User className="w-4 h-4" />
                Admin
              </Button>
            )}

            {/* CTA mobile Mon compte / Se connecter */}
            <div className="pt-2">
              <Button
                className="w-full bg-pro-blue text-white hover:bg-pro-blue/90 flex items-center justify-center gap-2"
                type="button"
                onClick={() => {
                  closeMobile();
                  handleAccountClick();
                }}
              >
                <User className="w-4 h-4" />
                {accountLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
