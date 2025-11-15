// src/pages/AdminOuvrierInscriptions.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";

type DbWorker = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profession: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  years_experience: number | null;
  status: string | null;
  created_at: string;

  // colonnes d’audit de validation / refus
  validated_at?: string | null;
  validated_by?: string | null;
  rejected_at?: string | null;
  rejected_by?: string | null;
  rejection_reason?: string | null;
};

type WorkerStatus = "pending" | "approved" | "rejected";

const AdminOuvrierInscriptions: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  // 🔐 Auth admin
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  // données
  const [workers, setWorkers] = useState<DbWorker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filtres
  const [statusFilter, setStatusFilter] = useState<WorkerStatus | "all">(
    "pending"
  );
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // bouton en cours (pour désactiver Validé / Refusé pendant l’update)
  const [savingId, setSavingId] = useState<string | null>(null);

  // ─────────────────────────────
  // 1) Vérification des droits admin
  // ─────────────────────────────
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
      setCurrentAdminId(user.id);
      setAuthLoading(false);
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // ─────────────────────────────
  // 2) Chargement des inscriptions
  // ─────────────────────────────
  const loadWorkers = async () => {
    if (authLoading || !isAdmin) return;

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from<DbWorker>("op_ouvriers")
      .select(
        `
        id,
        first_name,
        last_name,
        profession,
        email,
        phone,
        country,
        region,
        city,
        commune,
        district,
        years_experience,
        status,
        created_at,
        validated_at,
        validated_by,
        rejected_at,
        rejected_by,
        rejection_reason
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError(
        language === "fr"
          ? `Impossible de charger les inscriptions. (${error.message})`
          : `Unable to load registrations. (${error.message})`
      );
    } else {
      setWorkers(data ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadWorkers();
    }
  }, [authLoading, isAdmin, language]);

  // ─────────────────────────────
  // 3) Helpers
  // ─────────────────────────────
  const statusLabel = (s: string | null | undefined) => {
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

  const statusBadgeClass = (s: string | null | undefined) => {
    if (s === "approved")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "rejected")
      return "bg-red-50 text-red-700 border-red-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const fullName = (w: DbWorker) =>
    `${w.first_name ?? ""} ${w.last_name ?? ""}`.trim() || "—";

  const formatDateTime = (value?: string | null) => {
    if (!value) return "";
    const d = new Date(value);
    return d.toLocaleString(language === "fr" ? "fr-FR" : "en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ─────────────────────────────
  // 4) Filtrage
  // ─────────────────────────────
  const filtered = useMemo(() => {
    return workers.filter((w) => {
      // statut
      if (statusFilter !== "all") {
        if ((w.status as WorkerStatus | null) !== statusFilter) return false;
      }

      // recherche texte
      const haystack =
        [
          w.first_name,
          w.last_name,
          w.profession,
          w.email,
          w.phone,
          w.region,
          w.city,
          w.commune,
          w.district,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase() || "";

      if (search && !haystack.includes(search.trim().toLowerCase())) {
        return false;
      }

      // dates (sur created_at)
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
  }, [workers, statusFilter, search, dateFrom, dateTo]);

  // ─────────────────────────────
  // 5) Actions : valider / refuser
  // ─────────────────────────────
  const handleApprove = async (w: DbWorker) => {
    if (!currentAdminId) return;

    setSavingId(w.id);
    setError(null);

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("op_ouvriers")
      .update({
        status: "approved",
        validated_at: nowIso,
        validated_by: currentAdminId,
        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,
      })
      .eq("id", w.id);

    if (error) {
      console.error(error);
      setError(
        language === "fr"
          ? `Erreur lors de la validation. (${error.message})`
          : `Error while approving. (${error.message})`
      );
    } else {
      setWorkers((prev) =>
        prev.map((x) =>
          x.id === w.id
            ? {
                ...x,
                status: "approved",
                validated_at: nowIso,
                validated_by: currentAdminId,
                rejected_at: null,
                rejected_by: null,
                rejection_reason: null,
              }
            : x
        )
      );
    }

    setSavingId(null);
  };

  const handleReject = async (w: DbWorker) => {
    if (!currentAdminId) return;

    // petite boîte de dialogue pour la raison
    const reason = window.prompt(
      language === "fr"
        ? "Motif du refus (optionnel) :"
        : "Rejection reason (optional):",
      w.rejection_reason ?? ""
    );

    setSavingId(w.id);
    setError(null);

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("op_ouvriers")
      .update({
        status: "rejected",
        rejected_at: nowIso,
        rejected_by: currentAdminId,
        rejection_reason: reason || null,
        validated_at: null,
        validated_by: null,
      })
      .eq("id", w.id);

    if (error) {
      console.error(error);
      setError(
        language === "fr"
          ? `Erreur lors du refus. (${error.message})`
          : `Error while rejecting. (${error.message})`
      );
    } else {
      setWorkers((prev) =>
        prev.map((x) =>
          x.id === w.id
            ? {
                ...x,
                status: "rejected",
                rejected_at: nowIso,
                rejected_by: currentAdminId,
                rejection_reason: reason || null,
                validated_at: null,
                validated_by: null,
              }
            : x
        )
      );
    }

    setSavingId(null);
  };

  // ─────────────────────────────
  // 6) Export CSV (période filtrée)
  // ─────────────────────────────
  const exportCsv = () => {
    if (!filtered.length) return;

    const escapeCsv = (v: string | null | undefined) =>
      `"${(v ?? "").replace(/"/g, '""')}"`;

    const headers = [
      "id",
      "created_at",
      "status",
      "first_name",
      "last_name",
      "profession",
      "email",
      "phone",
      "region",
      "city",
      "commune",
      "district",
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
        w.region ?? "",
        w.city ?? "",
        w.commune ?? "",
        w.district ?? "",
        w.years_experience?.toString() ?? "",
        w.validated_at ?? "",
        w.validated_by ?? "",
        w.rejected_at ?? "",
        w.rejected_by ?? "",
        w.rejection_reason ?? "",
      ].map(escapeCsv)
    );

    const csv =
      headers.join(";") + "\n" + rows.map((r) => r.join(";")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ouvriers_inscriptions.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────
  // 7) Rendu
  // ─────────────────────────────
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

  if (!isAdmin) return null;

  const text = {
    title:
      language === "fr"
        ? "Inscriptions ouvriers"
        : "Worker registrations",
    subtitle:
      language === "fr"
        ? "Validez ou refusez les demandes d'adhésion des professionnels."
        : "Approve or reject worker registration requests.",
    tabContacts:
      language === "fr" ? "Demandes de contact" : "Contact requests",
    tabWorkers:
      language === "fr" ? "Inscriptions ouvriers" : "Worker registrations",
    statusFilter: language === "fr" ? "Statut" : "Status",
    searchLabel: language === "fr" ? "Recherche" : "Search",
    dateFrom:
      language === "fr" ? "Du (date de création)" : "From (created at)",
    dateTo:
      language === "fr" ? "Au (date de création)" : "To (created at)",
    colDate: language === "fr" ? "Date" : "Date",
    colWorker: language === "fr" ? "Ouvrier" : "Worker",
    colContact: language === "fr" ? "Contact" : "Contact",
    colLocation: language === "fr" ? "Localisation" : "Location",
    colStatus: language === "fr" ? "Statut" : "Status",
    colActions: language === "fr" ? "Actions" : "Actions",
    filterPending: language === "fr" ? "En attente" : "Pending",
    filterApproved: language === "fr" ? "Validé" : "Approved",
    filterRejected: language === "fr" ? "Refusé" : "Rejected",
    filterAll: language === "fr" ? "Tous" : "All",
    searchPlaceholder:
      language === "fr"
        ? "Rechercher (nom, métier, email, téléphone...)"
        : "Search (name, job, email, phone...)",
    refresh: language === "fr" ? "Rafraîchir" : "Refresh",
    exportCsv: language === "fr" ? "Exporter en CSV" : "Export CSV",
    validate: language === "fr" ? "Validé" : "Approve",
    reject: language === "fr" ? "Refusé" : "Reject",
    noData:
      language === "fr"
        ? "Aucune demande d'inscription pour le moment."
        : "No registration request yet.",
    experience:
      language === "fr"
        ? "ans d'expérience"
        : "years of experience",
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Onglets haut : contacts / inscriptions */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/admin/ouvrier-contacts"
            className="px-4 py-2 rounded-full text-sm border border-slate-200 text-slate-600 bg-white hover:bg-slate-50"
          >
            {text.tabContacts}
          </Link>
          <button
            type="button"
            className="px-4 py-2 rounded-full text-sm font-medium bg-pro-blue text-white shadow-sm"
          >
            {text.tabWorkers}
          </button>
        </div>

        {/* Header + actions globales */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {text.title}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {text.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              {filtered.length} / {workers.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadWorkers}
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

        {/* Filtres */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="md:w-1/4">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {text.statusFilter}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
            >
              <option value="pending">{text.filterPending}</option>
              <option value="approved">{text.filterApproved}</option>
              <option value="rejected">{text.filterRejected}</option>
              <option value="all">{text.filterAll}</option>
            </select>
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

          <div className="md>w-1/4">
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

        {/* Tableau */}
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
                    {text.colContact}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                    {text.colLocation}
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
                      colSpan={6}
                      className="px-4 py-6 text-center text-slate-500 text-sm"
                    >
                      {text.noData}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-slate-500 text-sm"
                    >
                      {language === "fr" ? "Chargement..." : "Loading..."}
                    </td>
                  </tr>
                )}

                {!loading &&
                  filtered.map((w) => {
                    const locationParts = [
                      w.country,
                      w.region,
                      w.city,
                      w.commune,
                      w.district,
                    ]
                      .filter(Boolean)
                      .join(" • ");

                    return (
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
                            {w.profession || ""}
                          </div>
                          {w.years_experience != null && (
                            <div className="text-xs text-slate-500">
                              {w.years_experience} {text.experience}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 align-top text-slate-800">
                          <div className="text-xs text-slate-500">
                            {w.email || "—"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {w.phone || ""}
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top text-slate-700">
                          <div className="text-xs text-slate-500">
                            {locationParts || "—"}
                          </div>
                        </td>

                        {/* 🟡 Statut + infos de validation / refus */}
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
                              {language === "fr"
                                ? "Validé le "
                                : "Approved on "}
                              {formatDateTime(w.validated_at)}
                            </div>
                          )}

                          {w.rejected_at && (
                            <div className="mt-1 text-[11px] text-slate-500">
                              {language === "fr"
                                ? "Refusé le "
                                : "Rejected on "}
                              {formatDateTime(w.rejected_at)}
                              {w.rejection_reason &&
                                ` – ${w.rejection_reason}`}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 align-top text-right">
                          <div className="inline-flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                savingId === w.id || w.status === "approved"
                              }
                              onClick={() => handleApprove(w)}
                            >
                              {text.validate}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              disabled={
                                savingId === w.id || w.status === "rejected"
                              }
                              onClick={() => handleReject(w)}
                            >
                              {text.reject}
                            </Button>
                          </div>
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

export default AdminOuvrierInscriptions;
