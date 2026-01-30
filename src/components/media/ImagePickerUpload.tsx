// src/components/media/ImagePickerUpload.tsx
import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera as CameraIcon, Image as ImageIcon, Loader2, X } from "lucide-react";
import { pickImageAndUpload, PickMediaMode } from "@/lib/media";

type Props = {
  userId: string;
  bucket: string;
  path: string; // path complet dans le bucket (tu le construis depuis le parent)
  label?: string;

  // appelé après upload (pour enregistrer en DB, etc.)
  onUploaded?: (payload: { publicUrl: string; storagePath: string }) => Promise<void> | void;

  // affichage
  previewUrl?: string | null;
  onPreviewChange?: (url: string | null) => void;

  // options
  allowGallery?: boolean;
  quality?: number;
};

export default function ImagePickerUpload({
  userId,
  bucket,
  path,
  label,
  onUploaded,
  previewUrl,
  onPreviewChange,
  allowGallery = true,
  quality = 85,
}: Props) {
  const [loading, setLoading] = useState<PickMediaMode | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const effectivePreview = previewUrl ?? localPreview;

  const filePath = useMemo(() => {
    // sécurité minimale
    if (!userId) return path;
    return path;
  }, [userId, path]);

  const run = async (mode: PickMediaMode) => {
    try {
      setLoading(mode);
      const res = await pickImageAndUpload({
        mode,
        bucket,
        path: filePath,
        quality,
        upsert: true,
      });

      if (onPreviewChange) onPreviewChange(res.publicUrl);
      else setLocalPreview(res.publicUrl);

      if (onUploaded) await onUploaded(res);
    } catch (e: any) {
      alert(e?.message ?? "Erreur média");
    } finally {
      setLoading(null);
    }
  };

  const clear = () => {
    if (onPreviewChange) onPreviewChange(null);
    else setLocalPreview(null);
  };

  return (
    <div className="w-full">
      {label && <div className="mb-2 text-sm font-medium text-pro-gray">{label}</div>}

      {effectivePreview ? (
        <div className="relative w-full max-w-md rounded-xl border bg-white overflow-hidden">
          <img src={effectivePreview} alt="preview" className="w-full h-auto object-cover" />
          <button
            type="button"
            onClick={clear}
            className="absolute top-2 right-2 rounded-full bg-white/90 border shadow-sm p-2"
            aria-label="Supprimer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md rounded-xl border bg-white p-4">
          <div className="text-sm text-gray-600">Aucune image</div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          className="rounded-full bg-pro-blue text-white hover:bg-pro-blue/90"
          onClick={() => run("camera")}
          disabled={!!loading}
        >
          {loading === "camera" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CameraIcon className="w-4 h-4 mr-2" />}
          Prendre une photo
        </Button>

        {allowGallery && (
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => run("gallery")}
            disabled={!!loading}
          >
            {loading === "gallery" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
            Choisir depuis la galerie
          </Button>
        )}
      </div>
    </div>
  );
}
