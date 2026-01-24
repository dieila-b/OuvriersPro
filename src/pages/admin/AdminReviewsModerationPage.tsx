// src/pages/admin/AdminReviewsModerationPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Search, Eye, CheckCircle2, XCircle, EyeOff, RefreshCw } from "lucide-react";

// CORRECT TABLE: op_reviews
// Relations:
// - client_user_id -> profiles.id (for client name)
// - worker_user_id -> op_users.id (for worker name via op_users.full_name)

type ReviewRow = {
  id: string;
  created_at: string | null;
  updated_at?: string | null;

  client_user_id: string | null;
  worker_user_id: string | null;

  rating: number | null;
  title: string | null;
  content: string | null;

  status: string | null; // "pending" | "published" | "hidden" | "rejected"
  is_public: boolean | null;

  // Display names (enriched)
  client_display?: string | null;
  worker_display?: string | null;
};

type ProfileRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
};

type OpUserRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
};

type WorkerRow = {
  id: string;
  user_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  profession?: string | null;
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

function statusBadge(status?: string | null, isPublic?: boolean | null) {
  if (status === "hidden" || status === "rejected") {
    return <Badge variant="destructive">Masqué</Badge>;
  }
  if (status === "published" || isPublic === true) {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Publié</Badge>;
  }
  return <Badge className="bg-amber-600 hover:bg-amber-600">En attente</Badge>;
}

function isUuidLike(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v.trim());
}

function buildClientName(profile?: ProfileRow | null, fallbackId?: string | null) {
  if (profile) {
    const first = (profile.first_name ?? "").trim();
    const last = (profile.last_name ?? "").trim();
    const full = (profile.full_name ?? "").trim();
    const name = [first, last].filter(Boolean).join(" ").trim() || full;
    if (name) return name;
    
    const email = (profile.email ?? "").trim();
    if (email) return email;
  }
  
  if (fallbackId) return `${fallbackId.slice(0, 8)}…`;
  return "Client";
}

function buildWorkerName(
  opUser?: OpUserRow | null, 
  worker?: WorkerRow | null, 
  fallbackId?: string | null
) {
  // Priority 1: op_users.full_name
  if (opUser?.full_name?.trim()) {
    const prof = worker?.profession?.trim();
    return prof ? `${opUser.full_name.trim()} • ${prof}` : opUser.full_name.trim();
  }
  
  // Priority 2: op_ouvriers first/last name
  if (worker) {
    const first = (worker.first_name ?? "").trim();
    const last = (worker.last_name ?? "").trim();
    const name = [first, last].filter(Boolean).join(" ").trim();
    if (name) {
      const prof = (worker.profession ?? "").trim();
      return prof ? `${name} • ${prof}` : name;
    }
  }
  
  // Priority 3: email
  if (opUser?.email?.trim()) return opUser.email.trim();
  
  // Fallback
  if (fallbackId) return `${fallbackId.slice(0, 8)}…`;
  return "Prestataire";
}

export default function AdminReviewsModerationPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "pending" | "hidden">("all");
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);

  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    published: 0,
    hidden: 0,
  });

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ReviewRow | null>(null);
  const [saving, setSaving] = useState(false);

  const fromIdx = (page - 1) * perPage;
  const toIdx = fromIdx + perPage - 1;

  const applySearchFilters = (base: any) => {
    const raw = q.trim();
    if (!raw) return base;

    const like = `%${raw.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    base = base.or([`title.ilike.${like}`, `content.ilike.${like}`].join(","));

    if (isUuidLike(raw)) {
      base = base.or([`id.eq.${raw}`, `client_user_id.eq.${raw}`, `worker_user_id.eq.${raw}`].join(","));
    }

    return base;
  };

  const buildListQuery = () => {
    let query = supabase
      .from(TABLE)
      .select(
        "id,created_at,updated_at,client_user_id,worker_user_id,rating,title,content,status,is_public",
        { count: "exact" }
      );

    query = applySearchFilters(query);
    
    // NO hidden filter - show ALL reviews
    if (statusFilter === "published") query = query.or("status.eq.published,is_public.eq.true");
    if (statusFilter === "pending") query = query.eq("status", "pending");
    if (statusFilter === "hidden") query = query.or("status.eq.hidden,status.eq.rejected");

    return query.order("created_at", { ascending: false }).range(fromIdx, toIdx);
  };

  const buildCountQuery = (filter: "all" | "published" | "pending" | "hidden") => {
    let query = supabase.from(TABLE).select("id", { count: "exact", head: true });
    query = applySearchFilters(query);
    
    if (filter === "published") query = query.or("status.eq.published,is_public.eq.true");
    if (filter === "pending") query = query.eq("status", "pending");
    if (filter === "hidden") query = query.or("status.eq.hidden,status.eq.rejected");
    
    return query;
  };

  // Fetch client profiles from profiles table
  const fetchProfiles = async (userIds: string[]) => {
    const uniq = Array.from(new Set(userIds.filter(Boolean)));
    const map = new Map<string, ProfileRow>();
    if (!uniq.length) return map;

    const { data, error } = await supabase
      .from("profiles")
      .select("id,first_name,last_name,full_name,email")
      .in("id", uniq);

    if (error) {
      console.error("[fetchProfiles] error:", error);
      return map;
    }

    (data as ProfileRow[] | null)?.forEach((p) => p?.id && map.set(p.id, p));
    return map;
  };

  // Fetch op_users for worker identity
  const fetchOpUsers = async (userIds: string[]) => {
    const uniq = Array.from(new Set(userIds.filter(Boolean)));
    const map = new Map<string, OpUserRow>();
    if (!uniq.length) return map;

    const { data, error } = await supabase
      .from("op_users")
      .select("id,full_name,email")
      .in("id", uniq);

    if (error) {
      console.error("[fetchOpUsers] error:", error);
      return map;
    }

    (data as OpUserRow[] | null)?.forEach((u) => u?.id && map.set(u.id, u));
    return map;
  };

  // Fetch workers from op_ouvriers (for profession)
  const fetchWorkers = async (userIds: string[]) => {
    const uniq = Array.from(new Set(userIds.filter(Boolean)));
    const map = new Map<string, WorkerRow>();
    if (!uniq.length) return map;

    // op_ouvriers.user_id = op_users.id
    const { data, error } = await supabase
      .from("op_ouvriers")
      .select("id,user_id,first_name,last_name,profession")
      .in("user_id", uniq);

    if (error) {
      console.error("[fetchWorkers] error:", error);
      return map;
    }

    // Map by user_id (not by id)
    (data as WorkerRow[] | null)?.forEach((w) => w?.user_id && map.set(w.user_id, w));
    return map;
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: e1 } = await buildListQuery();
      if (e1) throw e1;

      const baseRows = (data ?? []) as ReviewRow[];

      console.log("[AdminReviews] Fetched", baseRows.length, "reviews from", TABLE);

      const [cAll, cPending, cPublished, cHidden] = await Promise.all([
        buildCountQuery("all"),
        buildCountQuery("pending"),
        buildCountQuery("published"),
        buildCountQuery("hidden"),
      ]);

      setCounts({
        total: cAll.count ?? 0,
        pending: cPending.count ?? 0,
        published: cPublished.count ?? 0,
        hidden: cHidden.count ?? 0,
      });

      // Get unique client and worker IDs
      const clientIds = baseRows.map((r) => r.client_user_id ?? "").filter(Boolean);
      const workerIds = baseRows.map((r) => r.worker_user_id ?? "").filter(Boolean);

      // Fetch related data in parallel
      const [profileMap, opUserMap, workerMap] = await Promise.all([
        fetchProfiles(clientIds),
        fetchOpUsers(workerIds),
        fetchWorkers(workerIds),
      ]);

      // Enrich rows with display names
      const enriched = baseRows.map((r) => {
        const clientProfile = r.client_user_id ? profileMap.get(r.client_user_id) : null;
        const workerOpUser = r.worker_user_id ? opUserMap.get(r.worker_user_id) : null;
        const workerData = r.worker_user_id ? workerMap.get(r.worker_user_id) : null;

        return {
          ...r,
          client_display: buildClientName(clientProfile, r.client_user_id),
          worker_display: buildWorkerName(workerOpUser, workerData, r.worker_user_id),
        };
      });

      setRows(enriched);
    } catch (e: any) {
      const msg = e?.message ?? "Impossible de charger les avis.";
      console.error("[AdminReviews] error:", e);
      setError(msg);
      setRows([]);
      setCounts({ total: 0, pending: 0, published: 0, hidden: 0 });
      toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [statusFilter, q, perPage]);

  useEffect(() => {
    fetchData();
  }, [statusFilter, q, perPage, page]);

  const openDetails = (r: ReviewRow) => {
    setSelected(r);
    setOpen(true);
  };

  const closeDetails = () => {
    setOpen(false);
    setSelected(null);
    setSaving(false);
  };

  const applyModeration = async (action: "publish" | "unpublish" | "hide") => {
    if (!selected) return;

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (action === "publish") {
        payload.status = "published";
        payload.is_public = true;
      } else if (action === "unpublish") {
        payload.status = "pending";
        payload.is_public = false;
      } else if (action === "hide") {
        payload.status = "hidden";
        payload.is_public = false;
      }

      const { error } = await supabase.from(TABLE).update(payload).eq("id", selected.id);
      if (error) throw error;

      const messages: Record<string, string> = {
        publish: "Avis publié.",
        unpublish: "Avis dépublié.",
        hide: "Avis masqué.",
      };

      toast({
        title: "Modération enregistrée",
        description: messages[action],
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
              Avis des clients sur les prestataires. L'admin peut publier, dépublier ou masquer.
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span>Total: <span className="font-medium text-slate-700">{uiCounts.total}</span></span>
              <span>•</span>
              <span>En attente: <span className="font-medium text-slate-700">{uiCounts.pending}</span></span>
              <span>•</span>
              <span>Publié: <span className="font-medium text-slate-700">{uiCounts.published}</span></span>
              <span>•</span>
              <span>Masqué: <span className="font-medium text-slate-700">{uiCounts.hidden}</span></span>
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
                  placeholder="Titre, contenu… (ou UUID)"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="text-xs font-medium text-slate-600">Statut</label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">Tous</option>
                <option value="pending">En attente</option>
                <option value="published">Publié</option>
                <option value="hidden">Masqué</option>
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
                  <th className="px-4 py-3 whitespace-nowrap text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">{r.client_display}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{r.worker_display}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-amber-600 font-semibold">{r.rating ?? "—"}/5</td>
                    <td className="px-4 py-3 max-w-xs truncate text-slate-600">{truncate(r.content)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{statusBadge(r.status, r.is_public)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openDetails(r)} title="Voir détails">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail / moderation dialog */}
      <Dialog open={open} onOpenChange={(v) => !v && closeDetails()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Détail de l'avis</DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500">Client</div>
                  <div className="font-medium">{selected.client_display}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Prestataire</div>
                  <div className="font-medium">{selected.worker_display}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Date</div>
                  <div>{fmtDate(selected.created_at)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Note</div>
                  <div className="font-semibold text-amber-600">{selected.rating ?? "—"}/5</div>
                </div>
              </div>

              {selected.title && (
                <div>
                  <div className="text-xs text-slate-500">Titre</div>
                  <div className="font-medium">{selected.title}</div>
                </div>
              )}

              <div>
                <div className="text-xs text-slate-500">Contenu</div>
                <div className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 border border-slate-200">
                  {selected.content || "—"}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-2">Statut actuel</div>
                {statusBadge(selected.status, selected.is_public)}
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                {(selected.status !== "published" && selected.is_public !== true) && (
                  <Button
                    type="button"
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => applyModeration("publish")}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Publier
                  </Button>
                )}

                {(selected.status === "published" || selected.is_public === true) && (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => applyModeration("unpublish")}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
                    Dépublier
                  </Button>
                )}

                {selected.status !== "hidden" && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="gap-2"
                    onClick={() => applyModeration("hide")}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Masquer
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
