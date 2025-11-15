// src/pages/AdminDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, Link } from "react-router-dom";
import AdminNavTabs from "@/components/AdminNavTabs";

type DbWorkerSummary = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profession: string | null;
  status: string | null;
  created_at: string;
};

type DbContactSummary = {
  id: string;
  worker_name: string | null;
  client_name: string | null;
  status: string | null;
  origin?: string | null;
  created_at: string;
};

const AdminDashboard: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  // 🔐 Auth admin
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // 🔢 Données dashboard
  const [workers, setWorkers] = useState<DbWorkerSummary[]>([]);
  const [contacts, setContacts] = useState<DbContactSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optionnel : filtre rapide par date sur le dashboard global
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // 🔐 Vérification des droits admin
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      setAuthLoading(true);

      const { data, error } = await supabase.auth.getUser();
      const user = data?.user;

      if (!isMounted) return;

      if (error || !user) {
        setAuthLoading(false);
        navigate("/login", { replace: true });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("op_users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (profileError || !profile || profile.role !== "admin") {
        setAuthLoading(false);
        navigate("/", { replace: true });
        return;
      }

      setIsAdmin(true);
      setAuthLoading(false);
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // 🔹 Chargement des données globales (ouvriers + contacts)
  useEffect(() => {
    if (authLoading || !isAdmin) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      // 1) Ouvriers
      const { data: workersData, error: workersError } = await supabase
        .from<DbWorkerSummary>("op_ouvriers")
        .select(
          `
          id,
          first_name,
          last_name,
          profession,
          status,
          created_at
        `
        )
        .order("created_at", { ascending: false });

      if (workersError) {
        console.error(workersError);
        setError(
          language === "fr"
            ? `Erreur chargement ouvriers : ${workersError.message}`
            : `Error loading workers: ${workersError.message}`
        );
      } else {
        setWorkers(workersData ?? []);
      }

      // 2) Contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from<DbContactSummary>("op_ouvrier_contacts")
        .select(
          `
          id,
          worker_name,
          client_name,
          status,
          origin,
          created_at
        `
        )
        .order("created_at", { ascending: false });

      if (contactsError) {
        console.error(contactsError);
        setError((prev) => {
          const msg =
            language === "fr"
              ? `Erreur chargement contacts : ${contactsError.message}`
              : `Error loading contacts: ${contactsError.message}`;
          return prev ? `${prev} | ${msg}` : msg;
        });
      } else {
        setContacts(contactsData ?? []);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, [language, authLoading, isAdmin]);

  // 🔎 Filtrage par dates global (appliqué aux stats et listes récentes)
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const created = new Date(w.created_at);
      let okFrom = true;
      let okTo = true;

      if (dateFrom) {
        const from = new Date(dateFrom + "T00:00:00");
        okFrom = created >= from;
      }
      if (dateTo) {
        const to = new Date(dateTo + "T23:59:59");
        okTo = created <= to;
      }

      return okFrom && okTo;
    });
  }, [workers, dateFrom, dateTo]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const created = new Date(c.created_at);
      let okFrom = true;
      let okTo = true;

      if (dateFrom) {
        const from = new Date(dateFrom + "T00:00:00");
        okFrom = created >= from;
      }
      if (dateTo) {
        const to = new Date(dateTo + "T23:59:59");
        okTo = created <= to;
      }

      return okFrom && okTo;
    });
  }, [contacts, dateFrom, dateTo]);

  // 🔢 Stats calculées
  const stats = useMemo(() => {
    // Ouvriers
    const totalWorkers = filteredWorkers.length;
    let pendingWorkers = 0;
    let approvedWorkers = 0;
    let rejectedWorkers = 0;

    filteredWorkers.forEach((w) => {
      if (w.status === "pending") pendingWorkers += 1;
      if (w.status === "approved") approvedWorkers += 1;
      if (w.status === "rejected") rejectedWorkers += 1;
    });

    // Contacts
    const totalContacts = filteredContacts.length;

    const todayISO = new Date().toISOString().slice(0, 10);
    let contactsToday = 0;
    let contactsLast7 = 0;

    filteredContacts.forEach((c) => {
      const dateStr = c.created_at.slice(0, 10);
      const created = new Date(c.created_at);
      const diffMs = Date.now() - created.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (dateStr === todayISO) contactsToday += 1;
      if (diffDays <= 7) contactsLast7 += 1;
    });

    return {
      totalWorkers,
      pendingWorkers,
      approvedWorkers,
      rejectedWorkers,
      totalContacts,
      contactsToday,
      contactsLast7,
    };
  }, [filteredWorkers, filteredContacts]);

  const formatDateTime = (value: string) => {
    const d = new Date(value);
    return d.toLocaleString(language === "fr" ? "fr-FR" : "en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const workerStatusLabel = (s: string | null | undefined) => {
    if (language === "fr") {
      if (s === "approved") return "Validé";
      if (s === "rejected") return "Refusé";
      return "En attente";
    } else {
      if (s === "approved") return "Approved";
      if (s === "rejected") return "Rejected";
      return "Pending";
    }
  };

  const workerStatusClass = (s: string | null | undefined) => {
    if (s === "approved")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "rejected")
      return "bg-red-50 text-red-700 border-red-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const contactStatusLabel = (s: string | null | undefined) => {
    if (language === "fr") {
      if (s === "in_progress") return "En cours";
      if (s === "done") return "Traité";
      return "Nouveau";
    } else {
      if (s === "in_progress") return "In progress";
      if (s === "done") return "Done";
      return "New";
    }
  };

  const originLabel = (o: string | null | undefined) => {
    if (!o || o === "web") return "web";
    if (o === "mobile") return "mobile";
    if (o === "other") return language === "fr" ? "autre" : "other";
    return o;
  };

  const recentWorkers = filteredWorkers.slice(0, 5);
  const recentContacts = filteredContacts.slice(0, 5);

  const text = {
    title:
      language === "fr"
        ? "Tableau de bord admin"
        : "Admin dashboard",
    subtitle:
      language === "fr"
        ? "Vue d’ensemble des inscriptions et demandes de contact."
        : "Global view of registrations and contact requests.",
    dateFrom:
      language === "fr"
        ? "Du (filtre global)"
        : "From (global filter)",
    dateTo:
      language === "fr"
        ? "Au (filtre global)"
        : "To (global filter)",
    statsWorkers:
      language === "fr" ? "Inscriptions ouvriers" : "Workers registrations",
    statTotalWorkers:
      language === "fr" ? "Total ouvriers" : "Total workers",
    statPending:
      language === "fr" ? "En attente" : "Pending",
    statApproved:
      language === "fr" ? "Validés" : "Approved",
    statRejected:
      language === "fr" ? "Refusés" : "Rejected",
    statsContacts:
      language === "fr"
        ? "Demandes de contact"
        : "Contact requests",
    statTotalContacts:
      language === "fr" ? "Total demandes" : "Total requests",
    statToday:
      language === "fr" ? "Aujourd’hui" : "Today",
    statLast7:
      language === "fr" ? "7 derniers jours" : "Last 7 days",
    recentWorkers:
      language === "fr"
        ? "Dernières inscriptions"
        : "Latest registrations",
    recentContacts:
      language === "fr"
        ? "Dernières demandes de contact"
        : "Latest contact requests",
    goToInscriptions:
      language === "fr"
        ? "Voir toutes les inscriptions"
        : "View all registrations",
    goToContacts:
      language === "fr"
        ? "Voir toutes les demandes"
        : "View all requests",
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          {language === "fr"
            ? "Vérification de vos droits..."
            : "Checking your permissions..."}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Menu admin (tabs + bouton retour au site) */}
        <AdminNavTabs />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 mt-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {text.title}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {text.subtitle}
            </p>
          </div>
          {/* Filtres dates globaux */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {text.dateFrom}
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {text.dateTo}
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Bloc stats ouvriers */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                {text.statsWorkers}
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div>
                <div className="text-xs text-slate-500">
                  {text.statTotalWorkers}
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {stats.totalWorkers}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">
                  {text.statPending}
                </div>
                <div className="text-2xl font-bold text-amber-600">
                  {stats.pendingWorkers}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">
                  {text.statApproved}
                </div>
                <div className="text-2xl font-bold text-emerald-700">
                  {stats.approvedWorkers}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xs text-slate-500">
                {text.statRejected}
              </div>
              <div className="text-lg font-semibold text-red-600">
                {stats.rejectedWorkers}
              </div>
            </div>
            <div className="mt-4">
              <Link to="/admin/ouvriers">
                <Button size="sm" variant="outline">
                  {text.goToInscriptions}
                </Button>
              </Link>
            </div>
          </div>

          {/* Bloc stats contacts */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
                {text.statsContacts}
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div>
                <div className="text-xs text-slate-500">
                  {text.statTotalContacts}
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {stats.totalContacts}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">
                  {text.statToday}
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {stats.contactsToday}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">
                  {text.statLast7}
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {stats.contactsLast7}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Link to="/admin/ouvrier-contacts">
                <Button size="sm" variant="outline">
                  {text.goToContacts}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Listes récentes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dernières inscriptions ouvriers */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">
              {text.recentWorkers}
            </h2>
            {recentWorkers.length === 0 && !loading && (
              <div className="text-sm text-slate-500">
                {language === "fr"
                  ? "Aucune inscription dans la période sélectionnée."
                  : "No registrations in selected period."}
              </div>
            )}
            {loading && (
              <div className="text-sm text-slate-500">
                {language === "fr" ? "Chargement..." : "Loading..."}
              </div>
            )}
            {!loading && recentWorkers.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {recentWorkers.map((w) => {
                  const fullName =
                    (w.first_name || "") +
                    (w.last_name ? ` ${w.last_name}` : "");
                  return (
                    <li key={w.id} className="py-2 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">
                          {fullName || "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {w.profession || ""}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatDateTime(w.created_at)}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${workerStatusClass(
                          w.status
                        )}`}
                      >
                        {workerStatusLabel(w.status)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Dernières demandes de contact */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">
              {text.recentContacts}
            </h2>
            {recentContacts.length === 0 && !loading && (
              <div className="text-sm text-slate-500">
                {language === "fr"
                  ? "Aucune demande dans la période sélectionnée."
                  : "No requests in selected period."}
              </div>
            )}
            {loading && (
              <div className="text-sm text-slate-500">
                {language === "fr" ? "Chargement..." : "Loading..."}
              </div>
            )}
            {!loading && recentContacts.length > 0 && (
              <ul className="divide-y divide-slate-100">
                {recentContacts.map((c) => (
                  <li key={c.id} className="py-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">
                        {c.worker_name || "—"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {c.client_name || "—"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDateTime(c.created_at)} • {originLabel(c.origin)}
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-slate-50 text-slate-700 border-slate-200">
                      {contactStatusLabel(c.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
