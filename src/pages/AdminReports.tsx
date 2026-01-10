// src/pages/AdminReports.tsx
import * as React from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  Tag,
  Bug,
  Database,
  Copy,
} from "lucide-react";

const TABLE = "account_reports";

/**
 * Colonnes vues sur ta capture (à adapter si besoin):
 * id uuid
 * created_at timestamptz
 * reporter_user_id uuid
 * reported_user_id uuid
 * reported_role text
 * reason report_reason (enum)
 * details text
 * evidence_url text
 * status text
 * admin_note text
 */
const SELECT_FIELDS = `
  id,
  created_at,
  reporter_user_id,
  reported_user_id,
  reported_role,
  reason,
  details,
  evidence_url,
  status,
  admin_note
`;

type ReportStatus = "new" | "reviewing" | "resolved" | "rejected";
type VoteReason =
  | "spam"
  | "fraud"
  | "impersonation"
  | "inappropriate_content"
  | "harassment"
  | "pricing_scam"
  | "other";

type ReportRow = {
  id: string;
  created_at: string;
  reporter_user_id: string | null;
  reported_user_id: string | null;
  reported_role: string | null;
  reason: VoteReason | string | null;
  details: string | null;
  evidence_url: string | null;
  status: ReportStatus | string | null;
  admin_note: string | null;
};

const statusMeta: Record<
  ReportStatus,
  { label: string; icon: React.ElementType; badge: string }
> = {
  new: {
    label: "Nouveau",
    icon: ShieldAlert,
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  reviewing: {
    label: "En cours",
    icon: Clock,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  resolved: {
    label: "Résolu",
    icon: CheckCircle2,
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  rejected: {
    label: "Rejeté",
    icon: XCircle,
    badge: "bg-slate-50 text-slate-700 border-slate-200",
  },
};

const safe = (v: any) => (v == null || v === "" ? "—" : String(v));

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const toISOStartOfDay = (yyyyMmDd: string) => new Date(`${yyyyMmDd}T00:00:00.000Z`).toISOString();
const toISOEndOfDay = (yyyyMmDd: string) => new Date(`${yyyyMmDd}T23:59:59.999Z`).toISOString();

function copyToClipboard(text: string) {
  try {
    void navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

function serializeSupabaseError(e: any) {
  if (!e) return null;
  return {
    message: e?.message ?? null,
    code: e?.code ?? null,
    details: e?.details ?? null,
    hint: e?.hint ?? null,
    status: e?.status ?? null,
  };
}

const AdminReports: React.FC = () => {
  const { toast } = useToast();

  // Data
  const [rows, setRows] = React.useState<ReportRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Debug
  const [debugOpen, setDebugOpen] = React.useState(true);
  const [debugLog, setDebugLog] = React.useState<any[]>([]);
  const [authUserId, setAuthUserId] = React.useState<string | null>(null);
  const [authEmail, setAuthEmail] = React.useState<string | null>(null);

  const logDebug = React.useCallback((label: string, payload?: any) => {
    setDebugLog((prev) => [
      { at: new Date().toISOString(), label, payload },
      ...prev,
    ]);
  }, []);

  // Filters
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<ReportStatus | "all">("all");
  const [role, setRole] = React.useState<string | "all">("all");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");

  // Pagination
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  // Dialog
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ReportRow | null>(null);
  const [adminNote, setAdminNote] = React.useState("");
  const [nextStatus, setNextStatus] = React.useState<ReportStatus>("reviewing");
  const [saving, setSaving] = React.useState(false);

  // Auth debug
  React.useEffect(() => {
    let mounted = true;

    const loadAuth = async () => {
      const { data, error: e } = await supabase.auth.getUser();
      if (!mounted) return;

      if (e) {
        logDebug("auth.getUser error", serializeSupabaseError(e));
      } else {
        logDebug("auth.getUser ok", {
          id: data.user?.id ?? null,
          email: data.user?.email ?? null,
          role: (data.user as any)?.role ?? null,
        });
      }

      setAuthUserId(data.user?.id ?? null);
      setAuthEmail(data.user?.email ?? null);
    };

    loadAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!mounted) return;
      setAuthUserId(session?.user?.id ?? null);
      setAuthEmail(session?.user?.email ?? null);
      logDebug("auth state change", {
        evt: _evt,
        user_id: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [logDebug]);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();

    return rows.filter((r) => {
      const s = (r.status ?? "new") as string;
      if (status !== "all" && s !== status) return false;

      if (role !== "all" && (r.reported_role ?? "") !== role) return false;

      if (dateFrom) {
        const from = new Date(toISOStartOfDay(dateFrom)).getTime();
        const t = new Date(r.created_at).getTime();
        if (t < from) return false;
      }

      if (dateTo) {
        const to = new Date(toISOEndOfDay(dateTo)).getTime();
        const t = new Date(r.created_at).getTime();
        if (t > to) return false;
      }

      if (!query) return true;

      const hay = [
        r.id,
        r.reporter_user_id,
        r.reported_user_id,
        r.reported_role,
        r.reason,
        r.details,
        r.status,
        r.admin_note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(query);
    });
  }, [rows, q, status, role, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(Math.max(page, 1), totalPages);

  React.useEffect(() => {
    if (page !== clampedPage) setPage(clampedPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const paged = React.useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, clampedPage]);

  const stats = React.useMemo(() => {
    const base: Record<ReportStatus, number> = {
      new: 0,
      reviewing: 0,
      resolved: 0,
      rejected: 0,
    };
    for (const r of rows) {
      const s = (r.status ?? "new") as ReportStatus;
      if (base[s] != null) base[s] += 1;
    }
    return base;
  }, [rows]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    logDebug("load() start", { table: TABLE, select: SELECT_FIELDS });

    try {
      const { data, error: err } = await supabase
        .from(TABLE)
        .select(SELECT_FIELDS)
        .order("created_at", { ascending: false })
        .limit(300);

      if (err) {
        logDebug("load() supabase error", serializeSupabaseError(err));
        throw err;
      }

      logDebug("load() ok", { count: (data ?? []).length });
      setRows((data || []) as ReportRow[]);
    } catch (e: any) {
      console.error("AdminReports load error:", e);
      const se = serializeSupabaseError(e);
      setError(se?.message || "Impossible de charger les signalements.");
    } finally {
      setLoading(false);
    }
  }, [logDebug]);

  React.useEffect(() => {
    load();
  }, [load]);

  const testReadOne = async () => {
    setError(null);
    logDebug("testReadOne() start");
    try {
      const { data, error: err } = await supabase
        .from(TABLE)
        .select("id, created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      if (err) {
        logDebug("testReadOne() error", serializeSupabaseError(err));
        throw err;
      }

      logDebug("testReadOne() ok", data);
      toast({ title: "Test lecture OK", description: data?.[0]?.id ?? "Aucune ligne" });
    } catch (e: any) {
      const se = serializeSupabaseError(e);
      toast({
        title: "Test lecture KO",
        description: se?.message || "Erreur",
        variant: "destructive",
      });
    }
  };

  const testTableExists = async () => {
    setError(null);
    logDebug("testTableExists() start");
    try {
      // Heuristique: un select limit 0 suffit à valider le routage PostgREST
      const { error: err } = await supabase.from(TABLE).select("id").limit(0);
      if (err) {
        logDebug("testTableExists() error", serializeSupabaseError(err));
        throw err;
      }
      logDebug("testTableExists() ok");
      toast({ title: "Table OK", description: `"${TABLE}" est accessible (routing OK).` });
    } catch (e: any) {
      const se = serializeSupabaseError(e);
      toast({
        title: "Table KO",
        description: se?.message || "Erreur",
        variant: "destructive",
      });
    }
  };

  const openRow = (r: ReportRow) => {
    setSelected(r);
    setAdminNote(r.admin_note || "");
    const current = (r.status ?? "new") as ReportStatus;
    setNextStatus(current === "new" ? "reviewing" : current);
    setOpen(true);
  };

  const updateSelected = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);

    const payload: Partial<ReportRow> = {
      status: nextStatus,
      admin_note: adminNote?.trim() ? adminNote.trim() : null,
    };

    logDebug("updateSelected() start", { id: selected.id, payload });

    try {
      const { error: updErr } = await supabase.from(TABLE).update(payload).eq("id", selected.id);
      if (updErr) {
        logDebug("updateSelected() error", serializeSupabaseError(updErr));
        throw updErr;
      }

      setRows((prev) =>
        prev.map((r) => (r.id === selected.id ? ({ ...r, ...payload } as ReportRow) : r))
      );
      setSelected((prev) => (prev ? ({ ...prev, ...payload } as ReportRow) : prev));

      toast({
        title: "Mise à jour OK",
        description: `Statut: ${payload.status} • Note admin: ${payload.admin_note ? "oui" : "non"}`,
      });
      logDebug("updateSelected() ok");
      setOpen(false);
    } catch (e: any) {
      const se = serializeSupabaseError(e);
      toast({
        title: "Erreur mise à jour",
        description: se?.message || "Impossible de mettre à jour",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setQ("");
    setStatus("all");
    setRole("all");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const uniqueRoles = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.reported_role) set.add(r.reported_role);
    return Array.from(set).sort();
  }, [rows]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-pro-blue" />
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 truncate">
                Signalements (Admin)
              </h1>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Table: <span className="font-mono">{TABLE}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="outline" onClick={clearFilters} className="gap-2">
              <Filter className="w-4 h-4" />
              Réinitialiser
            </Button>

            <Button variant="outline" onClick={testTableExists} className="gap-2">
              <Database className="w-4 h-4" />
              Test table
            </Button>

            <Button variant="outline" onClick={testReadOne} className="gap-2">
              <Bug className="w-4 h-4" />
              Test lecture 1
            </Button>

            <Button
              onClick={load}
              disabled={loading}
              className="gap-2 bg-pro-blue hover:bg-blue-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Debug panel */}
        <Card className="rounded-2xl mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Debug</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDebugOpen((v) => !v)}
              >
                {debugOpen ? "Masquer" : "Afficher"}
              </Button>
            </div>
          </CardHeader>

          {debugOpen && (
            <CardContent className="pt-2 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="text-xs text-slate-500">Auth user</div>
                  <div className="text-sm font-medium">{authUserId ? "Connecté" : "Non connecté"}</div>
                  <div className="text-xs text-slate-600 break-all">{authEmail ?? "—"}</div>
                  <div className="text-[11px] text-slate-400 break-all">{authUserId ?? "—"}</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="text-xs text-slate-500">Dernière erreur</div>
                  <div className="text-sm text-slate-800">{error ?? "—"}</div>
                  <div className="text-[11px] text-slate-400">
                    Si tu vois “permission denied” / “RLS”, c’est une policy à ajouter.
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="text-xs text-slate-500">Logs</div>
                  <div className="text-sm font-medium">{debugLog.length}</div>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDebugLog([])}
                    >
                      Vider
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(JSON.stringify(debugLog, null, 2))}
                      className="gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copier logs
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-slate-100 rounded-xl p-3 text-xs overflow-auto max-h-[240px]">
                <pre className="whitespace-pre-wrap">
{debugLog.length === 0
  ? "Aucun log pour le moment."
  : debugLog
      .slice(0, 20)
      .map((l) => `• ${l.at} — ${l.label}\n${l.payload ? JSON.stringify(l.payload, null, 2) : ""}`)
      .join("\n\n")}
                </pre>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(["new", "reviewing", "resolved", "rejected"] as ReportStatus[]).map((s) => {
            const Icon = statusMeta[s].icon;
            return (
              <Card key={s} className="rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500">Statut</div>
                      <div className="text-sm font-semibold text-slate-900">{statusMeta[s].label}</div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-slate-600" />
                    </div>
                  </div>
                  <div className="mt-3 text-2xl font-bold text-slate-900">{stats[s]}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card className="rounded-2xl mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Filtres</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6">
                <label className="text-xs font-medium text-slate-600 block mb-1">Recherche</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                    placeholder="ID, user_id, raison, détails, note…"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="text-xs font-medium text-slate-600 block mb-1">Statut</label>
                <select
                  className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as any);
                    setPage(1);
                  }}
                >
                  <option value="all">Tous</option>
                  <option value="new">Nouveau</option>
                  <option value="reviewing">En cours</option>
                  <option value="resolved">Résolu</option>
                  <option value="rejected">Rejeté</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="text-xs font-medium text-slate-600 block mb-1">Rôle signalé</label>
                <select
                  className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value as any);
                    setPage(1);
                  }}
                >
                  <option value="all">Tous</option>
                  {uniqueRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-600 block mb-1">Du</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-600 block mb-1">Au</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="md:col-span-8 flex items-end">
                <div className="text-slate-500 text-sm">
                  {loading ? "Chargement…" : `${filtered.length} résultat(s) (sur ${rows.length})`}
                  {error ? (
                    <span className="ml-2 text-xs text-red-600">• {error}</span>
                  ) : null}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Liste</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[980px] border-separate border-spacing-0">
                <thead>
                  <tr className="text-xs text-slate-500">
                    <th className="text-left font-medium py-3 px-3 border-b border-slate-200">Statut</th>
                    <th className="text-left font-medium py-3 px-3 border-b border-slate-200">Signalé</th>
                    <th className="text-left font-medium py-3 px-3 border-b border-slate-200">Rôle</th>
                    <th className="text-left font-medium py-3 px-3 border-b border-slate-200">Raison</th>
                    <th className="text-left font-medium py-3 px-3 border-b border-slate-200">Reporter</th>
                    <th className="text-left font-medium py-3 px-3 border-b border-slate-200">Date</th>
                    <th className="text-right font-medium py-3 px-3 border-b border-slate-200">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-slate-500">
                        Chargement…
                      </td>
                    </tr>
                  )}

                  {!loading && paged.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-sm text-slate-500">
                        Aucun signalement ne correspond aux filtres.
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    paged.map((r) => {
                      const s = ((r.status ?? "new") as ReportStatus);
                      const meta = statusMeta[s] ?? statusMeta.new;
                      const Icon = meta.icon;

                      return (
                        <tr key={r.id} className="text-sm hover:bg-slate-50">
                          <td className="py-3 px-3 border-b border-slate-100 align-top">
                            <Badge variant="outline" className={`gap-1 ${meta.badge}`}>
                              <Icon className="w-3.5 h-3.5" />
                              {meta.label}
                            </Badge>
                          </td>

                          <td className="py-3 px-3 border-b border-slate-100 align-top">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                                <User className="w-4 h-4 text-slate-600" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-slate-900 truncate">
                                  {safe(r.reported_user_id)}
                                </div>
                                <div className="text-xs text-slate-500 truncate">ID signalé</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-3 border-b border-slate-100 align-top">
                            <Badge variant="secondary" className="gap-1">
                              <Tag className="w-3.5 h-3.5" />
                              {safe(r.reported_role)}
                            </Badge>
                          </td>

                          <td className="py-3 px-3 border-b border-slate-100 align-top">
                            <div className="font-medium text-slate-900">{safe(r.reason)}</div>
                            {r.details ? (
                              <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">{r.details}</div>
                            ) : (
                              <div className="text-xs text-slate-400 mt-0.5">Aucun détail</div>
                            )}
                          </td>

                          <td className="py-3 px-3 border-b border-slate-100 align-top">
                            <div className="text-slate-900">{safe(r.reporter_user_id)}</div>
                            <div className="text-xs text-slate-500">Reporter</div>
                          </td>

                          <td className="py-3 px-3 border-b border-slate-100 align-top">
                            <div className="inline-flex items-center gap-2 text-slate-700">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              {formatDate(r.created_at)}
                            </div>
                          </td>

                          <td className="py-3 px-3 border-b border-slate-100 align-top text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2"
                              onClick={() => openRow(r)}
                            >
                              <Eye className="w-4 h-4" />
                              Voir
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="text-xs text-slate-500">
                Page {clampedPage} / {Math.max(1, Math.ceil(filtered.length / pageSize))}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={clampedPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Précédent
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={clampedPage >= Math.max(1, Math.ceil(filtered.length / pageSize))}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dialog détails */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Détails du signalement</DialogTitle>
              <DialogDescription>
                Debug: si la mise à jour échoue, regarde le panneau Debug (RLS/policy).
              </DialogDescription>
            </DialogHeader>

            {selected ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Card className="rounded-xl">
                    <CardContent className="p-4 space-y-2">
                      <div className="text-xs text-slate-500">ID signalement</div>
                      <div className="font-mono text-xs text-slate-900 break-all">{selected.id}</div>
                      <div className="mt-2 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            copyToClipboard(selected.id);
                            toast({ title: "Copié", description: "ID copié dans le presse-papier" });
                          }}
                        >
                          <Copy className="w-4 h-4" />
                          Copier ID
                        </Button>
                      </div>

                      <div className="text-xs text-slate-500 mt-3">Créé le</div>
                      <div className="text-sm text-slate-900">{formatDate(selected.created_at)}</div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl">
                    <CardContent className="p-4 space-y-2">
                      <div className="text-xs text-slate-500">Compte signalé</div>
                      <div className="text-sm text-slate-900 break-all">{safe(selected.reported_user_id)}</div>

                      <div className="text-xs text-slate-500 mt-2">Rôle</div>
                      <div className="text-sm text-slate-900 break-all">{safe(selected.reported_role)}</div>

                      {selected.evidence_url && (
                        <>
                          <div className="text-xs text-slate-500 mt-2">Preuve</div>
                          <a
                            className="text-sm text-blue-700 underline break-all"
                            href={selected.evidence_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {selected.evidence_url}
                          </a>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl md:col-span-2">
                    <CardContent className="p-4 space-y-2">
                      <div className="text-xs text-slate-500">Reporter</div>
                      <div className="text-sm text-slate-900 break-all">{safe(selected.reporter_user_id)}</div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl md:col-span-2">
                    <CardContent className="p-4 space-y-2">
                      <div className="text-xs text-slate-500">Raison</div>
                      <div className="text-sm font-medium text-slate-900">{safe(selected.reason)}</div>

                      <div className="text-xs text-slate-500 mt-2">Détails</div>
                      <div className="text-sm text-slate-700 whitespace-pre-line">
                        {selected.details ? selected.details : "—"}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Statut</label>
                    <select
                      className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value as ReportStatus)}
                      disabled={saving}
                    >
                      <option value="new">Nouveau</option>
                      <option value="reviewing">En cours</option>
                      <option value="resolved">Résolu</option>
                      <option value="rejected">Rejeté</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Note admin</label>
                    <Textarea
                      rows={3}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Note interne…"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
                  <div className="text-xs text-slate-500">
                    Statut actuel :{" "}
                    <span className="font-semibold text-slate-900">
                      {safe(selected.status)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={saving}
                      className="gap-2 bg-pro-blue hover:bg-blue-700"
                      onClick={updateSelected}
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Enregistrement…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Enregistrer
                        </>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      disabled={saving}
                      className="gap-2"
                      onClick={() => {
                        logDebug("selected row snapshot", selected);
                        toast({ title: "Snapshot loggé", description: "Voir Debug panel" });
                      }}
                    >
                      <Bug className="w-4 h-4" />
                      Snapshot debug
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-slate-500">
                Aucun signalement sélectionné.
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminReports;
