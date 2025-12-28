// src/components/AdminNavTabs.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Home, Megaphone } from "lucide-react";

const AdminNavTabs: React.FC = () => {
  const { language } = useLanguage();
  const location = useLocation();
  const path = location.pathname;

  const isContacts = path.startsWith("/admin/ouvrier-contacts");
  const isInscriptions = path.startsWith("/admin/ouvriers");
  const isDashboard = path.startsWith("/admin/dashboard");
  const isAds = path.startsWith("/admin/publicites");

  const t = {
    contacts: language === "fr" ? "Demandes de contact" : "Contact requests",
    inscriptions:
      language === "fr" ? "Inscriptions ouvriers" : "Worker registrations",
    dashboard: language === "fr" ? "Tableau de bord" : "Dashboard",
    ads: language === "fr" ? "Publicités" : "Ads",
    back: language === "fr" ? "Retour au site" : "Back to site",
  };

  const baseTab = "px-4 py-2 text-sm font-medium rounded-full transition-colors";
  const active = "bg-white text-slate-900 shadow-sm border border-slate-200";
  const inactive = "text-slate-600 hover:text-slate-900 hover:bg-slate-100";

  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      {/* Onglets */}
      <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 flex-wrap">
        <Link
          to="/admin/dashboard"
          className={`${baseTab} ${isDashboard ? active : inactive}`}
        >
          {t.dashboard}
        </Link>

        <Link
          to="/admin/ouvrier-contacts"
          className={`${baseTab} ${isContacts ? active : inactive}`}
        >
          {t.contacts}
        </Link>

        <Link
          to="/admin/ouvriers"
          className={`${baseTab} ${isInscriptions ? active : inactive}`}
        >
          {t.inscriptions}
        </Link>

        <Link
          to="/admin/publicites"
          className={`${baseTab} ${isAds ? active : inactive} inline-flex items-center gap-2`}
        >
          <Megaphone className="w-4 h-4" />
          {t.ads}
        </Link>
      </div>

      {/* Bouton retour au site */}
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 transition-colors"
      >
        <Home className="w-4 h-4" />
        {t.back}
      </Link>
    </div>
  );
};

export default AdminNavTabs;
