// src/components/layout/AdminLayout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import { Menu, X, ExternalLink, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  group?: "core" | "content";
};

function pillClass({ isActive }: { isActive: boolean }) {
  return cn(
    "shrink-0 inline-flex items-center gap-2",
    "px-3 py-2 rounded-full text-sm font-medium transition whitespace-nowrap",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-pro-blue/40",
    isActive
      ? "bg-white text-pro-gray shadow-sm border border-slate-200"
      : "text-slate-600 hover:text-pro-gray hover:bg-white/70 border border-transparent hover:border-slate-200"
  );
}

function mobileNavClass({ isActive }: { isActive: boolean }) {
  return cn(
    "w-full px-3 py-2 rounded-xl text-sm font-medium transition text-left",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-pro-blue/40",
    isActive
      ? "bg-slate-50 text-pro-gray border border-slate-200"
      : "text-slate-700 hover:text-pro-gray hover:bg-slate-50 border border-transparent"
  );
}

/** Petit dropdown custom (sans dépendance) */
function MoreMenu({
  items,
  activePath,
  label = "Plus",
}: {
  items: NavItem[];
  activePath: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isAnyActive = useMemo(() => {
    return items.some((it) =>
      it.end ? activePath === it.to : activePath.startsWith(it.to)
    );
  }, [items, activePath]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-pro-blue/40",
          isAnyActive
            ? "bg-white text-pro-gray shadow-sm border border-slate-200"
            : "text-slate-600 hover:text-pro-gray hover:bg-white/70 border border-transparent hover:border-slate-200"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </button>

      {/* overlay click-outside */}
      {open && (
        <button
          className="fixed inset-0 z-40 cursor-default"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 mt-2 z-50 w-72",
            "rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]",
            "p-2"
          )}
        >
          <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Navigation
          </div>

          <div className="mt-1 space-y-1">
            {items.map((it) => {
              const active = it.end ? activePath === it.to : activePath.startsWith(it.to);
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  className={cn(
                    "w-full flex items-center justify-between gap-3",
                    "px-3 py-2 rounded-xl text-sm transition",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-pro-blue/40",
                    active
                      ? "bg-slate-50 text-pro-gray border border-slate-200"
                      : "text-slate-700 hover:bg-slate-50 border border-transparent"
                  )}
                  end={it.end}
                  onClick={() => setOpen(false)}
                >
                  <span className="truncate">{it.label}</span>
                  {active && (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pro-blue text-white">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const navItems: NavItem[] = useMemo(
    () => [
      { to: "/admin/dashboard", label: "Tableau de bord", end: true, group: "core" },
      { to: "/admin/ouvrier-contacts", label: "Demandes de contact", group: "core" },
      { to: "/admin/ouvriers", label: "Inscriptions prestataires", group: "core" },
      { to: "/admin/publicites", label: "Publicités", group: "core" },
      { to: "/admin/signalements", label: "Signalements", group: "core" },
      { to: "/admin/journal-connexions", label: "Journal de connexions", group: "core" },
      { to: "/admin/faq-questions", label: "Questions FAQ", group: "content" },
      { to: "/admin/contenu", label: "Contenu du site", group: "content" },
    ],
    []
  );

  // Répartition : visible (pills) vs overflow (Plus)
  const { visibleItems, overflowItems } = useMemo(() => {
    const MAX_VISIBLE = 5; // ajustable
    const visible = navItems.slice(0, MAX_VISIBLE);
    const overflow = navItems.slice(MAX_VISIBLE);
    return { visibleItems: visible, overflowItems: overflow };
  }, [navItems]);

  // Ferme le drawer à chaque navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Bloque le scroll du body quand le drawer est ouvert
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // ESC pour fermer
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const activePath = location.pathname;

  return (
    <div data-admin className="min-h-dvh bg-slate-50 overflow-x-clip">
      {/* Top header glass + subtle gradient */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/75 backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white/70 to-transparent pointer-events-none" />

        <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex items-center gap-3 py-3 min-w-0">
            {/* Brand */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-10 w-10 rounded-2xl bg-pro-blue text-white flex items-center justify-center text-sm font-bold shadow-sm">
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

            {/* Desktop / Tablet nav */}
            <nav className="hidden md:flex min-w-0 flex-1 items-center">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Pills */}
                <div className="flex items-center gap-1 min-w-0">
                  {visibleItems.map((it) => (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      className={pillClass}
                      end={it.end}
                    >
                      {it.label}
                    </NavLink>
                  ))}

                  {overflowItems.length > 0 && (
                    <MoreMenu items={overflowItems} activePath={activePath} label="Plus" />
                  )}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* External + Logout */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/"
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition whitespace-nowrap",
                      "text-slate-600 hover:text-pro-gray hover:bg-white/70",
                      "border border-transparent hover:border-slate-200",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-pro-blue/40"
                    )}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Retour au site
                  </Link>

                  <AdminLogoutButton className="whitespace-nowrap" redirectTo="/" />
                </div>
              </div>
            </nav>

            {/* Mobile actions */}
            <div className="ml-auto flex items-center gap-2 md:hidden shrink-0">
              <button
                type="button"
                className="inline-flex items-center justify-center h-10 w-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                aria-label={drawerOpen ? "Fermer le menu" : "Ouvrir le menu"}
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen((v) => !v)}
              >
                {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        <div className="md:hidden">
          <div
            className={cn(
              "fixed inset-0 z-40 bg-black/30 transition-opacity",
              drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          <div
            className={cn(
              "fixed inset-y-0 right-0 z-50 w-[88vw] max-w-sm bg-white shadow-2xl border-l border-slate-200",
              "transition-transform duration-200 ease-out",
              drawerOpen ? "translate-x-0" : "translate-x-full"
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Menu admin"
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">Menu admin</div>
                <div className="text-[11px] text-slate-500 truncate">Navigation back-office</div>
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center h-10 w-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm shrink-0"
                aria-label="Fermer"
                onClick={() => setDrawerOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto h-[calc(100dvh-76px)]">
              {/* Section Core */}
              <div>
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Administration
                </div>
                <div className="mt-2 space-y-1">
                  {navItems
                    .filter((x) => x.group === "core")
                    .map((it) => (
                      <NavLink
                        key={it.to}
                        to={it.to}
                        className={mobileNavClass}
                        end={it.end}
                      >
                        {it.label}
                      </NavLink>
                    ))}
                </div>
              </div>

              {/* Section Content */}
              <div>
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Contenu
                </div>
                <div className="mt-2 space-y-1">
                  {navItems
                    .filter((x) => x.group === "content")
                    .map((it) => (
                      <NavLink
                        key={it.to}
                        to={it.to}
                        className={mobileNavClass}
                        end={it.end}
                      >
                        {it.label}
                      </NavLink>
                    ))}
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <Link
                  to="/"
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  Retour au site
                </Link>

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
