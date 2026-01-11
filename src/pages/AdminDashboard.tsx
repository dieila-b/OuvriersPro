// src/pages/AdminDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, Link } from "react-router-dom";

import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  PhoneCall,
  TrendingUp,
  Percent,
  RefreshCw,
  CalendarDays,
  ArrowRight,
} from "lucide-react";

type DbWorkerSummary = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profession: string | null;
  status: string | null;
  created_at: string;
  plan_code: string | null;
};

type DbContactSummary = {
  id: string;
  worker_name: string | null;
  client_name: string | null;
  status: string | null;
  origin?: string | null;
  created_at: string;
};

type ChartMode = "daily" | "weekly";
type MetricMode = "volume" | "conversion";

type ChartPoint = {
  key: string;
  label: string;
  value: number;
};

type ChartData = {
  points: ChartPoint[];
  maxValue: number;
};

/* -----------------------------
   ✅ UI helpers
-------------------------------- */
const cardClass =
  "bg-white/85 backdrop-blur border border-slate-200/60 rounded-2xl shadow-[0_18px_45px_rgba(15,23,42,0.06)]";

const statCardBase =
  "relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 backdrop-blur p-4 md:p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] flex flex-col justify-between";

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}) {
  return (
    <div className={statCardBase}>
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} opacity-70`} />
      <div className="relative flex items-center justify-between mb-3 gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[.16em] text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 border border-white/60 shadow-sm shrink-0">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
      {subtitle && <p className="relative text-xs text-slate-600">{subtitle}</p>}
    </div>
  );
}

type PlanKey = "free" | "monthly" | "yearly" | "other";

const normalizePlan = (code: string | null | undefined): PlanKey => {
  const c = (code || "").toLowerCase().trim();
  if (!c) return "free";
  if (c.includes("free") || c.includes("gratuit") || c === "plan_free" || c === "basic") return "free";
  if (c.includes("month") || c.includes("mensuel") || c === "monthly" || c === "pro_monthly") return "monthly";
  if (c.includes("year") || c.includes("annuel") || c === "yearly" || c === "pro_yearly" || c === "annual") return "yearly";
  return "other";
};

const planLabel = (code: string | null | undefined, language: "fr" | "en") => {
  const plan = normalizePlan(code);
  if (plan === "free") return language === "fr" ? "Gratuit" : "Free";
  if (plan === "monthly") return language === "fr" ? "Mensuel" : "Monthly";
  if (plan === "yearly") return language === "fr" ? "Annuel" : "Yearly";
  return language === "fr" ? "Autre" : "Other";
};

const planBadgeClass = (code: string | null | undefined) => {
  const plan = normalizePlan(code);
  if (plan === "free") return "bg-slate-50 text-slate-700 border-slate-200";
  if (plan === "monthly") return "bg-sky-50 text-sky-700 border-sky-200";
  if (plan === "yearly") return "bg-indigo-50 text-indigo-700 border-indigo-200";
  return "bg-slate-50 text-slate-500 border-slate-200";
};

const AdminDashboard: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [workers, setWorkers] = useState<DbWorkerSummary[]>([]);
  const [contacts, setContacts] = useState<DbContactSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const [chartMode, setChartMode] = useState<ChartMode>("daily");
  const [metricMode, setMetricMode] = useState<MetricMode>("volume");

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

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        { data: workersData, error: workersError },
        { data: contactsData, error: contactsError },
      ] = await Promise.all([
        supabase
          .from("op_ouvriers")
          .select("id, first_name, last_name, profession, status, created_at, plan_code")
          .order("created_at", { ascending: false }),
        supabase
          .from("op_ouvrier_contacts")
          .select("id, worker_name, client_name, status, origin, created_at")
          .order("created_at", { ascending: false }),
      ]);

      if (workersError) {
        setError(
          language === "fr"
            ? `Erreur chargement ouvriers : ${workersError.message}`
            : `Error loading workers: ${workersError.message}`
        );
      } else setWorkers((workersData as DbWorkerSummary[]) ?? []);

      if (contactsError) {
        setError((prev) => {
          const msg =
            language === "fr"
              ? `Erreur chargement contacts : ${contactsError.message}`
              : `Error loading contacts: ${contactsError.message}`;
          return prev ? `${prev} | ${msg}` : msg;
        });
      } else setContacts((contactsData as DbContactSummary[]) ?? []);
    } catch (e) {
      setError(language === "fr" ? "Erreur inconnue lors du chargement." : "Unknown loading error.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin, language]);

  const filteredWorkers = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return workers.filter((w) => {
      const created = new Date(w.created_at);
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    });
  }, [workers, dateFrom, dateTo]);

  const filteredContacts = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return contacts.filter((c) => {
      const created = new Date(c.created_at);
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    });
  }, [contacts, dateFrom, dateTo]);

  const stats = useMemo(() => {
    let pendingWorkers = 0;
    let approvedWorkers = 0;
    let rejectedWorkers = 0;
    let suspendedWorkers = 0;

    let planFree = 0;
    let planMonthly = 0;
    let planYearly = 0;
    let planOther = 0;

    for (const w of filteredWorkers) {
      if (w.status === "pending") pendingWorkers += 1;
      else if (w.status === "approved") approvedWorkers += 1;
      else if (w.status === "rejected") rejectedWorkers += 1;
      else if (w.status === "suspended") suspendedWorkers += 1;

      const p = normalizePlan(w.plan_code);
      if (p === "free") planFree += 1;
      else if (p === "monthly") planMonthly += 1;
      else if (p === "yearly") planYearly += 1;
      else planOther += 1;
    }

    const totalContacts = filteredContacts.length;
    const todayISO = new Date().toISOString().slice(0, 10);

    let contactsToday = 0;
    let contactsLast7 = 0;

    for (const c of filteredContacts) {
      const dateStr = c.created_at.slice(0, 10);
      const created = new Date(c.created_at);
      const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);

      if (dateStr === todayISO) contactsToday += 1;
      if (diffDays <= 7) contactsLast7 += 1;
    }

    return {
      totalWorkers: filteredWorkers.length,
      pendingWorkers,
      approvedWorkers,
      rejectedWorkers,
      suspendedWorkers,
      totalContacts,
      contactsToday,
      contactsLast7,
      planFree,
      planMonthly,
      planYearly,
      planOther,
    };
  }, [filteredWorkers, filteredContacts]);

  const getWeekKey = (d: Date) => {
    const year = d.getFullYear();
    const start = new Date(year, 0, 1);
    const diff = d.getTime() - start.getTime();
    const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    const week = Math.floor((diffDays + d.getDay() + 1) / 7);
    const weekStr = week.toString().padStart(2, "0");
    return { key: `${year}-W${weekStr}`, week };
  };

  const volumeChartData: ChartData = useMemo(() => {
    if (chartMode === "daily") {
      const days: ChartPoint[] = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - i));
        const key = d.toISOString().slice(0, 10);
        const label =
          language === "fr"
            ? d.toLocaleDateString("fr-FR", { weekday: "short" })
            : d.toLocaleDateString("en-GB", { weekday: "short" });
        days.push({ key, label, value: 0 });
      }

      for (const c of filteredContacts) {
        const dateStr = c.created_at.slice(0, 10);
        const day = days.find((x) => x.key === dateStr);
        if (day) day.value += 1;
      }

      const maxValue = days.reduce((max, x) => (x.value > max ? x.value : max), 0) || 1;
      return { points: days, maxValue };
    }

    const weeksMap: Record<string, { label: string; key: string; value: number; orderKey: string }> = {};
    for (const c of filteredContacts) {
      const d = new Date(c.created_at);
      const { key, week } = getWeekKey(d);
      if (!weeksMap[key]) {
        const label = language === "fr" ? `S${week}` : `W${week}`;
        weeksMap[key] = { label, key, value: 0, orderKey: key };
      }
      weeksMap[key].value += 1;
    }

    let weeks = Object.values(weeksMap).sort((a, b) => a.orderKey.localeCompare(b.orderKey));
    if (weeks.length > 8) weeks = weeks.slice(weeks.length - 8);

    const maxValue = weeks.reduce((max, x) => (x.value > max ? x.value : max), 0) || 1;
    return { points: weeks, maxValue };
  }, [filteredContacts, chartMode, language]);

  const conversionChartData: ChartData = useMemo(() => {
    if (chartMode === "daily") {
      const daysBase: { key: string; label: string }[] = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - i));
        const key = d.toISOString().slice(0, 10);
        const label =
          language === "fr"
            ? d.toLocaleDateString("fr-FR", { weekday: "short" })
            : d.toLocaleDateString("en-GB", { weekday: "short" });
        daysBase.push({ key, label });
      }

      const meta: Record<string, { total: number; approved: number; label: string }> = {};
      for (const d of daysBase) meta[d.key] = { total: 0, approved: 0, label: d.label };

      for (const w of filteredWorkers) {
        const dateStr = w.created_at.slice(0, 10);
        if (meta[dateStr]) {
          meta[dateStr].total += 1;
          if (w.status === "approved") meta[dateStr].approved += 1;
        }
      }

      const points: ChartPoint[] = daysBase.map((d) => {
        const m = meta[d.key];
        const rate = m.total > 0 ? (m.approved / m.total) * 100 : 0;
        return { key: d.key, label: d.label, value: rate };
      });

      return { points, maxValue: 100 };
    }

    const weeksMeta: Record<string, { label: string; orderKey: string; total: number; approved: number }> = {};
    for (const w of filteredWorkers) {
      const d = new Date(w.created_at);
      const { key, week } = getWeekKey(d);
      if (!weeksMeta[key]) {
        const label = language === "fr" ? `S${week}` : `W${week}`;
        weeksMeta[key] = { label, orderKey: key, total: 0, approved: 0 };
      }
      weeksMeta[key].total += 1;
      if (w.status === "approved") weeksMeta[key].approved += 1;
    }

    let weeksArr = Object.values(weeksMeta).sort((a, b) => a.orderKey.localeCompare(b.orderKey));
    if (weeksArr.length > 8) weeksArr = weeksArr.slice(weeksArr.length - 8);

    const points: ChartPoint[] = weeksArr.map((w) => {
      const rate = w.total > 0 ? (w.approved / w.total) * 100 : 0;
      return { key: w.orderKey, label: w.label, value: rate };
    });

    return { points, maxValue: 100 };
  }, [filteredWorkers, chartMode, language]);

  const activeChartData = metricMode === "volume" ? volumeChartData : conversionChartData;

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
      if (s === "suspended") return "Suspendu";
      return "En attente";
    }
    if (s === "approved") return "Approved";
    if (s === "rejected") return "Rejected";
    if (s === "suspended") return "Suspended";
    return "Pending";
  };

  const workerStatusClass = (s: string | null | undefined) => {
    if (s === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "rejected") return "bg-rose-50 text-rose-700 border-rose-200";
    if (s === "suspended") return "bg-slate-100 text-slate-700 border-slate-300";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const contactStatusLabel = (s: string | null | undefined) => {
    if (language === "fr") {
      if (s === "in_progress") return "En cours";
      if (s === "done") return "Traité";
      return "Nouveau";
    }
    if (s === "in_progress") return "In progress";
    if (s === "done") return "Done";
    return "New";
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
    title: language === "fr" ? "Tableau de bord admin" : "Admin dashboard",
    subtitle:
      language === "fr"
        ? "Vue d’ensemble des inscriptions et demandes de contact."
        : "Global view of registrations and contact requests.",
    dateFrom: language === "fr" ? "Du (filtre global)" : "From (global filter)",
    dateTo: language === "fr" ? "Au (filtre global)" : "To (global filter)",
    chartTitle: language === "fr" ? "Évolution des demandes / conversions" : "Requests / conversions trend",
    chartModeDaily: language === "fr" ? "Jour" : "Daily",
    chartModeWeekly: language === "fr" ? "Semaine" : "Weekly",
    metricModeVolume: language === "fr" ? "Volume" : "Volume",
    metricModeConversion: language === "fr" ? "Conversion" : "Conversion",
    chartSubtitleDailyVolume:
      language === "fr"
        ? "Demandes de contact reçues par jour (7 derniers jours)."
        : "Contact requests per day (last 7 days).",
    chartSubtitleWeeklyVolume:
      language === "fr"
        ? "Demandes de contact reçues par semaine (8 dernières semaines)."
        : "Contact requests per week (last 8 weeks).",
    chartSubtitleDailyConversion:
      language === "fr"
        ? "Taux de conversion (validées / totales) par jour (7 derniers jours)."
        : "Conversion rate (approved / total) per day (last 7 days).",
    chartSubtitleWeeklyConversion:
      language === "fr"
        ? "Taux de conversion (validées / totales) par semaine (8 dernières semaines)."
        : "Conversion rate (approved / total) per week (last 8 weeks).",
    goToInscriptions: language === "fr" ? "Voir toutes les inscriptions" : "View all registrations",
    goToContacts: language === "fr" ? "Voir toutes les demandes" : "View all requests",
    recentWorkers: language === "fr" ? "Dernières inscriptions" : "Latest registrations",
    recentContacts: language === "fr" ? "Dernières demandes de contact" : "Latest contact requests",
    emptyPeriod:
      language === "fr"
        ? "Aucune donnée dans la période sélectionnée."
        : "No data in the selected period.",
    refresh: language === "fr" ? "Actualiser" : "Refresh",
    clearDates: language === "fr" ? "Effacer dates" : "Clear dates",
    viewAll: language === "fr" ? "Tout voir" : "View all",
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-slate-500">
          {language === "fr" ? "Vérification de vos droits..." : "Checking your permissions..."}
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="w-full">
      {/* Header + actions + filtres */}
      <div className="flex flex-col gap-4 md:gap-5">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              {text.title}
              <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-semibold">
                Admin
              </span>
            </h1>
            <p className="text-sm text-slate-600 mt-1">{text.subtitle}</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              disabled={loading}
            >
              <CalendarDays className="h-4 w-4" />
              {text.clearDates}
            </Button>

            <Button className="gap-2 bg-pro-blue hover:bg-blue-700" onClick={fetchDashboardData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {text.refresh}
            </Button>
          </div>
        </div>

        <div className={`${cardClass} p-3 sm:p-4`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{text.dateFrom}</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{text.dateTo}</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-white" />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
      </div>

      {/* KPIs workers */}
      <div className="mt-6 grid gap-4 md:gap-5 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label={language === "fr" ? "Total ouvriers" : "Total workers"}
          value={stats.totalWorkers}
          subtitle={language === "fr" ? "Tous statuts" : "All statuses"}
          icon={Users}
          gradient="from-sky-500/10 via-sky-400/20 to-sky-500/40"
        />
        <StatCard
          label={language === "fr" ? "En attente" : "Pending"}
          value={stats.pendingWorkers}
          subtitle={language === "fr" ? "À traiter" : "To review"}
          icon={Clock}
          gradient="from-amber-400/10 via-amber-300/20 to-amber-500/40"
        />
        <StatCard
          label={language === "fr" ? "Validés" : "Approved"}
          value={stats.approvedWorkers}
          subtitle={language === "fr" ? "Actifs" : "Active"}
          icon={CheckCircle2}
          gradient="from-emerald-400/10 via-emerald-300/20 to-emerald-500/40"
        />
        <StatCard
          label={language === "fr" ? "Refusés" : "Rejected"}
          value={stats.rejectedWorkers}
          subtitle={language === "fr" ? "Non retenus" : "Not accepted"}
          icon={XCircle}
          gradient="from-rose-400/10 via-rose-300/20 to-rose-500/40"
        />
        <StatCard
          label={language === "fr" ? "Suspendus" : "Suspended"}
          value={stats.suspendedWorkers}
          subtitle={language === "fr" ? "Masqués" : "Hidden"}
          icon={Ban}
          gradient="from-slate-400/10 via-slate-300/20 to-slate-500/30"
        />
      </div>

      {/* KPIs contacts */}
      <div className="mt-4 grid gap-4 md:gap-5 grid-cols-1 md:grid-cols-3">
        <StatCard
          label={language === "fr" ? "Total demandes" : "Total requests"}
          value={stats.totalContacts}
          subtitle={language === "fr" ? "Contacts reçus" : "Requests received"}
          icon={PhoneCall}
          gradient="from-indigo-500/10 via-indigo-400/20 to-indigo-500/40"
        />
        <StatCard
          label={language === "fr" ? "Aujourd’hui" : "Today"}
          value={stats.contactsToday}
          subtitle={language === "fr" ? "Dernières 24h" : "Last 24h"}
          icon={TrendingUp}
          gradient="from-fuchsia-500/10 via-fuchsia-400/20 to-fuchsia-500/40"
        />
        <StatCard
          label={language === "fr" ? "7 derniers jours" : "Last 7 days"}
          value={stats.contactsLast7}
          subtitle={language === "fr" ? "Semaine" : "Weekly"}
          icon={TrendingUp}
          gradient="from-teal-500/10 via-teal-400/20 to-teal-500/40"
        />
      </div>

      {/* Plans + liens */}
      <div className={`mt-6 ${cardClass} p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4`}>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-800">
            {language === "fr" ? "Répartition des plans" : "Plans distribution"}
          </h2>

          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${planBadgeClass("free")}`}>
              <span>{language === "fr" ? "Gratuit" : "Free"}</span>
              <span className="font-semibold">{stats.planFree}</span>
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${planBadgeClass("monthly")}`}>
              <span>{language === "fr" ? "Mensuel" : "Monthly"}</span>
              <span className="font-semibold">{stats.planMonthly}</span>
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${planBadgeClass("yearly")}`}>
              <span>{language === "fr" ? "Annuel" : "Yearly"}</span>
              <span className="font-semibold">{stats.planYearly}</span>
            </span>
            {stats.planOther > 0 && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${planBadgeClass("other")}`}>
                <span>{language === "fr" ? "Autre" : "Other"}</span>
                <span className="font-semibold">{stats.planOther}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Link to="/admin/ouvriers" className="w-full sm:w-auto">
            <Button size="sm" variant="outline" className="gap-2 w-full sm:w-auto justify-between sm:justify-center">
              {text.goToInscriptions}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/admin/ouvrier-contacts" className="w-full sm:w-auto">
            <Button size="sm" variant="outline" className="gap-2 w-full sm:w-auto justify-between sm:justify-center">
              {text.goToContacts}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Graph + Roadmap */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className={`${cardClass} p-4 sm:p-5`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              {text.chartTitle}
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                {metricMode === "volume" ? (
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {text.metricModeVolume}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    {text.metricModeConversion}
                  </span>
                )}
              </span>
            </h2>

            <div className="flex flex-col sm:items-end gap-2">
              <div className="inline-flex items-center rounded-full bg-slate-100/80 p-1 text-[11px] shadow-inner">
                <button
                  type="button"
                  onClick={() => setChartMode("daily")}
                  className={`px-3 py-1 rounded-full transition ${
                    chartMode === "daily" ? "bg-white shadow text-slate-900 font-medium" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {text.chartModeDaily}
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode("weekly")}
                  className={`px-3 py-1 rounded-full transition ${
                    chartMode === "weekly" ? "bg-white shadow text-slate-900 font-medium" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {text.chartModeWeekly}
                </button>
              </div>

              <div className="inline-flex items-center rounded-full bg-slate-100/80 p-1 text-[11px] shadow-inner">
                <button
                  type="button"
                  onClick={() => setMetricMode("volume")}
                  className={`px-3 py-1 rounded-full transition ${
                    metricMode === "volume"
                      ? "bg-white shadow text-slate-900 font-medium"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {text.metricModeVolume}
                </button>
                <button
                  type="button"
                  onClick={() => setMetricMode("conversion")}
                  className={`px-3 py-1 rounded-full transition ${
                    metricMode === "conversion"
                      ? "bg-white shadow text-slate-900 font-medium"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {text.metricModeConversion}
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            {chartMode === "daily"
              ? metricMode === "volume"
                ? text.chartSubtitleDailyVolume
                : text.chartSubtitleDailyConversion
              : metricMode === "volume"
              ? text.chartSubtitleWeeklyVolume
              : text.chartSubtitleWeeklyConversion}
          </p>

          {/* ✅ scroll horizontal contrôlé si trop serré */}
          <div className="overflow-x-auto">
            <div className="min-w-[520px] h-44 flex items-end gap-2 border-b border-slate-100 pb-3">
              {activeChartData.points.length === 0 ? (
                <div className="text-xs text-slate-400">{text.emptyPeriod}</div>
              ) : (
                activeChartData.points.map((p) => {
                  const height = (p.value / activeChartData.maxValue) * 140;
                  const labelValue = metricMode === "volume" ? p.value : `${Math.round(p.value)}%`;
                  const barClass =
                    metricMode === "volume"
                      ? "bg-gradient-to-t from-sky-200 to-sky-500/70 border-sky-300"
                      : "bg-gradient-to-t from-emerald-200 to-emerald-500/70 border-emerald-300";

                  return (
                    <div key={p.key} className="flex-1 flex flex-col items-center justify-end">
                      <div
                        className={`w-7 rounded-t-lg border flex items-end justify-center ${barClass}`}
                        style={{ height: `${height || 4}px` }}
                      >
                        {p.value > 0 && (
                          <span className="text-[10px] text-white font-semibold mb-1 drop-shadow">{labelValue}</span>
                        )}
                      </div>
                      <div className="mt-1 text-[10px] text-slate-500">{p.label}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className={`${cardClass} p-4 sm:p-5`}>
          <h2 className="text-sm font-semibold text-slate-800 mb-1">
            {language === "fr" ? "Prochains développements mobile" : "Upcoming mobile features"}
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            {language === "fr" ? "Roadmap indicative pour l’app mobile OuvriersPro." : "Indicative roadmap for the OuvriersPro mobile app."}
          </p>

          <ul className="space-y-3 text-xs text-slate-700">
            <li className="flex items-start gap-2">
              <span className="mt-[3px] h-2 w-2 rounded-full bg-emerald-500" />
              <div>
                <span className="font-semibold">
                  {language === "fr" ? "Phase 1 – API / Back-end prêt pour mobile" : "Phase 1 – API / backend ready"}
                </span>
                <div className="text-slate-500">
                  {language === "fr"
                    ? "Réutiliser Supabase + endpoints existants pour une future app React Native / Expo."
                    : "Reuse Supabase + existing endpoints for a future React Native / Expo app."}
                </div>
              </div>
            </li>

            <li className="flex items-start gap-2">
              <span className="mt-[3px] h-2 w-2 rounded-full bg-amber-500" />
              <div>
                <span className="font-semibold">
                  {language === "fr" ? "Phase 2 – App mobile ouvriers" : "Phase 2 – Workers mobile app"}
                </span>
                <div className="text-slate-500">
                  {language === "fr"
                    ? "Gestion profil, abonnement, zones et réponses aux demandes depuis le téléphone."
                    : "Manage profile, subscription, areas and answer requests from mobile."}
                </div>
              </div>
            </li>

            <li className="flex items-start gap-2">
              <span className="mt-[3px] h-2 w-2 rounded-full bg-slate-400" />
              <div>
                <span className="font-semibold">
                  {language === "fr" ? "Phase 3 – App mobile clients" : "Phase 3 – Clients mobile app"}
                </span>
                <div className="text-slate-500">
                  {language === "fr"
                    ? "Recherche, notes, notifications et suivi des interventions."
                    : "Search, ratings, notifications and intervention tracking."}
                </div>
              </div>
            </li>

            <li className="flex items-start gap-2">
              <span className="mt-[3px] h-2 w-2 rounded-full bg-sky-500" />
              <div>
                <span className="font-semibold">
                  {language === "fr" ? "Phase 4 – Stats & reporting mobile" : "Phase 4 – Mobile analytics"}
                </span>
                <div className="text-slate-500">
                  {language === "fr"
                    ? "Dashboards sur mobile pour suivre inscriptions, demandes et revenus d’abonnements."
                    : "Mobile dashboards for registrations, requests and subscription revenue."}
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Listes récentes */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className={`${cardClass} p-4 sm:p-5`}>
          <div className="flex items-center justify-between mb-3 gap-3">
            <h2 className="text-sm font-semibold text-slate-800">{text.recentWorkers}</h2>
            <Link to="/admin/ouvriers" className="text-[11px] text-pro-blue hover:underline whitespace-nowrap">
              {text.viewAll}
            </Link>
          </div>

          {recentWorkers.length === 0 && !loading && (
            <div className="text-sm text-slate-500">
              {language === "fr" ? "Aucune inscription dans la période sélectionnée." : "No registrations in selected period."}
            </div>
          )}

          {loading && <div className="text-sm text-slate-500">{language === "fr" ? "Chargement..." : "Loading..."}</div>}

          {!loading && recentWorkers.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {recentWorkers.map((w) => {
                const fullName = `${w.first_name ?? ""}${w.last_name ? ` ${w.last_name}` : ""}`.trim();
                return (
                  <li key={w.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 text-sm truncate">{fullName || "—"}</div>
                      <div className="text-xs text-slate-500 truncate">{w.profession || ""}</div>
                      <div className="text-xs text-slate-400">{formatDateTime(w.created_at)}</div>
                      <div className="mt-1">
                        <Link to={`/ouvrier/${w.id}`} className="text-[11px] text-pro-blue hover:underline">
                          {language === "fr" ? "Voir la fiche ouvrier" : "Open worker profile"}
                        </Link>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${workerStatusClass(w.status)}`}>
                        {workerStatusLabel(w.status)}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${planBadgeClass(w.plan_code)}`}>
                        {planLabel(w.plan_code, language)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={`${cardClass} p-4 sm:p-5`}>
          <div className="flex items-center justify-between mb-3 gap-3">
            <h2 className="text-sm font-semibold text-slate-800">{text.recentContacts}</h2>
            <Link to="/admin/ouvrier-contacts" className="text-[11px] text-pro-blue hover:underline whitespace-nowrap">
              {text.viewAll}
            </Link>
          </div>

          {recentContacts.length === 0 && !loading && (
            <div className="text-sm text-slate-500">
              {language === "fr" ? "Aucune demande dans la période sélectionnée." : "No requests in selected period."}
            </div>
          )}

          {loading && <div className="text-sm text-slate-500">{language === "fr" ? "Chargement..." : "Loading..."}</div>}

          {!loading && recentContacts.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {recentContacts.map((c) => (
                <li key={c.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 text-sm truncate">{c.worker_name || "—"}</div>
                    <div className="text-xs text-slate-500 truncate">{c.client_name || "—"}</div>
                    <div className="text-xs text-slate-400">
                      {formatDateTime(c.created_at)} • {originLabel(c.origin)}
                    </div>
                    <div className="mt-1">
                      <Link to="/admin/ouvrier-contacts" className="text-[11px] text-pro-blue hover:underline">
                        {language === "fr" ? "Ouvrir dans le back-office" : "Open in back-office"}
                      </Link>
                    </div>
                  </div>

                  <span className="shrink-0 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-slate-50 text-slate-700 border-slate-200">
                    {contactStatusLabel(c.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8" />
    </div>
  );
};

export default AdminDashboard;
