import React from "react";
import { Outlet, NavLink, Link } from "react-router-dom";

function navClass({ isActive }: { isActive: boolean }) {
  return [
    "px-3 py-2 rounded-lg text-sm font-medium transition",
    isActive ? "bg-white shadow-sm text-pro-gray" : "text-gray-600 hover:text-pro-gray hover:bg-white/60",
  ].join(" ");
}

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header sticky */}
      <div className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-pro-blue text-white flex items-center justify-center text-sm font-bold">
                OP
              </div>
              <div className="text-sm font-semibold text-pro-gray">Administration</div>
            </div>

            <div className="flex items-center gap-2">
              <NavLink to="/admin/dashboard" className={navClass}>
                Tableau de bord
              </NavLink>
              <NavLink to="/admin/contacts" className={navClass}>
                Demandes de contact
              </NavLink>
              <NavLink to="/admin/inscriptions-ouvriers" className={navClass}>
                Inscriptions ouvriers
              </NavLink>
              <NavLink to="/admin/publicites" className={navClass}>
                Publicités
              </NavLink>

              <Link
                to="/"
                className="ml-2 text-sm text-gray-600 hover:text-pro-gray inline-flex items-center gap-2"
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
