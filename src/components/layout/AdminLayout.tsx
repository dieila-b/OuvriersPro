// src/components/layout/AdminLayout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import { Menu, X, ExternalLink } from "lucide-react";

type NavItem = { to: string; label: string; end?: boolean };

function desktopNavItemClass({ isActive }: { isActive: boolean }) {
  return [
    "shrink-0",
    "px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-pro-blue/40",
    isActive
      ? "bg-white shadow-sm text-pro-gray"
      : "text-gray-600 hover:text-pro-gray hover:bg-white/70",
  ].join(" ");
}

function mobileNavClass({ isActive }: { isActive: boolean }) {
  return [
    "w-full px-3 py-2 rounded-lg text-sm font-medium transition text-left",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-pro-blue/40",
    isActive
      ? "bg-slate-50 text-pro-gray border border-slate-200"
      : "text-slate-700 hover:text-pro-gray hover:bg-slate-50",
  ].join(" ");
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const navItems: NavItem[] = useMemo(
    () => [
      { to: "/admin/dashboard", label: "Tableau de bord", end: true },
      { to: "/admin/ouvrier-contacts", label: "Demandes de contact" },
      { to: "/admin/ouvriers", label: "Inscriptions prestataires" },
      { to: "/admin/publicites", label: "Publicités" },
      { to: "/admin/signalements", label: "Signalements" },

      // ✅ NOUVEAU : Journal des connexions
      { to: "/admin/journal-connexions", label: "Journal de connexions" },

      { to: "/admin/faq-questions", label: "Questions FAQ" },
      { to: "/admin/contenu", label: "Contenu du site" },
    ],
    []
  );

  // Ferme le drawer à chaque navigation
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Bloque le scroll du body quand le drawer est ouvert
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC pour fermer
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div data-admin className="min-h-dvh bg-slate-50 overflow-x-clip">
      <header className="sticky top-0 z-50 border-b bg-white/85 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center gap-3 py-3 min-w-0">
            {/* Brand */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-9 w-9 rounded-xl bg-pro-blue text-white flex items-center justify-center text-sm font-bold">
                PS
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-pro-gray truncate">
                  Administration
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Back-office
                </div>
              </div>
            </div>

            {/* ✅ NAV DESKTOP UNIQUEMENT SUR TRÈS GRAND ÉCRAN (xl+) */}
            <nav className="hidden xl:flex min-w-0 flex-1 items-center">
              <div className="flex items-center gap-1 min-w-0 overflow-x-auto admin-scrollbar pr-8">
                {navItems.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    className={desktopNavItemClass}
                    end={it.end}
                  >
                    {it.label}
                  </NavLink>
                ))}

                <Link
                  to="/"
                  className={[
                    "shrink-0 ml-2 inline-flex items-center gap-2",
                    "px-3 py-2 rounded-lg text-sm text-gray-600 hover:text-pro-gray hover:bg-white/70 whitespace-nowrap",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-pro-blue/40",
                  ].join(" ")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Retour au site
                </Link>
              </div>
            </nav>

            {/* Actions */}
            <div className="ml-auto flex items-center gap-2 shrink-0">
              {/* Déconnexion visible en xl+ */}
              <div className="hidden xl:block">
                <AdminLogoutButton className="whitespace-nowrap" redirectTo="/" />
              </div>

              {/* ✅ Hamburger sur tout ce qui est < xl (donc vrai responsive) */}
              <button
                type="button"
                className="xl:hidden inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ✅ Drawer (< xl) */}
        <div className="xl:hidden">
          <div
            className={[
              "fixed inset-0 z-40 bg-black/30 transition-opacity",
              open
                ? "opacity-100 pointer-events-auto"
                : "opacity-0 pointer-events-none",
            ].join(" ")}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <div
            className={[
              "fixed inset-y-0 right-0 z-50 w-[88vw] max-w-sm bg-white shadow-2xl border-l border-slate-200",
              "transition-transform duration-200 ease-out",
              open ? "translate-x-0" : "translate-x-full",
            ].join(" ")}
            role="dialog"
            aria-modal="true"
            aria-label="Menu admin"
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  Menu admin
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  Navigation back-office
                </div>
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shrink-0"
                aria-label="Fermer"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-2 overflow-y-auto h-[calc(100dvh-72px)]">
              {navItems.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  className={mobileNavClass}
                  end={it.end}
                >
                  {it.label}
                </NavLink>
              ))}

              <Link
                to="/"
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                Retour au site
              </Link>

              <div className="pt-2">
                <AdminLogoutButton className="w-full justify-center" redirectTo="/" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
