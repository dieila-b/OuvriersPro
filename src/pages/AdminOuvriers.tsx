// src/pages/AdminOuvriers.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type WorkerStatus = "pending" | "approved" | "rejected" | "suspended" | null;

type DbWorker = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profession: string | null;
  description: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  hourly_rate: number | null;
  currency: string | null;
  years_experience: number | null;
  phone: string | null;
  email: string | null;
  status: WorkerStatus;
  created_at: string;

  // Champs de validation / refus (ajoutés en SQL)
  validated_at?: string | null;
  validated_by?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
  rejection_reason?: string | null;
};

const statusOptions: WorkerStatus[] = ["pending", "approved", "rejected"];

const AdminOuvriers: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  // 🔐 Auth admin
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Données
  const [workers, setWorkers] = useState<DbWorker[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [statusFilter, setStatusFilter] = useState<WorkerStatus | "">("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // 🔐 Vérification des droits admin (op_users.role = 'admin')
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

  // 🔄 Chargement des ouvriers (inscriptions)
  useEffect(() => {
    if (authLoading || !isAdmin) return;

    const fetchWorkers = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("op_ouvriers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setError(
          language === "fr"
            ? `Impossible de charger les inscriptions. (${error.message})`
            : `Unable to load worker registrations. (${error.message})`
        );
        setLoading(false);
        return;
      }

      setWorkers(data ?? []);
      setLoading(false);
    };

    fetchWorkers();
  }, [language, authLoading, isAdmin]);

  const fullName = (w: DbWorker) =>
    ((w.first_name || "") + (w.last_name ? ` ${w.last_name}` : "")).trim() ||
    "—";

  const locationLabel = (w: DbWorker) =>
    [w.region, w.city, w.commune, w.district].filter(Boolean).join(" • ");

  const formatCurrency = (value: number | null, currency?: string | null) => {
    if (!value) return "—";
    const cur = currency || "GNF";
    if (cur === "GNF") {
      return `${value.toLocaleString("fr-FR")} GNF`;
    }
    return `${value} ${cur}`;
  };

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

  const statusLabel = (s: WorkerStatus) => {
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

  const statusBadgeClass = (s: WorkerStatus) => {
    if (s === "approved")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "rejected")
      return "bg-rose-50 text-rose-700 border-rose-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  // 🔎 Filtrage
  const filtered = useMemo(() => {
    return workers.filter((w) => {
      const matchStatus = !statusFilter || w.status === statusFilter;

      const haystack =
        [
          fullName(w),
          w.profession,
          w.email,
          w.phone,
          w.description,
          locationLabel(w),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase() || "";

      const matchSearch =
        !search || haystack.includes(search.trim().toLowerCase());

      const created = new Date(w.created_at);
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
  }, [workers, statusFilter, search, dateFrom, dateTo]);

  // 🧮 Stats simples
  const stats = useMemo(() => {
    const total = filtered.length;
    const pending = filtered.filter((w) => w.status === "pending").length;
    const approved = filtered.filter((w) => w.status === "approved").length;
    const rejected = filtered.filter((w) => w.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [filtered]);

  const text = {
    title:
      language === "fr"
        ? "Inscriptions ouvriers"
        : "Worker registrations",
    subtitle:
      language === "fr"
        ? "Validez ou refusez les demandes d’adhésion des ouvriers."
        : "Approve or reject worker registration requests.",
    statusFilter: language === "fr" ? "Statut" : "Status",
    searchLabel: language === "fr" ? "Recherche" : "Search",
    searchPlaceholder:
      language === "fr"
        ? "Nom, métier, email, téléphone, zone..."
        : "Name, trade, email, phone, area...",
    dateFrom: language === "fr" ? "Du" : "From",
    dateTo: language === "fr" ? "Au" : "To",
    colDate: language === "fr" ? "Créée le" : "Created at",
    colWorker: language === "fr" ? "Ouvrier" : "Worker",
    colLocation: language === "fr" ? "Zone" : "Area",
    colJob: language === "fr" ? "Métier" : "Trade",
    colRate: language === "fr" ? "Tarif horaire" : "Hourly rate",
    colStatus: language === "fr" ? "Statut" : "Status",
    colActions: language === "fr" ? "Actions" : "Actions",
    allStatuses: language === "fr" ? "Tous les statuts" : "All statuses",
    pending: language === "fr" ? "En attente" : "Pending",
    approved: language === "fr" ? "Validés" : "Approved",
    rejected: language === "fr" ? "Refusés" : "Rejected",
    empty:
      language === "fr"
        ? "Aucune inscription pour le moment."
        : "No registrations yet.",
    refresh: language === "fr" ? "Rafraîchir" : "Refresh",
    exportCsv: language === "fr" ? "Exporter CSV" : "Export CSV",
    approve: language === "fr" ? "Valider" : "Approve",
    reject: language === "fr" ? "Refuser" : "Reject",
    confirmApprove:
      language === "fr"
        ? "Confirmer la validation de cette inscription ?"
        : "Confirm approval of this registration?",
    askRejectReason:
      language === "fr"
        ? "Raison du refus (facultatif) :"
        : "Rejection reason (optional):",
    statTotal:
      language === "fr" ? "Total (filtré)" : "Total (filtered)",
    statPending:
      language === "fr" ? "En attente" : "Pending",
    statApproved:
      language === "fr" ? "Validés" : "Approved",
    statRejected:
      language === "fr" ? "Refusés" : "Rejected",
    validatedOn:
      language === "fr" ? "Validé le " : "Approved on ",
    rejectedOn:
      language === "fr" ? "Refusé le " : "Rejected on ",
  };

  const refresh = async () => {
    if (authLoading || !isAdmin) return;

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("op_ouvriers")
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
      setWorkers(data ?? []);
    }

    setLoading(false);
  };

  // ✅ Action : Valider une inscription
  const approveWorker = async (worker: DbWorker) => {
    if (!window.confirm(text.confirmApprove)) return;

    setSavingId(worker.id);
    setError(null);

    const now = new Date().toISOString();

    const { data: auth } = await supabase.auth.getUser();
    const currentUserId = auth.user?.id ?? null;

    const { error } = await supabase
      .from("op_ouvriers")
      .update({
        status: "approved",
        validated_at: now,
        validated_by: currentUserId,
        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,
      })
      .eq("id", worker.id);

    if (error) {
      console.error(error);
      setError(
        language === "fr"
          ? `Erreur lors de la validation. (${error.message})`
          : `Error while approving. (${error.message})`
      );
    } else {
      setWorkers((prev) =>
        prev.map((w) =>
          w.id === worker.id
            ? {
                ...w,
                status: "approved",
                validated_at: now,
                validated_by: currentUserId,
                rejected_at: null,
                rejected_by: null,
                rejection_reason: null,
              }
            : w
        )
      );
    }

    setSavingId(null);
  };

  // ❌ Action : Refuser une inscription
  const rejectWorker = async (worker: DbWorker) => {
    const reason = window.prompt(text.askRejectReason, "");
    // même si raison null, on peut refuser quand même

    setSavingId(worker.id);
    setError(null);

    const now = new Date().toISOString();

    const { data: auth } = await supabase.auth.getUser();
    const currentUserId = auth.user?.id ?? null;

    const { error } = await supabase
      .from("op_ouvriers")
      .update({
        status: "rejected",
        rejected_at: now,
        rejected_by: currentUserId,
        rejection_reason: reason || null,
        validated_at: null,
        validated_by: null,
      })
      .eq("id", worker.id);

    if (error) {
      console.error(error);
      setError(
        language === "fr"
          ? `Erreur lors du refus. (${error.message})`
          : `Error while rejecting. (${error.message})`
      );
    } else {
      setWorkers((prev) =>
        prev.map((w) =>
          w.id === worker.id
            ? {
                ...w,
                status: "rejected",
                rejected_at: now,
                rejected_by: currentUserId,
                rejection_reason: reason || null,
                validated_at: null,
                validated_by: null,
              }
            : w
        )
      );
    }

    setSavingId(null);
  };

  // Export CSV (avec les lignes filtrées)
  const exportCsv = () => {
    if (!filtered.length) return;

    const escapeCsv = (value: string | null | undefined) =>
      `"${(value ?? "").replace(/"/g, '""')}"`;

    const headers = [
      "id",
      "created_at",
      "status",
      "first_name",
      "last_name",
      "profession",
      "email",
      "phone",
      "country",
      "region",
      "city",
      "commune",
      "district",
      "hourly_rate",
      "currency",
      "years_experience",
      "validated_at",
      "validated_by",
      "rejected_at",
      "rejected_by",
      "rejection_reason",
    ];

    const rows = filtered.map((w) =>
      [
        w.id,
        w.created_at,
        w.status ?? "",
        w.first_name ?? "",
        w.last_name ?? "",
        w.profession ?? "",
        w.email ?? "",
        w.phone ?? "",
        w.country ?? "",
        w.region ?? "",
        w.city ?? "",
        w.commune ?? "",
        w.district ?? "",
        w.hourly_rate?.toString() ?? "",
        w.currency ?? "",
        w.years_experience?.toString() ?? "",
        w.validated_at ?? "",
        w.validated_by ?? "",
        w.rejected_at ?? "",
        w.rejected_by ?? "",
        w.rejection_reason ?? "",
      ].map(escapeCsv)
    );

    const csvContent =
      headers.join(";") +
      "\n" +
      rows.map((r) => r.join(";")).join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "ouvriers_inscriptions.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Écrans de chargement / blocage
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {text.title}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {text.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {filtered.length} / {workers.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-slate-500 uppercase">
              {text.statTotal}
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {stats.total}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-slate-500 uppercase">
              {text.statPending}
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {stats.pending}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-slate-500 uppercase">
              {text.statApproved}
            </div>
            <div className="text-2xl font-bold text-emerald-700">
              {stats.approved}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="text-xs text-slate-500 uppercase">
              {text.statRejected}
            </div>
            <div className="text-2xl font-bold text-rose-700">
              {stats.rejected}
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="md:w-1/4">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {text.statusFilter}
            </label>
            <select
              value={statusFilter || ""}
              onChange={(e) =>
                setStatusFilter(
                  (e.target.value as WorkerStatus | "") || ""
                )
              }
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
            >
              <option value="">{text.allStatuses}</option>
              <option value="pending">{text.pending}</option>
              <option value="approved">{text.approved}</option>
              <option value="rejected">{text.rejected}</option>
            </select>
          </div>

          <div className="md:w-1/4">
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

          <div className="md:w-1/4">
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

          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {text.searchLabel}
            </label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={text.searchPlaceholder}
              className="text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                    {text.colLocation}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                    {text.colJob}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                    {text.colRate}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                    {text.colStatus}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">
                    {text.colActions}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-slate-500 text-sm"
                    >
                      {text.empty}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-slate-500 text-sm"
                    >
                      {language === "fr"
                        ? "Chargement..."
                        : "Loading..."}
                    </td>
                  </tr>
                )}

                {!loading &&
                  filtered.map((w) => (
                    <tr
                      key={w.id}
                      className="border-t border-slate-100 hover:bg-slate-50/60"
                    >
                      <td className="px-4 py-3 align-top text-slate-700 whitespace-nowrap">
                        {formatDateTime(w.created_at)}
                      </td>

                      <td className="px-4 py-3 align-top text-slate-800">
                        <div className="font-semibold">
                          {fullName(w)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {w.email || ""} {w.phone ? `• ${w.phone}` : ""}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top text-slate-700">
                        <div className="text-xs">
                          {locationLabel(w) || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top text-slate-700">
                        <div className="text-sm font-medium">
                          {w.profession || "—"}
                        </div>
                        {w.years_experience != null && (
                          <div className="text-xs text-slate-500">
                            {w.years_experience}{" "}
                            {language === "fr"
                              ? "ans d'expérience"
                              : "years of experience"}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top text-slate-700">
                        <div className="font-semibold text-pro-blue">
                          {formatCurrency(w.hourly_rate, w.currency)}
                        </div>
                      </td>

                      {/* ✅ Statut + qui a validé / refusé */}
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${statusBadgeClass(
                            w.status
                          )}`}
                        >
                          {statusLabel(w.status)}
                        </span>

                        {w.validated_at && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            {text.validatedOn}
                            {formatDateTime(w.validated_at)}
                          </div>
                        )}

                        {w.rejected_at && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            {text.rejectedOn}
                            {formatDateTime(w.rejected_at)}
                            {w.rejection_reason &&
                              ` – ${w.rejection_reason}`}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top text-right">
                        <div className="flex flex-col items-end gap-1">
                          <Button
                            size="sm"
                            className="text-xs"
                            disabled={
                              savingId === w.id ||
                              w.status === "approved"
                            }
                            onClick={() => approveWorker(w)}
                          >
                            {text.approve}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            disabled={
                              savingId === w.id ||
                              w.status === "rejected"
                            }
                            onClick={() => rejectWorker(w)}
                          >
                            {text.reject}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

export default AdminOuvriers;
