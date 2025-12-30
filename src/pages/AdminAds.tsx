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

// datetime-local helpers
function isoToLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}
function localInputToIso(val: string) {
  if (!val) return null;
  const d = new Date(val);
  return d.toISOString();
}

type EditDraft = {
  id: string;
  title: string;
  placement: string;
  link_url: string;
  start_at: string; // datetime-local
  end_at: string; // datetime-local
  status: CampaignStatus;
};

export default function AdminAds() {
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [assetsByCampaign, setAssetsByCampaign] = useState<Record<string, Asset[]>>({});
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [title, setTitle] = useState("");
  const [placement, setPlacement] = useState(DEFAULT_PLACEMENT);
  const [linkUrl, setLinkUrl] = useState("");
  const [startAt, setStartAt] = useState(""); // ISO local
  const [endAt, setEndAt] = useState(""); // ISO local

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: c, error: cErr } = await supabase
        .from("ads_campaigns")
        .select("id,title,status,placement,start_at,end_at,link_url,created_at")
        .order("created_at", { ascending: false });

      if (cErr) throw cErr;
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

  const createCampaign = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!title.trim()) throw new Error("Titre requis");

      const payload: any = {
        title: title.trim(),
        placement: placement.trim() || DEFAULT_PLACEMENT,
        status: "draft" as CampaignStatus,
        link_url: linkUrl.trim() ? linkUrl.trim() : null,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
      };

      const { error: insErr } = await supabase.from("ads_campaigns").insert(payload);
      if (insErr) throw insErr;

      setTitle("");
      setLinkUrl("");
      setStartAt("");
      setEndAt("");
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Erreur création campagne");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: CampaignStatus) => {
    setSavingId(id);
    setError(null);
    try {
      const { error } = await supabase.from("ads_campaigns").update({ status }).eq("id", id);
      if (error) throw error;
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Erreur changement statut");
    } finally {
      setSavingId(null);
    }
  };

  const deleteCampaign = async (id: string) => {
    setSavingId(id);
    setError(null);
    try {
      const { error } = await supabase.from("ads_campaigns").delete().eq("id", id);
      if (error) throw error;

      // Best effort: supprimer aussi les fichiers du bucket
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

      // Si on supprimait la campagne en cours d'édition
      if (editingId === id) {
        setEditingId(null);
        setEditDraft(null);
      }

      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Erreur suppression");
    } finally {
      setSavingId(null);
    }
  };

  const uploadAsset = async (campaignId: string, file: File) => {
    setSavingId(campaignId);
    setError(null);
    try {
      const mediaType = guessMediaType(file);
      if (!mediaType) throw new Error("Format non supporté (image ou vidéo uniquement).");

      const folder = mediaType === "image" ? "images" : "videos";
      const safeName = file.name.replace(/\s+/g, "_");
      const storagePath = `${folder}/${campaignId}/${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("ads-media")
        .upload(storagePath, file, {
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
      setSavingId(null);
    }
  };

  const startEdit = (c: Campaign) => {
    setError(null);
    setEditingId(c.id);
    setEditDraft({
      id: c.id,
      title: c.title ?? "",
      placement: c.placement ?? DEFAULT_PLACEMENT,
      link_url: c.link_url ?? "",
      start_at: isoToLocalInput(c.start_at),
      end_at: isoToLocalInput(c.end_at),
      status: c.status ?? "draft",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setError(null);
  };

  const editWindowError = useMemo(() => {
    if (!editDraft) return false;
    if (!editDraft.start_at || !editDraft.end_at) return false;
    return new Date(editDraft.end_at).getTime() < new Date(editDraft.start_at).getTime();
  }, [editDraft]);

  const saveEdit = async () => {
    if (!editDraft) return;
    if (editWindowError) return;

    setSavingId(editDraft.id);
    setError(null);
    try {
      const payload = {
        title: editDraft.title.trim(),
        placement: editDraft.placement.trim() || DEFAULT_PLACEMENT,
        link_url: editDraft.link_url.trim() ? editDraft.link_url.trim() : null,
        start_at: localInputToIso(editDraft.start_at),
        end_at: localInputToIso(editDraft.end_at),
        status: editDraft.status,
      };

      const { error } = await supabase.from("ads_campaigns").update(payload).eq("id", editDraft.id);
      if (error) throw error;

      setEditingId(null);
      setEditDraft(null);
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Erreur mise à jour campagne");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-pro-gray">Publicités</h1>
          <p className="text-sm text-gray-600">Créer, uploader et publier des spots (image / vidéo).</p>
        </div>
        <Button onClick={refresh} variant="outline" disabled={loading}>
          Rafraîchir
        </Button>
      </div>

      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

      {/* Create Campaign */}
      <div className="mt-6 bg-white border rounded-xl p-4 sm:p-5">
        <h2 className="font-semibold text-pro-gray">Créer une campagne</h2>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
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
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div>
            <label className="text-xs text-gray-600">Début (optionnel)</label>
            <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          </div>

          <div>
            <label className="text-xs text-gray-600">Fin (optionnel)</label>
            <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={createCampaign} disabled={loading}>
            Créer (Draft)
          </Button>
        </div>
      </div>

      {/* Campaign list */}
      <div className="mt-6 space-y-4">
        {campaigns.length === 0 && <div className="text-sm text-gray-600">Aucune campagne pour le moment.</div>}

        {campaigns.map((c) => {
          const assets = assetsByCampaign[c.id] ?? [];
          const latest = assets[0];
          const isEditing = editingId === c.id;
          const busy = savingId === c.id;

          return (
            <div key={c.id} className="bg-white border rounded-xl p-4 sm:p-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-pro-gray truncate">{c.title}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full border">{c.status}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{c.placement}</span>
                  </div>

                  <div className="mt-1 text-xs text-gray-600 break-all">ID: {c.id}</div>

                  <div className="mt-2 text-xs text-gray-600">
                    Fenêtre:{" "}
                    <span className="font-medium">{c.start_at ? new Date(c.start_at).toLocaleString() : "—"}</span>{" "}
                    →{" "}
                    <span className="font-medium">{c.end_at ? new Date(c.end_at).toLocaleString() : "—"}</span>
                  </div>

                  {c.link_url && (
                    <div className="mt-1 text-xs text-gray-600 break-all">Lien: {c.link_url}</div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {!isEditing && (
                    <Button variant="outline" disabled={loading || busy} onClick={() => startEdit(c)}>
                      Éditer
                    </Button>
                  )}

                  {c.status !== "published" && !isEditing && (
                    <Button disabled={loading || busy} onClick={() => updateStatus(c.id, "published")}>
                      Publier
                    </Button>
                  )}

                  {c.status === "published" && !isEditing && (
                    <Button disabled={loading || busy} variant="outline" onClick={() => updateStatus(c.id, "paused")}>
                      Pause
                    </Button>
                  )}

                  {!isEditing && (
                    <Button disabled={loading || busy} variant="destructive" onClick={() => deleteCampaign(c.id)}>
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>

              {/* EDIT PANEL */}
              {isEditing && editDraft && (
                <div className="mt-4 border rounded-xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-pro-gray">Éditer la campagne</div>
                    <div className="flex gap-2">
                      <Button
                        className="bg-pro-blue hover:bg-blue-700"
                        disabled={busy || editWindowError}
                        onClick={saveEdit}
                      >
                        {busy ? "Enregistrement..." : "Enregistrer"}
                      </Button>
                      <Button variant="outline" disabled={busy} onClick={cancelEdit}>
                        Annuler
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Titre</label>
                      <Input
                        value={editDraft.title}
                        onChange={(e) => setEditDraft((s) => (s ? { ...s, title: e.target.value } : s))}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Placement</label>
                      <Input
                        value={editDraft.placement}
                        onChange={(e) => setEditDraft((s) => (s ? { ...s, placement: e.target.value } : s))}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-600">Lien (optionnel)</label>
                      <Input
                        value={editDraft.link_url}
                        onChange={(e) => setEditDraft((s) => (s ? { ...s, link_url: e.target.value } : s))}
                        placeholder="https://..."
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Début</label>
                      <Input
                        type="datetime-local"
                        value={editDraft.start_at}
                        onChange={(e) => setEditDraft((s) => (s ? { ...s, start_at: e.target.value } : s))}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Fin</label>
                      <Input
                        type="datetime-local"
                        value={editDraft.end_at}
                        onChange={(e) => setEditDraft((s) => (s ? { ...s, end_at: e.target.value } : s))}
                      />
                      {editWindowError && (
                        <div className="mt-1 text-xs text-red-600">
                          La date de fin doit être après la date de début.
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Statut</label>
                      <select
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                        value={editDraft.status}
                        onChange={(e) =>
                          setEditDraft((s) => (s ? { ...s, status: e.target.value as CampaignStatus } : s))
                        }
                      >
                        <option value="draft">draft</option>
                        <option value="published">published</option>
                        <option value="paused">paused</option>
                        <option value="ended">ended</option>
                      </select>
                      <div className="mt-1 text-[11px] text-gray-500">
                        Pour prolonger un spot : modifie “Fin” puis garde “published”.
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-500 self-end">
                      Conseillé : si tu changes les dates, clique “Enregistrer” puis “Publier” si nécessaire.
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Asset */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="text-sm text-gray-700">
                  Média actuel:{" "}
                  {latest ? (
                    <span className="font-medium">
                      {latest.media_type} — {latest.storage_path}
                    </span>
                  ) : (
                    <span className="text-gray-500">Aucun</span>
                  )}
                </div>

                <div className="sm:ml-auto">
                  <label className="text-xs text-gray-600 block mb-1">Uploader un média (image/vidéo)</label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    disabled={busy}
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
