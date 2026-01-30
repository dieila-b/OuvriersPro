import React, { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { UploadCloud, Image as ImageIcon, Trash2, Camera, FolderOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { pickImageAndUpload } from "@/lib/media";

type PortfolioItem = {
  id: string;
  storage_path: string;
  public_url: string | null;
  title: string | null;
  created_at: string;
};

type Props = {
  workerId: string;
  bucket?: string; // default "portfolio"
  prefix?: string; // default `workers/${workerId}/portfolio`
  maxFiles?: number; // default 12
};

function safeExtFromFile(file: File) {
  const t = (file.type || "").toLowerCase();
  if (t.includes("png")) return "png";
  if (t.includes("webp")) return "webp";
  return "jpg";
}

export default function PortfolioUploader({
  workerId,
  bucket = "portfolio",
  prefix,
  maxFiles = 12,
}: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const folder = useMemo(() => {
    return (prefix ?? `workers/${workerId}/portfolio`).replace(/\/+$/, "");
  }, [prefix, workerId]);

  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const load = useCallback(async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from("op_ouvrier_portfolio_photos")
      .select("id, storage_path, public_url, title, created_at")
      .eq("worker_id", workerId)
      .order("created_at", { ascending: false });

    setLoadingList(false);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setItems((data ?? []) as PortfolioItem[]);
  }, [toast, workerId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files || []).filter((f) => f && f.type.startsWith("image/"));

      if (arr.length === 0) {
        toast({ title: "Aucune image", description: "Sélectionne des images (JPG/PNG/WebP)." });
        return;
      }

      if (arr.length > maxFiles) {
        toast({
          title: "Trop de fichiers",
          description: `Maximum ${maxFiles} images à la fois.`,
          variant: "destructive",
        });
        return;
      }

      setBusy(true);
      try {
        for (const file of arr) {
          const ext = safeExtFromFile(file);
          const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
          const path = `${folder}/${filename}`;

          // upload
          const { error: upErr } = await supabase.storage
            .from(bucket)
            .upload(path, file, { upsert: false, contentType: file.type || "image/jpeg" });

          if (upErr) throw upErr;

          // public url (portfolio public)
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
          const publicUrl = pub?.publicUrl ?? null;

          // DB insert
          const { error: insErr } = await supabase.from("op_ouvrier_portfolio_photos").insert({
            worker_id: workerId,
            storage_path: path,
            public_url: publicUrl,
            title: null,
          });

          if (insErr) throw insErr;
        }

        toast({ title: "Portfolio mis à jour", description: "Images ajoutées avec succès." });
        await load();
      } catch (e: any) {
        toast({
          title: "Upload échoué",
          description: e?.message ?? String(e),
          variant: "destructive",
        });
      } finally {
        setBusy(false);
      }
    },
    [bucket, folder, load, maxFiles, toast, workerId]
  );

  // Drag & drop (web)
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (busy) return;
      const files = e.dataTransfer.files;
      void uploadFiles(files);
    },
    [busy, uploadFiles]
  );

  const remove = useCallback(
    async (row: PortfolioItem) => {
      if (busy) return;
      setBusy(true);
      try {
        // delete storage
        const { error: delErr } = await supabase.storage.from(bucket).remove([row.storage_path]);
        if (delErr) throw delErr;

        // delete db
        const { error: dbErr } = await supabase.from("op_ouvrier_portfolio_photos").delete().eq("id", row.id);
        if (dbErr) throw dbErr;

        toast({ title: "Supprimé", description: "Image retirée du portfolio." });
        await load();
      } catch (e: any) {
        toast({ title: "Erreur", description: e?.message ?? String(e), variant: "destructive" });
      } finally {
        setBusy(false);
      }
    },
    [bucket, busy, load, toast]
  );

  // Mobile (camera/galerie) via Capacitor
  const addFromMobile = useCallback(
    async (mode: "camera" | "gallery") => {
      if (busy) return;
      setBusy(true);
      try {
        const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`;
        const path = `${folder}/${filename}`;

        const res = await pickImageAndUpload({
          mode,
          bucket,
          path,
          visibility: "public", // portfolio public
          upsert: false,
          quality: 85,
        });

        const { error: insErr } = await supabase.from("op_ouvrier_portfolio_photos").insert({
          worker_id: workerId,
          storage_path: res.storagePath,
          public_url: res.publicUrl,
          title: null,
        });

        if (insErr) throw insErr;

        toast({ title: "Ajouté", description: "Image ajoutée au portfolio." });
        await load();
      } catch (e: any) {
        toast({ title: "Erreur", description: e?.message ?? String(e), variant: "destructive" });
      } finally {
        setBusy(false);
      }
    },
    [bucket, busy, folder, load, toast, workerId]
  );

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-pro-blue" />
            <h3 className="font-semibold text-pro-gray text-base sm:text-lg">Portfolio</h3>
            <Badge variant="secondary" className="bg-pro-blue/10 text-pro-blue">
              {items.length} image{items.length > 1 ? "s" : ""}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Ajoute des photos de tes réalisations. Drag & drop sur PC, caméra/galerie sur mobile.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Importer
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => addFromMobile("camera")}
            disabled={busy}
          >
            <Camera className="w-4 h-4 mr-2" />
            Caméra
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files) void uploadFiles(files);
          e.currentTarget.value = "";
        }}
      />

      <div
        className={[
          "mt-4 rounded-xl border-2 border-dashed p-5 sm:p-6 transition",
          dragOver ? "border-pro-blue bg-pro-blue/5" : "border-gray-200 bg-gray-50",
        ].join(" ")}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
        }}
        onDrop={onDrop}
      >
        <div className="flex items-center justify-center gap-3 text-center">
          <UploadCloud className="w-6 h-6 text-gray-500" />
          <div className="text-sm text-gray-600">
            Dépose tes images ici (ou clique sur <span className="font-medium">Importer</span>)
            {busy ? <div className="text-xs text-gray-500 mt-1">Upload en cours…</div> : null}
          </div>
        </div>
      </div>

      <div className="mt-5">
        {loadingList ? (
          <div className="text-sm text-gray-500">Chargement…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-500">Aucune photo pour l’instant.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((it) => (
              <div key={it.id} className="group relative rounded-xl overflow-hidden border bg-white">
                <img
                  src={it.public_url ?? ""}
                  alt={it.title ?? "Portfolio"}
                  className="h-28 sm:h-32 w-full object-cover"
                  loading="lazy"
                />
                <button
                  type="button"
                  className="absolute top-2 right-2 rounded-full bg-white/90 p-2 shadow-sm opacity-0 group-hover:opacity-100 transition"
                  onClick={() => remove(it)}
                  disabled={busy}
                  aria-label="Supprimer"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
