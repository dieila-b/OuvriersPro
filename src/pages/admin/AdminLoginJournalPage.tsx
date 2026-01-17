// src/pages/admin/AdminLoginJournalPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, RefreshCw, Search, Filter, Eye, X } from "lucide-react";

/**
 * Journal de connexions (admin only)
 * - Table attendue: public.op_login_journal
 * - RLS: SELECT uniquement pour admin (via op_is_admin())
 */
const TABLE_NAME = "op_login_journal";

type AnyRow = Record<string, any>;

type FiltersState = {
  q: string;
  event: "all" | "login" | "logout" | "refresh" | "failed_login";
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
    if (typeof v === "string" && v.includes("T")) return v;
  }
  return null;
}

function truncate(s: string, n = 48) {
  if (!s) return "";
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function escapeLike(raw: string) {
  // supabase ilike escape % et _
  return raw.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export default function AdminLoginJournalPage() {
  const { toast } = useToast();

  const [tableOk, setTableOk] = useState<boolean | null>(null); // null = pending
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AnyRow | null>(null);

  const debounceRef = useRef<number | null>(null);

  const perPage = filters.perPage;
  const fromIdx = (page - 1) * perPage;
  const toIdx = fromIdx + perPage - 1;

  const totalPages = useMemo(() => {
    if (!total) return 1;
    return Math.max(1, Math.ceil(total / perPage));
  }, [total, perPage]);

  // Vérifie l'existence/lisibilité de la table
  useEffect(() => {
    let alive = true;

    const check = async () => {
      try {
        const { error } = await supabase.from(TABLE_NAME).select("id").limit(1);
        if (!alive) return;

        if (!error) {
          setTableOk(true);
          return;
        }

        const code = (error as any)?.code;
        const msg = String((error as any)?.message ?? "");

        // 42P01 = table inexistante
        if (code === "42P01") {
          setTableOk(false);
          setError("Table op_login_journal introuvable. Crée-la dans Supabase (SQL) puis réessaye.");
          return;
        }

        // RLS / permission => table existe mais pas lisible
        if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("rls")) {
          setTableOk(false);
          setError(
            "Accès refusé (RLS). Vérifie la policy SELECT admin sur op_login_journal (op_is_admin())."
          );
          return;
        }

        setTableOk(false);
        setError(msg || "Impossible d'accéder à la table op_login_journal.");
      } catch (e: any) {
        if (!alive) return;
        setTableOk(false);
        setError(e?.message ?? "Erreur lors de la vérification de la table.");
      }
    };

    check();

    return () => {
      alive = false;
    };
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.q, filters.event, filters.success, filters.from, filters.to, filters.perPage]);

  const buildQuery = () => {
    if (!tableOk) return null;

    let q = supabase.from(TABLE_NAME).select("*", { count: "exact" });

    if (filters.event !== "all") q = q.eq("event", filters.event);

    if (filters.success !== "all") {
      q = q.eq("success", filters.success === "success");
    }

    const isoFrom = toIsoStartOfDay(filters.from);
    const isoTo = toIsoEndOfDay(filters.to);
    if (isoFrom) q = q.gte("created_at", isoFrom);
    if (isoTo) q = q.lte("created_at", isoTo);

    const raw = filters.q.trim();
    if (raw) {
      const like = `%${escapeLike(raw)}%`;
      // Colonnes connues de op_login_journal : email, user_id, ip, user_agent, source, event
      q = q.or(
        [
          `email.ilike.${like}`,
          `user_id::text.ilike.${like}`,
          `ip.ilike.${like}`,
          `user_agent.ilike.${like}`,
          `source.ilike.${like}`,
          `event.ilike.${like}`,
        ].join(",")
      );
    }

    q = q.order("created_at", { ascending: false }).range(fromIdx, toIdx);
    return q;
  };

  const fetchData = async () => {
    if (!tableOk) {
      setRows([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const q = buildQuery();
      if (!q) return;

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

  // initial + whenever page changes
  useEffect(() => {
    if (!tableOk) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableOk, page]);

  // debounced fetch on filters changes
  useEffect(() => {
    if (!tableOk) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchData(), 350);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableOk, filters.q, filters.event, filters.success, filters.from, filters.to, filters.perPage]);

  const openDetails = (r: AnyRow) => {
    setSelected(r);
    setOpen(true);
  };

  const closeDetails = () => {
    setOpen(false);
    setSelected(null);
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
      raw: selected,
    };
  }, [selected]);

  const headerRight = useMemo(() => {
    if (tableOk === null) {
      return (
        <div className="inline-flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Vérification…
        </div>
      );
    }

    if (tableOk === false) {
      return <div className="text-xs text-red-600">Table/RLS non OK</div>;
    }

    return (
      <div className="text-xs text-slate-500">
        Table: <span className="font-medium text-slate-700">{TABLE_NAME}</span>
      </div>
    );
  }, [tableOk]);

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
            {headerRight}

            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => fetchData()}
              disabled={loading || tableOk !== true}
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
                  placeholder="Email, user_id, IP, user-agent…"
                  value={filters.q}
                  onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
                  disabled={tableOk !== true}
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-slate-600">Événement</label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={filters.event}
                onChange={(e) => setFilters((p) => ({ ...p, event: e.target.value as any }))}
                disabled={tableOk !== true}
              >
                <option value="all">Tous</option>
                <option value="login">login</option>
                <option value="logout">logout</option>
                <option value="refresh">refresh</option>
                <option value="failed_login">failed_login</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-slate-600">Statut</label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={filters.success}
                onChange={(e) => setFilters((p) => ({ ...p, success: e.target.value as any }))}
                disabled={tableOk !== true}
              >
                <option value="all">Tous</option>
                <option value="success">Succès</option>
                <option value="fail">Échec</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-slate-600">Du</label>
              <Input
                className="mt-1"
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
                disabled={tableOk !== true}
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-slate-600">Au</label>
              <Input
                className="mt-1"
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
                disabled={tableOk !== true}
              />
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
                  disabled={tableOk !== true}
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  disabled={loading || tableOk !== true}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Error / Empty */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
              <div className="mt-2 text-xs text-red-700/90">
                Si la table existe mais tu ne vois rien : il faut aussi que l’app écrive dedans (RPC op_log_login_event).
              </div>
            </div>
          )}

          {!error && !loading && rows.length === 0 && tableOk === true && (
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

                  const userLabel = email ? truncate(email, 28) : userId ? truncate(userId, 28) : "—";
                  const loc = [city, region, country].filter(Boolean).join(", ") || "—";

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
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700" title={email || userId || ""}>
                        {userLabel}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700" title={ip || ""}>
                        {truncate(ip || "—", 22) || "—"}
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
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={loading || page <= 1}
              >
                Précédent
              </Button>

              <div className="text-xs text-slate-600 px-2">
                Page <span className="font-medium">{page}</span> / <span className="font-medium">{totalPages}</span>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={loading || page >= totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDetails())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Détails de la connexion</DialogTitle>
          </DialogHeader>

          {!prettyRow ? (
            <div className="text-sm text-slate-500">Aucun détail.</div>
          ) : (
            <div className="space-y-4">
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

                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-xs text-slate-500">Utilisateur</div>
                  <div className="font-medium text-slate-900 break-all">{prettyRow.email || prettyRow.userId || "—"}</div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-xs text-slate-500">IP</div>
                  <div className="font-medium text-slate-900 break-all">{prettyRow.ip || "—"}</div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <div className="text-xs text-slate-500">Localisation</div>
                  <div className="font-medium text-slate-900">
                    {[prettyRow.city, prettyRow.region, prettyRow.country].filter(Boolean).join(", ") || "—"}
                  </div>
                  {(prettyRow.lat != null || prettyRow.lng != null) && (
                    <div className="text-xs text-slate-500 mt-1">
                      GPS: {String(prettyRow.lat ?? "—")}, {String(prettyRow.lng ?? "—")}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-3 md:col-span-2">
                  <div className="text-xs text-slate-500">User-Agent</div>
                  <div className="font-medium text-slate-900 break-all">{prettyRow.ua || "—"}</div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3 md:col-span-2">
                  <div className="text-xs text-slate-500">Source</div>
                  <div className="font-medium text-slate-900">{prettyRow.source || "—"}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="text-xs text-slate-500 mb-2">Payload brut (JSON)</div>
                <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-[40vh]">
                  {JSON.stringify(prettyRow.raw, null, 2)}
                </pre>
              </div>

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
