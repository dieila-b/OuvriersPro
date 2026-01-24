// src/pages/admin/AdminReviewsModerationPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Search, Eye, CheckCircle2, XCircle, EyeOff, RefreshCw } from "lucide-react";

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

  client_display?: string | null;
  worker_display?: string | null;
};

type ProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  is_admin?: boolean | null;
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

  if (s === "published" && pub) return <Badge className="bg-emerald-600 hover:bg-emerald-600">Publié</Badge>;
  if (s === "hidden") return <Badge className="bg-slate-600 hover:bg-slate-600">Masqué</Badge>;
  if (s === "rejected") return <Badge variant="destructive">Rejeté</Badge>;
  return <Badge className="bg-amber-600 hover:bg-amber-600">En attente</Badge>;
}

function isUuidLike(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.trim());
}

function buildName(p?: Partial<ProfileRow> | null, fallbackId?: string | null) {
  const first = (p?.first_name ?? "").trim();
  const last = (p?.last_name ?? "").trim();
  const parts = [first, last].filter(Boolean).join(" ").trim();

  const full = (p?.full_name ?? "").trim();
  const email = (p?.email ?? "").trim();

  if (parts) return parts;
  if (full) return full;
  if (email) return email;

  if (fallbackId) return `${fallbackId.slice(0, 8)}…${fallbackId.slice(-4)}`;
  return "Utilisateur";
}

export default function AdminReviewsModerationPage() {
  const { toast } = useToast();

  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ReviewStatus | "all">("all");
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);

  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    published: 0,
    hidden: 0,
    rejected: 0,
  });

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ReviewRow | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fromIdx = (page - 1) * perPage;
  const toIdx = fromIdx + perPage - 1;

  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const fetchingRef = useRef(false);

  const applySearchFilters = (base: any) => {
    const raw = q.trim();
    if (!raw) return base;

    const like = `%${raw.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    base = base.or([`title.ilike.${like}`, `content.ilike.${like}`, `moderation_note.ilike.${like}`].join(","));

    if (isUuidLike(raw)) {
      base = base.or([`id.eq.${raw}`, `client_user_id.eq.${raw}`, `worker_user_id.eq.${raw}`, `related_order_id.eq.${raw}`].join(","));
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
    let query = supabase.from(TABLE).select("id", { count: "exact", head: true });
    query = applySearchFilters(query);
    if (s !== "all") query = query.eq("status", s);
    return query;
  };

  const checkAdmin = async () => {
    setCheckingAdmin(true);
    try {
      const { data: au, error: eAu } = await supabase.auth.getUser();
      if (eAu) throw eAu;
      const uid = au?.user?.id;
      if (!uid) {
        setIsAdmin(false);
        return;
      }

      const { data, error: e } = await supabase
        .from("profiles")
        .select("id,is_admin")
        .eq("id", uid)
        .maybeSingle();

      if (e) throw e;
      setIsAdmin(!!data?.is_admin);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Impossible de vérifier le rôle admin.", variant: "destructive" });
      setIsAdmin(false);
    } finally {
      setCheckingAdmin(false);
    }
  };

  const fetchProfilesMap = async (ids: string[]) => {
    const uniq = Array.from(new Set(ids.filter(Boolean)));
    const map = new Map<string, ProfileRow>();
    if (!uniq.length) return map;

    // IMPORTANT: ceci suppose la policy profiles_admin_select_all (SQL ci-dessus)
    const { data, error: e } = await supabase
      .from("profiles")
      .select("id,email,first_name,last_name,full_name")
      .in("id", uniq);

    if (e) {
      // On affiche l’erreur car sinon vous ne saurez pas que la policy manque
      toast({
        title: "Lecture profils refusée",
        description: `profiles: ${e.message}`,
        variant: "destructive",
      });
      return map;
    }

    (data ?? []).forEach((p: any) => map.set(p.id, p as ProfileRow));
    return map;
  };

  const fetchData = async () => {
    if (!isAdmin) return;
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    setLoading(true);
    setError(null);

    try {
      const { data, error: e1 } = await buildListQuery();
      if (e1) throw e1;

      const baseRows = (data ?? []) as ReviewRow[];

      const [cAll, cPending, cPublished, cHidden, cRejected] = await Promise.all([
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

      const ids = Array.from(
        new Set(baseRows.flatMap((r) => [r.client_user_id, r.worker_user_id]).filter(Boolean) as string[])
      );

      const profileMap = await fetchProfilesMap(ids);

      const enriched = baseRows.map((r) => {
        const clientP = r.client_user_id ? profileMap.get(r.client_user_id) : null;
        const workerP = r.worker_user_id ? profileMap.get(r.worker_user_id) : null;

        return {
          ...r,
          client_display: buildName(clientP ?? null, r.client_user_id),
          worker_display: buildName(workerP ?? null, r.worker_user_id),
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
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    checkAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!checkingAdmin && isAdmin) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAdmin, isAdmin]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, perPage]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, q, perPage, page, isAdmin]);

  // Realtime: auto refresh quand un avis est créé/modifié/supprimé
  useEffect(() => {
    if (!isAdmin) return;

    // cleanup ancien channel si existant
    if (realtimeRef.current) {
      supabase.removeChannel(realtimeRef.current);
      realtimeRef.current = null;
    }

    const ch = supabase
      .channel("admin-op-reviews")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        () => {
          // Recharge sans casser les filtres/pagination
          fetchData();
        }
      )
      .subscribe();

    realtimeRef.current = ch;

    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current);
        realtimeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

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
    if (!isAdmin) return;

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
        description: action === "publish" ? "Avis publié." : action === "hide" ? "Avis masqué." : "Avis rejeté.",
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

  if (checkingAdmin) {
    return (
      <div className="p-6 text-sm text-slate-600 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Vérification des droits…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-base text-red-700">Accès refusé</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-red-700">
            Vous n’avez pas les droits administrateur pour accéder à la modération des avis.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="border-slate-200">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">Modération des avis</CardTitle>
            <div className="mt-1 text-xs text-slate-500">
              Tous les avis laissés par clients et prestataires apparaissent ici. Seul un admin peut publier, masquer ou rejeter.
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span>Total: <span className="font-medium text-slate-700">{uiCounts.total}</span></span>
              <span>•</span>
              <span>En attente: <span className="font-medium text-slate-700">{uiCounts.pending}</span></span>
              <span>•</span>
              <span>Publié: <span className="font-medium text-slate-700">{uiCounts.published}</span></span>
              <span>•</span>
              <span>Masqué: <span className="font-medium text-slate-700">{uiCounts.hidden}</span></span>
              <span>•</span>
              <span>Rejeté: <span className="font-medium text-slate-700">{uiCounts.rejected}</span></span>
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-5">
              <label className="text-xs font-medium text-slate-600">Recherche</label>
              <div className="mt-1 relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="Titre, contenu, note de modération… (ou UUID)"
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
                      {truncate(r.client_display ?? "—", 28)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700" title={r.worker_user_id ?? ""}>
                      {truncate(r.worker_display ?? "—", 28)}
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
                    <div className="font-medium text-slate-900 break-words" title={selected.client_user_id ?? ""}>
                      {selected.client_display ?? "—"}
                    </div>

                    <div className="mt-2 text-xs text-slate-500">Prestataire</div>
                    <div className="font-medium text-slate-900 break-words" title={selected.worker_user_id ?? ""}>
                      {selected.worker_display ?? "—"}
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
                  Dernière modération : {selected.moderated_at ? fmtDate(selected.moderated_at) : "—"} • par {selected.moderated_by ?? "—"}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button type="button" variant="outline" onClick={closeDetails} disabled={saving}>
                  Fermer
                </Button>

                <Button type="button" className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => applyModeration("publish")} disabled={saving}>
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
