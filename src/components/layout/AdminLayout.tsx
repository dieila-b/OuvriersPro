// src/components/layout/AdminLayout.tsx
import React from "react";
import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import { Button } from "@/components/ui/button";
import { Menu, ExternalLink } from "lucide-react";

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "px-3 py-2 rounded-lg text-sm font-medium transition",
    "whitespace-nowrap",
    isActive
      ? "bg-white shadow-sm text-pro-gray"
      : "text-gray-600 hover:text-pro-gray hover:bg-white/60",
  ].join(" ");
}

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Tableau de bord", end: true },
  { to: "/admin/ouvrier-contacts", label: "Demandes de contact" },
  { to: "/admin/ouvriers", label: "Inscriptions prestataires" },
  { to: "/admin/publicites", label: "Publicités" },
  { to: "/admin/signalements", label: "Signalements" },
  { to: "/admin/faq-questions", label: "Questions FAQ" },
  { to: "/admin/contenu", label: "Contenu du site" },
] as const;

export default function AdminLayout() {
  const location = useLocation();

  // ✅ ferme le menu mobile quand on change de route
  const detailsRef = React.useRef<HTMLDetailsElement | null>(null);
  React.useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = false;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header sticky */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3">
            {/* Brand */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-9 w-9 rounded-xl bg-pro-blue text-white flex items-center justify-center text-sm font-bold">
                PS
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-pro-gray">
                  Administration
                </div>
                <div className="text-[11px] text-gray-500">Back-office</div>
              </div>
            </div>

            {/* ✅ Desktop nav (UNE LIGNE, jamais de wrap) */}
            <div className="hidden md:flex flex-1 min-w-0 items-center gap-3">
              <nav
                className={[
                  "flex-1 min-w-0",
                  "overflow-x-auto overflow-y-hidden",
                  "whitespace-nowrap",
                  // hide scrollbar (cross browser) via Tailwind arbitrary selectors
                  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
                ].join(" ")}
              >
                <div className="inline-flex items-center gap-2 pr-2">
                  {NAV_ITEMS.map((it) => (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      end={Boolean((it as any).end)}
                      className={navClass}
                    >
                      {it.label}
                    </NavLink>
                  ))}
                </div>
              </nav>

              {/* Right actions desktop */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/"
                  className="text-sm text-gray-600 hover:text-pro-gray inline-flex items-center gap-2 whitespace-nowrap"
                >
                  <ExternalLink className="h-4 w-4" />
                  Retour au site
                </Link>

                <AdminLogoutButton className="whitespace-nowrap" redirectTo="/" />
              </div>
            </div>

            {/* ✅ Mobile menu (<md) */}
            <div className="ml-auto flex items-center gap-2 md:hidden">
              <Link
                to="/"
                className="text-sm text-gray-600 hover:text-pro-gray inline-flex items-center gap-2 whitespace-nowrap"
              >
                <ExternalLink className="h-4 w-4" />
                Site
              </Link>

              <AdminLogoutButton className="whitespace-nowrap" redirectTo="/" />

              {/* Menu natif (pas de dépendance shadcn Sheet) */}
              <details ref={detailsRef} className="relative">
                <summary className="list-none">
                  <Button variant="outline" size="icon" aria-label="Ouvrir le menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </summary>

                {/* overlay click-away */}
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => {
                    if (detailsRef.current) detailsRef.current.open = false;
                  }}
                  aria-label="Fermer le menu"
                />

                <div className="absolute right-0 mt-2 z-50 w-[320px] max-w-[calc(100vw-24px)] rounded-2xl border bg-white shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b">
                    <div className="text-sm font-semibold text-slate-900">
                      Menu admin
                    </div>
                    <div className="text-xs text-slate-500">
                      Navigation du back-office
                    </div>
                  </div>

                  <div className="p-2">
                    {NAV_ITEMS.map((it) => (
                      <NavLink
                        key={it.to}
                        to={it.to}
                        end={Boolean((it as any).end)}
                        className={({ isActive }) =>
                          [
                            "block w-full rounded-xl px-3 py-2 text-sm font-medium transition",
                            isActive
                              ? "bg-slate-100 text-pro-gray"
                              : "text-gray-700 hover:bg-slate-50",
                          ].join(" ")
                        }
                      >
                        {it.label}
                      </NavLink>
                    ))}
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}
