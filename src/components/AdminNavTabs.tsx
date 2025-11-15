// src/components/AdminNavTabs.tsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const AdminNavTabs: React.FC = () => {
  const { language } = useLanguage();
  const location = useLocation();
  const path = location.pathname;

  const isContacts = path.startsWith("/admin/ouvrier-contacts");
  const isInscriptions = path.startsWith("/admin/ouvriers");

  const text = {
    contacts:
      language === "fr"
        ? "Demandes de contact"
        : "Contact requests",
    inscriptions:
      language === "fr"
        ? "Inscriptions ouvriers"
        : "Worker registrations",
  };

  const baseTabClass =
    "px-4 py-2 text-sm font-medium rounded-full transition-colors";
  const activeClass =
    "bg-white text-slate-900 shadow-sm border border-slate-200";
  const inactiveClass =
    "text-slate-600 hover:text-slate-900 hover:bg-slate-100";

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1">
        <Link
          to="/admin/ouvrier-contacts"
          className={`${baseTabClass} ${
            isContacts ? activeClass : inactiveClass
          }`}
        >
          {text.contacts}
        </Link>
        <Link
          to="/admin/ouvriers"
          className={`${baseTabClass} ${
            isInscriptions ? activeClass : inactiveClass
          }`}
        >
          {text.inscriptions}
        </Link>
      </div>

      {/* Petit rappel discret de l'espace admin */}
      <div className="text-[11px] text-slate-500 uppercase tracking-wide">
        {language === "fr" ? "Espace admin" : "Admin area"}
      </div>
    </div>
  );
};

export default AdminNavTabs;
