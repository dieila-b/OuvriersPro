// src/components/layout/AdminLayout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import { Menu, X } from "lucide-react";

type NavItem = { to: string; label: string; end?: boolean };

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-pro-blue/40",
    isActive
      ? "bg-white shadow-sm text-pro-gray"
      : "text-gray-600 hover:text-pro-gray hover:bg-white/70",
  ].join(" ");
}

function mobileNavClass({ isActive }: { isActive: boolean }) {
  return [
    "w-full px-3 py-2 rounded-lg text-sm font-medium transition",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-pro-blue/40",
    isActive
      ? "bg-white shadow-sm text-pro-gray"
      : "text-gray-700 hover:text-pro-gray hover:bg-white/70",
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
      { to: "/admin/faq-questions", label: "Questions FAQ" },
      { to: "/admin/contenu", label: "Contenu du site" },
    ],
    []
  );

  // Ferme le menu mobile à chaque navigation
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Empêche le scroll du body quand le drawer est ouvert
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header sticky */}
      <header className="sticky top-0 z-50 border-b bg-white/85 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between py-3 gap-3 min-w-0">
            {/* Brand */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-pro-blue text-white flex items-center justify-center text-sm font-bold shrink-0">
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

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1 min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                {navItems.map((it) => (
                  <NavLink key={it.to} to={it.to} className={navClass} end={it.end}>
                    {it.label}
                  </NavLink>
                ))}
                <Link
                  to="/"
                  className="ml-2 text-sm text-gray-600 hover:text-pro-gray inline-flex items-center gap-2 whitespace-nowrap"
                >
                  Retour au site
                </Link>
              </div>

              <div className="ml-2 shrink-0">
                <AdminLogoutButton className="whitespace-nowrap" redirectTo="/" />
              </div>
            </nav>

            {/* Mobile actions */}
            <div className="flex items-center gap-2 lg:hidden shrink-0">
              <Link
                to="/"
                className="text-sm text-gray-600 hover:text-pro-gray whitespace-nowrap hidden sm:inline-flex"
              >
                Retour au site
              </Link>

              <button
                type="button"
                className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
                aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {open && (
          <div className="lg:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 z-50 w-[86vw] max-w-sm bg-white shadow-2xl border-l border-slate-200">
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

              <div className="p-4 space-y-2">
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
                  className="w-full inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50"
                >
                  Retour au site
                </Link>

                <div className="pt-2">
                  <AdminLogoutButton className="w-full justify-center" redirectTo="/" />
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-10 py-6">
        <Outlet />
      </main>
    </div>
  );
}
