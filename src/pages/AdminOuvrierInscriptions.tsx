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
  region: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  phone: string | null;
  email: string | null;
  years_experience: number | null;
  status: string | null;
  created_at: string;
};

const statusOptions = ["pending", "approved", "rejected"] as const;
type WorkerStatus = (typeof statusOptions)[number];

const AdminOuvrierInscriptions: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  // 🔐 Auth admin
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [workers, setWorkers] = useState<DbWorker[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<WorkerStatus | "">("pending");
  const [search, setSearch] = useState("");

  // 🔹 Filtres de dates
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // 🔐 Vérification admin (op_users.role = 'admin')
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

  // 🔹 Chargement des inscriptions
  useEffect(() => {
    if (authLoading || !isAdmin) return;

    const fetchWorkers = async () => {
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
          region,
          city,
          commune,
          district,
          phone,
          email,
          years_experience,
          status,
          created_at
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setError(
          language === "fr"
            ? "Impossible de charger les demandes d'inscription."
            : "Unable to load worker registrations."
        );
        setLoading(false);
        return;
      }

      setWorkers(data ?? []);
      setLoading(false);
    };

    fetchWorkers();
  }, [language, authLoading, isAdmin]);

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
      if (s === "approved") return "Validé";
      if (s === "rejected") return "Refusé";
      return "En attente";
    }
    if (s === "approved") return "Approved";
    if (s === "rejected") return "Rejected";
    return "Pending";
  };

  const statusColor = (s: string | null | undefined) => {
    if (s === "approved") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (s === "rejected") {
      return "bg-red-50 text-red-700 border-red-200";
    }
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  // 🔹 Filtrage (statut + recherche + dates)
  const filtered = useMemo(() => {
    return workers.filter((w) => {
      const matchStatus = !statusFilter || w.status === statusFilter;

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

      const matchSearch =
        !search || haystack.includes(search.trim().toLowerCase());

      const created = new Date(w.created_at);

      // Date from
      if (dateFrom) {
        const from = new Date(dateFrom + "T00:00:00");
        if (created < from) return false;
      }

      // Date to
      if (dateTo) {
        const to = new Date(dateTo + "T23:59:59.999");
        if (created > to) return false;
      }

      return matchStatus && matchSearch;
    });
  }, [workers, statusFilter, search, dateFrom, dateTo]);

  const handleStatusChange = async (id: string, newStatus: WorkerStatus) => {
    setSavingId(id);
    setError(null);

    const { error } = await supabase
      .from("op_ouvriers")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error(error);
      setError(
        language === "fr"
          ? "Erreur lors de la mise à jour du statut."
          : "Error while updating status."
      );
    } else {
      setWorkers((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status: newStatus } : w))
      );
    }

    setSavingId(null);
  };

  const text = {
    title:
      language === "fr"
        ? "Inscriptions ouvriers"
        : "Worker registrations",
    subtitle:
      language === "fr"
        ? "Validez ou refusez les demandes d'adhésion des professionnels."
        : "Approve or reject worker registration requests.",
    statusFilter: language === "fr" ? "Statut" : "Status",
    searchLabel: language === "fr" ? "Recherche" : "Search",
    searchPlaceholder:
      language === "fr"
        ? "Rechercher (nom, métier, email, téléphone, ville...)"
        : "Search (name, trade, email, phone, city...)",
    allStatuses: language === "fr" ? "Tous les statuts" : "All statuses",
    pending: language === "fr" ? "En attente" : "Pending",
    approved: language === "fr" ? "Validé" : "Approved",
    rejected: language === "fr" ? "Refusé" : "Rejected",
    colDate: language === "fr" ? "Date" : "Date",
    colWorker: language === "fr" ? "Ouvrier" : "Worker",
    colContact: language === "fr" ? "Contact" : "Contact",
    colLocation: language === "fr" ? "Localisation" : "Location",
    colStatus: language === "fr" ? "Statut" : "Status",
    colActions: language === "fr" ? "Actions" : "Actions",
    empty:
      language === "fr"
        ? "Aucune demande d'inscription pour le moment."
        : "No registration requests yet.",
    refresh: language === "fr" ? "Rafraîchir" : "Refresh",
    adminContacts:
      language === "fr"
        ? "Demandes de contact"
        : "Contact requests",
    adminInscriptions:
      language === "fr"
        ? "Inscriptions ouvriers"
        : "Worker registrations",
    dateFrom:
      language === "fr" ? "Du (date de création)" : "From (creation date)",
    dateTo:
      language === "fr" ? "Au (date de création)" : "To (creation date)",
    exportCsv:
      language === "fr" ? "Exporter en CSV" : "Export CSV",
  };

  const refresh = async () => {
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
        region,
        city,
        commune,
        district,
        phone,
        email,
        years_experience,
        status,
        created_at
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError(
        language === "fr"
          ? "Impossible de rafraîchir les données."
          : "Unable to refresh data."
      );
    } else {
      setWorkers(data ?? []);
    }

    setLoading(false);
  };

  // 🔹 Export CSV des lignes filtrées
  const exportCsv = () => {
    if (!filtered.length) return;

    const header = [
      "id",
      "created_at",
      "status",
      "first_name",
      "last_name",
      "profession",
      "region",
      "city",
      "commune",
      "district",
      "email",
      "phone",
      "years_experience",
    ];

    const rows = filtered.map((w) => [
      w.id,
      w.created_at,
      w.status ?? "",
      w.first_name ?? "",
      w.last_name ?? "",
      w.profession ?? "",
      w.region ?? "",
      w.city ?? "",
      w.commune ?? "",
      w.district ?? "",
      w.email ?? "",
      w.phone ?? "",
      w.years_experience?.toString() ?? "",
    ]);

    const csvLines = [
      header.join(";"),
      ...rows.map((r) =>
        r
          .map((cell) => {
            const safe = cell.replace(/"/g, '""');
            return `"${safe}"`;
          })
          .join(";")
      ),
    ];

    const blob = new Blob([csvLines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename =
      language === "fr"
        ? "inscriptions_ouvriers.csv"
        : "worker_registrations.csv";
    a.download = filename;
    a.click();
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
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Mini navigation admin */}
        <div className="flex items-center gap-2 mb-4">
          <Link
            to="/admin/ouvrier-contacts"
            className="text-xs px-3 py-1.5 rounded-full border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
          >
            {text.adminContacts}
          </Link>
          <span className="text-xs px-3 py-1.5 rounded-full bg-pro-blue text-white">
            {text.adminInscriptions}
          </span>
        </div>

        {/* Header + actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
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
              disabled={loading || filtered.length === 0}
            >
              {text.exportCsv}
            </Button>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-col md:grid md:grid-cols-4 gap-3 mb-6">
          {/* Statut */}
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {text.statusFilter}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
            >
              <option value="">{text.allStatuses}</option>
              <option value="pending">{text.pending}</option>
              <option value="approved">{text.approved}</option>
              <option value="rejected">{text.rejected}</option>
            </select>
          </div>

          {/* Recherche texte */}
          <div className="md:col-span-1">
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

          {/* Date du */}
          <div className="md:col-span-1">
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

          {/* Date au */}
          <div className="md:col-span-1">
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
                      {text.empty}
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
                    const fullName = `${w.first_name ?? ""} ${
                      w.last_name ?? ""
                    }`.trim();
                    const location = [
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
                          {formatDate(w.created_at)}
                        </td>
                        <td className="px-4 py-3 align-top text-slate-800">
                          <div className="font-semibold">
                            {fullName || "—"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {w.profession || ""}
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
                        <td className="px-4 py-3 align-top text-slate-800">
                          <div className="text-xs text-slate-500">
                            {w.email || "—"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {w.phone || ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-slate-700">
                          <div className="text-xs">{location || "—"}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${statusColor(
                              w.status
                            )}`}
                          >
                            {statusLabel(w.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-right space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingId === w.id}
                            onClick={() =>
                              handleStatusChange(w.id, "approved")
                            }
                            className="text-xs"
                          >
                            {text.approved}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingId === w.id}
                            onClick={() =>
                              handleStatusChange(w.id, "rejected")
                            }
                            className="text-xs border-red-300 text-red-700 hover:bg-red-50"
                          >
                            {text.rejected}
                          </Button>
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
