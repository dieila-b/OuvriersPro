// src/lib/media.ts
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { supabase } from "@/lib/supabase";

export type PickMediaMode = "camera" | "gallery";

async function blobFromWebPath(webPath: string): Promise<Blob> {
  const res = await fetch(webPath);
  if (!res.ok) throw new Error("Impossible de lire le fichier");
  return await res.blob();
}

function guessExt(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}

export async function pickImageAndUpload(params: {
  mode: PickMediaMode;              // "camera" ou "gallery"
  bucket: string;                   // ex: "avatars", "kyc", "ads", "chat"
  path: string;                     // ex: users/${id}/avatar.jpg
  upsert?: boolean;                 // true par défaut
  quality?: number;                 // 70-95
}): Promise<{ publicUrl: string; storagePath: string }> {
  const perm = await Camera.requestPermissions();
  // Sur certains devices, "photos" est séparé — on ne bloque pas si camera ok.
  if (params.mode === "camera" && perm.camera !== "granted") {
    throw new Error("Permission caméra refusée");
  }

  const photo = await Camera.getPhoto({
    quality: params.quality ?? 85,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: params.mode === "camera" ? CameraSource.Camera : CameraSource.Photos,
  });

  if (!photo.webPath) throw new Error("Aucune image récupérée");

  const blob = await blobFromWebPath(photo.webPath);
  const contentType = blob.type || "image/jpeg";

  // Si tu veux auto-extension : (optionnel)
  // const ext = guessExt(contentType);

  const { error } = await supabase.storage
    .from(params.bucket)
    .upload(params.path, blob, {
      upsert: params.upsert ?? true,
      contentType,
    });

  if (error) throw error;

  // URL publique (bucket public)
  const { data } = supabase.storage.from(params.bucket).getPublicUrl(params.path);
  if (!data?.publicUrl) throw new Error("URL publique indisponible");

  return { publicUrl: data.publicUrl, storagePath: params.path };
}
