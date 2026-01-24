// src/pages/admin/AdminReviewsModerationPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Loader2,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  MessageSquare,
  AlertTriangle,
  Shield,
} from "lucide-react";

/* =========================================================
   Types (match RPC outputs)
   ========================================================= */

type UnifiedStatus =
  | "pending"
  | "published"
  | "hidden"
  | "rejected"
  | "flagged"
  | string;

type UnifiedReviewRow = {
  source_table: "op_reviews" | "op_worker_client_reviews" | "op_ouvrier_reviews" | string;
  review_id: string;

  created_at: string | null;
  updated_at: string | null;

  rating: number | null;
  title: string | null;
  content: string | null;

  status: UnifiedStatus | null;
  is_public: boolean | null;
  is_flagged: boolean | null;

  client_ref: string | null;
  worker_ref: string | null;
  contact_id: string | null;

  related_order_id: string | null;

  client_display: string | null;
  worker_display: string | null;

  total_count: number | null;
};

type ThreadItem = {
  item_type: "review" | "message" | string;
  created_at: string;
  sender_role: string | null;
  message: string | null;
  author_display: string | null;
};

/* =========================================================
   UI helpers
   ========================================================= */

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
  });
}

function truncate(s?: string | null, n = 70) {
  if (!s) return "—";
  const t = String(s);
  if (t.length <= n) return t;
  return t.slice(0, n - 1) + "…";
}

function isUuidLike(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.trim());
}

function sourceBadge(src?: string | null) {
  const s = (src ?? "").trim();
  if (s === "op_reviews") return <Badge className="bg-indigo-600 hover:bg-indigo-600">op_reviews</Badge>;
  if (s === "op_worker_client_reviews") return <Badge className="bg-sky-600 hover:bg-sky-600">worker_client</Badge>;
  if (s === "op_ouvrier_reviews") return <Badge className="bg-violet-600 hover:bg-violet-600">ouvrier_reviews</Badge>;
  return <Badge variant="secondary">{s || "source"}</Badge>;
}

function statusBadge(status?: UnifiedStatus | null, isPublic?: boolean | null, isFlagged?: boolean | null) {
  const s = (status ?? "pending").toString();
  const pub = !!isPublic;

  if (s === "published" && pub) return <Badge className="bg-emerald-600 hover:bg-emerald-600">Publié</Badge>;
  if (s === "hidden") return <Badge className="bg-slate-600 hover:bg-slate-600">Masqué</Badge>;
  if (s === "rejected") return <Badge variant="destructive">Rejeté</Badge>;
  if (s === "flagged" || isFlagged) return <Badge className="bg-amber-600 hover:bg-amber-600">Signalé</Badge>;
  return <Badge className="bg-amber-600 hover:bg-amber-600">En attente</Badge>;
}

function rolePill(role?: string | null) {
  const r = (role ?? "").toLowerCase().trim();
  if (r === "worker") return <Badge className="bg-slate-900 hover:bg-slate-900">Prestataire</Badge>;
  if (r === "client") return <Badge className="bg-slate-700 hover:bg-slate-700">Client</Badge>;
  if (r === "system") return <Badge variant="secondary">Système</Badge>;
  if (!r) return <Badge variant="secondary">—</Badge>;
  return <Badge variant="secondary">{r}</Badge>;
}

function safeText(v?: string | null, fallback = "—") {
  const t = (v ?? "").trim();
  return t ? t : fallback;
}

/* =========================================================
   Main component
   ========================================================= */

export default function AdminReviewsModerationPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<UnifiedReviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);

  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    published: 0,
    hidden: 0,
    rejected: 0,
    flagged: 0,
  });

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<UnifiedReviewRow | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fromIdx = (page - 1) * perPage;
  const toIdx = fromIdx + perPage - 1;

  const uiCounts = useMemo(() => counts, [counts]);

  const buildCountsFromPage = (pageRows: UnifiedReviewRow[], totalCount: number) => {
    // IMPORTANT:
    // The RPC returns total_count for the filtered set, but it does NOT return per-status counts.
    // We compute per-status counts from the CURRENT PAGE only, and show total from total_count.
    // If you need exact counts per status across all pages, create a dedicated RPC later.
    const next = {
      total: totalCount,
      pending: 0,
      published: 0,
      hidden: 0,
      rejected: 0,
      flagged: 0,
    };

    for (const r of pageRows) {
      const s = (r.status ?? "pending").toString();
      if (s === "published" && r.is_public) next.published += 1;
      else if (s === "hidden") next.hidden += 1;
      else if (s === "rejected") next.rejected += 1;
      else if (s === "flagged" || r.is_flagged) next.flagged += 1;
      else next.pending += 1;
    }

    setCounts(next);
  };

  const fetchUnifiedReviews = async () => {
    setLoading(true);
    setError(null);

    try {
      const p_q = q.trim() ? q.trim() : null;
      const p_status = status === "all" ? null : status;

      const { data, error: e } = await supabase.rpc("admin_list_all_reviews", {
        p_q,
        p_status,
        p_page: page,
        p_per_page: perPage,
      });

      if (e) throw e;

      const list = (data ?? []) as UnifiedReviewRow[];
      setRows(list);

      const total = list?.[0]?.total_count ?? 0;
      buildCountsFromPage(list, Number(total) || 0);
    } catch (err: any) {
      const msg = err?.message ?? "Impossible de charger les avis (RPC admin_list_all_reviews).";
      setError(msg);
      setRows([]);
      setCounts({ total: 0, pending: 0, published: 0, hidden: 0, rejected: 0, flagged: 0 });
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, perPage]);

  useEffect(() => {
    fetchUnifiedReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, perPage, page]);

  const openDetails = async (r: UnifiedReviewRow) => {
    setSelected(r);
    setNote("");
    setThread([]);
    setOpen(true);

    setThreadLoading(true);
    try {
      const { data, error: e } = await supabase.rpc("admin_get_review_thread", {
        p_source: r.source_table,
        p_review_id: r.review_id,
      });
      if (e) throw e;

      setThread((data ?? []) as ThreadItem[]);
    } catch (err: any) {
      const msg = err?.message ?? "Impossible de charger le fil (RPC admin_get_review_thread).";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
      setThread([]);
    } finally {
      setThreadLoading(false);
    }
  };

  const closeDetails = () => {
    setOpen(false);
    setSelected(null);
    setNote("");
    setThread([]);
    setSaving(false);
    setThreadLoading(false);
  };

  const applyModeration = async (action: "publish" | "hide" | "reject") => {
    if (!selected) return;

    // source limitation: op_ouvrier_reviews is read-only by default (per SQL RPC)
    if (selected.source_table === "op_ouvrier_reviews") {
      toast({
        title: "Source en lecture seule",
        description:
          "Cette source (op_ouvrier_reviews) n’a pas de champs de modération dans le schéma actuel. Modération désactivée pour éviter des incohérences.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error: e } = await supabase.rpc("admin_moderate_any_review", {
        p_source: selected.source_table,
        p_review_id: selected.review_id,
        p_action: action,
        p_note: note?.trim() ? note.trim() : null,
      });
      if (e) throw e;

      toast({
        title: "Modération enregistrée",
        description:
          action === "publish" ? "Avis publié." : action === "hide" ? "Avis masqué." : "Avis rejeté / signalé.",
      });

      closeDetails();
      await fetchUnifiedReviews();
    } catch (err: any) {
      const msg = err?.message ?? "Échec de la modération (RPC admin_moderate_any_review).";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const applySearchFiltersHint = useMemo(() => {
    const raw = q.trim();
    if (!raw) return null;
    if (isUuidLike(raw)) return "UUID détecté : filtre exact possible (review_id / client_ref / worker_ref / contact_id).";
    return null;
  }, [q]);

  return (
    <div className="space-y-5">
      <Card className="border-slate-200">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">Modération des avis & échanges</CardTitle>
            <div className="mt-1 text-xs text-slate-500">
              Vue unifiée (RPC) de tous les avis (multi-tables) + fil de discussion (messages). Vous pouvez publier,
              masquer, rejeter selon la source.
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span>
                Total: <span className="font-medium text-slate-700">{uiCounts.total}</span>
              </span>
              <span>•</span>
              <span>
                En attente: <span className="font-medium text-slate-700">{uiCounts.pending}</span>
              </span>
              <span>•</span>
              <span>
                Publiés (page): <span className="font-medium text-slate-700">{uiCounts.published}</span>
              </span>
              <span>•</span>
              <span>
                Masqués (page): <span className="font-medium text-slate-700">{uiCounts.hidden}</span>
              </span>
              <span>•</span>
              <span>
                Rejetés (page): <span className="font-medium text-slate-700">{uiCounts.rejected}</span>
              </span>
              <span>•</span>
              <span>
                Signalés (page): <span className="font-medium text-slate-700">{uiCounts.flagged}</span>
              </span>
            </div>

            <div className="mt-2 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
              <Shield className="h-4 w-4 mt-[1px]" />
              <div className="leading-relaxed">
                Les noms sont résolus côté DB via RPC/view (profiles → op_users → op_clients/op_ouvriers). Si un nom ne
                correspond pas, c’est que les clés ne pointent pas vers les mêmes référentiels (auth uid vs op_clients.id
                / op_ouvriers.id). La vue unifiée gère cela automatiquement.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={fetchUnifiedReviews} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Rafraîchir
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-6">
              <label className="text-xs font-medium text-slate-600">Recherche</label>
              <div className="mt-1 relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Titre, contenu… ou coller un UUID (review/client/worker/contact)"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              {applySearchFiltersHint ? (
                <div className="mt-1 text-[11px] text-slate-500">{applySearchFiltersHint}</div>
              ) : null}
            </div>

            <div className="lg:col-span-3">
              <label className="text-xs font-medium text-slate-600">Statut</label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">Tous</option>
                <option value="pending">En attente</option>
                <option value="published">Publié</option>
                <option value="hidden">Masqué</option>
                <option value="rejected">Rejeté</option>
                <option value="flagged">Signalé</option>
              </select>
              <div className="mt-1 text-[11px] text-slate-500">Filtre sur le champ unifié status (RPC).</div>
            </div>

            <div className="lg:col-span-1">
              <label className="text-xs font-medium text-slate-600">Par page</label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="text-xs font-medium text-slate-600">Page</label>
              <div className="mt-1 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                >
                  -
                </Button>
                <div className="text-sm text-slate-700 min-w-[42px] text-center">{page}</div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading}
                >
                  +
                </Button>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Affiche les lignes {fromIdx + 1}–{Math.min(toIdx + 1, uiCounts.total || toIdx + 1)}.
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-[2px]" />
                <div>
                  <div className="font-medium">Erreur de chargement</div>
                  <div className="mt-1">{error}</div>
                </div>
              </div>
            </div>
          )}

          {!error && !loading && rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Aucun avis trouvé avec ces filtres.
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="text-left">
                  <th className="px-4 py-3 whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 whitespace-nowrap">Source</th>
                  <th className="px-4 py-3 whitespace-nowrap">Client</th>
                  <th className="px-4 py-3 whitespace-nowrap">Prestataire</th>
                  <th className="px-4 py-3 whitespace-nowrap">Note</th>
                  <th className="px-4 py-3 whitespace-nowrap">Extrait</th>
                  <th className="px-4 py-3 whitespace-nowrap">Statut</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={`${r.source_table}:${r.review_id}`} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{fmtDate(r.created_at)}</td>

                    <td className="px-4 py-3 whitespace-nowrap">{sourceBadge(r.source_table)}</td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-700" title={r.client_ref ?? ""}>
                      {truncate(r.client_display ?? "—", 28)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-700" title={r.worker_ref ?? ""}>
                      {truncate(r.worker_display ?? "—", 28)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{r.rating ?? "—"}</td>

                    <td className="px-4 py-3 text-slate-700" title={r.content ?? ""}>
                      {truncate(r.title ? `${r.title} — ${r.content ?? ""}` : r.content, 64)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {statusBadge(r.status, r.is_public, r.is_flagged)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => openDetails(r)}
                      >
                        <Eye className="h-4 w-4" />
                        Voir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading ? (
              <div className="p-4 text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement…
              </div>
            ) : null}
          </div>

          <div className="text-[11px] text-slate-500">
            Astuce: pour diagnostiquer rapidement, collez un UUID dans la recherche (review_id, client_ref, worker_ref ou
            contact_id).
          </div>
        </CardContent>
      </Card>

      {/* ====================== DETAILS DIALOG ====================== */}
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDetails())}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Détail (avis + fil de discussion)</DialogTitle>
          </DialogHeader>

          {!selected ? (
            <div className="text-sm text-slate-500">Aucun avis sélectionné.</div>
          ) : (
            <div className="space-y-4">
              {/* Header card */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {sourceBadge(selected.source_table)}
                      {statusBadge(selected.status, selected.is_public, selected.is_flagged)}
                      <Badge variant="secondary" className="gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Thread
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-slate-500">Client</div>
                        <div className="font-medium text-slate-900 break-words" title={selected.client_ref ?? ""}>
                          {safeText(selected.client_display, "Client")}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Prestataire</div>
                        <div className="font-medium text-slate-900 break-words" title={selected.worker_ref ?? ""}>
                          {safeText(selected.worker_display, "Prestataire")}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Date</div>
                        <div className="font-medium text-slate-900">{fmtDate(selected.created_at)}</div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">Note</div>
                        <div className="font-medium text-slate-900">{selected.rating ?? "—"} / 5</div>
                      </div>

                      {selected.contact_id ? (
                        <div className="sm:col-span-2">
                          <div className="text-xs text-slate-500">Contact ID</div>
                          <div className="font-mono text-[12px] text-slate-700 break-all">{selected.contact_id}</div>
                        </div>
                      ) : null}

                      {selected.related_order_id ? (
                        <div className="sm:col-span-2">
                          <div className="text-xs text-slate-500">Related Order</div>
                          <div className="font-mono text-[12px] text-slate-700 break-all">{selected.related_order_id}</div>
                        </div>
                      ) : null}

                      <div className="sm:col-span-2">
                        <div className="text-xs text-slate-500">Review ID</div>
                        <div className="font-mono text-[12px] text-slate-700 break-all">{selected.review_id}</div>
                      </div>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className="text-xs text-slate-500">Actions</div>
                    <div className="mt-2 flex flex-wrap sm:justify-end gap-2">
                      <Button type="button" variant="outline" onClick={closeDetails} disabled={saving}>
                        Fermer
                      </Button>

                      <Button
                        type="button"
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => applyModeration("publish")}
                        disabled={saving || selected.source_table === "op_ouvrier_reviews"}
                        title={selected.source_table === "op_ouvrier_reviews" ? "Source en lecture seule" : undefined}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Publier
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={() => applyModeration("hide")}
                        disabled={saving || selected.source_table === "op_ouvrier_reviews"}
                        title={selected.source_table === "op_ouvrier_reviews" ? "Source en lecture seule" : undefined}
                      >
                        <EyeOff className="h-4 w-4" />
                        Masquer
                      </Button>

                      <Button
                        type="button"
                        variant="destructive"
                        className="gap-2"
                        onClick={() => applyModeration("reject")}
                        disabled={saving || selected.source_table === "op_ouvrier_reviews"}
                        title={selected.source_table === "op_ouvrier_reviews" ? "Source en lecture seule" : undefined}
                      >
                        <XCircle className="h-4 w-4" />
                        Rejeter
                      </Button>
                    </div>

                    {selected.source_table === "op_ouvrier_reviews" ? (
                      <div className="mt-2 text-[11px] text-slate-500 flex items-start gap-2 sm:justify-end">
                        <AlertTriangle className="h-4 w-4 mt-[1px]" />
                        <div className="max-w-[360px]">
                          Cette table n’a pas de champs de modération dans votre schéma actuel. Si vous voulez modérer
                          cette source, il faut ajouter des colonnes (status/is_published/is_flagged) ou créer une table
                          de modération séparée.
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Review content */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">Titre</div>
                <div className="font-medium text-slate-900">{selected.title ?? "—"}</div>

                <div className="mt-3 text-xs text-slate-500">Commentaire</div>
                <div className="text-sm text-slate-800 whitespace-pre-wrap">{selected.content ?? "—"}</div>
              </div>

              {/* Moderation note */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="text-xs font-medium text-slate-600">Note de modération (visible admin)</label>
                <Textarea
                  className="mt-2"
                  placeholder="Ex: spam, insulte, hors sujet..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={selected.source_table === "op_ouvrier_reviews"}
                />
                <div className="mt-2 text-[11px] text-slate-500">
                  La note est enregistrée seulement si la source supporte la modération (op_reviews / op_worker_client_reviews).
                </div>
              </div>

              <Separator />

              {/* Thread */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-900">Fil de discussion</div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => selected && openDetails(selected)}
                    disabled={threadLoading}
                    title="Recharger le fil"
                  >
                    {threadLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Recharger
                  </Button>
                </div>

                {threadLoading ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement du fil…
                  </div>
                ) : thread.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    Aucun message trouvé pour ce fil (ou mapping client/worker non résolu côté DB).
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white">
                    <ul className="divide-y divide-slate-100">
                      {thread.map((t, idx) => {
                        const isReview = t.item_type === "review";
                        return (
                          <li key={`${t.item_type}-${idx}`} className="p-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {isReview ? <Badge variant="secondary">Avis</Badge> : rolePill(t.sender_role)}
                                <div className="text-sm font-medium text-slate-900">
                                  {safeText(t.author_display, isReview ? "Avis" : "Utilisateur")}
                                </div>
                              </div>

                              <div className="text-xs text-slate-500">{fmtDate(t.created_at)}</div>
                            </div>

                            <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">
                              {safeText(t.message, "—")}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
