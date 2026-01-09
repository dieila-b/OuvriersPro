// src/pages/AdminReports.tsx
import * as React from "react";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";

/**
 * ✅ À ADAPTER (1 seule fois)
 * - Table recommandée: "op_account_reports"
 * - Colonnes attendues:
 *   id (uuid)
 *   created_at (timestamptz)
 *   reporter_user_id (uuid)
 *   reported_user_id (uuid)
 *   reported_role ('worker'|'client')
 *   reason (text)
 *   details (text|null)
 *   status ('new'|'reviewing'|'resolved'|'rejected')
 *   resolved_at (timestamptz|null)
 *   resolved_by (uuid|null)
 *   resolution_note (text|null)
 *
 * Si tes noms diffèrent, change uniquement:
 * - TABLE
 * - SELECT_FIELDS
 * - update payload dans updateStatus()
 */

const TABLE = "op_account_reports";
const SELECT_FIELDS = `
  id,
  created_at,
  reporter_user_id,
  reported_user_id,
  reported_role,
  reason,
  details,
  status,
  resolved_at,
  resolved_by,
  resolution_note
`;

type ReportStatus = "new" | "reviewing" | "resolved" | "rejected";
type ReportRole = "worker" | "client";

type ReportRow = {
  id: string;
  created_at: string;
  reporter_user_id: string | null;
  reported_user_id: string | null;
  reported_role: ReportRole | null;
  reason: string | null;
  details: string | null;
  status: ReportStatus | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
};

const statusMeta: Record<
  ReportStatus,
  { label: string; icon: React.ElementType; badge: string }
> = {
  new: { label: "Nouveau", icon: ShieldAlert, badge: "bg-red-50 text-red-700 border-red-200" },
  reviewing: { label: "En revue", icon: Clock, badge: "bg-amber-50 text-amber-700 border-amber-200" },
  resolved: { label: "Résolu", icon: CheckCircle2, badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejeté", icon: XCircle, badge: "bg-slate-50 text-slate-700 border-slate-200" },
};

const roleLabel = (r: ReportRole | null) => {
  if (r === "worker") return "Ouvrier";
  if (r === "client") return "Client";
  return "—";
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

const toISOStartOfDay = (yyyyMmDd: string) => {
  // "2026-01-09" -> "2026-01-09T00:00:00.000Z"
  const d = new Date(`${yyyyMmDd}T00:00:00.000Z`);
  return d.toISOString();
};

const toISOEndOfDay = (yyyyMmDd: string) => {
  const d = new Date(`${yyyyMmDd}T23:59:59.999Z`);
  return d.toISOString();
};

const AdminReports: React.FC = () => {
  const { toast } = useToast();

  // Data
  const [rows, setRows] = React.useState<ReportRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<ReportStatus | "all">("all");
  const [role, setRole] = React.useState<ReportRole | "all">("all");
  const [dateFrom, setDateFrom] = React.useState<string>(""); // yyyy-mm-dd
  const [dateTo, setDateTo] = React.useState<string>(""); // yyyy-mm-dd

  // Pagination
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  // Dialog
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ReportRow | null>(null);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(Math.max(page, 1), totalPages);

  React.useEffect(() => {
    if (page !== clampedPage) setPage(clampedPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();

    return rows.filter((r) => {
      if (status !== "all" && (r.status ?? "new") !== status) return false;
      if (role !== "all" && (r.reported_role ?? null) !== role) return false;

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
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(query);
    });
  }, [rows, q, status, role, dateFrom, dateTo]);

  const paged = React.useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, clampedPage]);

  const stats = React.useMemo(() => {
    const base = { new: 0, reviewing: 0, resolved: 0, rejected: 0 } as Record<ReportStatus, number>;
    for (const r of rows) {
      const s = (r.status ?? "new") as ReportStatus;
      if (base[s] != null) base[s] += 1;
    }
    return base;
  }, [rows]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from(TABLE)
        .select(SELECT_FIELDS)
        .order("created_at", { ascending: false });

      if (err) throw err;
      setRows((data || []) as ReportRow[]);
    } catch (e: any) {
      console.error("AdminReports load error:", e);
      setError(e?.message || "Impossible de charger les signalements.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const openRow = (r: ReportRow) => {
    setSelected(r);
    setNote(r.resolution_note || "");
    setOpen(true);
  };

  const updateStatus = async (next: ReportStatus) => {
    if (!selected) return;

    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const adminUserId = auth.user?.id ?? null;

      const payload: Partial<ReportRow> = {
        status: next,
        resolution_note: note?.trim() ? note.trim() : null,
      };

      // si statut final -> on renseigne resolved_at/resolved_by
      if (next === "resolved" || next === "rejected") {
        payload.resolved_at = new Date().toISOString();
        payload.resolved_by = adminUserId;
      } else {
        payload.resolved_at = null;
        payload.resolved_by = null;
      }

      const { error: updErr } = await supabase.from(TABLE).update(payload).eq("id", selected.id);
      if (updErr) throw updErr;

      // Update local state
      setRows((prev) =>
        prev.map((r) => (r.id === selected.id ? { ...r, ...payload } as ReportRow : r))
      );
      setSelected((prev) => (prev ? ({ ...prev, ...payload } as ReportRow) : prev));

      toast({
        title: "Statut mis à jour",
        description: `Le signalement a été mis à jour en "${statusMeta[next].label}".`,
      });
    } catch (e: any) {
      console.error("updateStatus error:", e);
      toast({
        title: "Erreur",
        description: e?.message || "Impossible de mettre à jour le statut.",
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

  return (
    <AppLayout title="Signalements">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-pro-blue" />
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 truncate">
                Signalements
              </h1>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Gérez les signalements (liste, filtres, statut, notes de résolution).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={clearFilters} className="gap-2">
              <Filter className="w-4 h-4" />
              Réinitialiser
            </Button>
            <Button onClick={load} disabled={loading} className="gap-2 bg-pro-blue hover:bg-blue-700">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
          </div>
        </div>

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
              <div className="md:col-span-5">
                <label className="text-xs font-medium text-slate-600 block mb-1">Recherche</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                    placeholder="ID, user_id, raison, détails…"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="text-xs font-medium text-slate-600 block mb-1">Statut</label>
                <Select
                  value={status}
                  onValueChange={(v) => {
                    setStatus(v as any);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="new">Nouveau</SelectItem>
                    <SelectItem value="reviewing">En revue</SelectItem>
                    <SelectItem value="resolved">Résolu</SelectItem>
                    <SelectItem value="rejected">Rejeté</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-600 block mb-1">Rôle signalé</label>
                <Select
                  value={role}
                  onValueChange={(v) => {
                    setRole(v as any);
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="worker">Ouvrier</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-1">
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

              <div className="md:col-span-1">
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
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="text-slate-500">
                {loading ? "Chargement…" : `${filtered.length} résultat(s) (sur ${rows.length})`}
              </div>
              {error && (
                <div className="text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2 text-xs">
                  {error}
                </div>
              )}
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
              <table className="w-full min-w-[900px] border-separate border-spacing-0">
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
                      const s = (r.status ?? "new") as ReportStatus;
                      const meta = statusMeta[s];
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
                              {roleLabel(r.reported_role)}
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
                Consultez le contenu, puis changez le statut (avec note optionnelle).
              </DialogDescription>
            </DialogHeader>

            {selected ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Card className="rounded-xl">
                    <CardContent className="p-4 space-y-2">
                      <div className="text-xs text-slate-500">ID signalement</div>
                      <div className="font-mono text-xs text-slate-900 break-all">{selected.id}</div>
                      <div className="text-xs text-slate-500 mt-2">Créé le</div>
                      <div className="text-sm text-slate-900">{formatDate(selected.created_at)}</div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl">
                    <CardContent className="p-4 space-y-2">
                      <div className="text-xs text-slate-500">Compte signalé</div>
                      <div className="text-sm text-slate-900 break-all">{safe(selected.reported_user_id)}</div>

                      <div className="text-xs text-slate-500 mt-2">Rôle</div>
                      <div className="text-sm text-slate-900">{roleLabel(selected.reported_role)}</div>
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

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600">Note admin (optionnel)</label>
                  <Textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex : Compte averti, preuve insuffisante, résolution appliquée…"
                    disabled={saving}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
                  <div className="text-xs text-slate-500">
                    Statut actuel :{" "}
                    <span className="font-semibold text-slate-900">
                      {statusMeta[(selected.status ?? "new") as ReportStatus].label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={saving}
                      className="gap-2"
                      onClick={() => updateStatus("reviewing")}
                    >
                      <Clock className="w-4 h-4" />
                      Mettre en revue
                    </Button>

                    <Button
                      disabled={saving}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => updateStatus("resolved")}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Marquer résolu
                    </Button>

                    <Button
                      disabled={saving}
                      variant="destructive"
                      className="gap-2"
                      onClick={() => updateStatus("rejected")}
                    >
                      <XCircle className="w-4 h-4" />
                      Rejeter
                    </Button>
                  </div>
                </div>

                {(selected.resolved_at || selected.resolved_by) && (
                  <Card className="rounded-xl">
                    <CardContent className="p-4">
                      <div className="text-xs text-slate-500">Clôture</div>
                      <div className="text-sm text-slate-900 mt-1">
                        {selected.resolved_at ? `Date : ${formatDate(selected.resolved_at)}` : "Date : —"}
                      </div>
                      <div className="text-sm text-slate-900">
                        {selected.resolved_by ? `Par : ${selected.resolved_by}` : "Par : —"}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-slate-500">Aucun signalement sélectionné.</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AdminReports;
