// src/lib/media.ts
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { supabase } from "@/lib/supabase";

export type PickMediaMode = "camera" | "gallery";
export type BucketVisibility = "public" | "private";

async function blobFromWebPath(webPath: string): Promise<Blob> {
  const res = await fetch(webPath);
  if (!res.ok) throw new Error("Impossible de lire le fichier");
  return await res.blob();
}

export async function pickImageAndUpload(params: {
  mode: PickMediaMode; // "camera" | "gallery"
  bucket: string; // ex: "avatars", "kyc", "ads", "chat-media"
  path: string; // ex: workers/${id}/avatar.jpg
  visibility?: BucketVisibility; // "public" (default) ou "private" (KYC)
  upsert?: boolean; // true par défaut
  quality?: number; // 70-95
  signedUrlSeconds?: number; // pour private: durée du lien signé (default 600s)
}): Promise<{
  storagePath: string;
  publicUrl: string | null; // dispo si bucket public
  signedUrl: string | null; // dispo si bucket private (aperçu)
  contentType: string;
}> {
  const perm = await Camera.requestPermissions();

  // Sur certains devices, "photos" est séparé — on ne bloque pas si camera ok.
  if (params.mode === "camera" && perm.camera !== "granted") {
    throw new Error("Permission caméra refusée");
  }
  if (params.mode === "gallery" && perm.photos && perm.photos !== "granted") {
    // On ne bloque pas systématiquement (Android varie), mais si l'OS renvoie un refus explicite, on le respecte
    // Tu peux commenter si tu préfères être permissive.
    // throw new Error("Permission galerie refusée");
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

  const { error } = await supabase.storage
    .from(params.bucket)
    .upload(params.path, blob, {
      upsert: params.upsert ?? true,
      contentType,
    });

  if (error) throw error;

  const visibility: BucketVisibility = params.visibility ?? "public";

  // ✅ Bucket public => URL publique
  if (visibility === "public") {
    const { data } = supabase.storage.from(params.bucket).getPublicUrl(params.path);
    const publicUrl = data?.publicUrl ?? null;
    return { storagePath: params.path, publicUrl, signedUrl: null, contentType };
  }

  // ✅ Bucket private => URL signée (aperçu)
  const expiresIn = params.signedUrlSeconds ?? 600;
  const { data, error: signErr } = await supabase.storage
    .from(params.bucket)
    .createSignedUrl(params.path, expiresIn);

  if (signErr) throw signErr;

  return {
    storagePath: params.path,
    publicUrl: null,
    signedUrl: data?.signedUrl ?? null,
    contentType,
  };
}

/**
 * ✅ Helper pour afficher un fichier stocké en private bucket (KYC, etc.)
 * Retourne une signedUrl temporaire.
 */
export async function getSignedImageUrl(params: {
  bucket: string;
  path: string;
  expiresIn?: number; // seconds
}): Promise<string> {
  const { data, error } = await supabase.storage
    .from(params.bucket)
    .createSignedUrl(params.path, params.expiresIn ?? 600);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Signed URL indisponible");

  return data.signedUrl;
}
