// src/pages/AdminOuvrierContacts.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

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
  // s'il y a d'autres colonnes, ce n'est pas bloquant
};

const statusOptions = ["new", "in_progress", "done"] as const;
type ContactStatus = (typeof statusOptions)[number];

const AdminOuvrierContacts: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  // 🔐 État local pour l'authentification admin
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [contacts, setContacts] = useState<DbContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDebug, setErrorDebug] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"" | ContactStatus>("");
  const [search, setSearch] = useState("");

  // 🔐 Vérification des droits : user connecté + rôle admin dans op_users
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      setAuthLoading(true);

      // 1) Récupérer l'utilisateur connecté
      const { data, error } = await supabase.auth.getUser();
      const user = data?.user;

      if (!isMounted) return;

      if (error || !user) {
        // Pas connecté → login
        setAuthLoading(false);
        navigate("/login", { replace: true });
        return;
      }

      // 2) Vérifier le rôle dans op_users
      const { data: profile, error: profileError } = await supabase
        .from("op_users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (profileError || !profile || profile.role !== "admin") {
        // Connecté mais pas admin → retour à l'accueil
        setAuthLoading(false);
        navigate("/", { replace: true });
        return;
      }

      // 3) OK, c'est un admin
      setIsAdmin(true);
      setAuthLoading(false);
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // 🔹 Chargement des demandes (uniquement si admin validé)
  useEffect(() => {
    if (authLoading || !isAdmin) return;

    const fetchContacts = async () => {
      setLoading(true);
      setError(null);
      setErrorDebug(null);

      const { data, error } = await supabase
        .from<DbContact>("op_ouvrier_contacts")
        .select("*") // ✅ on récupère toutes les colonnes
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error (select op_ouvrier_contacts):", error);
        setError(
          language === "fr"
            ? "Impossible de charger les demandes."
            : "Unable to load contact requests."
        );
        setErrorDebug(error.message ?? null);
        setLoading(false);
        return;
      }

      setContacts(data ?? []);
      setLoading(false);
    };

    fetchContacts();
  }, [language, authLoading, isAdmin]);

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

      return matchStatus && matchSearch;
    });
  }, [contacts, statusFilter, search]);

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
    if (s === "done") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "in_progress") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  const handleStatusChange = async (id: string, newStatus: ContactStatus) => {
    setSavingId(id);
    setError(null);
    setErrorDebug(null);

    const { error } = await supabase
      .from("op_ouvrier_contacts")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      console.error("Supabase error (update op_ouvrier_contacts):", error);
      setError(
        language === "fr"
          ? "Erreur lors de la mise à jour du statut."
          : "Error while updating status."
      );
      setErrorDebug(error.message ?? null);
    } else {
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );
    }

    setSavingId(null);
  };

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
    colDate: language === "fr" ? "Date" : "Date",
    colWorker: language === "fr" ? "Ouvrier" : "Worker",
    colClient: language === "fr" ? "Client" : "Client",
    colMessage: language === "fr" ? "Message" : "Message",
    colStatus: language === "fr" ? "Statut" : "Status",
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
  };

  const refresh = async () => {
    if (authLoading || !isAdmin) return;

    setLoading(true);
    setError(null);
    setErrorDebug(null);

    const { data, error } = await supabase
      .from<DbContact>("op_ouvrier_contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error (refresh op_ouvrier_contacts):", error);
      setError(
        language === "fr"
          ? "Impossible de rafraîchir les données."
          : "Unable to refresh data."
      );
      setErrorDebug(error.message ?? null);
    } else {
      setContacts(data ?? []);
    }

    setLoading(false);
  };

  // Pendant qu'on ne sait pas encore si l'utilisateur est admin ou non
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

  // Si pas admin, on ne rend rien (la redirection a déjà eu lieu)
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        {/* Header */}
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
              {filtered.length} / {contacts.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              {text.refresh}
            </Button>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="md:w-1/3">
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
                    {text.colClient}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                    {text.colMessage}
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
                  filtered.map((c) => (
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
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
            {errorDebug && (
              <div className="mt-1 text-xs text-red-500 opacity-80">
                Détail technique : {errorDebug}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOuvrierContacts;
