// src/components/layout/AdminLayout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, NavLink, Link, useLocation } from "react-router-dom";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import {
  Menu,
  X,
  ExternalLink,
  LayoutDashboard,
  PhoneCall,
  UserCheck,
  Megaphone,
  Flag,
  BookOpen,
  FileText,
  Shield,
  LogIn,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  MessageCircle,
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

function matchActive(activePath: string, it: NavItem) {
  return it.end ? activePath === it.to : activePath.startsWith(it.to);
}

function itemClass({ isActive, collapsed }: { isActive: boolean; collapsed: boolean }) {
  return cn(
    "w-full flex items-center gap-3 rounded-xl text-sm font-medium transition",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-pro-blue/40",
    collapsed ? "px-2 py-2 justify-center" : "px-3 py-2.5",
    isActive
      ? "bg-white text-pro-gray border border-slate-200 shadow-sm"
      : "text-slate-700 hover:text-pro-gray hover:bg-white/70 border border-transparent hover:border-slate-200"
  );
}

function Breadcrumb({ activePath, items }: { activePath: string; items: NavItem[] }) {
  const active = useMemo(() => {
    return items.find((it) => matchActive(activePath, it)) || items.find((it) => it.to === "/admin/dashboard");
  }, [activePath, items]);

  return (
    <div className="text-xs text-slate-500 flex items-center gap-2 min-w-0">
      <span className="font-medium text-slate-600">Administration</span>
      <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
      <span className="truncate text-slate-700">{active?.label ?? "—"}</span>
    </div>
  );
}

function Sidebar({
  navItems,
  activePath,
  collapsed,
  setCollapsed,
  onNavigate,
  showCollapseToggle,
}: {
  navItems: NavItem[];
  activePath: string;
  collapsed: boolean;
  setCollapsed?: (v: boolean) => void;
  onNavigate?: () => void;
  showCollapseToggle?: boolean;
}) {
  const core = navItems.filter((x) => x.group === "core");
  const content = navItems.filter((x) => x.group === "content");

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Brand */}
      <div className="px-3 pt-4 pb-4 border-b border-slate-200/70">
        <div className={cn("flex items-center gap-3 min-w-0", collapsed && "justify-center")}>
          <div className="h-10 w-10 rounded-2xl bg-pro-blue text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
            PS
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">Administration</div>
              <div className="text-[11px] text-slate-500 truncate">Back-office</div>
            </div>
          )}

          {showCollapseToggle && setCollapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "ml-auto inline-flex items-center justify-center h-10 w-10 rounded-2xl",
                "border border-slate-200 bg-white hover:bg-slate-50 shadow-sm",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-pro-blue/40",
                collapsed && "ml-0"
              )}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              aria-label={collapsed ? "Étendre le menu" : "Réduire le menu"}
              title={collapsed ? "Étendre" : "Réduire"}
            >
              {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <div className={cn("flex-1 min-h-0 overflow-y-auto overscroll-contain", collapsed ? "px-2 py-3" : "px-3 py-4", "space-y-5")}>
        <div>
          {!collapsed && (
            <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Menu</div>
          )}
          <div className={cn("mt-2", collapsed ? "space-y-2" : "space-y-1")}>
            {core.map((it) => {
              const Icon = it.icon;
              const isActive = matchActive(activePath, it);

              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={itemClass({ isActive, collapsed })}
                  onClick={onNavigate}
                  title={collapsed ? it.label : undefined}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                >
                  {Icon ? (
                    <span
                      className={cn(
                        "rounded-xl border border-slate-200 bg-white shadow-sm inline-flex items-center justify-center shrink-0",
                        collapsed ? "h-10 w-10" : "h-9 w-9"
                      )}
                    >
                      <Icon className="h-4 w-4 text-slate-700" />
                    </span>
                  ) : null}
                  {!collapsed && <span className="truncate">{it.label}</span>}
                </NavLink>
              );
            })}
          </div>
        </div>

        <div>
          {!collapsed && (
            <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contenu</div>
          )}
          <div className={cn("mt-2", collapsed ? "space-y-2" : "space-y-1")}>
            {content.map((it) => {
              const Icon = it.icon;
              const isActive = matchActive(activePath, it);

              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={itemClass({ isActive, collapsed })}
                  onClick={onNavigate}
                  title={collapsed ? it.label : undefined}
                  style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                >
                  {Icon ? (
                    <span
                      className={cn(
                        "rounded-xl border border-slate-200 bg-white shadow-sm inline-flex items-center justify-center shrink-0",
                        collapsed ? "h-10 w-10" : "h-9 w-9"
                      )}
                    >
                      <Icon className="h-4 w-4 text-slate-700" />
                    </span>
                  ) : null}
                  {!collapsed && <span className="truncate">{it.label}</span>}
                </NavLink>
              );
            })}
          </div>
        </div>

        {!collapsed && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 flex items-start gap-2">
            <Shield className="h-4 w-4 mt-0.5" />
            <div>Astuce : utilise le bouton en haut pour réduire/étendre la sidebar.</div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className={cn("border-t border-slate-200/70 bg-white", collapsed ? "px-2 py-3" : "px-4 py-4", "space-y-2")}>
        {collapsed ? (
          <>
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
              onClick={onNavigate}
              title="Retour au site"
              aria-label="Retour au site"
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
            <AdminLogoutButton className="w-full justify-center" redirectTo="/" />
          </>
        ) : (
          <>
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 shadow-sm"
              onClick={onNavigate}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              <ExternalLink className="h-4 w-4" />
              Retour au site
            </Link>
            <AdminLogoutButton className="w-full justify-center" redirectTo="/" />
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("admin_sidebar_collapsed");
      return v === "1";
    } catch {
      return false;
    }
  });

  const location = useLocation();
  const activePath = location.pathname;

  const navItems: NavItem[] = useMemo(
    () => [
      { to: "/admin/dashboard", label: "Tableau de bord", end: true, group: "core", icon: LayoutDashboard },
      { to: "/admin/ouvrier-contacts", label: "Demandes de contact", group: "core", icon: PhoneCall },
      { to: "/admin/ouvriers", label: "Inscriptions prestataires", group: "core", icon: UserCheck },
      { to: "/admin/publicites", label: "Publicités", group: "core", icon: Megaphone },
      { to: "/admin/signalements", label: "Signalements", group: "core", icon: Flag },
      { to: "/admin/journal-connexions", label: "Journal de connexions", group: "core", icon: LogIn },
      { to: "/admin/moderation-avis", label: "Modération avis", group: "core", icon: MessageCircle },
      { to: "/admin/faq-questions", label: "Questions FAQ", group: "content", icon: BookOpen },
      { to: "/admin/contenu", label: "Contenu du site", group: "content", icon: FileText },
    ],
    []
  );

  useEffect(() => {
    try {
      localStorage.setItem("admin_sidebar_collapsed", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  useEffect(() => setDrawerOpen(false), [location.pathname]);

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

  const desktopSidebarWidth = collapsed ? "w-[88px]" : "w-[280px]";

  return (
    <div data-admin className="min-h-dvh bg-slate-50">
      {/* ✅ header sans blur (WebView friendly) */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white">
        <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-pro-blue/40"
              aria-label={drawerOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen((v) => !v)}
              style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >
              {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="min-w-0 flex-1">
              <Breadcrumb activePath={activePath} items={navItems} />
            </div>

            <div className="hidden md:flex items-center gap-2 shrink-0">
              <Link
                to="/"
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition whitespace-nowrap",
                  "text-slate-600 hover:text-pro-gray hover:bg-white/70",
                  "border border-transparent hover:border-slate-200",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-pro-blue/40"
                )}
                style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >
                <ExternalLink className="h-4 w-4" />
                Retour au site
              </Link>

              <AdminLogoutButton className="whitespace-nowrap" redirectTo="/" />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px]">
        <div className="flex min-h-[calc(100dvh-64px)]">
          <aside className={cn("hidden md:block shrink-0 border-r border-slate-200/70 bg-white", desktopSidebarWidth)}>
            <div className="sticky top-[64px] h-[calc(100dvh-64px)] min-h-0">
              <Sidebar
                navItems={navItems}
                activePath={activePath}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                showCollapseToggle
              />
            </div>
          </aside>

          <main className="min-w-0 flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile drawer */}
      <div className="md:hidden">
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/35 transition-opacity",
            drawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
          style={{ WebkitTapHighlightColor: "transparent" }}
        />

        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[88vw] max-w-sm bg-white shadow-2xl border-r border-slate-200",
            "transition-transform duration-200 ease-out",
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Menu admin"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <Sidebar navItems={navItems} activePath={activePath} collapsed={false} onNavigate={() => setDrawerOpen(false)} />
        </div>
      </div>
    </div>
  );
}
