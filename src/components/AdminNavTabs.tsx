// src/components/AdminNavTabs.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Home, Megaphone } from "lucide-react";

const AdminNavTabs: React.FC = () => {
  const { language } = useLanguage();
  const { pathname } = useLocation();

  const isContacts = pathname.startsWith("/admin/ouvrier-contacts");
  const isInscriptions = pathname.startsWith("/admin/ouvriers");
  const isDashboard = pathname.startsWith("/admin/dashboard");
  const isAds = pathname.startsWith("/admin/publicites");

  const t = {
    contacts: language === "fr" ? "Demandes de contact" : "Contact requests",
    inscriptions:
      language === "fr" ? "Inscriptions ouvriers" : "Worker registrations",
    dashboard: language === "fr" ? "Tableau de bord" : "Dashboard",
    ads: language === "fr" ? "Publicités" : "Ads",
    back: language === "fr" ? "Retour au site" : "Back to site",
  };

  const baseTab =
    "px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap";
  const active = "bg-white text-slate-900 shadow-sm border border-slate-200";
  const inactive =
    "text-slate-600 hover:text-slate-900 hover:bg-slate-100";

  const tabClass = (on: boolean) => `${baseTab} ${on ? active : inactive}`;

  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      {/* Onglets */}
      <div className="rounded-full bg-slate-100 p-1">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <Link
            to="/admin/dashboard"
            aria-current={isDashboard ? "page" : undefined}
            className={tabClass(isDashboard)}
          >
            {t.dashboard}
          </Link>

          <Link
            to="/admin/ouvrier-contacts"
            aria-current={isContacts ? "page" : undefined}
            className={tabClass(isContacts)}
          >
            {t.contacts}
          </Link>

          <Link
            to="/admin/ouvriers"
            aria-current={isInscriptions ? "page" : undefined}
            className={tabClass(isInscriptions)}
          >
            {t.inscriptions}
          </Link>

          <Link
            to="/admin/publicites"
            aria-current={isAds ? "page" : undefined}
            className={`${tabClass(isAds)} inline-flex items-center gap-2`}
          >
            <Megaphone className="w-4 h-4" />
            {t.ads}
          </Link>
        </div>
      </div>

      {/* Retour au site */}
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

/* Optionnel: ajoute ceci dans ton CSS global si tu veux masquer la scrollbar :
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
*/
