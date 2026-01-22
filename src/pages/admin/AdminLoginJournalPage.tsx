// src/pages/admin/AdminLoginJournalPage.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  X,
  Clock,
  ToggleLeft,
  ToggleRight,
  Zap,
  AlertTriangle,
  User,
  Phone,
  Mail,
  MapPin,
  Shield,
} from "lucide-react";

const TABLE_NAME = "op_login_journal";

type AnyRow = Record<string, any>;

type FiltersState = {
  q: string;
  event: "all" | "login" | "logout" | "refresh";
  success: "all" | "success" | "fail";
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  perPage: number;
};

const DEFAULT_FILTERS: FiltersState = {
  q: "",
  event: "all",
  success: "all",
  from: "",
  to: "",
  perPage: 25,
};

type PersonDetails = {
  full_name: string | null;
  phone: string | null;
  email: string | null;
  id: string | null;
  user_id: string | null;
  source:
    | "op_users(id)"
    | "op_users(user_id)"
    | "profiles(id)"
    | "op_users(email)"
    | "op_users(auth_user_id)"
    | "profiles(user_id)"
    | "none";
  debug?: { tried?: string[]; lastError?: any };
};

function toIsoStartOfDay(dateYYYYMMDD: string) {
  if (!dateYYYYMMDD) return null;
  const d = new Date(`${dateYYYYMMDD}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function toIsoEndOfDay(dateYYYYMMDD: string) {
  if (!dateYYYYMMDD) return null;
  const d = new Date(`${dateYYYYMMDD}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function fmtDate(ts?: string | null) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
function truncate(s: string, n = 48) {
  if (!s) return "";
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
function pickStr(row: AnyRow, keys: string[]) {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}
function pickBool(row: AnyRow, keys: string[]) {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === "boolean") return v;
  }
  return null;
}
function pickTs(row: AnyRow, keys: string[]) {
  for (const k of keys) {
    const v = row?.[k];
    if (typeof v === "string" && v.includes("T")) return v;
  }
  return null;
}
function pickMetaUserId(meta: any): string | null {
  if (!meta || typeof meta !== "object") return null;
  const direct = meta.user_id ?? meta.userId ?? meta.uid ?? meta.auth_user_id ?? meta.authUserId ?? null;
  return typeof direct === "string" && direct.trim() ? direct.trim() : null;
}
function pickGeo(meta: any): any | null {
  if (!meta || typeof meta !== "object") return null;
  const g = meta.geo ?? null;
  return g && typeof g === "object" ? g : null;
}

/** ---- Robust profile fetch (évite les 400 "Bad Request" si colonnes absentes) ---- */

function normalizeFullName(obj: AnyRow): string | null {
  const direct =
    pickStr(obj, ["full_name", "fullname", "name", "display_name", "displayName"]) ||
    [pickStr(obj, ["first_name", "firstname", "firstName"]), pickStr(obj, ["last_name", "lastname", "lastName"])]
      .filter(Boolean)
      .join(" ");
  return direct?.trim() ? direct.trim() : null;
}

function normalizePhone(obj: AnyRow): string | null {
  const p = pickStr(obj, ["phone", "phone_number", "mobile", "tel", "telephone", "whatsapp"]);
  return p?.trim() ? p.trim() : null;
}

function normalizeEmail(obj: AnyRow, fallback?: string | null): string | null {
  const e = pickStr(obj, ["email", "mail"]);
  return e?.trim() ? e.trim() : fallback ?? null;
}

function isColumnError(err: any) {
  // Supabase PostgREST renvoie souvent 400 + message "column ... does not exist"
  const msg = String(err?.message ?? err?.details ?? err?.hint ?? "").toLowerCase();
  return msg.includes("column") && msg.includes("does not exist");
}

/**
 * Tente une requête op_users avec plusieurs variantes de SELECT,
 * pour éviter de casser si certaines colonnes n'existent pas (=> 400).
 */
async function tryQueryOpUsers(params: {
  filterKey: string;
  filterVal: string;
  emailFallback?: string | null;
  selectVariants: string[];
}) {
  const tried: string[] = [];
  let lastError: any = null;

  for (const sel of params.selectVariants) {
    tried.push(`${params.filterKey}=${params.filterVal} | select=${sel}`);
    const res = await supabase.from("op_users").select(sel).eq(params.filterKey as any, params.filterVal).maybeSingle();
    if (!res.error && res.data) {
      const d = res.data as AnyRow;
      return {
        ok: true as const,
        data: {
          id: (d.id ?? null) as string | null,
          user_id: (d.user_id ?? d.auth_user_id ?? params.filterVal ?? null) as string | null,
          full_name: normalizeFullName(d),
          phone: normalizePhone(d),
          email: normalizeEmail(d, params.emailFallback ?? null),
        },
        debug: { tried },
      };
    }
    lastError = res.error;

    // Si c’est une erreur "colonne inexistante", on tente le variant suivant.
    // Si c’est RLS/permission ou autre, on peut aussi tenter le suivant (souvent utile),
    // mais on garde l’erreur pour l’affichage.
    continue;
  }

  return { ok: false as const, error: lastError, debug: { tried, lastError } };
}

/**
 * Tente profiles (si existe) avec variantes de SELECT.
 */
async function tryQueryProfiles(params: {
  filterKey: string;
  filterVal: string;
  emailFallback?: string | null;
  selectVariants: string[];
}) {
  const tried: string[] = [];
  let lastError: any = null;

  for (const sel of params.selectVariants) {
    tried.push(`${params.filterKey}=${params.filterVal} | select=${sel}`);
    const res = await supabase.from("profiles").select(sel).eq(params.filterKey as any, params.filterVal).maybeSingle();
    if (!res.error && res.data) {
      const d = res.data as AnyRow;
      return {
        ok: true as const,
        data: {
          id: (d.id ?? null) as string | null,
          user_id: (d.user_id ?? params.filterVal ?? null) as string | null,
          full_name: normalizeFullName(d),
          phone: normalizePhone(d),
          email: normalizeEmail(d, params.emailFallback ?? null),
        },
        debug: { tried },
      };
    }
    lastError = res.error;
    continue;
  }

  return { ok: false as const, error: lastError, debug: { tried, lastError } };
}

/**
 * Récupère des infos utilisateur à partir de meta.user_id.
 * Ordre (robuste):
 * 1) op_users.id == userId
 * 2) op_users.user_id == userId
 * 3) op_users.auth_user_id == userId (si votre schéma utilise ce champ)
 * 4) profiles.id == userId
 * 5) profiles.user_id == userId (si votre schéma utilise ce champ)
 * 6) fallback op_users.email == email (UNIQUEMENT si colonne email existe; on le détecte via variantes)
 */
async function fetchPersonDetails(row: AnyRow): Promise<PersonDetails> {
  const meta = row?.meta ?? null;
  const userId = pickMetaUserId(meta);
  const email = (typeof row?.email === "string" ? row.email : null) ?? null;

  const empty: PersonDetails = {
    full_name: null,
    phone: null,
    email,
    id: null,
    user_id: userId,
    source: "none",
  };

  // Variantes minimalistes pour éviter 400 si colonnes absentes
  const OP_SELECTS = [
    // plus riche
    "id,user_id,auth_user_id,full_name,first_name,last_name,phone,phone_number,mobile,telephone,tel,email,mail",
    // standard
    "id,user_id,full_name,phone,email",
    // sans email
    "id,user_id,full_name,phone",
    // schémas alternatifs
    "id,auth_user_id,full_name,phone",
    "id,name,phone",
    "id,display_name,phone",
  ];

  const PROFILES_SELECTS = [
    "id,user_id,full_name,first_name,last_name,phone,phone_number,mobile,telephone,tel,email,mail",
    "id,full_name,phone",
    "id,user_id,full_name,phone",
    "id,name,phone",
    "id,display_name,phone",
  ];

  // 1) op_users via id
  if (userId) {
    const a = await tryQueryOpUsers({
      filterKey: "id",
      filterVal: userId,
      emailFallback: email,
      selectVariants: OP_SELECTS,
    });

    if (a.ok) {
      return {
        ...a.data,
        source: "op_users(id)",
        debug: a.debug,
      };
    }
  }

  // 2) op_users via user_id
  if (userId) {
    const b = await tryQueryOpUsers({
      filterKey: "user_id",
      filterVal: userId,
      emailFallback: email,
      selectVariants: OP_SELECTS,
    });

    if (b.ok) {
      return {
        ...b.data,
        source: "op_users(user_id)",
        debug: b.debug,
      };
    }
  }

  // 3) op_users via auth_user_id (si présent)
  if (userId) {
    const b2 = await tryQueryOpUsers({
      filterKey: "auth_user_id",
      filterVal: userId,
      emailFallback: email,
      selectVariants: OP_SELECTS,
    });

    if (b2.ok) {
      return {
        ...b2.data,
        source: "op_users(auth_user_id)",
        debug: b2.debug,
      };
    }
  }

  // 4) profiles via id
  if (userId) {
    const c = await tryQueryProfiles({
      filterKey: "id",
      filterVal: userId,
      emailFallback: email,
      selectVariants: PROFILES_SELECTS,
    });

    if (c.ok) {
      return {
        ...c.data,
        source: "profiles(id)",
        debug: c.debug,
      };
    }
  }

  // 5) profiles via user_id
  if (userId) {
    const c2 = await tryQueryProfiles({
      filterKey: "user_id",
      filterVal: userId,
      emailFallback: email,
      selectVariants: PROFILES_SELECTS,
    });

    if (c2.ok) {
      return {
        ...c2.data,
        source: "profiles(user_id)",
        debug: c2.debug,
      };
    }
  }

  // 6) fallback via email (attention: si la colonne email n'existe pas => 400; nos variantes gèrent ça)
  if (email) {
    const d = await tryQueryOpUsers({
      filterKey: "email",
      filterVal: email,
      emailFallback: email,
      selectVariants: OP_SELECTS,
    });

    if (d.ok) {
      return {
        ...d.data,
        source: "op_users(email)",
        debug: d.debug,
      };
    }

    // Si c'est une erreur de colonne absente, on ne "toast" pas comme un accès bloqué.
    // (ex: vous n’avez pas de colonne email sur op_users)
    // On laisse tomber silencieusement.
    if (d.error && !isColumnError(d.error)) {
      // autre erreur (RLS, permission, etc.) => on la garde en debug
      return {
        ...empty,
        source: "none",
        debug: d.debug,
      };
    }
  }

  return empty;
}

/**
 * Bouton "Ping Log" pour tester la chaîne Edge Function → RPC → DB
 */
function PingLogButton({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ ok: boolean; data?: any; error?: any } | null>(null);

  const handlePing = async () => {
    setLoading(true);
    setLastResult(null);

    const payload = {
      event: "login",
      success: true,
      email: `ping-${Date.now()}@admin.test`,
      source: "web",
      meta: {
        note: "admin-ping-test",
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
      },
    };

    console.log("[PingLog] Sending payload:", payload);

    try {
      const { data, error } = await supabase.functions.invoke("log-login", { body: payload });

      console.log("[PingLog] Response:", { data, error });

      if (error) {
        const errDetails = {
          message: error.message ?? String(error),
          name: (error as any).name ?? "Unknown",
          details: (error as any).details ?? null,
          hint: (error as any).hint ?? null,
          status: (error as any).status ?? null,
        };
        console.error("[PingLog] Error details:", errDetails);
        setLastResult({ ok: false, error: errDetails });
        toast({ title: "Erreur Ping Log", description: `${errDetails.message}`, variant: "destructive" });
      } else {
        setLastResult({ ok: true, data });
        toast({ title: "Ping Log réussi ✓", description: `ID: ${data?.id ?? "—"} | Email: ${payload.email}` });
        onSuccess?.();
      }
    } catch (e: any) {
      console.error("[PingLog] Exception:", e);
      const errDetails = { message: e?.message ?? String(e), name: e?.name ?? "Exception", stack: e?.stack ?? null };
      setLastResult({ ok: false, error: errDetails });
      toast({ title: "Exception Ping Log", description: errDetails.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="default"
        className="gap-2 bg-amber-600 hover:bg-amber-700"
        onClick={handlePing}
        disabled={loading}
        title="Tester l'envoi vers log-login"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        Ping Log
      </Button>

      {lastResult && (
        <div
          className={`text-xs px-2 py-1 rounded ${
            lastResult.ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}
        >
          {lastResult.ok ? (
            <span>✓ OK: {lastResult.data?.id ?? "created"}</span>
          ) : (
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {lastResult.error?.message ?? "Erreur"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminLoginJournalPage() {
  const { toast } = useToast();

  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AnyRow | null>(null);

  // ✅ détails utilisateur (Nom, téléphone, etc.)
  const [personLoading, setPersonLoading] = useState(false);
  const [person, setPerson] = useState<PersonDetails | null>(null);

  // Auto refresh
  const [auto, setAuto] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [lastTopId, setLastTopId] = useState<string | null>(null);

  const perPage = filters.perPage;
  const fromIdx = (page - 1) * perPage;
  const toIdx = fromIdx + perPage - 1;

  const totalPages = useMemo(() => {
    if (!total) return 1;
    return Math.max(1, Math.ceil(total / perPage));
  }, [total, perPage]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.q, filters.event, filters.success, filters.from, filters.to, filters.perPage]);

  const buildQuery = useCallback(() => {
    let q = supabase.from(TABLE_NAME).select("*", { count: "exact" });

    if (filters.event !== "all") q = q.eq("event", filters.event);
    if (filters.success !== "all") q = q.eq("success", filters.success === "success");

    const isoFrom = toIsoStartOfDay(filters.from);
    const isoTo = toIsoEndOfDay(filters.to);
    if (isoFrom) q = q.gte("created_at", isoFrom);
    if (isoTo) q = q.lte("created_at", isoTo);

    const raw = filters.q.trim();
    if (raw) {
      const like = `%${raw.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      q = q.or(
        [
          `email.ilike.${like}`,
          `ip.ilike.${like}`,
          `country.ilike.${like}`,
          `region.ilike.${like}`,
          `city.ilike.${like}`,
          `meta::text.ilike.${like}`,
          `user_agent.ilike.${like}`,
        ].join(",")
      );
    }

    q = q.order("created_at", { ascending: false }).range(fromIdx, toIdx);
    return q;
  }, [filters, fromIdx, toIdx]);

  const fetchData = useCallback(
    async (opts?: { silent?: boolean }) => {
      setError(null);
      if (!opts?.silent) setLoading(true);

      try {
        const q = buildQuery();
        const { data, error, count } = await q;
        if (error) throw error;

        const list = (data ?? []) as AnyRow[];
        setRows(list);
        setTotal(typeof count === "number" ? count : 0);
        setLastFetchedAt(Date.now());

        const topId = list?.[0]?.id ? String(list[0].id) : null;
        if (topId && topId !== lastTopId) setLastTopId(topId);
      } catch (e: any) {
        const msg = e?.message ?? "Impossible de charger le journal de connexion.";
        setRows([]);
        setTotal(0);
        setError(msg);
        toast({ title: "Erreur", description: msg, variant: "destructive" });
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [buildQuery, toast, lastTopId]
  );

  // Initial load + when page changes
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // When filters change
  useEffect(() => {
    fetchData({ silent: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.event, filters.success, filters.from, filters.to, filters.perPage]);

  // Auto refresh polling
  useEffect(() => {
    if (!auto) return;
    const t = window.setInterval(() => {
      fetchData({ silent: true });
    }, 5000);
    return () => window.clearInterval(t);
  }, [auto, fetchData]);

  const openDetails = async (r: AnyRow) => {
    setSelected(r);
    setOpen(true);

    setPerson(null);
    setPersonLoading(true);

    try {
      const d = await fetchPersonDetails(r);
      setPerson(d);

      // Toast uniquement si on a un user_id mais aucun profil trouvé
      const metaUserId = pickMetaUserId(r?.meta);
      const hasAny = !!(d?.full_name || d?.phone);
      if (metaUserId && !hasAny) {
        toast({
          title: "Profil non récupéré",
          description:
            "Aucun profil trouvé (ou accès bloqué). Vérifie que op_users/profiles contiennent bien full_name/phone, que le lien avec auth.users utilise user_id/auth_user_id, et que la RLS autorise l’admin à lire ces tables.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      console.warn("[AdminLoginJournalPage] fetchPersonDetails error:", e);
      setPerson({
        full_name: null,
        phone: null,
        email: (typeof r?.email === "string" ? r.email : null) ?? null,
        id: null,
        user_id: pickMetaUserId(r?.meta),
        source: "none",
        debug: { lastError: e },
      });
      toast({
        title: "Profil non récupéré",
        description: "Erreur lors de la récupération du profil (RLS/table/colonnes).",
        variant: "destructive",
      });
    } finally {
      setPersonLoading(false);
    }
  };

  const closeDetails = () => {
    setOpen(false);
    setSelected(null);
    setPerson(null);
    setPersonLoading(false);
  };

  const prettyRow = useMemo(() => {
    if (!selected) return null;

    const createdAt = pickTs(selected, ["created_at"]);
    const event = pickStr(selected, ["event"]);
    const success = pickBool(selected, ["success"]);
    const email = pickStr(selected, ["email"]);
    const ip = pickStr(selected, ["ip"]);
    const country = pickStr(selected, ["country"]);
    const region = pickStr(selected, ["region"]);
    const city = pickStr(selected, ["city"]);
    const source = pickStr(selected, ["source"]);
    const ua = pickStr(selected, ["user_agent"]);
    const meta = selected?.meta ?? null;

    const metaUserId = pickMetaUserId(meta);
    const geo = pickGeo(meta);

    // Location display priority: DB columns -> meta.geo
    const locCity = city || (typeof geo?.city === "string" ? geo.city : "");
    const locRegion = region || (typeof geo?.region === "string" ? geo.region : "");
    const locCountry =
      country ||
      (typeof geo?.country === "string" ? geo.country : "") ||
      (typeof geo?.country_code === "string" ? geo.country_code : "");

    const lat = typeof selected?.lat === "number" ? selected.lat : typeof geo?.lat === "number" ? geo.lat : null;
    const lng = typeof selected?.lng === "number" ? selected.lng : typeof geo?.lng === "number" ? geo.lng : null;

    const isp = typeof geo?.isp === "string" ? geo.isp : null;
    const timezone = typeof geo?.timezone === "string" ? geo.timezone : null;

    return {
      createdAt,
      event,
      success,
      email,
      ip,
      country: locCountry || country,
      region: locRegion || region,
      city: locCity || city,
      source,
      ua,
      metaUserId,
      meta,
      geo,
      lat,
      lng,
      isp,
      timezone,
      raw: selected,
    };
  }, [selected]);

  const locationLabel = useMemo(() => {
    if (!prettyRow) return "—";
    const parts = [prettyRow.city, prettyRow.region, prettyRow.country].filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  }, [prettyRow]);

  return (
    <div className="space-y-5">
      <Card className="border-slate-200">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">Journal de connexions</CardTitle>
            <div className="mt-1 text-xs text-slate-500">
              Historique des connexions / déconnexions (visible uniquement côté admin).
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {lastFetchedAt ? `Dernière mise à jour: ${new Date(lastFetchedAt).toLocaleTimeString("fr-FR")}` : "—"}
              </span>
              <span>•</span>
              <span>
                Table: <span className="font-medium text-slate-700">{TABLE_NAME}</span>
              </span>
              {auto ? (
                <span className="inline-flex items-center gap-1">
                  <ToggleRight className="h-3.5 w-3.5" /> Auto: ON
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <ToggleLeft className="h-3.5 w-3.5" /> Auto: OFF
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PingLogButton onSuccess={() => fetchData({ silent: false })} />

            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setAuto((v) => !v)}
              disabled={loading}
              title="Auto refresh"
            >
              {auto ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
              Auto
            </Button>

            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => fetchData({ silent: false })}
              disabled={loading}
              title="Rafraîchir"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Rafraîchir
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-4">
              <label className="text-xs font-medium text-slate-600">Recherche</label>
              <div className="mt-1 relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Email, IP, user-agent, user_id (meta)…"
                  value={filters.q}
                  onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-slate-600">Événement</label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={filters.event}
                onChange={(e) => setFilters((p) => ({ ...p, event: e.target.value as any }))}
              >
                <option value="all">Tous</option>
                <option value="login">login</option>
                <option value="logout">logout</option>
                <option value="refresh">refresh</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-slate-600">Statut</label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={filters.success}
                onChange={(e) => setFilters((p) => ({ ...p, success: e.target.value as any }))}
              >
                <option value="all">Tous</option>
                <option value="success">Succès</option>
                <option value="fail">Échec</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-slate-600">Du</label>
              <Input className="mt-1" type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} />
            </div>

            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-slate-600">Au</label>
              <Input className="mt-1" type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} />
            </div>

            <div className="lg:col-span-12 flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                <Filter className="h-4 w-4" />
                <span>
                  {total.toLocaleString("fr-FR")} entrée{total > 1 ? "s" : ""} • Page {page} / {totalPages}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={filters.perPage}
                  onChange={(e) => setFilters((p) => ({ ...p, perPage: Number(e.target.value) }))}
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>

                <Button type="button" variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)} disabled={loading} className="gap-2">
                  <X className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Error / Empty */}
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          {!error && !loading && rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Aucune entrée trouvée avec ces filtres.
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="text-left">
                  <th className="px-4 py-3 whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 whitespace-nowrap">Événement</th>
                  <th className="px-4 py-3 whitespace-nowrap">Statut</th>
                  <th className="px-4 py-3 whitespace-nowrap">Utilisateur</th>
                  <th className="px-4 py-3 whitespace-nowrap">IP</th>
                  <th className="px-4 py-3 whitespace-nowrap">Localisation</th>
                  <th className="px-4 py-3 whitespace-nowrap">Source</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Détails</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => {
                  const createdAt = pickTs(r, ["created_at"]);
                  const event = pickStr(r, ["event"]) || "—";
                  const success = pickBool(r, ["success"]);
                  const email = pickStr(r, ["email"]);
                  const ip = pickStr(r, ["ip"]);
                  const country = pickStr(r, ["country"]);
                  const region = pickStr(r, ["region"]);
                  const city = pickStr(r, ["city"]);
                  const source = pickStr(r, ["source"]) || "—";

                  const geo = pickGeo(r?.meta);
                  const locCity = city || (typeof geo?.city === "string" ? geo.city : "");
                  const locRegion = region || (typeof geo?.region === "string" ? geo.region : "");
                  const locCountry =
                    country ||
                    (typeof geo?.country === "string" ? geo.country : "") ||
                    (typeof geo?.country_code === "string" ? geo.country_code : "");

                  const loc = [locCity, locRegion, locCountry].filter(Boolean).join(", ") || "—";
                  const ok = success === null ? null : !!success;

                  return (
                    <tr key={(r?.id as string) ?? `${idx}`} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">{fmtDate(createdAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium text-slate-800">{event}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {ok === null ? (
                          <span className="text-slate-500">—</span>
                        ) : ok ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">Succès</Badge>
                        ) : (
                          <Badge variant="destructive">Échec</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700" title={email}>
                        {truncate(email || "—", 28)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700" title={ip}>
                        {truncate(ip || "—", 22)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600" title={loc}>
                        {truncate(loc, 28)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{truncate(source, 18)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => openDetails(r)}>
                          <Eye className="h-4 w-4" />
                          Voir
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {loading ? (
              <div className="p-4 text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement…
              </div>
            ) : null}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              Affichage{" "}
              <span className="font-medium text-slate-700">
                {total === 0 ? 0 : fromIdx + 1}–{Math.min(toIdx + 1, total)}
              </span>{" "}
              sur <span className="font-medium text-slate-700">{total.toLocaleString("fr-FR")}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setPage(1)} disabled={loading || page === 1}>
                Début
              </Button>

              <Button type="button" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={loading || page <= 1}>
                Précédent
              </Button>

              <div className="text-xs text-slate-600 px-2">
                Page <span className="font-medium">{page}</span> / <span className="font-medium">{totalPages}</span>
              </div>

              <Button type="button" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={loading || page >= totalPages}>
                Suivant
              </Button>

              <Button type="button" variant="outline" onClick={() => setPage(totalPages)} disabled={loading || page === totalPages}>
                Fin
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDetails())}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Détails de la connexion</DialogTitle>
          </DialogHeader>

          {!prettyRow ? (
            <div className="text-sm text-slate-500">Aucun détail.</div>
          ) : (
            <div className="space-y-4">
              {/* Bloc Identité */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Utilisateur</div>
                      <div className="font-semibold text-slate-900">
                        {personLoading ? "Chargement…" : person?.full_name || "Nom non disponible"}
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />{" "}
                          {personLoading ? "…" : person?.email || prettyRow.email || "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />{" "}
                          {personLoading ? "…" : person?.phone || "Téléphone non disponible"}
                        </span>
                      </div>

                      {prettyRow.metaUserId ? (
                        <div className="mt-1 text-[11px] text-slate-500 break-all">
                          user_id (meta): <span className="font-medium text-slate-700">{prettyRow.metaUserId}</span>
                          {person?.source && person.source !== "none" ? (
                            <span className="ml-2 text-slate-400">• source profil: {person.source}</span>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-1 text-[11px] text-slate-500 break-all">
                          user_id (meta): <span className="text-slate-400">non présent</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-500">Statut</div>
                    <div className="mt-1">
                      {prettyRow.success === null ? (
                        <span className="text-slate-500">—</span>
                      ) : prettyRow.success ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">Succès</Badge>
                      ) : (
                        <Badge variant="destructive">Échec</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Infos Connexion */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-xs text-slate-500">Date</div>
                  <div className="font-medium text-slate-900">{fmtDate(prettyRow.createdAt)}</div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-xs text-slate-500">Événement</div>
                  <div className="font-medium text-slate-900">{prettyRow.event || "—"}</div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-xs text-slate-500">IP</div>
                  <div className="font-medium text-slate-900 break-all">{prettyRow.ip || "Non disponible"}</div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Localisation
                  </div>
                  <div className="font-medium text-slate-900">{locationLabel || "Non disponible"}</div>

                  <div className="mt-1 text-xs text-slate-500">
                    {prettyRow.lat != null && prettyRow.lng != null ? (
                      <span>
                        Coordonnées:{" "}
                        <span className="font-medium text-slate-700">
                          {prettyRow.lat.toFixed(5)}, {prettyRow.lng.toFixed(5)}
                        </span>
                      </span>
                    ) : (
                      <span>Coordonnées: —</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 md:col-span-2">
                  <div className="text-xs text-slate-500">User-Agent</div>
                  <div className="font-medium text-slate-900 break-all">{prettyRow.ua || "—"}</div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-xs text-slate-500">Source</div>
                  <div className="font-medium text-slate-900">{prettyRow.source || "—"}</div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5" />
                    GeoIP (meta.geo)
                  </div>
                  <div className="text-xs text-slate-600">
                    <div>
                      FAI/ISP: <span className="font-medium text-slate-800">{prettyRow.isp || "—"}</span>
                    </div>
                    <div>
                      Timezone: <span className="font-medium text-slate-800">{prettyRow.timezone || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <details className="rounded-xl border border-slate-200 bg-white">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-800">
                  Détails techniques (JSON)
                </summary>
                <div className="px-4 pb-4">
                  <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-[40vh]">
                    {JSON.stringify(
                      {
                        row: prettyRow.raw,
                        person,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </details>

              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={closeDetails}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
