// src/pages/admin/AdminLoginJournalPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Info,
  User,
  ShieldCheck,
  Globe,
  Laptop,
  Hash,
  ChevronDown,
} from "lucide-react";

const TABLE_NAME = "op_login_journal";

type AnyRow = Record<string, any>;

type FiltersState = {
  q: string;
  event: "all" | "login" | "logout" | "refresh";
  success: "all" | "success" | "fail";
  from: string;
  to: string;
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
    if (typeof v === "string" && (v.includes("T") || v.includes(":"))) return v;
  }
  return null;
}
function truncate(s: string, n = 48) {
  if (!s) return "";
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
function safeJson(val: any) {
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val ?? "");
  }
}

function StatusBadge({ ok }: { ok: boolean | null }) {
  if (ok === null) return <Badge variant="secondary">—</Badge>;
  if (ok) return <Badge className="bg-emerald-600 hover:bg-emerald-600">Succès</Badge>;
  return <Badge variant="destructive">Échec</Badge>;
}

function EventBadge({ event }: { event: string }) {
  const e = (event || "").toLowerCase();
  const cls =
    e === "login"
      ? "bg-blue-600 hover:bg-blue-600"
      : e === "logout"
      ? "bg-slate-700 hover:bg-slate-700"
      : e === "refresh"
      ? "bg-amber-600 hover:bg-amber-600"
      : "bg-slate-500 hover:bg-slate-500";
  return <Badge className={cls}>{event || "—"}</Badge>;
}

function NiceKV({
  icon,
  label,
  value,
  hint,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {icon ? <span className="text-slate-400">{icon}</span> : null}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium text-slate-900 break-words">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

type Enrichment = {
  loading: boolean;
  role?: string | null;
  profileType?: "client" | "worker" | "unknown";
  client?: AnyRow | null;
  worker?: AnyRow | null;
  opUser?: AnyRow | null;
};

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
  const [enrich, setEnrich] = useState<Enrichment>({ loading: false });

  const [showTech, setShowTech] = useState(false);

  const debounceRef = useRef<number | null>(null);

  const perPage = filters.perPage;
  const fromIdx = (page - 1) * perPage;
  const toIdx = fromIdx + perPage - 1;

  const totalPages = useMemo(() => {
    if (!total) return 1;
    return Math.max(1, Math.ceil(total / perPage));
  }, [total, perPage]);

  useEffect(() => {
    setPage(1);
  }, [filters.q, filters.event, filters.success, filters.from, filters.to, filters.perPage]);

  const buildQuery = () => {
    let q = supabase.from(TABLE_NAME).select("*", { count: "exact" });

    if (filters.event !== "all") q = q.eq("event", filters.event);

    if (filters.success !== "all") {
      const val = filters.success === "success";
      q = q.eq("success", val);
    }

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
          `user_id::text.ilike.${like}`,
          `ip.ilike.${like}`,
          `user_agent.ilike.${like}`,
          `country.ilike.${like}`,
          `region.ilike.${like}`,
          `city.ilike.${like}`,
          `source.ilike.${like}`,
        ].join(",")
      );
    }

    q = q.order("created_at", { ascending: false }).range(fromIdx, toIdx);
    return q;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = buildQuery();
      const { data, error, count } = await q;
      if (error) throw error;

      setRows((data ?? []) as AnyRow[]);
      setTotal(typeof count === "number" ? count : 0);
    } catch (e: any) {
      console.error(e);
      setRows([]);
      setTotal(0);

      const msg = e?.message ?? "Impossible de charger le journal de connexion.";
      setError(msg);

      toast({
        title: "Erreur",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      fetchData();
    }, 350);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.event, filters.success, filters.from, filters.to, filters.perPage]);

  const closeDetails = () => {
    setOpen(false);
    setSelected(null);
    setEnrich({ loading: false });
    setShowTech(false);
  };

  const openDetails = async (r: AnyRow) => {
    setSelected(r);
    setOpen(true);
    setShowTech(false);

    const userId = pickStr(r, ["user_id"]);
    if (!userId) {
      setEnrich({ loading: false, profileType: "unknown" });
      return;
    }

    setEnrich({ loading: true });

    try {
      const [opUserRes, clientRes, workerRes] = await Promise.all([
        supabase.from("op_users").select("*").eq("id", userId).maybeSingle(),
        supabase.from("op_clients").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("op_ouvriers").select("*").eq("user_id", userId).maybeSingle(),
      ]);

      const opUser = opUserRes.data ?? null;
      const client = clientRes.data ?? null;
      const worker = workerRes.data ?? null;

      const role = (opUser as any)?.role ?? null;

      const profileType: Enrichment["profileType"] = client
        ? "client"
        : worker
        ? "worker"
        : "unknown";

      setEnrich({
        loading: false,
        role,
        profileType,
        client,
        worker,
        opUser,
      });
    } catch {
      setEnrich({ loading: false, profileType: "unknown" });
    }
  };

  const prettyRow = useMemo(() => {
    if (!selected) return null;

    const createdAt = pickTs(selected, ["created_at"]);
    const event = pickStr(selected, ["event"]);
    const success = pickBool(selected, ["success"]);
    const userId = pickStr(selected, ["user_id"]);
    const email = pickStr(selected, ["email"]);
    const ip = pickStr(selected, ["ip"]);
    const source = pickStr(selected, ["source"]);
    const ua = pickStr(selected, ["user_agent"]);

    const country = pickStr(selected, ["country"]);
    const region = pickStr(selected, ["region"]);
    const city = pickStr(selected, ["city"]);
    const lat = selected?.lat ?? null;
    const lng = selected?.lng ?? null;

    const meta = selected?.meta ?? null;

    return {
      createdAt,
      event,
      success,
      userId,
      email,
      ip,
      source,
      ua,
      country,
      region,
      city,
      lat,
      lng,
      meta,
      raw: selected,
    };
  }, [selected]);

  const ipMissing = useMemo(() => {
    const sample = rows.slice(0, 20);
    if (sample.length === 0) return false;
    const missing = sample.filter((r) => !pickStr(r, ["ip"])).length;
    return missing / sample.length > 0.6;
  }, [rows]);

  const identity = useMemo(() => {
    // unifie un affichage "pro" (nom, phone, etc.)
    const opu = enrich.opUser ?? null;
    const cli = enrich.client ?? null;
    const wor = enrich.worker ?? null;

    const role = enrich.role ?? null;

    const fullName =
      pickStr(opu, ["full_name", "name"]) ||
      pickStr(cli, ["first_name", "last_name"]) ||
      pickStr(wor, ["full_name", "name"]) ||
      "";

    const phone =
      pickStr(opu, ["phone"]) || pickStr(cli, ["phone"]) || pickStr(wor, ["phone"]) || "";

    const country =
      pickStr(opu, ["country"]) || pickStr(cli, ["country"]) || pickStr(wor, ["country"]) || "";

    const city = pickStr(cli, ["city"]) || pickStr(wor, ["city"]) || "";

    return { role, fullName, phone, country, city, opu, cli, wor };
  }, [enrich]);

  return (
    <div className="space-y-5">
      <Card className="border-slate-200">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">Journal de connexions</CardTitle>
            <div className="mt-1 text-xs text-slate-500">
              Historique des connexions / déconnexions (visible uniquement côté admin).
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500">
              Table: <span className="font-medium text-slate-700">{TABLE_NAME}</span>
            </div>

            <Button type="button" variant="outline" className="gap-2" onClick={() => fetchData()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Rafraîchir
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {ipMissing && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex gap-2">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">IP / Localisation non disponibles</div>
                <div className="text-xs mt-1 text-amber-800/90">
                  Ton log est écrit côté navigateur, donc l’IP et la géolocalisation IP ne remontent pas. Pour obtenir ces
                  champs, il faudra logger via une Edge Function (serveur) qui lit les headers.
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-4">
              <label className="text-xs font-medium text-slate-600">Recherche</label>
              <div className="mt-1 relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Email, user_id, IP, user-agent…"
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
                  const userId = pickStr(r, ["user_id"]);
                  const email = pickStr(r, ["email"]);
                  const ip = pickStr(r, ["ip"]);

                  const country = pickStr(r, ["country"]);
                  const region = pickStr(r, ["region"]);
                  const city = pickStr(r, ["city"]);

                  const source = pickStr(r, ["source"]) || "—";

                  const userLabel = email ? truncate(email, 30) : userId ? truncate(userId, 28) : "—";
                  const loc = [city, region, country].filter(Boolean).join(", ") || "—";

                  return (
                    <tr key={(r?.id as string) ?? `${idx}`} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">{fmtDate(createdAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <EventBadge event={event} />
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge ok={success === null ? null : !!success} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700" title={email || userId || ""}>
                        {userLabel}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700" title={ip || ""}>
                        {ip ? truncate(ip, 22) : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600" title={loc}>
                        {truncate(loc, 40)}
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
              <Button type="button" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={loading || page <= 1}>
                Précédent
              </Button>

              <div className="text-xs text-slate-600 px-2">
                Page <span className="font-medium">{page}</span> / <span className="font-medium">{totalPages}</span>
              </div>

              <Button type="button" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={loading || page >= totalPages}>
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ✅ DIALOG “PROPRE” */}
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDetails())}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          {!prettyRow ? null : (
            <>
              {/* Header */}
              <DialogHeader className="px-6 py-4 border-b bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <DialogTitle className="text-base sm:text-lg">Détails de la connexion</DialogTitle>
                    <div className="mt-1 text-xs text-slate-500">
                      {fmtDate(prettyRow.createdAt)} • {prettyRow.email || truncate(prettyRow.userId || "", 28) || "—"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <EventBadge event={prettyRow.event || "—"} />
                    <StatusBadge ok={prettyRow.success === null ? null : !!prettyRow.success} />
                  </div>
                </div>
              </DialogHeader>

              <div className="px-6 py-5 bg-slate-50">
                {/* 2 colonnes pro */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Connexion */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Connexion
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <NiceKV
                        icon={<Globe className="h-4 w-4" />}
                        label="IP"
                        value={prettyRow.ip || "Non disponible"}
                        hint={!prettyRow.ip ? "Le navigateur ne fournit pas l’IP publique. Utilise une Edge Function pour la capturer." : undefined}
                      />
                      <NiceKV
                        icon={<Globe className="h-4 w-4" />}
                        label="Localisation"
                        value={[prettyRow.city, prettyRow.region, prettyRow.country].filter(Boolean).join(", ") || "Non disponible"}
                        hint={
                          !prettyRow.country && !prettyRow.city
                            ? "La géolocalisation IP est calculée côté serveur (headers CDN)."
                            : undefined
                        }
                      />

                      <NiceKV
                        icon={<Hash className="h-4 w-4" />}
                        label="Source"
                        value={prettyRow.source || "—"}
                      />
                      <NiceKV
                        icon={<Laptop className="h-4 w-4" />}
                        label="Appareil / Navigateur"
                        value={prettyRow.ua ? truncate(prettyRow.ua, 80) : "—"}
                        hint={prettyRow.ua ? "User-Agent" : undefined}
                      />
                    </div>

                    {/* Meta clean */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-medium text-slate-600">Informations additionnelles</div>
                      </div>
                      <div className="mt-2 text-sm text-slate-700">
                        {prettyRow?.meta && typeof prettyRow.meta === "object" ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {Object.entries(prettyRow.meta).map(([k, v]) => (
                              <div key={k} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                                <div className="text-[11px] text-slate-500">{k}</div>
                                <div className="text-sm font-medium text-slate-900 break-words">
                                  {typeof v === "string" ? v : safeJson(v)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-500">Aucune information.</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Identité */}
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Identité & Profil
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <NiceKV
                        icon={<User className="h-4 w-4" />}
                        label="Nom"
                        value={identity.fullName || "—"}
                      />
                      <NiceKV
                        icon={<ShieldCheck className="h-4 w-4" />}
                        label="Rôle"
                        value={identity.role || "—"}
                      />
                      <NiceKV label="Email" value={prettyRow.email || "—"} />
                      <NiceKV label="Téléphone" value={identity.phone || "—"} />
                      <NiceKV label="Pays" value={identity.country || "—"} />
                      <NiceKV label="Ville" value={identity.city || "—"} />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-xs font-medium text-slate-600">Type de profil</div>
                      <div className="mt-1 text-sm font-medium text-slate-900">
                        {enrich.loading ? "Chargement…" : enrich.profileType === "client" ? "Client" : enrich.profileType === "worker" ? "Prestataire" : "Non trouvé"}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        L’interface affiche uniquement des champs utiles. Le JSON brut est disponible dans “Détails techniques”.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Détails techniques repliables */}
                <div className="mt-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-slate-800 hover:bg-slate-50"
                    onClick={() => setShowTech((v) => !v)}
                  >
                    <span>Détails techniques (JSON)</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showTech ? "rotate-180" : ""}`} />
                  </button>

                  {showTech ? (
                    <div className="border-t border-slate-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs text-slate-500 mb-2">op_users</div>
                        <pre className="text-xs overflow-auto max-h-72">{safeJson(identity.opu)}</pre>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="text-xs text-slate-500 mb-2">op_clients</div>
                        <pre className="text-xs overflow-auto max-h-72">{safeJson(identity.cli)}</pre>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                        <div className="text-xs text-slate-500 mb-2">Entrée op_login_journal (raw)</div>
                        <pre className="text-xs overflow-auto max-h-72">{safeJson(prettyRow.raw)}</pre>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex justify-end">
                  <Button type="button" variant="outline" onClick={closeDetails}>
                    Fermer
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
