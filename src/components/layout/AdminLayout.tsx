// src/components/layout/AdminLayout.tsx
import React from "react";
import { Outlet, NavLink, Link } from "react-router-dom";

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap",
    isActive ? "bg-white shadow-sm text-pro-gray" : "text-gray-600 hover:text-pro-gray hover:bg-white/60",
  ].join(" ");
}

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header sticky */}
      <div className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-pro-blue text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                PS
              </div>
              <div className="text-sm font-semibold text-pro-gray truncate">Administration</div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
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

              {/* ✅ Nouveau: Questions FAQ */}
              <NavLink to="/admin/faq-questions" className={navClass}>
                Questions FAQ
              </NavLink>

              <Link
                to="/"
                className="ml-2 text-sm text-gray-600 hover:text-pro-gray inline-flex items-center gap-2 whitespace-nowrap"
              >
                Retour au site
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
