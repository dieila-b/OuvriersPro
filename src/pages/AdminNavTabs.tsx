// src/components/AdminNavTabs.tsx
import React from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { LayoutDashboard, MessageSquareText, Users, ArrowLeft } from "lucide-react";

const basePill =
  "inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border backdrop-blur";
const inactivePill =
  "bg-white/70 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300 hover:shadow-sm";
const activePill =
  "bg-gradient-to-r from-sky-600 to-indigo-600 text-white border-white/40 shadow-[0_10px_30px_rgba(37,99,235,0.35)]";

const AdminNavTabs: React.FC = () => {
  const { language } = useLanguage();
  const location = useLocation();

  const tabs = [
    {
      to: "/admin/dashboard",
      label: language === "fr" ? "Tableau de bord" : "Dashboard",
      icon: LayoutDashboard,
    },
    {
      to: "/admin/ouvrier-contacts",
      label: language === "fr" ? "Demandes de contact" : "Contact requests",
      icon: MessageSquareText,
    },
    {
      to: "/admin/ouvriers",
      label: language === "fr" ? "Inscriptions ouvriers" : "Workers registrations",
      icon: Users,
    },
  ];

  return (
    <div className="w-full flex items-center justify-between gap-3 flex-wrap">
      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `${basePill} ${isActive ? activePill : inactivePill}`
              }
              end={t.to === "/admin/dashboard"}
            >
              <Icon className={`h-4 w-4 ${location.pathname === t.to ? "text-white" : "text-slate-600"}`} />
              <span>{t.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Retour au site */}
      <Link
        to="/"
        className={`${basePill} ${inactivePill} px-3 py-2`}
      >
        <ArrowLeft className="h-4 w-4 text-slate-600" />
        <span>{language === "fr" ? "Retour au site" : "Back to site"}</span>
      </Link>
    </div>
  );
};

export default AdminNavTabs;
