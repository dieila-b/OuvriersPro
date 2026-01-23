// src/pages/AdminOuvrierContacts.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

import {
  PhoneCall,
  CalendarDays,
  Search,
  Filter,
  Clock,
  Sparkles,
  Smartphone,
  Globe,
  Layers,
  Mail,
  Phone,
  User,
  RefreshCw,
  FileDown,
  MessageSquareText,
} from "lucide-react";

type DbContact = {
  id: string;
  worker_id: string | null;
  worker_name: string | null;
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
   ✅ UI helpers (premium + responsive)
-------------------------------- */
const shellBg =
  "min-h-[calc(100dvh-1px)] bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50";

const containerClass =
  "w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-7";

const cardClass =
  "bg-white/80 backdrop-blur border border-slate-200/60 rounded-2xl shadow-[0_18px_45px_rgba(15,23,42,0.06)]";

const statCardBase =
  "relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/85 backdrop-blur p-4 sm:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] flex flex-col justify-between min-w-0";

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
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70",
          gradient
        )}
      />
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[.16em] text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/85 border border-white/60 shadow-sm shrink-0">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
    </div>
  );
}

const normalizeStatus = (s: string | null | undefined): ContactStatus => {
  if (s === "in_progress" || s === "done" || s === "new") return s;
  return "new";
};

const clampText = (t: string | null | undefined, n = 220) => {
  const v = (t || "").trim();
  if (!v) return "—";
  return v.length > n ? `${v.slice(0, n)}…` : v;
};

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

  const formatDate = useCallback(
    (value: string) => {
      const d = new Date(value);
      return d.toLocaleString(language === "fr" ? "fr-FR" : "en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    [language]
  );

  const statusLabel = useCallback(
    (s: string | null | undefined) => {
      const v = normalizeStatus(s);

      if (language === "fr") {
        if (v === "in_progress") return "En cours";
        if (v === "done") return "Traité";
        return "Nouveau";
      } else {
        if (v === "in_progress") return "In progress";
        if (v === "done") return "Done";
        return "New";
      }
    },
    [language]
  );

  const statusColor = (s: string | null | undefined) => {
    const v = normalizeStatus(s);
    if (v === "done") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (v === "in_progress") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-sky-50 text-sky-700 border-sky-200";
  };

  const originLabel = useCallback(
    (o: string | null | undefined) => {
      if (!o || o === "web") return "web";
      if (o === "mobile") return "mobile";
      if (o === "other") return language === "fr" ? "autre" : "other";
      return o;
    },
    [language]
  );

  const originIcon = useCallback(
    (o: string | null | undefined) => {
      const key = originLabel(o);
      if (key === "mobile") return Smartphone;
      if (key === "web") return Globe;
      return Layers;
    },
    [originLabel]
  );

  // 🔹 Chargement
  const fetchContacts = useCallback(async () => {
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
          ? `Impossible de charger les demandes. (${error.message})`
          : `Unable to load contact requests. (${error.message})`
      );
      setLoading(false);
      return;
    }

    const rows = ((data as DbContact[]) ?? []).map((r) => ({
      ...r,
      status: normalizeStatus(r.status),
    }));

    setContacts(rows);
    setLoading(false);
  }, [authLoading, isAdmin, language]);

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    fetchContacts();
  }, [authLoading, isAdmin, fetchContacts]);

  // 🔎 Filtrage
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return contacts.filter((c) => {
      const st = normalizeStatus(c.status);
      const matchStatus = !statusFilter || st === statusFilter;

      const haystack =
        [
          c.worker_name,
          c.client_name,
          c.client_email,
          c.client_phone,
          c.message,
          originLabel(c.origin),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase() || "";

      const matchSearch = !q || haystack.includes(q);

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
  }, [contacts, statusFilter, search, dateFrom, dateTo, originLabel]);

  const handleStatusChange = async (id: string, newStatus: ContactStatus) => {
    setSavingId(id);
    setError(null);

    const prev = contacts;
    setContacts((p) =>
      p.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );

    const { error } = await supabase
      .from("op_ouvrier_contacts")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error(error);
      setContacts(prev);
      setError(
        language === "fr"
          ? `Erreur lors de la mise à jour du statut. (${error.message})`
          : `Error while updating status. (${error.message})`
      );
    }

    setSavingId(null);
  };

  // 🔢 Stats
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
  }, [filtered, originLabel]);

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
    statLast7: language === "fr" ? "7 derniers jours" : "Last 7 days",
    statByOrigin: language === "fr" ? "Par origine" : "By origin",
    checking:
      language === "fr"
        ? "Vérification de vos droits..."
        : "Checking your permissions...",
    loading: language === "fr" ? "Chargement..." : "Loading...",
    colDate: language === "fr" ? "Date" : "Date",
    colWorker: language === "fr" ? "Ouvrier" : "Worker",
    colClient: language === "fr" ? "Client" : "Client",
    colMessage: language === "fr" ? "Message" : "Message",
    colStatus: language === "fr" ? "Statut" : "Status",
    colOrigin: language === "fr" ? "Origine" : "Origin",
    colActions: language === "fr" ? "Actions" : "Actions",
    tip:
      language === "fr"
        ? "Astuce : sur desktop, la table est scrollable horizontalement si l’écran est étroit."
        : "Tip: on desktop, the table can scroll horizontally on narrow screens.",
  };

  const refresh = async () => {
    await fetchContacts();
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
      "client_name",
      "client_email",
      "client_phone",
      "message",
    ];

    const rows = filtered.map((c) =>
      [
        c.id,
        c.created_at,
        normalizeStatus(c.status),
        originLabel(c.origin),
        c.worker_name ?? "",
        c.client_name ?? "",
        c.client_email ?? "",
        c.client_phone ?? "",
        c.message ?? "",
      ].map(escapeCsv)
    );

    const csvContent =
      headers.join(";") + "\n" + rows.map((r) => r.join(";")).join("\n");

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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm text-slate-500">{text.checking}</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className={shellBg}>
      <div className={containerClass}>
        {/* Header */}
        <div className="flex flex-col gap-4 sm:gap-5">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2 flex-wrap">
                {text.title}
                <span className="inline-flex items-center rounded-full bg-sky-100 text-sky-800 px-3 py-1 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Back-office
                </span>
              </h1>
              <p className="text-sm text-slate-600 mt-1">{text.subtitle}</p>
            </div>

            {/* Actions responsive */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-end">
              <div className="text-xs text-slate-500 sm:mr-2">
                {filtered.length} / {contacts.length}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="gap-2 w-full sm:w-auto justify-center"
                  onClick={refresh}
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  {text.refresh}
                </Button>

                <Button
                  variant="outline"
                  className="gap-2 w-full sm:w-auto justify-center"
                  onClick={exportCsv}
                  disabled={!filtered.length}
                >
                  <FileDown className="h-4 w-4" />
                  {text.exportCsv}
                </Button>
              </div>
            </div>
          </div>

          {/* Mini dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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

            <div className={cn(cardClass, "p-4 sm:p-5 min-w-0")}>
              <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4 text-slate-600" />
                <p className="text-[11px] font-medium uppercase tracking-[.16em] text-slate-500">
                  {text.statByOrigin}
                </p>
              </div>

              {Object.keys(stats.originCounts).length === 0 ? (
                <div className="text-sm text-slate-500">—</div>
              ) : (
                <div className="flex flex-wrap gap-2 text-xs">
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
          <div className={cn(cardClass, "p-4 sm:p-5")}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="min-w-0">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {text.statusFilter}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
                >
                  <option value="">{text.allStatuses}</option>
                  <option value="new">{text.new}</option>
                  <option value="in_progress">{text.inProgress}</option>
                  <option value="done">{text.done}</option>
                </select>
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {text.dateFrom}
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-sm bg-white rounded-xl"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {text.dateTo}
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-sm bg-white rounded-xl"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {text.searchLabel}
                </label>
                <div className="relative min-w-0">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={text.searchPlaceholder}
                    className="text-sm pl-9 bg-white rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* ✅ LISTING */}
        <div className="mt-6">
          {/* ✅ RESPONSIVE RULE:
              - Mobile + Tablet + small laptops: cards
              - Desktop: table
              (=> switch md -> lg)
          */}

          {/* ✅ CARDS (<= lg) */}
          <div className="lg:hidden space-y-3">
            {loading && (
              <div
                className={cn(
                  cardClass,
                  "px-4 py-6 text-center text-slate-500 text-sm"
                )}
              >
                {text.loading}
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div
                className={cn(
                  cardClass,
                  "px-4 py-6 text-center text-slate-500 text-sm"
                )}
              >
                {text.empty}
              </div>
            )}

            {!loading &&
              filtered.map((c) => {
                const OriginIcon = originIcon(c.origin);
                const st = normalizeStatus(c.status);

                return (
                  <div key={c.id} className={cn(cardClass, "p-4")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-slate-500">
                          {formatDate(c.created_at)}
                        </div>
                        <div className="mt-1 font-semibold text-slate-900 truncate">
                          {c.worker_name || "—"}
                        </div>
                      </div>

                      <span
                        className={cn(
                          "shrink-0 inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border",
                          statusColor(st)
                        )}
                      >
                        {statusLabel(st)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-700">
                        <User className="h-4 w-4 text-slate-500" />
                        <span className="font-medium truncate">
                          {c.client_name || "—"}
                        </span>
                      </div>

                      {c.client_email && (
                        <div className="flex items-center gap-2 text-slate-700 break-all">
                          <Mail className="h-4 w-4 text-slate-500" />
                          <span>{c.client_email}</span>
                        </div>
                      )}

                      {c.client_phone && (
                        <div className="flex items-center gap-2 text-slate-700">
                          <Phone className="h-4 w-4 text-slate-500" />
                          <span>{c.client_phone}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-slate-700">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-white border border-slate-200">
                          <OriginIcon className="h-3.5 w-3.5" />
                          {originLabel(c.origin)}
                        </span>
                      </div>

                      <div className="mt-1">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-2">
                          <MessageSquareText className="h-4 w-4" />
                          {text.colMessage}
                        </div>
                        <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                          {clampText(c.message, 260)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <select
                        disabled={savingId === c.id}
                        value={st}
                        onChange={(e) =>
                          handleStatusChange(c.id, e.target.value as ContactStatus)
                        }
                        className="h-11 w-full text-sm border border-slate-300 rounded-xl px-3 bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
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

          {/* ✅ TABLE (>= lg) */}
          <div className="hidden lg:block">
            <div className={cn(cardClass, "overflow-hidden")}>
              <div className="px-4 py-3 border-b border-slate-200/60 bg-white/60">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    {filtered.length} résultat(s)
                  </div>
                </div>
              </div>

              {/* IMPORTANT:
                  - allow horizontal scroll
                  - allow table to reach full viewport width on narrow layouts
              */}
              <div className="-mx-3 sm:-mx-6 lg:mx-0 overflow-x-auto">
                <div className="min-w-[1040px] w-full px-3 sm:px-6 lg:px-0">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/80 text-slate-600">
                      <tr className="border-b border-slate-200/60">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                          {text.colDate}
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                          {text.colWorker}
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                          {text.colClient}
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                          {text.colMessage}
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                          {text.colStatus}
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                          {text.colOrigin}
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                          {text.colActions}
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {loading && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            {text.loading}
                          </td>
                        </tr>
                      )}

                      {!loading && filtered.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            {text.empty}
                          </td>
                        </tr>
                      )}

                      {!loading &&
                        filtered.map((c) => {
                          const OriginIcon = originIcon(c.origin);
                          const st = normalizeStatus(c.status);

                          return (
                            <tr key={c.id} className="hover:bg-slate-50/60 align-top">
                              <td className="px-4 py-4 whitespace-nowrap text-slate-700">
                                {formatDate(c.created_at)}
                              </td>

                              <td className="px-4 py-4">
                                <div className="font-semibold text-slate-900 whitespace-nowrap">
                                  {c.worker_name || "—"}
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <div className="font-medium text-slate-900">
                                  {c.client_name || "—"}
                                </div>

                                {(c.client_email || c.client_phone) && (
                                  <div className="mt-1 text-xs text-slate-500 space-y-0.5">
                                    {c.client_email ? (
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-3.5 w-3.5" />
                                        <span className="truncate max-w-[260px]">
                                          {c.client_email}
                                        </span>
                                      </div>
                                    ) : null}

                                    {c.client_phone ? (
                                      <div className="flex items-center gap-2">
                                        <Phone className="h-3.5 w-3.5" />
                                        <span>{c.client_phone}</span>
                                      </div>
                                    ) : null}
                                  </div>
                                )}
                              </td>

                              <td className="px-4 py-4 text-slate-700">
                                <div className="max-w-[520px] text-xs leading-relaxed whitespace-pre-line line-clamp-3">
                                  {clampText(c.message, 340)}
                                </div>
                              </td>

                              <td className="px-4 py-4">
                                <span
                                  className={cn(
                                    "inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border",
                                    statusColor(st)
                                  )}
                                >
                                  {statusLabel(st)}
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-white border border-slate-200">
                                  <OriginIcon className="h-3.5 w-3.5" />
                                  {originLabel(c.origin)}
                                </span>
                              </td>

                              <td className="px-4 py-4 text-right">
                                <select
                                  disabled={savingId === c.id}
                                  value={st}
                                  onChange={(e) =>
                                    handleStatusChange(
                                      c.id,
                                      e.target.value as ContactStatus
                                    )
                                  }
                                  className="h-9 text-sm border border-slate-300 rounded-xl px-3 bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
                                >
                                  <option value="new">{text.new}</option>
                                  <option value="in_progress">{text.inProgress}</option>
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

              <div className="px-4 py-3 border-t border-slate-200/60 bg-white/60 text-xs text-slate-500">
                {text.tip}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10" />
      </div>
    </div>
  );
};

export default AdminOuvrierContacts;
