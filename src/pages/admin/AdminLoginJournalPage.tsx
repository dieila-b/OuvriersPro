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
  MapPin,
  User,
  Phone,
  Mail,
  Globe,
  Shield,
  Info,
} from "lucide-react";

const TABLE_NAME = "op_login_journal" as const;

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
    if (typeof v === "string" && v.trim()) return v.trim();
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

function safeObj(v: any) {
  return v && typeof v === "object" ? v : null;
}

function prettyAddress(parts: string[]) {
  const v = parts.map((x) => (x || "").trim()).filter(Boolean);
  return v.length ? v.join(", ") : "—";
}

function Field({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium text-slate-900 break-words">{value || "—"}</div>
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

  const [profileLoading, setProfileLoading] = useState(false);
  const [userRow, setUserRow] = useState<AnyRow | null>(null);
  const [clientRow, setClientRow] = useState<AnyRow | null>(null);
  const [workerRow, setWorkerRow] = useState<AnyRow | null>(null);

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
          `user_agent.ilike.${like}`,
          `country.ilike.${like}`,
          `region.ilike.${like}`,
          `city.ilike.${like}`,
          // si ta table a user_id, ça marche, sinon ignoré
          `user_id::text.ilike.${like}`,
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
      const { data, error, count } = await buildQuery();
      if (error) throw error;

      setRows((data ?? []) as AnyRow[]);
      setTotal(typeof count === "number" ? count : 0);
    } catch (e: any) {
      console.error(e);
      setRows([]);
      setTotal(0);

      const msg = e?.message ?? "Impossible de charger le journal de connexion.";
      setError(msg);

      toast({ title: "Erreur", description: msg, variant: "destructive" });
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
    setUserRow(null);
    setClientRow(null);
    setWorkerRow(null);
    setProfileLoading(false);
  };

  // ✅ Enrichissement "personne" : op_users + op_clients + op_ouvriers (si possible)
  const fetchPersonDetails = async (row: AnyRow) => {
    setProfileLoading(true);
    setUserRow(null);
    setClientRow(null);
    setWorkerRow(null);

    try {
      const meta = safeObj(row?.meta);
      const metaUserId = typeof meta?.user_id === "string" ? meta.user_id : null;

      const userId = pickStr(row, ["user_id"]) || metaUserId || "";
      const email = pickStr(row, ["email"]) || "";

      // 1) op_users : par id si possible, sinon par email
      let u: AnyRow | null = null;
      if (userId) {
        const { data } = await supabase.from("op_users").select("*").eq("id", userId).maybeSingle();
        u = (data as AnyRow) ?? null;
      } else if (email) {
        const { data } = await supabase.from("op_users").select("*").eq("email", email).maybeSingle();
        u = (data as AnyRow) ?? null;
      }
      setUserRow(u);

      const resolvedUserId =
        (u?.id as string | undefined) ||
        (userId ? userId : "") ||
        "";

      // 2) op_clients par user_id si on l’a
      if (resolvedUserId) {
        const { data: c } = await supabase
          .from("op_clients")
          .select("*")
          .eq("user_id", resolvedUserId)
          .maybeSingle();
        setClientRow((c as AnyRow) ?? null);

        // 3) op_ouvriers par user_id si ton schéma l’a (sinon on ne casse pas)
        const { data: w } = await supabase
          .from("op_ouvriers")
          .select("*")
          .eq("user_id", resolvedUserId)
          .maybeSingle();
        setWorkerRow((w as AnyRow) ?? null);
      }
    } catch {
      // silencieux
    } finally {
      setProfileLoading(false);
    }
  };

  const openDetails = (r: AnyRow) => {
    setSelected(r);
    setOpen(true);
    fetchPersonDetails(r);
  };

  const pretty = useMemo(() => {
    if (!selected) return null;

    const createdAt = pickTs(selected, ["created_at", "createdAt", "ts", "timestamp"]);
    const event = pickStr(selected, ["event", "action", "type"]) || "—";
    const success = pickBool(selected, ["success", "ok", "is_success"]);
    const email = pickStr(selected, ["email", "user_email", "userEmail"]);
    const ip = pickStr(selected, ["ip", "ip_address", "ipAddress"]);
    const source = pickStr(selected, ["source", "channel", "app"]) || "—";
    const ua = pickStr(selected, ["user_agent", "userAgent", "ua"]);

    const country = pickStr(selected, ["country", "ip_country", "geo_country", "location_country"]);
    const region = pickStr(selected, ["region", "ip_region", "geo_region", "location_region", "state"]);
    const city = pickStr(selected, ["city", "ip_city", "geo_city", "location_city"]);

    const meta = safeObj(selected?.meta);

    // Infos "personne" (normalisées depuis op_users/op_clients/op_ouvriers)
    const role =
      pickStr(userRow ?? {}, ["role"]) ||
      pickStr(workerRow ?? {}, ["role"]) ||
      pickStr(clientRow ?? {}, ["role"]) ||
      "—";

    const firstName =
      pickStr(clientRow ?? {}, ["first_name", "firstname", "prenom"]) ||
      pickStr(userRow ?? {}, ["first_name", "firstname", "prenom"]) ||
      "";

    const lastName =
      pickStr(clientRow ?? {}, ["last_name", "lastname", "nom"]) ||
      pickStr(userRow ?? {}, ["last_name", "lastname", "nom"]) ||
      "";

    const fullName =
      pickStr(userRow ?? {}, ["full_name", "fullname", "name", "display_name"]) ||
      pickStr(clientRow ?? {}, ["full_name", "fullname", "name"]) ||
      [firstName, lastName].filter(Boolean).join(" ") ||
      "—";

    const phone =
      pickStr(clientRow ?? {}, ["phone", "telephone", "tel", "mobile"]) ||
      pickStr(userRow ?? {}, ["phone", "telephone", "tel", "mobile"]) ||
      pickStr(workerRow ?? {}, ["phone", "telephone", "tel", "mobile"]) ||
      "—";

    // Adresse (si ton schéma la stocke)
    const address =
      pickStr(clientRow ?? {}, ["address", "adresse", "address_line1", "street"]) ||
      pickStr(userRow ?? {}, ["address", "adresse", "address_line1", "street"]) ||
      pickStr(workerRow ?? {}, ["address", "adresse", "address_line1", "street"]) ||
      "—";

    const addrCity =
      pickStr(clientRow ?? {}, ["city", "ville"]) ||
      pickStr(userRow ?? {}, ["city", "ville"]) ||
      pickStr(workerRow ?? {}, ["city", "ville"]) ||
      city;

    const addrRegion =
      pickStr(clientRow ?? {}, ["region", "state", "prefecture"]) ||
      pickStr(userRow ?? {}, ["region", "state", "prefecture"]) ||
      pickStr(workerRow ?? {}, ["region", "state", "prefecture"]) ||
      region;

    const addrCountry =
      pickStr(clientRow ?? {}, ["country", "pays"]) ||
      pickStr(userRow ?? {}, ["country", "pays"]) ||
      pickStr(workerRow ?? {}, ["country", "pays"]) ||
      country;

    return {
      createdAt,
      event,
      success,
      email,
      ip,
      ua,
      source,
      country,
      region,
      city,
      meta,
      person: {
        role,
        fullName,
        phone,
        address,
        addrCity: addrCity || "—",
        addrRegion: addrRegion || "—",
        addrCountry: addrCountry || "—",
        userId:
          pickStr(selected, ["user_id"]) ||
          (typeof meta?.user_id === "string" ? meta.user_id : "") ||
          "—",
        profileType: workerRow ? "Prestataire" : clientRow ? "Client" : userRow ? "Utilisateur" : "—",
      },
      raw: selected,
    };
  }, [selected, userRow, clientRow, workerRow]);

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

            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => fetchData()}
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
              <Input
                className="mt-1"
                type="date"
                value={filters.from}
                onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))}
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-slate-600">Au</label>
              <Input
                className="mt-1"
                type="date"
                value={filters.to}
                onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))}
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
                  disabled={loading}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

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
                  const createdAt = pickTs(r, ["created_at", "createdAt"]);
                  const event = pickStr(r, ["event"]) || "—";
                  const success = pickBool(r, ["success"]);
                  const email = pickStr(r, ["email"]);
                  const ip = pickStr(r, ["ip"]);
                  const source = pickStr(r, ["source"]) || "—";
                  const country = pickStr(r, ["country"]);
                  const region = pickStr(r, ["region"]);
                  const city = pickStr(r, ["city"]);
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
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700" title={email || ""}>
                        {email ? truncate(email, 28) : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700" title={ip || ""}>
                        {ip ? truncate(ip, 22) : "—"}
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

      {/* Details Dialog */}
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDetails())}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Détails de la connexion</DialogTitle>
          </DialogHeader>

          {!pretty ? (
            <div className="text-sm text-slate-500">Aucun détail.</div>
          ) : (
            <div className="space-y-4">
              {/* Header badges */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-slate-600">
                  <span className="font-medium text-slate-900">{fmtDate(pretty.createdAt)}</span>
                  {pretty.email ? <span className="text-slate-400"> • </span> : null}
                  {pretty.email ? <span className="font-medium">{pretty.email}</span> : null}
                </div>

                <div className="flex items-center gap-2">
                  <Badge className="bg-slate-900 hover:bg-slate-900">{pretty.event}</Badge>
                  {pretty.success === null ? null : pretty.success ? (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">Succès</Badge>
                  ) : (
                    <Badge variant="destructive">Échec</Badge>
                  )}
                </div>
              </div>

              {/* Main grids */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Connexion */}
                <div className="lg:col-span-5">
                  <div className="mb-2 text-xs font-semibold text-slate-500 tracking-wide">CONNEXION</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field
                      icon={<Globe className="h-4 w-4" />}
                      label="IP"
                      value={pretty.ip || "Non disponible (doit être capturée côté serveur)."}
                    />
                    <Field
                      icon={<MapPin className="h-4 w-4" />}
                      label="Localisation"
                      value={
                        pretty.country || pretty.region || pretty.city
                          ? prettyAddress([pretty.city, pretty.region, pretty.country])
                          : "Non disponible (ville/région nécessitent souvent un GeoIP)."
                      }
                    />
                    <Field icon={<Info className="h-4 w-4" />} label="Source" value={pretty.source || "—"} />
                    <Field icon={<Info className="h-4 w-4" />} label="User-Agent" value={pretty.ua ? truncate(pretty.ua, 90) : "—"} />
                  </div>

                  {pretty.meta ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-xs font-semibold text-slate-500 tracking-wide">INFORMATIONS ADDITIONNELLES</div>
                      <div className="mt-2 text-sm text-slate-700 break-words">
                        {pretty.meta?.note ? (
                          <div>
                            <span className="text-slate-500">note: </span>
                            <span className="font-medium">{String(pretty.meta.note)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Identité & Profil */}
                <div className="lg:col-span-7">
                  <div className="mb-2 text-xs font-semibold text-slate-500 tracking-wide">IDENTITÉ & PROFIL</div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field icon={<User className="h-4 w-4" />} label="Nom complet" value={pretty.person.fullName} />
                    <Field icon={<Shield className="h-4 w-4" />} label="Rôle" value={pretty.person.role} />
                    <Field icon={<Mail className="h-4 w-4" />} label="Email" value={pretty.email || "—"} />
                    <Field icon={<Phone className="h-4 w-4" />} label="Téléphone" value={pretty.person.phone} />
                    <Field icon={<MapPin className="h-4 w-4" />} label="Adresse" value={pretty.person.address} />
                    <Field
                      icon={<MapPin className="h-4 w-4" />}
                      label="Ville / Région / Pays"
                      value={prettyAddress([pretty.person.addrCity, pretty.person.addrRegion, pretty.person.addrCountry])}
                    />
                    <Field icon={<Info className="h-4 w-4" />} label="Type de profil" value={pretty.person.profileType} />
                    <Field icon={<Info className="h-4 w-4" />} label="User ID" value={pretty.person.userId} />
                  </div>

                  {profileLoading ? (
                    <div className="mt-3 text-sm text-slate-500 inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement du profil…
                    </div>
                  ) : null}

                  {!profileLoading && !userRow && !clientRow && !workerRow ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      Profil détaillé non trouvé dans <span className="font-medium">op_users/op_clients/op_ouvriers</span>.
                      <div className="mt-1 text-xs text-amber-700">
                        Assure-toi que <span className="font-medium">meta.user_id</span> est bien rempli (via l’Edge Function) ou que <span className="font-medium">email</span> existe dans op_users.
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* JSON technique (collapsible simple) */}
              <details className="rounded-xl border border-slate-200 bg-white">
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-800">
                  Détails techniques (JSON)
                </summary>
                <div className="px-4 pb-4">
                  <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto max-h-[40vh]">
                    {JSON.stringify(pretty.raw, null, 2)}
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
