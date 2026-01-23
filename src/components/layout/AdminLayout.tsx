// src/components/layout/AdminLayout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import {
  Menu,
  X,
  ExternalLink,
  ChevronDown,
  Check,
  Search,
  LayoutDashboard,
  PhoneCall,
  UserCheck,
  Megaphone,
  Flag,
  BookOpen,
  FileText,
  Shield,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavGroup = "core" | "content";
type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  group?: NavGroup;
  icon?: React.ComponentType<{ className?: string }>;
};

function pillClass({ isActive }: { isActive: boolean }) {
  return cn(
    "inline-flex items-center gap-2",
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

function matchActive(activePath: string, it: NavItem) {
  return it.end ? activePath === it.to : activePath.startsWith(it.to);
}

/** Breadcrumb (Administration / Page) */
function Breadcrumb({
  activePath,
  items,
}: {
  activePath: string;
  items: NavItem[];
}) {
  const active = useMemo(() => {
    return (
      items.find((it) => matchActive(activePath, it)) ||
      items.find((it) => it.to === "/admin/dashboard")
    );
  }, [activePath, items]);

  return (
    <div className="border-b border-slate-200/70 bg-white/55 backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 xl:px-10">
        <div className="py-2.5 text-xs text-slate-500 flex items-center gap-2 min-w-0">
          <span className="font-medium text-slate-600">Administration</span>
          <span className="text-slate-300">/</span>
          <span className="truncate text-slate-700">{active?.label ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}

/** Dropdown "Plus" premium */
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
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const isAnyActive = useMemo(() => {
    return items.some((it) => matchActive(activePath, it));
  }, [items, activePath]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => it.label.toLowerCase().includes(s));
  }, [items, q]);

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
            "absolute right-0 mt-2 z-50 w-[22rem]",
            "rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]",
            "p-2"
          )}
        >
          <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Navigation
          </div>

          <div className="px-2 pb-2">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher dans Plus…"
                className={cn(
                  "w-full h-9 rounded-xl border border-slate-200 bg-slate-50/60",
                  "pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400",
                  "focus:outline-none focus:ring-2 focus:ring-pro-blue/40 focus:border-slate-200"
                )}
              />
            </div>
          </div>

          <div className="mt-1 space-y-1 max-h-[340px] overflow-auto pr-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">
                Aucun résultat
              </div>
            ) : (
              filtered.map((it) => {
                const active = matchActive(activePath, it);
                const Icon = it.icon;
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
                    <span className="flex items-center gap-2 min-w-0">
                      {Icon ? (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm shrink-0">
                          <Icon className="h-4 w-4 text-slate-700" />
                        </span>
                      ) : null}
                      <span className="truncate">{it.label}</span>
                    </span>

                    {active && (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pro-blue text-white">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </NavLink>
                );
              })
            )}
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
      {
        to: "/admin/dashboard",
        label: "Tableau de bord",
        end: true,
        group: "core",
        icon: LayoutDashboard,
      },
      {
        to: "/admin/ouvrier-contacts",
        label: "Demandes de contact",
        group: "core",
        icon: PhoneCall,
      },
      {
        to: "/admin/ouvriers",
        label: "Inscriptions prestataires",
        group: "core",
        icon: UserCheck,
      },
      {
        to: "/admin/publicites",
        label: "Publicités",
        group: "core",
        icon: Megaphone,
      },
      {
        to: "/admin/signalements",
        label: "Signalements",
        group: "core",
        icon: Flag,
      },
      {
        to: "/admin/journal-connexions",
        label: "Journal de connexions",
        group: "core",
        icon: LogIn,
      },
      { to: "/admin/faq-questions", label: "Questions FAQ", group: "content", icon: BookOpen },
      { to: "/admin/contenu", label: "Contenu du site", group: "content", icon: FileText },
    ],
    []
  );

  // Répartition : visible (pills) vs overflow (Plus)
  const { visibleItems, overflowItems } = useMemo(() => {
    // Réduit un peu : moins de “pills” visibles = moins de risques de débordement
    const MAX_VISIBLE = 4;
    const visible = navItems.slice(0, MAX_VISIBLE);
    const overflow = navItems.slice(MAX_VISIBLE);
    return { visibleItems: visible, overflowItems: overflow };
  }, [navItems]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

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
    <div data-admin className="min-h-dvh bg-slate-50">
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
                <div className="text-[11px] text-slate-500 truncate">Back-office</div>
              </div>
            </div>

            {/* ✅ Desktop nav seulement à partir de lg */}
            <nav className="hidden lg:flex min-w-0 flex-1 items-center">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Pills (scrollables si nécessaire) */}
                <div className="flex items-center gap-1 min-w-0 max-w-full overflow-x-auto">
                  {visibleItems.map((it) => {
                    const Icon = it.icon;
                    return (
                      <NavLink key={it.to} to={it.to} className={pillClass} end={it.end}>
                        {Icon ? <Icon className="h-4 w-4" /> : null}
                        {it.label}
                      </NavLink>
                    );
                  })}

                  {overflowItems.length > 0 && (
                    <MoreMenu items={overflowItems} activePath={activePath} label="Plus" />
                  )}
                </div>

                <div className="flex-1" />

                {/* Actions à droite */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to="/"
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition whitespace-nowrap",
                      "text-slate-600 hover:text-pro-gray hover:bg-white/70",
                      "border border-transparent hover:border-slate-200",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-pro-blue/40"
                    )}
                    title="Retour au site"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="hidden xl:inline">Retour au site</span>
                  </Link>

                  <AdminLogoutButton className="whitespace-nowrap" redirectTo="/" />
                </div>
              </div>
            </nav>

            {/* ✅ Mobile/Tablet (jusqu’à lg) */}
            <div className="ml-auto flex items-center gap-2 lg:hidden shrink-0">
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

        <Breadcrumb activePath={activePath} items={navItems} />

        {/* Drawer : visible < lg */}
        <div className="lg:hidden">
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
              <div>
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Administration
                </div>
                <div className="mt-2 space-y-1">
                  {navItems
                    .filter((x) => x.group === "core")
                    .map((it) => {
                      const Icon = it.icon;
                      return (
                        <NavLink key={it.to} to={it.to} className={mobileNavClass} end={it.end}>
                          <span className="inline-flex items-center gap-2">
                            {Icon ? <Icon className="h-4 w-4" /> : null}
                            {it.label}
                          </span>
                        </NavLink>
                      );
                    })}
                </div>
              </div>

              <div>
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Contenu
                </div>
                <div className="mt-2 space-y-1">
                  {navItems
                    .filter((x) => x.group === "content")
                    .map((it) => {
                      const Icon = it.icon;
                      return (
                        <NavLink key={it.to} to={it.to} className={mobileNavClass} end={it.end}>
                          <span className="inline-flex items-center gap-2">
                            {Icon ? <Icon className="h-4 w-4" /> : null}
                            {it.label}
                          </span>
                        </NavLink>
                      );
                    })}
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

              <div className="pt-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 flex items-start gap-2">
                  <Shield className="h-4 w-4 mt-0.5" />
                  <div>
                    Astuce : sur mobile/tablette, la navigation est regroupée ici. Sur desktop, “Plus”
                    inclut une recherche.
                  </div>
                </div>
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
