import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  // ✅ optionnel: durée d’affichage (si la colonne existe)
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

function toIsoOrNull(localValue: string) {
  return localValue ? new Date(localValue).toISOString() : null;
}

function toLocalInputValue(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  // datetime-local => YYYY-MM-DDTHH:mm
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function safeInt(val: string, fallback: number) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.floor(n));
}

function statusLabel(s: CampaignStatus) {
  switch (s) {
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

function statusBadgeClasses(s: CampaignStatus) {
  if (s === "published") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s === "paused") return "border-amber-200 bg-amber-50 text-amber-700";
  if (s === "ended") return "border-gray-200 bg-gray-50 text-gray-600";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default function AdminAds() {
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [assetsByCampaign, setAssetsByCampaign] = useState<Record<string, Asset[]>>({});
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [title, setTitle] = useState("");
  const [placement, setPlacement] = useState(DEFAULT_PLACEMENT);
  const [linkUrl, setLinkUrl] = useState("");
  const [startAt, setStartAt] = useState(""); // local
  const [endAt, setEndAt] = useState(""); // local
  const [displaySeconds, setDisplaySeconds] = useState(String(DEFAULT_DISPLAY_SECONDS));

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eTitle, setETitle] = useState("");
  const [ePlacement, setEPlacement] = useState(DEFAULT_PLACEMENT);
  const [eLinkUrl, setELinkUrl] = useState("");
  const [eStartAt, setEStartAt] = useState("");
  const [eEndAt, setEEndAt] = useState("");
  const [eDisplaySeconds, setEDisplaySeconds] = useState(String(DEFAULT_DISPLAY_SECONDS));

  const refresh = async () => {
    setLoading(true);
    setError(null);

    try {
      // ✅ On essaie de récupérer display_seconds (si la colonne existe)
      // Si elle n'existe pas, on retombe sur une query sans cette colonne.
      let c: any[] | null = null;

      const tryWithDisplay = await supabase
        .from("ads_campaigns")
        .select("id,title,status,placement,start_at,end_at,link_url,display_seconds,created_at")
        .order("created_at", { ascending: false });

      if (tryWithDisplay.error) {
        const tryWithoutDisplay = await supabase
          .from("ads_campaigns")
          .select("id,title,status,placement,start_at,end_at,link_url,created_at")
          .order("created_at", { ascending: false });

        if (tryWithoutDisplay.error) throw tryWithoutDisplay.error;
        c = tryWithoutDisplay.data ?? [];
      } else {
        c = tryWithDisplay.data ?? [];
      }

      const campaignsData = (c ?? []) as Campaign[];
      setCampaigns(campaignsData);

      if (campaignsData.length === 0) {
        setAssetsByCampaign({});
        return;
      }

      const ids = campaignsData.map((x) => x.id);
      const { data: a, error: aErr } = await supabase
        .from("ads_assets")
        .select("id,campaign_id,media_type,storage_path,created_at")
        .in("campaign_id", ids)
        .order("created_at", { ascending: false });

      if (aErr) throw aErr;

      const map: Record<string, Asset[]> = {};
      (a ?? []).forEach((asset: any) => {
        map[asset.campaign_id] = map[asset.campaign_id] || [];
        map[asset.campaign_id].push(asset);
      });
      setAssetsByCampaign(map);
    } catch (e: any) {
      setError(e?.message ?? "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const resetCreate = () => {
    setTitle("");
    setPlacement(DEFAULT_PLACEMENT);
    setLinkUrl("");
    setStartAt("");
    setEndAt("");
    setDisplaySeconds(String(DEFAULT_DISPLAY_SECONDS));
  };

  const createCampaign = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!title.trim()) throw new Error("Titre requis");

      const payloadBase: any = {
        title: title.trim(),
        placement: placement.trim() || DEFAULT_PLACEMENT,
        status: "draft" as CampaignStatus,
        link_url: linkUrl.trim() ? linkUrl.trim() : null,
        start_at: toIsoOrNull(startAt),
        end_at: toIsoOrNull(endAt),
      };

      // ✅ Optionnel: display_seconds (si la colonne existe)
      const payloadWithDisplay = {
        ...payloadBase,
        display_seconds: safeInt(displaySeconds, DEFAULT_DISPLAY_SECONDS),
      };

      const ins1 = await supabase.from("ads_campaigns").insert(payloadWithDisplay);
      if (ins1.error) {
        // fallback sans display_seconds si colonne absente
        const ins2 = await supabase.from("ads_campaigns").insert(payloadBase);
        if (ins2.error) throw ins2.error;
      }

      resetCreate();
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Erreur création campagne");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: CampaignStatus) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.from("ads_campaigns").update({ status }).eq("id", id);
      if (error) throw error;
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Erreur changement statut");
    } finally {
      setLoading(false);
    }
  };

  const deleteCampaign = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.from("ads_campaigns").delete().eq("id", id);
      if (error) throw error;

      // best-effort: supprimer fichiers
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
    } catch (e: any) {
      setError(e?.message ?? "Erreur suppression");
    } finally {
      setLoading(false);
    }
  };

  const uploadAsset = async (campaignId: string, file: File) => {
    setLoading(true);
    setError(null);

    try {
      const mediaType = guessMediaType(file);
      if (!mediaType) throw new Error("Format non supporté (image ou vidéo uniquement).");

      const folder = mediaType === "image" ? "images" : "videos";
      const safeName = file.name.replace(/\s+/g, "_");
      const storagePath = `${folder}/${campaignId}/${safeName}`;

      const { error: upErr } = await supabase.storage.from("ads-media").upload(storagePath, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from("ads_assets").insert({
        campaign_id: campaignId,
        media_type: mediaType,
        storage_path: storagePath,
        mime_type: file.type || null,
        size_bytes: file.size || null,
      });
      if (dbErr) throw dbErr;

      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Erreur upload");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (c: Campaign) => {
    setEditingId(c.id);
    setETitle(c.title ?? "");
    setEPlacement(c.placement ?? DEFAULT_PLACEMENT);
    setELinkUrl(c.link_url ?? "");
    setEStartAt(toLocalInputValue(c.start_at));
    setEEndAt(toLocalInputValue(c.end_at));
    setEDisplaySeconds(String(c.display_seconds ?? DEFAULT_DISPLAY_SECONDS));
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

  const saveEdit = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      if (!eTitle.trim()) throw new Error("Titre requis");

      const base: any = {
        title: eTitle.trim(),
        placement: ePlacement.trim() || DEFAULT_PLACEMENT,
        link_url: eLinkUrl.trim() ? eLinkUrl.trim() : null,
        start_at: toIsoOrNull(eStartAt),
        end_at: toIsoOrNull(eEndAt),
      };

      const withDisplay = {
        ...base,
        display_seconds: safeInt(eDisplaySeconds, DEFAULT_DISPLAY_SECONDS),
      };

      const up1 = await supabase.from("ads_campaigns").update(withDisplay).eq("id", id);
      if (up1.error) {
        // fallback sans display_seconds
        const up2 = await supabase.from("ads_campaigns").update(base).eq("id", id);
        if (up2.error) throw up2.error;
      }

      await refresh();
      cancelEdit();
    } catch (e: any) {
      setError(e?.message ?? "Erreur mise à jour");
    } finally {
      setLoading(false);
    }
  };

  const now = useMemo(() => Date.now(), []);
  const formatWindow = (c: Campaign) => {
    const s = c.start_at ? new Date(c.start_at).toLocaleString() : "—";
    const e = c.end_at ? new Date(c.end_at).toLocaleString() : "—";
    return `${s} → ${e}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pro-gray">Publicités</h1>
          <p className="text-sm text-gray-600">
            Créer, uploader et publier des spots (image / vidéo), avec durée d’affichage.
          </p>
        </div>
        <Button onClick={refresh} variant="outline" disabled={loading}>
          Rafraîchir
        </Button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create Campaign */}
      <div className="mt-6 bg-white border rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-pro-gray">Créer une campagne</h2>
          <div className="text-xs text-gray-500">
            Statut initial : <span className="font-medium">Brouillon</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600">Titre</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Pub test - Home"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600">Placement</label>
            <Input
              value={placement}
              onChange={(e) => setPlacement(e.target.value)}
              placeholder="home_feed"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">Lien (optionnel)</label>
            <Input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="text-xs text-gray-600">Début (optionnel)</label>
            <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          </div>

          <div>
            <label className="text-xs text-gray-600">Fin (optionnel)</label>
            <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-gray-600">Durée d’affichage (secondes)</label>
            <Input
              type="number"
              min={1}
              value={displaySeconds}
              onChange={(e) => setDisplaySeconds(e.target.value)}
              placeholder="Ex: 8"
            />
            <div className="mt-1 text-[11px] text-gray-500">
              Cette valeur sera utilisée par le carrousel d’affichage (si `AdSlot` la lit).
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={createCampaign} disabled={loading}>
            Créer (Brouillon)
          </Button>
          <Button
            variant="outline"
            onClick={resetCreate}
            disabled={loading}
          >
            Réinitialiser
          </Button>
        </div>
      </div>

      {/* Campaign list */}
      <div className="mt-6 space-y-4">
        {campaigns.length === 0 && (
          <div className="text-sm text-gray-600">Aucune campagne pour le moment.</div>
        )}

        {campaigns.map((c) => {
          const assets = assetsByCampaign[c.id] ?? [];
          const latest = assets[0];
          const isEditing = editingId === c.id;

          return (
            <div key={c.id} className="bg-white border rounded-2xl p-4 sm:p-6 shadow-sm">
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold text-pro-gray truncate">{c.title}</div>

                    <span
                      className={[
                        "text-xs px-2 py-0.5 rounded-full border",
                        statusBadgeClasses(c.status),
                      ].join(" ")}
                    >
                      {statusLabel(c.status)}
                    </span>

                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {c.placement}
                    </span>
                  </div>

                  <div className="mt-1 text-xs text-gray-600 break-all">ID: {c.id}</div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                    <div className="rounded-lg border bg-gray-50 px-3 py-2">
                      <div className="text-[11px] text-gray-500">Fenêtre</div>
                      <div className="font-medium">{formatWindow(c)}</div>
                    </div>

                    <div className="rounded-lg border bg-gray-50 px-3 py-2">
                      <div className="text-[11px] text-gray-500">Durée</div>
                      <div className="font-medium">
                        {(c.display_seconds ?? DEFAULT_DISPLAY_SECONDS)}s
                      </div>
                    </div>
                  </div>

                  {c.link_url && (
                    <div className="mt-2 text-xs text-gray-600 break-all">
                      Lien: <span className="font-medium">{c.link_url}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {!isEditing ? (
                    <>
                      <Button variant="outline" disabled={loading} onClick={() => openEdit(c)}>
                        Éditer
                      </Button>

                      {c.status !== "published" && (
                        <Button disabled={loading} onClick={() => updateStatus(c.id, "published")}>
                          Publier
                        </Button>
                      )}

                      {c.status === "published" && (
                        <Button
                          disabled={loading}
                          variant="outline"
                          onClick={() => updateStatus(c.id, "paused")}
                        >
                          Pause
                        </Button>
                      )}

                      {c.status === "paused" && (
                        <Button
                          disabled={loading}
                          onClick={() => updateStatus(c.id, "published")}
                        >
                          Reprendre
                        </Button>
                      )}

                      <Button disabled={loading} variant="destructive" onClick={() => deleteCampaign(c.id)}>
                        Supprimer
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button disabled={loading} onClick={() => saveEdit(c.id)}>
                        Enregistrer
                      </Button>
                      <Button disabled={loading} variant="outline" onClick={cancelEdit}>
                        Annuler
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Edit form */}
              {isEditing && (
                <div className="mt-5 rounded-xl border bg-gray-50 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Titre</label>
                      <Input value={eTitle} onChange={(e) => setETitle(e.target.value)} />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Placement</label>
                      <Input value={ePlacement} onChange={(e) => setEPlacement(e.target.value)} />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-600">Lien (optionnel)</label>
                      <Input value={eLinkUrl} onChange={(e) => setELinkUrl(e.target.value)} placeholder="https://..." />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Début (optionnel)</label>
                      <Input type="datetime-local" value={eStartAt} onChange={(e) => setEStartAt(e.target.value)} />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Fin (optionnel)</label>
                      <Input type="datetime-local" value={eEndAt} onChange={(e) => setEEndAt(e.target.value)} />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-600">Durée d’affichage (secondes)</label>
                      <Input
                        type="number"
                        min={1}
                        value={eDisplaySeconds}
                        onChange={(e) => setEDisplaySeconds(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Media */}
              <div className="mt-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="min-w-0">
                  <div className="text-sm text-gray-700">
                    Média actuel:{" "}
                    {latest ? (
                      <span className="font-medium break-all">
                        {latest.media_type} — {latest.storage_path}
                      </span>
                    ) : (
                      <span className="text-gray-500">Aucun</span>
                    )}
                  </div>

                  <div className="mt-1 text-[11px] text-gray-500">
                    Astuce : pour une lecture vidéo fiable, re-uploade la vidéo si elle a été ajoutée avant que le
                    Content-Type ne soit correctement défini.
                  </div>
                </div>

                <div className="md:ml-auto">
                  <label className="text-xs text-gray-600 block mb-1">Uploader un média (image/vidéo)</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      uploadAsset(c.id, f);
                      e.currentTarget.value = "";
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
