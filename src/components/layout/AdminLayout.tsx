// src/components/layout/AdminLayout.tsx
import React from "react";
import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import { Menu, X, ExternalLink } from "lucide-react";

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap",
    isActive
      ? "bg-white shadow-sm text-pro-gray"
      : "text-gray-600 hover:text-pro-gray hover:bg-white/60",
  ].join(" ");
}

function mobileNavItemClass(isActive: boolean) {
  return [
    "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition",
    isActive ? "bg-white shadow-sm text-pro-gray" : "text-gray-700 hover:bg-white",
  ].join(" ");
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();

  // Ferme le menu mobile à chaque navigation
  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header sticky */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6">
          <div className="flex items-center justify-between py-3 gap-3">
            {/* Brand */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-pro-blue text-white flex items-center justify-center text-sm font-bold shrink-0">
                PS
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-pro-gray truncate">
                  Administration
                </div>
                <div className="text-[11px] text-gray-500 truncate">
                  Back-office
                </div>
              </div>
            </div>

            {/* Desktop nav (md+) */}
            <nav className="hidden md:flex items-center gap-2 flex-wrap justify-end">
              <NavLink to="/admin/dashboard" className={navClass} end>
                Tableau de bord
              </NavLink>
              <NavLink to="/admin/ouvrier-contacts" className={navClass}>
                Demandes de contact
              </NavLink>
              <NavLink to="/admin/ouvriers" className={navClass}>
                Inscriptions prestataires
              </NavLink>
              <NavLink to="/admin/publicites" className={navClass}>
                Publicités
              </NavLink>
              <NavLink to="/admin/signalements" className={navClass}>
                Signalements
              </NavLink>
              <NavLink to="/admin/faq-questions" className={navClass}>
                Questions FAQ
              </NavLink>
              <NavLink to="/admin/contenu" className={navClass}>
                Contenu du site
              </NavLink>

              <Link
                to="/"
                className="ml-2 text-sm text-gray-600 hover:text-pro-gray inline-flex items-center gap-2 whitespace-nowrap"
              >
                <ExternalLink className="h-4 w-4" />
                Retour au site
              </Link>

              <AdminLogoutButton className="ml-2 whitespace-nowrap" redirectTo="/" />
            </nav>

            {/* Mobile actions */}
            <div className="flex items-center gap-2 md:hidden">
              <Link
                to="/"
                className="text-sm text-gray-600 hover:text-pro-gray inline-flex items-center gap-2 whitespace-nowrap"
                title="Retour au site"
              >
                <ExternalLink className="h-4 w-4" />
              </Link>

              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-slate-50"
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                Menu
              </button>
            </div>
          </div>

          {/* Mobile menu panel */}
          {mobileOpen && (
            <div className="md:hidden pb-3">
              <div className="rounded-2xl border bg-white p-2 shadow-sm">
                <NavLink
                  to="/admin/dashboard"
                  end
                  className={({ isActive }) => mobileNavItemClass(isActive)}
                >
                  Tableau de bord
                </NavLink>

                <NavLink
                  to="/admin/ouvrier-contacts"
                  className={({ isActive }) => mobileNavItemClass(isActive)}
                >
                  Demandes de contact
                </NavLink>

                <NavLink
                  to="/admin/ouvriers"
                  className={({ isActive }) => mobileNavItemClass(isActive)}
                >
                  Inscriptions prestataires
                </NavLink>

                <NavLink
                  to="/admin/publicites"
                  className={({ isActive }) => mobileNavItemClass(isActive)}
                >
                  Publicités
                </NavLink>

                <NavLink
                  to="/admin/signalements"
                  className={({ isActive }) => mobileNavItemClass(isActive)}
                >
                  Signalements
                </NavLink>

                <NavLink
                  to="/admin/faq-questions"
                  className={({ isActive }) => mobileNavItemClass(isActive)}
                >
                  Questions FAQ
                </NavLink>

                <NavLink
                  to="/admin/contenu"
                  className={({ isActive }) => mobileNavItemClass(isActive)}
                >
                  Contenu du site
                </NavLink>

                <div className="my-2 border-t" />

                <Link
                  to="/"
                  className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-slate-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  Retour au site
                </Link>

                <div className="px-1 pt-2">
                  <AdminLogoutButton className="w-full justify-center" redirectTo="/" />
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-7xl px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}
