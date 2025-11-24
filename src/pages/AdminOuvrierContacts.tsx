// src/pages/AdminOuvrierContacts.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AdminNavTabs from "@/components/AdminNavTabs";
import {
  PhoneCall,
  CalendarDays,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Smartphone,
  Globe,
  Layers,
} from "lucide-react";

type DbContact = {
  id: string;
  worker_id: string | null;
  worker_name: string | null;
  worker_profession: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  message: string | null;
  status: string | null;
  created_at: string;
  origin?: string | null;
};

const statusOptions = ["new", "in_progress", "done"] as const;
type ContactStatus = (typeof statusOptions)[number];

/* -----------------------------
   ✅ UI helpers (design moderne)
-------------------------------- */
const cardClass =
  "bg-white/80 backdrop-blur border border-slate-100 rounded-2xl shadow-[0_18px_45px_rgba(15,23,42,0.06)]";

const statCardBase =
  "relative overflow-hidden rounded-2xl border border-slate-100 bg-white/90 backdrop-blur p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] flex flex-col justify-between";

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}) {
  return (
    <div className={statCardBase}>
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} opacity-70`}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[.16em] text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 border border-white/60 shadow-sm">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
    </div>
  );
}

const AdminOuvrierContacts: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  // 🔐 Auth admin
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [contacts, setContacts] = useState<DbContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"" | ContactStatus>("");
  const [search, setSearch] = useState("");

  // 🔹 filtres de date
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

  // 🔹 Chargement des demandes
  useEffect(() => {
    if (authLoading || !isAdmin) return;

    const fetchContacts = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("op_ouvrier_contacts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setError(
          language === "fr"
            ? `Impossible de charger les demandes. (${error.message})`
            : `Unable to load contact requests. (${error.message})`
        );
        setLoading(false);
        return;
      }

      setContacts(data ?? []);
      setLoading(false);
    };

    fetchContacts();
  }, [language, authLoading, isAdmin]);

  // 🔎 Filtrage (statut, texte, dates)
  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      const matchStatus = !statusFilter || c.status === statusFilter;

      const haystack =
        [
          c.worker_name,
          c.worker_profession,
          c.client_name,
          c.client_email,
          c.client_phone,
          c.message,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase() || "";

      const matchSearch =
        !search || haystack.includes(search.trim().toLowerCase());

      const created = new Date(c.created_at);

      let matchDateFrom = true;
      let matchDateTo = true;

      if (dateFrom) {
        const fromDate = new Date(dateFrom + "T00:00:00");
        matchDateFrom = created >= fromDate;
      }

      if (dateTo) {
        const toDate = new Date(dateTo + "T23:59:59");
        matchDateTo = created <= toDate;
      }

      return matchStatus && matchSearch && matchDateFrom && matchDateTo;
    });
  }, [contacts, statusFilter, search, dateFrom, dateTo]);

  const formatDate = (value: string) => {
    const d = new Date(value);
    return d.toLocaleString(language === "fr" ? "fr-FR" : "en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusLabel = (s: string | null | undefined) => {
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

  const statusColor = (s: string | null | undefined) => {
    if (s === "done")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "in_progress")
      return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-sky-50 text-sky-700 border-sky-200";
  };

  const originLabel = (o: string | null | undefined) => {
    if (!o || o === "web") return "web";
    if (o === "mobile") return "mobile";
    if (o === "other") return language === "fr" ? "autre" : "other";
    return o;
  };

  const originIcon = (o: string | null | undefined) => {
    const key = originLabel(o);
    if (key === "mobile") return Smartphone;
    if (key === "web") return Globe;
    return Layers;
  };

  const handleStatusChange = async (id: string, newStatus: ContactStatus) => {
    setSavingId(id);
    setError(null);

    const { error } = await supabase
      .from("op_ouvrier_contacts")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error(error);
      setError(
        language === "fr"
          ? `Erreur lors de la mise à jour du statut. (${error.message})`
          : `Error while updating status. (${error.message})`
      );
    } else {
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );
    }

    setSavingId(null);
  };

  // 🔢 Mini dashboard basé sur les lignes filtrées
  const stats = useMemo(() => {
    const total = filtered.length;

    const todayISO = new Date().toISOString().slice(0, 10);
    let today = 0;
    let last7 = 0;

    const originCounts: Record<string, number> = {};

    filtered.forEach((c) => {
      const dateStr = c.created_at.slice(0, 10);
      const created = new Date(c.created_at);
      const diffMs = Date.now() - created.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (dateStr === todayISO) today += 1;
      if (diffDays <= 7) last7 += 1;

      const originKey = originLabel(c.origin);
      originCounts[originKey] = (originCounts[originKey] || 0) + 1;
    });

    return { total, today, last7, originCounts };
  }, [filtered]);

  const text = {
    title:
      language === "fr"
        ? "Demandes de contact ouvriers"
        : "Worker contact requests",
    subtitle:
      language === "fr"
        ? "Vue d’ensemble des demandes envoyées par les particuliers."
        : "Overview of all contact requests sent by clients.",
    statusFilter: language === "fr" ? "Statut" : "Status",
    searchLabel: language === "fr" ? "Recherche" : "Search",
    searchPlaceholder:
      language === "fr"
        ? "Rechercher (ouvrier, client, email, téléphone, message...)"
        : "Search (worker, client, email, phone, message...)",
    dateFrom: language === "fr" ? "Du" : "From",
    dateTo: language === "fr" ? "Au" : "To",
    colDate: language === "fr" ? "Date" : "Date",
    colWorker: language === "fr" ? "Ouvrier" : "Worker",
    colClient: language === "fr" ? "Client" : "Client",
    colMessage: language === "fr" ? "Message" : "Message",
    colStatus: language === "fr" ? "Statut" : "Status",
    colOrigin: language === "fr" ? "Origine" : "Origin",
    colActions: language === "fr" ? "Actions" : "Actions",
    allStatuses: language === "fr" ? "Tous les statuts" : "All statuses",
    new: language === "fr" ? "Nouveau" : "New",
    inProgress: language === "fr" ? "En cours" : "In progress",
    done: language === "fr" ? "Traité" : "Done",
    empty:
      language === "fr"
        ? "Aucune demande pour le moment."
        : "No requests yet.",
    refresh: language === "fr" ? "Rafraîchir" : "Refresh",
    exportCsv: language === "fr" ? "Exporter CSV" : "Export CSV",
    statTotal:
      language === "fr" ? "Total (période filtrée)" : "Total (filtered)",
    statToday: language === "fr" ? "Aujourd’hui" : "Today",
    statLast7:
      language === "fr" ? "7 derniers jours" : "Last 7 days",
    statByOrigin:
      language === "fr" ? "Par origine" : "By origin",
  };

  const refresh = async () => {
    if (authLoading || !isAdmin) return;

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("op_ouvrier_contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError(
        language === "fr"
          ? `Impossible de rafraîchir les données. (${error.message})`
          : `Unable to refresh data. (${error.message})`
      );
    } else {
      setContacts(data ?? []);
    }

    setLoading(false);
  };

  // 🔄 Export CSV
  const exportCsv = () => {
    if (!filtered.length) return;

    const escapeCsv = (value: string | null | undefined) =>
      `"${(value ?? "").replace(/"/g, '""')}"`;

    const headers = [
      "id",
      "created_at",
      "status",
      "origin",
      "worker_name",
      "worker_profession",
      "client_name",
      "client_email",
      "client_phone",
      "message",
    ];

    const rows = filtered.map((c) =>
      [
        c.id,
        c.created_at,
        c.status ?? "",
        originLabel(c.origin),
        c.worker_name ?? "",
        c.worker_profession ?? "",
        c.client_name ?? "",
        c.client_email ?? "",
        c.client_phone ?? "",
        c.message ?? "",
      ].map(escapeCsv)
    );

    const csvContent =
      headers.join(";") +
      "\n" +
      rows.map((r) => r.join(";")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "ouvrier_contacts.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50">
      <div className="w-full px-3 sm:px-6 lg:px-10 py-6 md:py-10">
        <AdminNavTabs />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 mt-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              {text.title}
              <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-800 px-3 py-1 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Back-office
              </span>
            </h1>
            <p className="text-sm text-slate-600 mt-1">{text.subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {filtered.length} / {contacts.length}
            </span>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              {text.refresh}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              disabled={!filtered.length}
            >
              {text.exportCsv}
            </Button>
          </div>
        </div>

        {/* Mini dashboard modernisé */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label={text.statTotal}
            value={stats.total}
            icon={PhoneCall}
            gradient="from-indigo-500/10 via-indigo-400/20 to-indigo-500/40"
          />
          <StatCard
            label={text.statToday}
            value={stats.today}
            icon={CalendarDays}
            gradient="from-fuchsia-500/10 via-fuchsia-400/20 to-fuchsia-500/40"
          />
          <StatCard
            label={text.statLast7}
            value={stats.last7}
            icon={Clock}
            gradient="from-emerald-500/10 via-emerald-400/20 to-emerald-500/40"
          />
          <div className={cardClass + " p-4"}>
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4 text-slate-600" />
              <p className="text-[11px] font-medium uppercase tracking-[.16em] text-slate-500">
                {text.statByOrigin}
              </p>
            </div>
            {Object.keys(stats.originCounts).length === 0 ? (
              <div className="text-sm text-slate-500">—</div>
            ) : (
              <div className="flex flex-wrap gap-1 text-xs">
                {Object.entries(stats.originCounts).map(([key, value]) => {
                  const Icon = originIcon(key);
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200"
                    >
                      <Icon className="h-3 w-3" />
                      {key}
                      <span className="font-semibold ml-1">{value}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Filtres */}
        <div className={`${cardClass} p-4 mb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {text.statusFilter}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
              >
                <option value="">{text.allStatuses}</option>
                <option value="new">{text.new}</option>
                <option value="in_progress">{text.inProgress}</option>
                <option value="done">{text.done}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {text.dateFrom}
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm bg-white"
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
                className="text-sm bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {text.searchLabel}
              </label>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-2 top-2.5" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={text.searchPlaceholder}
                  className="text-sm pl-8 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Vue mobile (cartes) */}
        <div className="md:hidden space-y-3 mb-6">
          {filtered.length === 0 && !loading && (
            <div className={cardClass + " px-4 py-6 text-center text-slate-500 text-sm"}>
              {text.empty}
            </div>
          )}

          {loading && (
            <div className={cardClass + " px-4 py-6 text-center text-slate-500 text-sm"}>
              {language === "fr" ? "Chargement..." : "Loading..."}
            </div>
          )}

          {!loading &&
            filtered.map((c) => {
              const OriginIcon = originIcon(c.origin);
              return (
                <div key={c.id} className={cardClass + " p-4"}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-xs text-slate-500">
                      {formatDate(c.created_at)}
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${statusColor(
                        c.status
                      )}`}
                    >
                      {statusLabel(c.status)}
                    </span>
                  </div>

                  <div className="mb-2">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase">
                      {text.colWorker}
                    </div>
                    <div className="font-semibold text-slate-900">
                      {c.worker_name || "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {c.worker_profession || ""}
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase">
                      {text.colClient}
                    </div>
                    <div className="text-xs text-slate-600">
                      {c.client_name || "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {c.client_email || ""}
                    </div>
                    <div className="text-xs text-slate-500">
                      {c.client_phone || ""}
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase">
                      {text.colMessage}
                    </div>
                    <div className="text-xs whitespace-pre-line text-slate-700">
                      {c.message || "—"}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                      <OriginIcon className="h-3 w-3" />
                      {originLabel(c.origin)}
                    </span>

                    <select
                      disabled={savingId === c.id}
                      value={(c.status as ContactStatus) || "new"}
                      onChange={(e) =>
                        handleStatusChange(
                          c.id,
                          e.target.value as ContactStatus
                        )
                      }
                      className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
                    >
                      <option value="new">{text.new}</option>
                      <option value="in_progress">{text.inProgress}</option>
                      <option value="done">{text.done}</option>
                    </select>
                  </div>
                </div>
              );
            })}
        </div>

        {/* ✅ Vue desktop (tableau) */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                    {text.colDate}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                    {text.colWorker}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                    {text.colClient}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                    {text.colMessage}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                    {text.colStatus}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                    {text.colOrigin}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                    {text.colActions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500 text-sm">
                      {text.empty}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-500 text-sm">
                      {language === "fr" ? "Chargement..." : "Loading..."}
                    </td>
                  </tr>
                )}

                {!loading &&
                  filtered.map((c) => {
                    const OriginIcon = originIcon(c.origin);
                    return (
                      <tr
                        key={c.id}
                        className="border-t border-slate-100 hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3 align-top text-slate-700 whitespace-nowrap">
                          {formatDate(c.created_at)}
                        </td>

                        <td className="px-4 py-3 align-top text-slate-800">
                          <div className="font-semibold">
                            {c.worker_name || "—"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {c.worker_profession || ""}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top text-slate-800">
                          <div className="font-medium">
                            {c.client_name || "—"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {c.client_email || ""}
                          </div>
                          <div className="text-xs text-slate-500">
                            {c.client_phone || ""}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top text-slate-700 max-w-xs">
                          <div className="text-xs whitespace-pre-line line-clamp-3">
                            {c.message || "—"}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${statusColor(
                              c.status
                            )}`}
                          >
                            {statusLabel(c.status)}
                          </span>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                            <OriginIcon className="h-3 w-3" />
                            {originLabel(c.origin)}
                          </span>
                        </td>

                        <td className="px-4 py-3 align-top text-right">
                          <select
                            disabled={savingId === c.id}
                            value={(c.status as ContactStatus) || "new"}
                            onChange={(e) =>
                              handleStatusChange(
                                c.id,
                                e.target.value as ContactStatus
                              )
                            }
                            className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
                          >
                            <option value="new">{text.new}</option>
                            <option value="in_progress">
                              {text.inProgress}
                            </option>
                            <option value="done">{text.done}</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
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

export default AdminOuvrierContacts;
