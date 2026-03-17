import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Megaphone,
  RefreshCw,
  Plus,
  CalendarRange,
  Link as LinkIcon,
  Image as ImageIcon,
  Video,
  Upload,
  Pencil,
  Trash2,
  PauseCircle,
  PlayCircle,
  Eye,
  Clock3,
  LayoutTemplate,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FolderOpen,
} from "lucide-react";

type CampaignStatus = "draft" | "published" | "paused" | "ended";
type MediaType = "image" | "video";

type Campaign = {
  id: string;
  title: string;
  status: CampaignStatus;
  placement: string;
  start_at: string | null;
  end_at: string | null;
  link_url: string | null;
  display_seconds?: number | null;
  created_at: string;
};

type Asset = {
  id: string;
  campaign_id: string;
  media_type: MediaType;
  storage_path: string;
  created_at: string;
};

const DEFAULT_PLACEMENT = "home_feed";
const DEFAULT_DISPLAY_SECONDS = 8;
const MIN_DISPLAY_SECONDS = 1;
const MAX_DISPLAY_SECONDS = 300;

function extFromName(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function guessMediaType(file: File): MediaType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  const ext = extFromName(file.name);
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  return null;
}

function inferMimeFromExt(path: string): string | null {
  const ext = extFromName(path);
  if (ext === "mp4") return "video/mp4";
  if (ext === "webm") return "video/webm";
  if (ext === "mov") return "video/quicktime";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return null;
}

function toIsoOrNull(localValue: string) {
  return localValue ? new Date(localValue).toISOString() : null;
}

function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function clampInt(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function safeInt(val: string, fallback: number) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return clampInt(Math.floor(n), MIN_DISPLAY_SECONDS, MAX_DISPLAY_SECONDS);
}

function normalizeUrl(url: string) {
  const u = url.trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}

function statusLabel(status: CampaignStatus) {
  switch (status) {
    case "published":
      return "Publié";
    case "paused":
      return "En pause";
    case "ended":
      return "Terminé";
    default:
      return "Brouillon";
  }
}

function statusTone(status: CampaignStatus) {
  switch (status) {
    case "published":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "paused":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "ended":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapSupabaseError(message?: string | null) {
  const msg = (message || "").toLowerCase();

  if (
    msg.includes("row-level security") &&
    msg.includes("ads_campaigns")
  ) {
    return "Enregistrement refusé par la sécurité de la base de données. Votre compte n’a pas encore l’autorisation d’ajouter une campagne publicitaire.";
  }

  if (msg.includes("duplicate key")) {
    return "Une campagne identique existe déjà.";
  }

  if (msg.includes("invalid input syntax")) {
    return "Certaines valeurs saisies ne sont pas valides.";
  }

  return message || "Une erreur est survenue.";
}

function extractFileName(path: string) {
  const parts = path.split("/");
  return parts[parts.length - 1] || path;
}

export default function AdminAds() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [assetsByCampaign, setAssetsByCampaign] = useState<Record<string, Asset[]>>({});
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [placement, setPlacement] = useState(DEFAULT_PLACEMENT);
  const [linkUrl, setLinkUrl] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [displaySeconds, setDisplaySeconds] = useState(String(DEFAULT_DISPLAY_SECONDS));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [eTitle, setETitle] = useState("");
  const [ePlacement, setEPlacement] = useState(DEFAULT_PLACEMENT);
  const [eLinkUrl, setELinkUrl] = useState("");
  const [eStartAt, setEStartAt] = useState("");
  const [eEndAt, setEEndAt] = useState("");
  const [eDisplaySeconds, setEDisplaySeconds] = useState(String(DEFAULT_DISPLAY_SECONDS));

  const stats = useMemo(() => {
    const total = campaigns.length;
    const published = campaigns.filter((c) => c.status === "published").length;
    const drafts = campaigns.filter((c) => c.status === "draft").length;
    const paused = campaigns.filter((c) => c.status === "paused").length;
    return { total, published, drafts, paused };
  }, [campaigns]);

  const resetCreate = () => {
    setTitle("");
    setPlacement(DEFAULT_PLACEMENT);
    setLinkUrl("");
    setStartAt("");
    setEndAt("");
    setDisplaySeconds(String(DEFAULT_DISPLAY_SECONDS));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setETitle("");
    setEPlacement(DEFAULT_PLACEMENT);
    setELinkUrl("");
    setEStartAt("");
    setEEndAt("");
    setEDisplaySeconds(String(DEFAULT_DISPLAY_SECONDS));
  };

  const validateWindow = (sLocal: string, eLocal: string) => {
    if (!sLocal || !eLocal) return;
    const s = new Date(sLocal).getTime();
    const e = new Date(eLocal).getTime();
    if (Number.isFinite(s) && Number.isFinite(e) && e < s) {
      throw new Error("La date de fin doit être postérieure à la date de début.");
    }
  };

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      let rows: any[] | null = null;

      const withDisplay = await supabase
        .from("ads_campaigns")
        .select("id,title,status,placement,start_at,end_at,link_url,display_seconds,created_at")
        .order("created_at", { ascending: false });

      if (withDisplay.error) {
        const withoutDisplay = await supabase
          .from("ads_campaigns")
          .select("id,title,status,placement,start_at,end_at,link_url,created_at")
          .order("created_at", { ascending: false });

        if (withoutDisplay.error) throw withoutDisplay.error;
        rows = withoutDisplay.data ?? [];
      } else {
        rows = withDisplay.data ?? [];
      }

      const campaignsData = (rows ?? []) as Campaign[];
      setCampaigns(campaignsData);

      if (!campaignsData.length) {
        setAssetsByCampaign({});
        return;
      }

      const ids = campaignsData.map((item) => item.id);

      const { data: assets, error: assetsError } = await supabase
        .from("ads_assets")
        .select("id,campaign_id,media_type,storage_path,created_at")
        .in("campaign_id", ids)
        .order("created_at", { ascending: false });

      if (assetsError) throw assetsError;

      const grouped: Record<string, Asset[]> = {};
      (assets ?? []).forEach((asset: any) => {
        if (!grouped[asset.campaign_id]) grouped[asset.campaign_id] = [];
        grouped[asset.campaign_id].push(asset);
      });

      setAssetsByCampaign(grouped);
    } catch (e: any) {
      setError(mapSupabaseError(e?.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createCampaign = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!title.trim()) throw new Error("Le titre est requis.");
      validateWindow(startAt, endAt);

      const payloadBase: any = {
        title: title.trim(),
        placement: placement.trim() || DEFAULT_PLACEMENT,
        status: "draft" as CampaignStatus,
        link_url: normalizeUrl(linkUrl),
        start_at: toIsoOrNull(startAt),
        end_at: toIsoOrNull(endAt),
      };

      const payloadWithDisplay = {
        ...payloadBase,
        display_seconds: safeInt(displaySeconds, DEFAULT_DISPLAY_SECONDS),
      };

      const insertWithDisplay = await supabase.from("ads_campaigns").insert(payloadWithDisplay);

      if (insertWithDisplay.error) {
        const insertWithoutDisplay = await supabase.from("ads_campaigns").insert(payloadBase);
        if (insertWithoutDisplay.error) throw insertWithoutDisplay.error;
      }

      resetCreate();
      await refresh();

      toast({
        title: "Campagne créée",
        description: "La campagne a bien été enregistrée en brouillon.",
      });
    } catch (e: any) {
      setError(mapSupabaseError(e?.message));
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setETitle(campaign.title ?? "");
    setEPlacement(campaign.placement ?? DEFAULT_PLACEMENT);
    setELinkUrl(campaign.link_url ?? "");
    setEStartAt(toLocalInputValue(campaign.start_at));
    setEEndAt(toLocalInputValue(campaign.end_at));
    setEDisplaySeconds(String(campaign.display_seconds ?? DEFAULT_DISPLAY_SECONDS));
  };

  const saveEdit = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      if (!eTitle.trim()) throw new Error("Le titre est requis.");
      validateWindow(eStartAt, eEndAt);

      const base: any = {
        title: eTitle.trim(),
        placement: ePlacement.trim() || DEFAULT_PLACEMENT,
        link_url: normalizeUrl(eLinkUrl),
        start_at: toIsoOrNull(eStartAt),
        end_at: toIsoOrNull(eEndAt),
      };

      const withDisplay = {
        ...base,
        display_seconds: safeInt(eDisplaySeconds, DEFAULT_DISPLAY_SECONDS),
      };

      const updateWithDisplay = await supabase
        .from("ads_campaigns")
        .update(withDisplay)
        .eq("id", id);

      if (updateWithDisplay.error) {
        const updateWithoutDisplay = await supabase
          .from("ads_campaigns")
          .update(base)
          .eq("id", id);

        if (updateWithoutDisplay.error) throw updateWithoutDisplay.error;
      }

      cancelEdit();
      await refresh();

      toast({
        title: "Campagne mise à jour",
        description: "Les modifications ont bien été enregistrées.",
      });
    } catch (e: any) {
      setError(mapSupabaseError(e?.message));
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: CampaignStatus) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from("ads_campaigns")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      await refresh();

      toast({
        title: "Statut mis à jour",
        description: `La campagne est maintenant "${statusLabel(status)}".`,
      });
    } catch (e: any) {
      setError(mapSupabaseError(e?.message));
    } finally {
      setLoading(false);
    }
  };

  const deleteCampaign = async (id: string) => {
    const ok = window.confirm("Voulez-vous vraiment supprimer cette campagne et ses médias ?");
    if (!ok) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.from("ads_campaigns").delete().eq("id", id);
      if (error) throw error;

      const toRemove: string[] = [];
      for (const folder of ["images", "videos"]) {
        const { data: listData, error: listErr } = await supabase.storage
          .from("ads-media")
          .list(`${folder}/${id}`, { limit: 100 });

        if (!listErr && listData?.length) {
          listData.forEach((f) => toRemove.push(`${folder}/${id}/${f.name}`));
        }
      }

      if (toRemove.length) {
        await supabase.storage.from("ads-media").remove(toRemove);
      }

      await refresh();

      toast({
        title: "Campagne supprimée",
        description: "La campagne et ses médias ont été supprimés.",
      });
    } catch (e: any) {
      setError(mapSupabaseError(e?.message));
    } finally {
      setLoading(false);
    }
  };

  const uploadAsset = async (campaignId: string, file: File) => {
    setLoading(true);
    setError(null);

    try {
      const mediaType = guessMediaType(file);
      if (!mediaType) {
        throw new Error("Format non supporté. Utilisez une image ou une vidéo.");
      }

      const folder = mediaType === "image" ? "images" : "videos";
      const safeName = file.name.replace(/\s+/g, "_");
      const storagePath = `${folder}/${campaignId}/${safeName}`;
      const contentType = file.type || inferMimeFromExt(storagePath) || undefined;

      const { error: uploadError } = await supabase.storage
        .from("ads-media")
        .upload(storagePath, file, {
          upsert: true,
          contentType,
        });

      if (uploadError) throw uploadError;

      const { error: insertAssetError } = await supabase.from("ads_assets").insert({
        campaign_id: campaignId,
        media_type: mediaType,
        storage_path: storagePath,
        mime_type: contentType ?? null,
        size_bytes: file.size || null,
      });

      if (insertAssetError) throw insertAssetError;

      await refresh();

      toast({
        title: "Média ajouté",
        description: "Le média a bien été uploadé sur la campagne.",
      });
    } catch (e: any) {
      setError(mapSupabaseError(e?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_-24px_rgba(15,23,42,0.25)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_30%),linear-gradient(to_bottom,rgba(255,255,255,0.95),rgba(255,255,255,1))]" />
          <div className="relative border-b border-slate-200 px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  Gestion publicitaire
                </div>

                <div className="mt-3 flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-blue-500/20">
                    <Megaphone className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                      Publicités
                    </h1>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                      Créez, planifiez, illustrez et pilotez vos campagnes d’affichage
                      depuis une interface élégante, claire et structurée.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={refresh}
                  disabled={loading}
                  className="rounded-xl border-slate-200 bg-white/80 backdrop-blur"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Rafraîchir
                </Button>
              </div>
            </div>
          </div>

          <div className="relative px-5 py-5 sm:px-7 sm:py-6">
            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-white p-1 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold">Action impossible</div>
                    <div className="mt-0.5 text-red-700/90">{error}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="rounded-2xl border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        Total campagnes
                      </p>
                      <p className="mt-3 text-3xl font-bold text-slate-900">{stats.total}</p>
                    </div>
                    <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                      <LayoutTemplate className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-gradient-to-br from-white to-emerald-50 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        En ligne
                      </p>
                      <p className="mt-3 text-3xl font-bold text-slate-900">{stats.published}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-gradient-to-br from-white to-blue-50 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        Brouillons
                      </p>
                      <p className="mt-3 text-3xl font-bold text-slate-900">{stats.drafts}</p>
                    </div>
                    <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-gradient-to-br from-white to-amber-50 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        En pause
                      </p>
                      <p className="mt-3 text-3xl font-bold text-slate-900">{stats.paused}</p>
                    </div>
                    <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                      <PauseCircle className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
              <Card className="rounded-[24px] border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white">
                      <Plus className="h-5 w-5" />
                    </div>
                    Nouvelle campagne
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Titre
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex. Offre spéciale accueil"
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Placement
                    </label>
                    <Input
                      value={placement}
                      onChange={(e) => setPlacement(e.target.value)}
                      placeholder="home_feed"
                      className="h-11 rounded-xl border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Lien de redirection
                    </label>
                    <div className="relative">
                      <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className="h-11 rounded-xl border-slate-200 pl-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Début
                      </label>
                      <Input
                        type="datetime-local"
                        value={startAt}
                        onChange={(e) => setStartAt(e.target.value)}
                        className="h-11 rounded-xl border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Fin
                      </label>
                      <Input
                        type="datetime-local"
                        value={endAt}
                        onChange={(e) => setEndAt(e.target.value)}
                        className="h-11 rounded-xl border-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Durée d’affichage
                    </label>
                    <div className="relative">
                      <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="number"
                        min={MIN_DISPLAY_SECONDS}
                        max={MAX_DISPLAY_SECONDS}
                        value={displaySeconds}
                        onChange={(e) => setDisplaySeconds(e.target.value)}
                        className="h-11 rounded-xl border-slate-200 pl-9"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      Entre {MIN_DISPLAY_SECONDS}s et {MAX_DISPLAY_SECONDS}s.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white p-2 text-blue-600 shadow-sm">
                        <Eye className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Création en brouillon</p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-600">
                          La campagne est enregistrée en brouillon avant publication.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      onClick={createCampaign}
                      disabled={loading}
                      className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-blue-500/20 hover:opacity-95"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Créer la campagne
                    </Button>

                    <Button
                      variant="outline"
                      onClick={resetCreate}
                      disabled={loading}
                      className="rounded-xl border-slate-200"
                    >
                      Réinitialiser
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {campaigns.length === 0 ? (
                  <Card className="rounded-[24px] border-dashed border-slate-300 bg-white/80 shadow-sm">
                    <CardContent className="flex min-h-[260px] flex-col items-center justify-center px-6 py-10 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-100 to-violet-100 text-blue-700">
                        <Megaphone className="h-8 w-8" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-slate-900">
                        Aucune campagne pour le moment
                      </h3>
                      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                        Commencez par créer votre première campagne pour gérer vos affichages
                        publicitaires depuis cet espace.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  campaigns.map((campaign) => {
                    const assets = assetsByCampaign[campaign.id] ?? [];
                    const latest = assets[0];
                    const isEditing = editingId === campaign.id;

                    return (
                      <Card
                        key={campaign.id}
                        className="overflow-hidden rounded-[24px] border-slate-200 bg-white shadow-sm"
                      >
                        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

                        <CardContent className="p-5 sm:p-6">
                          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-xl font-semibold text-slate-900">
                                  {campaign.title}
                                </h3>

                                <Badge
                                  className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone(
                                    campaign.status
                                  )}`}
                                >
                                  {statusLabel(campaign.status)}
                                </Badge>

                                <Badge
                                  variant="outline"
                                  className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                                >
                                  {campaign.placement}
                                </Badge>
                              </div>

                              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <CalendarRange className="h-4 w-4" />
                                    Période
                                  </div>
                                  <div className="mt-2 text-sm font-medium text-slate-900">
                                    {formatDateTime(campaign.start_at)}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    au {formatDateTime(campaign.end_at)}
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <Clock3 className="h-4 w-4" />
                                    Affichage
                                  </div>
                                  <div className="mt-2 text-sm font-medium text-slate-900">
                                    {campaign.display_seconds ?? DEFAULT_DISPLAY_SECONDS} secondes
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    Temps d’exposition par spot
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    <ImageIcon className="h-4 w-4" />
                                    Média
                                  </div>
                                  <div className="mt-2 text-sm font-medium text-slate-900">
                                    {latest
                                      ? latest.media_type === "video"
                                        ? "Vidéo"
                                        : "Image"
                                      : "Aucun média"}
                                  </div>
                                  <div className="mt-1 truncate text-xs text-slate-500">
                                    {latest ? extractFileName(latest.storage_path) : "En attente d’upload"}
                                  </div>
                                </div>
                              </div>

                              {campaign.link_url && (
                                <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                                  <div className="flex items-start gap-2">
                                    <LinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                    <a
                                      href={campaign.link_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="break-all font-medium text-blue-600 hover:underline"
                                    >
                                      {campaign.link_url}
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 xl:w-[290px] xl:justify-end">
                              {!isEditing ? (
                                <>
                                  <Button
                                    variant="outline"
                                    onClick={() => openEdit(campaign)}
                                    disabled={loading}
                                    className="rounded-xl border-slate-200"
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Éditer
                                  </Button>

                                  {campaign.status !== "published" && (
                                    <Button
                                      onClick={() => updateStatus(campaign.id, "published")}
                                      disabled={loading}
                                      className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                                    >
                                      <PlayCircle className="mr-2 h-4 w-4" />
                                      Publier
                                    </Button>
                                  )}

                                  {campaign.status === "published" && (
                                    <Button
                                      variant="outline"
                                      onClick={() => updateStatus(campaign.id, "paused")}
                                      disabled={loading}
                                      className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50"
                                    >
                                      <PauseCircle className="mr-2 h-4 w-4" />
                                      Mettre en pause
                                    </Button>
                                  )}

                                  {campaign.status === "paused" && (
                                    <Button
                                      onClick={() => updateStatus(campaign.id, "published")}
                                      disabled={loading}
                                      className="rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                      <PlayCircle className="mr-2 h-4 w-4" />
                                      Reprendre
                                    </Button>
                                  )}

                                  <Button
                                    variant="destructive"
                                    onClick={() => deleteCampaign(campaign.id)}
                                    disabled={loading}
                                    className="rounded-xl"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    onClick={() => saveEdit(campaign.id)}
                                    disabled={loading}
                                    className="rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white"
                                  >
                                    Enregistrer
                                  </Button>

                                  <Button
                                    variant="outline"
                                    onClick={cancelEdit}
                                    disabled={loading}
                                    className="rounded-xl border-slate-200"
                                  >
                                    Annuler
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {isEditing && (
                            <div className="mt-5 rounded-[22px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5">
                              <div className="mb-4 flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                                  <Pencil className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900">Modifier la campagne</div>
                                  <div className="text-xs text-slate-500">
                                    Ajustez les informations principales de diffusion
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Titre
                                  </label>
                                  <Input
                                    value={eTitle}
                                    onChange={(e) => setETitle(e.target.value)}
                                    className="h-11 rounded-xl border-slate-200"
                                  />
                                </div>

                                <div>
                                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Placement
                                  </label>
                                  <Input
                                    value={ePlacement}
                                    onChange={(e) => setEPlacement(e.target.value)}
                                    className="h-11 rounded-xl border-slate-200"
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Lien de redirection
                                  </label>
                                  <Input
                                    value={eLinkUrl}
                                    onChange={(e) => setELinkUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="h-11 rounded-xl border-slate-200"
                                  />
                                </div>

                                <div>
                                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Début
                                  </label>
                                  <Input
                                    type="datetime-local"
                                    value={eStartAt}
                                    onChange={(e) => setEStartAt(e.target.value)}
                                    className="h-11 rounded-xl border-slate-200"
                                  />
                                </div>

                                <div>
                                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Fin
                                  </label>
                                  <Input
                                    type="datetime-local"
                                    value={eEndAt}
                                    onChange={(e) => setEEndAt(e.target.value)}
                                    className="h-11 rounded-xl border-slate-200"
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Durée d’affichage
                                  </label>
                                  <Input
                                    type="number"
                                    min={MIN_DISPLAY_SECONDS}
                                    max={MAX_DISPLAY_SECONDS}
                                    value={eDisplaySeconds}
                                    onChange={(e) => setEDisplaySeconds(e.target.value)}
                                    className="h-11 rounded-xl border-slate-200"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                  {latest?.media_type === "video" ? (
                                    <Video className="h-4 w-4 text-violet-600" />
                                  ) : (
                                    <ImageIcon className="h-4 w-4 text-blue-600" />
                                  )}
                                  Média associé
                                </div>

                                <div className="mt-1 text-sm text-slate-600">
                                  {latest ? (
                                    <span className="break-all">{extractFileName(latest.storage_path)}</span>
                                  ) : (
                                    "Aucun média n’a encore été ajouté."
                                  )}
                                </div>
                              </div>

                              <div className="w-full lg:w-auto">
                                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Ajouter une image ou une vidéo
                                </label>

                                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50">
                                  <Upload className="h-4 w-4" />
                                  Sélectionner un fichier
                                  <input
                                    type="file"
                                    accept="image/*,video/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (!f) return;
                                      uploadAsset(campaign.id, f);
                                      e.currentTarget.value = "";
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
