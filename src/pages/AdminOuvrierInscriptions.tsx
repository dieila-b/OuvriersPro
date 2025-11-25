// src/pages/AdminOuvrierInscriptions.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import AdminNavTabs from "@/components/AdminNavTabs";
import {
  Sparkles,
  BadgeCheck,
  XCircle,
  PauseCircle,
  RotateCcw,
  CreditCard,
  MapPin,
  User2,
  CalendarDays,
  Search,
  Clock,
} from "lucide-react";

type DbWorker = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  profession: string | null;
  description: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  years_experience: number | null;
  status: string | null;
  created_at: string;
  validated_at: string | null;
  validated_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  plan_code: string | null;
  payment_status: string | null; // "unpaid" | "pending" | "paid"
  payment_provider: string | null; // "free_plan" | "mobile_money" | ...
  payment_reference: string | null;
  payment_at: string | null;
};

type WorkerStatus = "pending" | "approved" | "rejected" | "suspended";

/* -----------------------------
   ✅ UI helpers (même thème)
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

const AdminOuvrierInscriptions: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  // 🔐 Auth admin
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  const [workers, setWorkers] = useState<DbWorker[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<WorkerStatus | "all">(
    "pending"
  );
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Helpers plan / paiement
  const isFreePlan = (code: string | null | undefined) => {
    const c = code?.toLowerCase() || "";
    return !c || ["free", "gratuit"].includes(c);
  };
  const requiresPayment = (code: string | null | undefined) => !isFreePlan(code);

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
      setCurrentAdminId(user.id);
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
        .from("op_ouvriers")
        .select(
          `
          id,
          first_name,
          last_name,
          email,
          phone,
          profession,
          description,
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
          rejection_reason,
          plan_code,
          payment_status,
          payment_provider,
          payment_reference,
          payment_at
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
        setWorkers((data as DbWorker[]) ?? []);
      }

      setLoading(false);
    };

    fetchWorkers();
  }, [language, authLoading, isAdmin]);

  // 🔎 Filtrage
  const filtered = useMemo(() => {
    return workers.filter((w) => {
      const matchStatus =
        statusFilter === "all" || (w.status as WorkerStatus) === statusFilter;

      const haystack =
        [
          w.first_name,
          w.last_name,
          w.email,
          w.phone,
          w.profession,
          w.description,
          w.city,
          w.commune,
          w.district,
          w.region,
          w.country,
          w.plan_code,
          w.payment_status,
          w.payment_provider,
          w.payment_reference,
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

  // Stats mini dashboard
  const stats = useMemo(() => {
    const total = filtered.length;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let suspended = 0;

    filtered.forEach((w) => {
      if (w.status === "pending") pending++;
      if (w.status === "approved") approved++;
      if (w.status === "rejected") rejected++;
      if (w.status === "suspended") suspended++;
    });

    return { total, pending, approved, rejected, suspended };
  }, [filtered]);

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

  const statusLabel = (s: string | null | undefined) => {
    if (language === "fr") {
      if (s === "approved") return "Validé";
      if (s === "rejected") return "Refusé";
      if (s === "suspended") return "Suspendu";
      return "En attente";
    } else {
      if (s === "approved") return "Approved";
      if (s === "rejected") return "Rejected";
      if (s === "suspended") return "Suspended";
      return "Pending";
    }
  };

  const statusBadgeClass = (s: string | null | undefined) => {
    if (s === "approved")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "rejected")
      return "bg-rose-50 text-rose-700 border-rose-200";
    if (s === "suspended")
      return "bg-slate-100 text-slate-700 border-slate-300";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  // Plans
  const planLabel = (code: string | null | undefined) => {
    const c = code?.toLowerCase() || "";
    if (["free", "gratuit"].includes(c)) return language === "fr" ? "Gratuit" : "Free";
    if (["monthly", "mensuel", "month"].includes(c)) return language === "fr" ? "Mensuel" : "Monthly";
    if (["yearly", "annuel", "annual"].includes(c)) return language === "fr" ? "Annuel" : "Yearly";
    return "—";
  };

  const planBadgeClass = (code: string | null | undefined) => {
    const c = code?.toLowerCase() || "";
    if (["free", "gratuit"].includes(c))
      return "bg-slate-50 text-slate-700 border-slate-200";
    if (["monthly", "mensuel", "month"].includes(c))
      return "bg-sky-50 text-sky-700 border-sky-200";
    if (["yearly", "annuel", "annual"].includes(c))
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    return "bg-slate-50 text-slate-400 border-slate-200";
  };

  // Paiement
  const paymentStatusLabel = (s: string | null | undefined) => {
    if (language === "fr") {
      if (s === "paid") return "Payé";
      if (s === "pending") return "En attente";
      return "Non payé";
    } else {
      if (s === "paid") return "Paid";
      if (s === "pending") return "Pending";
      return "Unpaid";
    }
  };

  const paymentStatusBadgeClass = (s: string | null | undefined) => {
    if (s === "paid")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "pending")
      return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  const paymentProviderLabel = (p: string | null | undefined) => {
    const c = p?.toLowerCase() || "";
    if (c === "free_plan") return language === "fr" ? "Plan gratuit" : "Free plan";
    if (c === "mobile_money") return "Mobile Money";
    if (c === "card") return language === "fr" ? "Carte bancaire" : "Card";
    if (c === "paypal") return "PayPal";
    if (c === "google_pay") return "Google Pay";
    if (!c) return "—";
    return c;
  };

  // ✅ Validation
  const handleValidate = async (w: DbWorker) => {
    if (!currentAdminId) return;

    if (!w.email || !w.phone || !w.profession) {
      toast({
        variant: "destructive",
        title: language === "fr" ? "Validation impossible" : "Cannot approve",
        description:
          language === "fr"
            ? "Email, téléphone et métier doivent être renseignés avant validation."
            : "Email, phone and profession must be filled before approval.",
      });
      return;
    }

    if (requiresPayment(w.plan_code) && w.payment_status !== "paid") {
      toast({
        variant: "destructive",
        title: language === "fr" ? "Paiement non confirmé" : "Payment not confirmed",
        description:
          language === "fr"
            ? `Impossible de valider tant que le paiement n'est pas "Payé". Statut actuel : ${paymentStatusLabel(
                w.payment_status
              )}.`
            : `You cannot approve while payment is not "Paid". Current status: ${paymentStatusLabel(
                w.payment_status
              )}.`,
      });
      return;
    }

    setActionLoadingId(w.id);
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
      toast({
        variant: "destructive",
        title: language === "fr" ? "Erreur lors de la validation" : "Error while approving",
        description: error.message,
      });
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

      toast({
        title: language === "fr" ? "Inscription validée" : "Registration approved",
        description:
          language === "fr"
            ? `${w.first_name ?? ""} ${w.last_name ?? ""} est maintenant visible comme ouvrier validé.`
            : `${w.first_name ?? ""} ${w.last_name ?? ""} is now approved.`,
      });
    }

    setActionLoadingId(null);
  };

  // ✅ Marquer paiement comme payé
  const handleMarkPaymentPaid = async (w: DbWorker) => {
    if (!currentAdminId) return;

    const defaultRef = w.payment_reference || "";
    const promptText =
      language === "fr"
        ? "Référence de paiement (Mobile Money, reçu...) :"
        : "Payment reference (Mobile Money, receipt, ...):";

    const ref = window.prompt(promptText, defaultRef);

    setActionLoadingId(w.id);
    setError(null);

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("op_ouvriers")
      .update({
        payment_status: "paid",
        payment_at: nowIso,
        payment_reference: ref || defaultRef || null,
      })
      .eq("id", w.id);

    if (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title:
          language === "fr"
            ? "Erreur lors de la validation du paiement"
            : "Error while confirming payment",
        description: error.message,
      });
    } else {
      setWorkers((prev) =>
        prev.map((x) =>
          x.id === w.id
            ? {
                ...x,
                payment_status: "paid",
                payment_at: nowIso,
                payment_reference: ref || defaultRef || null,
              }
            : x
        )
      );

      toast({
        title: language === "fr" ? "Paiement confirmé" : "Payment confirmed",
        description:
          language === "fr"
            ? "Le paiement a été marqué comme payé. Vous pouvez maintenant valider l'ouvrier."
            : "Payment marked as paid. You can now approve this worker.",
      });
    }

    setActionLoadingId(null);
  };

  // ❌ Refus
  const handleReject = async (w: DbWorker) => {
    if (!currentAdminId) return;

    const reason =
      language === "fr"
        ? window.prompt("Motif du refus (optionnel) :", w.rejection_reason || "")
        : window.prompt("Rejection reason (optional):", w.rejection_reason || "");

    setActionLoadingId(w.id);
    setError(null);

    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("op_ouvriers")
      .update({
        status: "rejected",
        rejected_at: nowIso,
        rejected_by: currentAdminId,
        rejection_reason: reason || null,
      })
      .eq("id", w.id);

    if (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: language === "fr" ? "Erreur lors du refus" : "Error while rejecting",
        description: error.message,
      });
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
              }
            : x
        )
      );

      toast({
        title: language === "fr" ? "Inscription refusée" : "Registration rejected",
        description:
          language === "fr"
            ? reason
              ? `Motif : ${reason}`
              : "Le refus a bien été enregistré."
            : reason
            ? `Reason: ${reason}`
            : "Rejection saved.",
      });
    }

    setActionLoadingId(null);
  };

  // 🛑 Suspension
  const handleSuspend = async (w: DbWorker) => {
    if (!currentAdminId) return;

    const reason =
      language === "fr"
        ? window.prompt("Motif de la suspension (optionnel) :", w.rejection_reason || "")
        : window.prompt("Suspension reason (optional):", w.rejection_reason || "");

    setActionLoadingId(w.id);
    setError(null);

    const { error } = await supabase
      .from("op_ouvriers")
      .update({
        status: "suspended",
        rejection_reason: reason || w.rejection_reason || null,
      })
      .eq("id", w.id);

    if (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: language === "fr" ? "Erreur lors de la suspension" : "Error while suspending",
        description: error.message,
      });
    } else {
      setWorkers((prev) =>
        prev.map((x) =>
          x.id === w.id
            ? {
                ...x,
                status: "suspended",
                rejection_reason: reason || x.rejection_reason || null,
              }
            : x
        )
      );

      toast({
        title: language === "fr" ? "Ouvrier suspendu" : "Worker suspended",
        description:
          language === "fr"
            ? "Cet ouvrier ne sera plus visible dans la recherche publique."
            : "This worker will no longer appear in public search.",
      });
    }

    setActionLoadingId(null);
  };

  // ✅ Réactiver (suspended ➜ approved)
  const handleReactivate = async (w: DbWorker) => {
    if (!currentAdminId) return;

    if (requiresPayment(w.plan_code) && w.payment_status !== "paid") {
      toast({
        variant: "destructive",
        title: language === "fr" ? "Paiement non confirmé" : "Payment not confirmed",
        description:
          language === "fr"
            ? "Impossible de réactiver tant que le paiement n'est pas marqué comme payé."
            : "Cannot reactivate while payment is not marked as paid.",
      });
      return;
    }

    const confirmText =
      language === "fr"
        ? "Réactiver cet ouvrier et le remettre en validé ?"
        : "Reactivate this worker and set to approved?";

    if (!window.confirm(confirmText)) return;

    setActionLoadingId(w.id);
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
      toast({
        variant: "destructive",
        title: language === "fr" ? "Erreur lors de la réactivation" : "Error while reactivating",
        description: error.message,
      });
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

      toast({
        title: language === "fr" ? "Ouvrier réactivé" : "Worker reactivated",
        description:
          language === "fr"
            ? "Cet ouvrier est de nouveau visible publiquement."
            : "This worker is visible publicly again.",
      });
    }

    setActionLoadingId(null);
  };

  // 🔄 Rafraîchir
  const refresh = async () => {
    if (authLoading || !isAdmin) return;

    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("op_ouvriers")
      .select(
        `
        id,
        first_name,
        last_name,
        email,
        phone,
        profession,
        description,
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
        rejection_reason,
        plan_code,
        payment_status,
        payment_provider,
        payment_reference,
        payment_at
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError(
        language === "fr"
          ? `Impossible de rafraîchir les données. (${error.message})`
          : `Unable to refresh data. (${error.message})`
      );
    } else {
      setWorkers((data as DbWorker[]) ?? []);
      toast({
        title: language === "fr" ? "Données actualisées" : "Data refreshed",
      });
    }

    setLoading(false);
  };

  // 📄 Export CSV
  const exportCsv = () => {
    if (!filtered.length) {
      toast({
        variant: "destructive",
        title: language === "fr" ? "Aucune ligne à exporter" : "No rows to export",
      });
      return;
    }

    const escapeCsv = (value: string | null | undefined) =>
      `"${(value ?? "").replace(/"/g, '""')}"`;

    const headers = [
      "id",
      "created_at",
      "status",
      "plan_code",
      "payment_status",
      "payment_provider",
      "payment_reference",
      "payment_at",
      "first_name",
      "last_name",
      "email",
      "phone",
      "profession",
      "country",
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
        w.plan_code ?? "",
        w.payment_status ?? "",
        w.payment_provider ?? "",
        w.payment_reference ?? "",
        w.payment_at ?? "",
        w.first_name ?? "",
        w.last_name ?? "",
        w.email ?? "",
        w.phone ?? "",
        w.profession ?? "",
        w.country ?? "",
        w.region ?? "",
        w.city ?? "",
        w.commune ?? "",
        w.district ?? "",
        w.years_experience ?? "",
        w.validated_at ?? "",
        w.validated_by ?? "",
        w.rejected_at ?? "",
        w.rejected_by ?? "",
        w.rejection_reason ?? "",
      ].map(escapeCsv)
    );

    const csvContent =
      headers.join(";") + "\n" + rows.map((r) => r.join(";")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "ouvriers_inscriptions.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: language === "fr" ? "Export CSV créé" : "CSV export created",
      description:
        language === "fr" ? "Le fichier a été téléchargé." : "File downloaded.",
    });
  };

  const text = {
    title: language === "fr" ? "Inscriptions ouvriers" : "Workers registrations",
    subtitle:
      language === "fr"
        ? "Validez, refusez, suspendez ou réactivez les ouvriers."
        : "Approve, reject, suspend or reactivate workers.",
    statusFilter: language === "fr" ? "Statut" : "Status",
    searchLabel: language === "fr" ? "Recherche" : "Search",
    searchPlaceholder:
      language === "fr"
        ? "Rechercher (nom, métier, email, téléphone...)"
        : "Search (name, job, email, phone...)",
    dateFrom: language === "fr" ? "Du (création)" : "From (created at)",
    dateTo: language === "fr" ? "Au (création)" : "To (created at)",
    colDate: language === "fr" ? "Date" : "Date",
    colWorker: language === "fr" ? "Ouvrier" : "Worker",
    colContact: language === "fr" ? "Contact" : "Contact",
    colLocation: language === "fr" ? "Localisation" : "Location",
    colPlan: language === "fr" ? "Formule" : "Plan",
    colPayment: language === "fr" ? "Paiement" : "Payment",
    colStatus: language === "fr" ? "Statut" : "Status",
    colActions: language === "fr" ? "Actions" : "Actions",
    empty:
      language === "fr"
        ? "Aucune demande d'inscription pour le moment."
        : "No registration request yet.",
    refresh: language === "fr" ? "Rafraîchir" : "Refresh",
    exportCsv: language === "fr" ? "Exporter en CSV" : "Export CSV",
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          {language === "fr" ? "Vérification de vos droits..." : "Checking your permissions..."}
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

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
              {filtered.length} / {workers.length}
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

        {/* Mini stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            label={language === "fr" ? "Total" : "Total"}
            value={stats.total}
            icon={User2}
            gradient="from-indigo-500/10 via-indigo-400/20 to-indigo-500/40"
          />
          <StatCard
            label={language === "fr" ? "En attente" : "Pending"}
            value={stats.pending}
            icon={Clock}
            gradient="from-amber-500/10 via-amber-400/20 to-amber-500/40"
          />
          <StatCard
            label={language === "fr" ? "Validés" : "Approved"}
            value={stats.approved}
            icon={BadgeCheck}
            gradient="from-emerald-500/10 via-emerald-400/20 to-emerald-500/40"
          />
          <StatCard
            label={language === "fr" ? "Refusés" : "Rejected"}
            value={stats.rejected}
            icon={XCircle}
            gradient="from-rose-500/10 via-rose-400/20 to-rose-500/40"
          />
          <StatCard
            label={language === "fr" ? "Suspendus" : "Suspended"}
            value={stats.suspended}
            icon={PauseCircle}
            gradient="from-slate-500/10 via-slate-400/20 to-slate-500/40"
          />
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
                onChange={(e) =>
                  setStatusFilter(e.target.value as WorkerStatus | "all")
                }
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
              >
                <option value="pending">{language === "fr" ? "En attente" : "Pending"}</option>
                <option value="approved">{language === "fr" ? "Validé" : "Approved"}</option>
                <option value="rejected">{language === "fr" ? "Refusé" : "Rejected"}</option>
                <option value="suspended">{language === "fr" ? "Suspendu" : "Suspended"}</option>
                <option value="all">{language === "fr" ? "Tous" : "All"}</option>
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
            filtered.map((w) => {
              const fullName =
                (w.first_name || "") + (w.last_name ? ` ${w.last_name}` : "");
              const locationParts = [
                w.country,
                w.region,
                w.city,
                w.commune,
                w.district,
              ]
                .filter(Boolean)
                .join(" • ");
              const needsPayment = requiresPayment(w.plan_code);

              return (
                <div key={w.id} className={cardClass + " p-4"}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDateTime(w.created_at)}
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${statusBadgeClass(
                        w.status
                      )}`}
                    >
                      {statusLabel(w.status)}
                    </span>
                  </div>

                  <div className="mb-2">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase">
                      {text.colWorker}
                    </div>
                    <div className="font-semibold text-slate-900">
                      {fullName || "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {w.profession || ""}
                    </div>
                    {w.years_experience != null && (
                      <div className="text-xs text-slate-500">
                        {w.years_experience}{" "}
                        {language === "fr" ? "ans d'expérience" : "years of experience"}
                      </div>
                    )}
                  </div>

                  <div className="mb-2">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase">
                      {text.colContact}
                    </div>
                    <div className="text-xs text-slate-500">{w.email || "—"}</div>
                    <div className="text-xs text-slate-500">{w.phone || ""}</div>
                  </div>

                  <div className="mb-2">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {text.colLocation}
                    </div>
                    <div className="text-xs text-slate-500">
                      {locationParts || "—"}
                    </div>
                  </div>

                  <div className="mb-2 flex flex-wrap gap-2 items-start">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 uppercase">
                        {text.colPlan}
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${planBadgeClass(
                          w.plan_code
                        )}`}
                      >
                        {planLabel(w.plan_code)}
                      </span>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5" />
                        {text.colPayment}
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${paymentStatusBadgeClass(
                          w.payment_status
                        )}`}
                      >
                        {paymentStatusLabel(w.payment_status)}
                      </span>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {language === "fr" ? "Mode : " : "Method: "}
                        {paymentProviderLabel(w.payment_provider)}
                      </div>
                      {w.payment_reference && (
                        <div className="text-[11px] text-slate-500 truncate">
                          {language === "fr" ? "Réf. " : "Ref. "} {w.payment_reference}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {needsPayment && w.payment_status !== "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        disabled={actionLoadingId === w.id}
                        onClick={() => handleMarkPaymentPaid(w)}
                      >
                        {language === "fr" ? "Valider paiement" : "Confirm payment"}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        actionLoadingId === w.id ||
                        w.status === "approved" ||
                        w.status === "suspended"
                      }
                      onClick={() => handleValidate(w)}
                    >
                      {language === "fr" ? "Validé" : "Approve"}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-300 text-rose-700 hover:bg-rose-50"
                      disabled={actionLoadingId === w.id || w.status === "rejected"}
                      onClick={() => handleReject(w)}
                    >
                      {language === "fr" ? "Refusé" : "Reject"}
                    </Button>

                    {w.status !== "suspended" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-400 text-slate-800 hover:bg-slate-50"
                        disabled={actionLoadingId === w.id}
                        onClick={() => handleSuspend(w)}
                      >
                        {language === "fr" ? "Suspendre" : "Suspend"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                        disabled={actionLoadingId === w.id}
                        onClick={() => handleReactivate(w)}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        {language === "fr" ? "Réactiver" : "Reactivate"}
                      </Button>
                    )}
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
                    {text.colContact}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                    {text.colLocation}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                    {text.colPlan}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">
                    {text.colPayment}
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
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500 text-sm">
                      {text.empty}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-slate-500 text-sm">
                      {language === "fr" ? "Chargement..." : "Loading..."}
                    </td>
                  </tr>
                )}

                {!loading &&
                  filtered.map((w) => {
                    const fullName =
                      (w.first_name || "") + (w.last_name ? ` ${w.last_name}` : "");
                    const locationParts = [
                      w.country,
                      w.region,
                      w.city,
                      w.commune,
                      w.district,
                    ]
                      .filter(Boolean)
                      .join(" • ");
                    const needsPayment = requiresPayment(w.plan_code);

                    return (
                      <tr
                        key={w.id}
                        className="border-t border-slate-100 hover:bg-slate-50/60"
                      >
                        <td className="px-4 py-3 align-top text-slate-700 whitespace-nowrap">
                          {formatDateTime(w.created_at)}
                        </td>

                        <td className="px-4 py-3 align-top text-slate-800">
                          <div className="font-semibold">{fullName || "—"}</div>
                          <div className="text-xs text-slate-500">{w.profession || ""}</div>
                          {w.years_experience != null && (
                            <div className="text-xs text-slate-500">
                              {w.years_experience}{" "}
                              {language === "fr" ? "ans d'expérience" : "years of experience"}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 align-top text-slate-800">
                          <div className="text-xs text-slate-500">{w.email || "—"}</div>
                          <div className="text-xs text-slate-500">{w.phone || ""}</div>
                        </td>

                        <td className="px-4 py-3 align-top text-slate-700 max-w-xs">
                          <div className="text-xs text-slate-500">{locationParts || "—"}</div>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${planBadgeClass(
                              w.plan_code
                            )}`}
                          >
                            {planLabel(w.plan_code)}
                          </span>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${paymentStatusBadgeClass(
                              w.payment_status
                            )}`}
                          >
                            {paymentStatusLabel(w.payment_status)}
                          </span>
                          <div className="mt-1 text-[11px] text-slate-500">
                            {language === "fr" ? "Mode : " : "Method: "}
                            {paymentProviderLabel(w.payment_provider)}
                          </div>
                          {w.payment_reference && (
                            <div className="text-[11px] text-slate-500 truncate">
                              {language === "fr" ? "Réf. " : "Ref. "} {w.payment_reference}
                            </div>
                          )}
                        </td>

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
                              {language === "fr" ? "Validé le " : "Approved on "}
                              {formatDateTime(w.validated_at)}
                            </div>
                          )}
                          {w.rejected_at && (
                            <div className="mt-1 text-[11px] text-slate-500">
                              {language === "fr" ? "Refusé le " : "Rejected on "}
                              {formatDateTime(w.rejected_at)}
                              {w.rejection_reason && ` – ${w.rejection_reason}`}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 align-top text-right space-x-2 whitespace-nowrap">
                          {needsPayment && w.payment_status !== "paid" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 mr-2"
                              disabled={actionLoadingId === w.id}
                              onClick={() => handleMarkPaymentPaid(w)}
                            >
                              {language === "fr" ? "Valider paiement" : "Confirm payment"}
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={
                              actionLoadingId === w.id ||
                              w.status === "approved" ||
                              w.status === "suspended"
                            }
                            onClick={() => handleValidate(w)}
                          >
                            {language === "fr" ? "Validé" : "Approve"}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="border-rose-300 text-rose-700 hover:bg-rose-50"
                            disabled={actionLoadingId === w.id || w.status === "rejected"}
                            onClick={() => handleReject(w)}
                          >
                            {language === "fr" ? "Refusé" : "Reject"}
                          </Button>

                          {w.status !== "suspended" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-400 text-slate-800 hover:bg-slate-50"
                              disabled={actionLoadingId === w.id}
                              onClick={() => handleSuspend(w)}
                            >
                              {language === "fr" ? "Suspendre" : "Suspend"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                              disabled={actionLoadingId === w.id}
                              onClick={() => handleReactivate(w)}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              {language === "fr" ? "Réactiver" : "Reactivate"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {error && (
          <div className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-md px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOuvrierInscriptions;
