// src/components/layout/AdminLayout.tsx
import React from "react";
import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu, ExternalLink } from "lucide-react";

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "px-3 py-2 rounded-lg text-sm font-medium transition",
    "min-w-0",
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
  const [open, setOpen] = React.useState(false);

  // ✅ ferme le drawer quand on change de route
  React.useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header sticky */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 gap-3">
            {/* Brand */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-pro-blue text-white flex items-center justify-center text-sm font-bold shrink-0">
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

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
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
            <div className="flex items-center gap-2 lg:hidden">
              <Link
                to="/"
                className="text-sm text-gray-600 hover:text-pro-gray inline-flex items-center gap-2 whitespace-nowrap"
              >
                <ExternalLink className="h-4 w-4" />
                Site
              </Link>

              <AdminLogoutButton className="whitespace-nowrap" redirectTo="/" />

              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Ouvrir le menu admin">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>

                <SheetContent side="right" className="w-[320px] sm:w-[380px] p-0">
                  <div className="p-4 border-b">
                    <SheetHeader>
                      <SheetTitle>Menu admin</SheetTitle>
                    </SheetHeader>
                    <div className="mt-2 text-xs text-gray-500">
                      Navigation du back-office
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="space-y-1">
                      {NAV_ITEMS.map((it) => (
                        <NavLink
                          key={it.to}
                          to={it.to}
                          end={Boolean((it as any).end)}
                          className={({ isActive }) =>
                            [
                              "block w-full rounded-lg px-3 py-2 text-sm font-medium transition",
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
                </SheetContent>
              </Sheet>
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
