// src/pages/admin/AdminReviewsModerationPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  EyeOff,
  RefreshCw,
} from "lucide-react";

type ReviewStatus = "pending" | "published" | "hidden" | "rejected";

type ReviewRow = {
  id: string;
  created_at: string | null;
  updated_at?: string | null;

  client_user_id: string | null;
  worker_user_id: string | null;

  rating: number | null;
  title: string | null;
  content: string | null;

  status: ReviewStatus | null;
  is_public: boolean | null;

  moderation_note: string | null;
  moderated_by: string | null;
  moderated_at: string | null;

  related_order_id?: string | null;

  // On enrichit côté UI via lookup
  client_display?: string | null;
  worker_display?: string | null;
};

type ProfileRow = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type WorkerProfileRow = {
  user_id: string;
  email?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  trade?: string | null;
};

const TABLE = "op_reviews";

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
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function statusBadge(status?: ReviewStatus | null, isPublic?: boolean | null) {
  const s = status ?? "pending";
  const pub = !!isPublic;

  if (s === "published" && pub)
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600">Publié</Badge>
    );
  if (s === "hidden")
    return <Badge className="bg-slate-600 hover:bg-slate-600">Masqué</Badge>;
  if (s === "rejected") return <Badge variant="destructive">Rejeté</Badge>;
  return <Badge className="bg-amber-600 hover:bg-amber-600">En attente</Badge>;
}

function isUuidLike(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v.trim()
  );
}

function buildDisplay(p?: Partial<ProfileRow & WorkerProfileRow> | null, fallbackId?: string | null) {
  const full =
    (p as any)?.full_name ??
    [ (p as any)?.first_name, (p as any)?.last_name ].filter(Boolean).join(" ").trim() ??
    null;

  const company = (p as any)?.company_name ?? null;
  const trade = (p as any)?.trade ?? null;
  const email = (p as any)?.email ?? null;

  const primary = full || company || email || fallbackId || "—";
  const extra = trade ? ` • ${trade}` : "";
  return `${primary}${extra}`;
}

export default function AdminReviewsModerationPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // filtres
  const [q, setQ] = useState("");
  // IMPORTANT: par défaut, on affiche TOUS les avis
  const [status, setStatus] = useState<ReviewStatus | "all">("all");
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);

  // compteurs (toujours basés sur la recherche, pas sur la pagination)
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    published: 0,
    hidden: 0,
    rejected: 0,
  });

  // modal
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ReviewRow | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fromIdx = (page - 1) * perPage;
  const toIdx = fromIdx + perPage - 1;

  const applySearchFilters = (base: any) => {
    const raw = q.trim();
    if (!raw) return base;

    // Recherche texte sur colonnes lisibles
    const like = `%${raw.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    base = base.or(
      [
        `title.ilike.${like}`,
        `content.ilike.${like}`,
        `moderation_note.ilike.${like}`,
      ].join(",")
    );

    // Si ça ressemble à un UUID, on ajoute une recherche par IDs (exact match)
    if (isUuidLike(raw)) {
      base = base.or(
        [
          `id.eq.${raw}`,
          `client_user_id.eq.${raw}`,
          `worker_user_id.eq.${raw}`,
          `related_order_id.eq.${raw}`,
        ].join(",")
      );
    }

    return base;
  };

  const buildListQuery = () => {
    let query = supabase
      .from(TABLE)
      .select(
        "id,created_at,updated_at,client_user_id,worker_user_id,rating,title,content,status,is_public,moderation_note,moderated_by,moderated_at,related_order_id",
        { count: "exact" }
      );

    query = applySearchFilters(query);

    if (status !== "all") query = query.eq("status", status);

    return query.order("created_at", { ascending: false }).range(fromIdx, toIdx);
  };

  const buildCountQuery = (s: ReviewStatus | "all") => {
    let query = supabase
      .from(TABLE)
      // head:true => pas de data, uniquement count
      .select("id", { count: "exact", head: true });

    query = applySearchFilters(query);

    if (s !== "all") query = query.eq("status", s);

    return query;
  };

  const fetchIdentityMaps = async (clientIds: string[], workerIds: string[]) => {
    const uniqClients = Array.from(new Set(clientIds.filter(Boolean)));
    const uniqWorkers = Array.from(new Set(workerIds.filter(Boolean)));

    const profileMap = new Map<string, ProfileRow>();
    const workerProfileMap = new Map<string, WorkerProfileRow>();

    // 1) profiles (souvent id = auth.uid)
    if (uniqClients.length || uniqWorkers.length) {
      const allIds = Array.from(new Set([...uniqClients, ...uniqWorkers]));
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,full_name,first_name,last_name")
        .in("id", allIds);

      if (!error && Array.isArray(data)) {
        (data as ProfileRow[]).forEach((p) => profileMap.set(p.id, p));
      }
      // si RLS bloque profiles, on ignore (l'admin doit idéalement avoir une policy)
    }

    // 2) worker_profiles (si existe) => enrichissement spécifique prestataire
    // Si table absente, Supabase renvoie une erreur; on ignore proprement.
    if (uniqWorkers.length) {
      const { data, error } = await supabase
        .from("worker_profiles")
        .select("user_id,email,full_name,first_name,last_name,company_name,trade")
        .in("user_id", uniqWorkers);

      if (!error && Array.isArray(data)) {
        (data as WorkerProfileRow[]).forEach((p) => workerProfileMap.set(p.user_id, p));
      }
    }

    return { profileMap, workerProfileMap };
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1) Liste paginée (selon filtres)
      const { data, error: e1 } = await buildListQuery();
      if (e1) throw e1;

      const baseRows = (data ?? []) as ReviewRow[];

      // 2) Compteurs (toujours “tous statuts” + par statut, basés sur la recherche)
      const [
        cAll,
        cPending,
        cPublished,
        cHidden,
        cRejected,
      ] = await Promise.all([
        buildCountQuery("all"),
        buildCountQuery("pending"),
        buildCountQuery("published"),
        buildCountQuery("hidden"),
        buildCountQuery("rejected"),
      ]);

      setCounts({
        total: cAll.count ?? 0,
        pending: cPending.count ?? 0,
        published: cPublished.count ?? 0,
        hidden: cHidden.count ?? 0,
        rejected: cRejected.count ?? 0,
      });

      // 3) Enrichissement affichage client / prestataire via lookup (profiles + worker_profiles)
      const clientIds = baseRows.map((r) => r.client_user_id ?? "").filter(Boolean);
      const workerIds = baseRows.map((r) => r.worker_user_id ?? "").filter(Boolean);

      const { profileMap, workerProfileMap } = await fetchIdentityMaps(clientIds, workerIds);

      const enriched = baseRows.map((r) => {
        const clientP = r.client_user_id ? profileMap.get(r.client_user_id) : null;

        // Pour prestataire: priorité worker_profiles (plus riche), sinon profiles
        const workerWP = r.worker_user_id ? workerProfileMap.get(r.worker_user_id) : null;
        const workerP = r.worker_user_id ? profileMap.get(r.worker_user_id) : null;

        return {
          ...r,
          client_display: buildDisplay(clientP ?? null, r.client_user_id),
          worker_display: buildDisplay((workerWP ?? workerP) ?? null, r.worker_user_id),
        };
      });

      setRows(enriched);
    } catch (e: any) {
      const msg = e?.message ?? "Impossible de charger les avis.";
      setError(msg);
      setRows([]);
      setCounts({ total: 0, pending: 0, published: 0, hidden: 0, rejected: 0 });
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // si on change les filtres, revenir page 1 (sinon page vide)
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, perPage]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, perPage, page]);

  const openDetails = (r: ReviewRow) => {
    setSelected(r);
    setNote(r.moderation_note ?? "");
    setOpen(true);
  };

  const closeDetails = () => {
    setOpen(false);
    setSelected(null);
    setNote("");
    setSaving(false);
  };

  const applyModeration = async (action: "publish" | "hide" | "reject") => {
    if (!selected) return;

    setSaving(true);
    try {
      const payload: Partial<ReviewRow> = {
        moderation_note: note?.trim() ? note.trim() : null,
        moderated_at: new Date().toISOString(),
      };

      if (action === "publish") {
        payload.status = "published";
        payload.is_public = true;
      } else if (action === "hide") {
        payload.status = "hidden";
        payload.is_public = false;
      } else {
        payload.status = "rejected";
        payload.is_public = false;
      }

      const user = (await supabase.auth.getUser())?.data?.user ?? null;
      if (user?.id) (payload as any).moderated_by = user.id;

      const { error } = await supabase.from(TABLE).update(payload).eq("id", selected.id);
      if (error) throw error;

      toast({
        title: "Modération enregistrée",
        description:
          action === "publish"
            ? "Avis publié."
            : action === "hide"
            ? "Avis masqué."
            : "Avis rejeté.",
      });

      closeDetails();
      await fetchData();
    } catch (e: any) {
      const msg = e?.message ?? "Échec de la modération.";
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const uiCounts = useMemo(() => counts, [counts]);

  return (
    <div className="space-y-5">
      <Card className="border-slate-200">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">Modération des avis</CardTitle>
            <div className="mt-1 text-xs text-slate-500">
              Affiche tous les commentaires laissés entre clients/particuliers et ouvriers/prestataires. Vous pouvez publier, masquer ou rejeter.
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
                Publié: <span className="font-medium text-slate-700">{uiCounts.published}</span>
              </span>
              <span>•</span>
              <span>
                Masqué: <span className="font-medium text-slate-700">{uiCounts.hidden}</span>
              </span>
              <span>•</span>
              <span>
                Rejeté: <span className="font-medium text-slate-700">{uiCounts.rejected}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={fetchData} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Rafraîchir
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-5">
              <label className="text-xs font-medium text-slate-600">Recherche</label>
              <div className="mt-1 relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Titre, contenu, note de modération… (ou coller un UUID pour filtrer)"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="text-xs font-medium text-slate-600">Statut</label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="all">Tous</option>
                <option value="pending">En attente</option>
                <option value="published">Publié</option>
                <option value="hidden">Masqué</option>
                <option value="rejected">Rejeté</option>
              </select>
            </div>

            <div className="lg:col-span-2">
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
                <Button type="button" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
                  -
                </Button>
                <div className="text-sm text-slate-700 min-w-[42px] text-center">{page}</div>
                <Button type="button" variant="outline" onClick={() => setPage((p) => p + 1)} disabled={loading}>
                  +
                </Button>
              </div>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          {!error && !loading && rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Aucun avis trouvé avec ces filtres.
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr className="text-left">
                  <th className="px-4 py-3 whitespace-nowrap">Date</th>
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
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700" title={r.client_user_id ?? ""}>
                      {truncate(r.client_display ?? r.client_user_id, 26)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700" title={r.worker_user_id ?? ""}>
                      {truncate(r.worker_display ?? r.worker_user_id, 26)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">{r.rating ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700" title={r.content ?? ""}>
                      {truncate(r.title ? `${r.title} — ${r.content ?? ""}` : r.content, 64)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{statusBadge(r.status, r.is_public)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => openDetails(r)}>
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
        </CardContent>
      </Card>

      {/* Modal Détails */}
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeDetails())}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Détail de l’avis</DialogTitle>
          </DialogHeader>

          {!selected ? (
            <div className="text-sm text-slate-500">Aucun avis sélectionné.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Client</div>
                    <div className="font-medium text-slate-900 break-words">
                      {selected.client_display ?? selected.client_user_id ?? "—"}
                    </div>

                    <div className="mt-2 text-xs text-slate-500">Prestataire</div>
                    <div className="font-medium text-slate-900 break-words">
                      {selected.worker_display ?? selected.worker_user_id ?? "—"}
                    </div>

                    <div className="mt-2 text-xs text-slate-500">Date</div>
                    <div className="font-medium text-slate-900">{fmtDate(selected.created_at)}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-500">Statut</div>
                    <div className="mt-1">{statusBadge(selected.status, selected.is_public)}</div>
                    <div className="mt-2 text-xs text-slate-500">Note</div>
                    <div className="font-medium text-slate-900">{selected.rating ?? "—"} / 5</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs text-slate-500">Titre</div>
                <div className="font-medium text-slate-900">{selected.title ?? "—"}</div>

                <div className="mt-3 text-xs text-slate-500">Commentaire</div>
                <div className="text-sm text-slate-800 whitespace-pre-wrap">{selected.content ?? "—"}</div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <label className="text-xs font-medium text-slate-600">Note de modération (visible admin)</label>
                <Textarea className="mt-2" placeholder="Ex: spam, insulte, hors sujet..." value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="mt-2 text-[11px] text-slate-500">
                  Dernière modération : {selected.moderated_at ? fmtDate(selected.moderated_at) : "—"} • par{" "}
                  {selected.moderated_by ?? "—"}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button type="button" variant="outline" onClick={closeDetails} disabled={saving}>
                  Fermer
                </Button>

                <Button
                  type="button"
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => applyModeration("publish")}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Publier
                </Button>

                <Button type="button" variant="outline" className="gap-2" onClick={() => applyModeration("hide")} disabled={saving}>
                  <EyeOff className="h-4 w-4" />
                  Masquer
                </Button>

                <Button type="button" variant="destructive" className="gap-2" onClick={() => applyModeration("reject")} disabled={saving}>
                  <XCircle className="h-4 w-4" />
                  Rejeter
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
