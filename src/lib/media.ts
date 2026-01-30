// src/lib/media.ts
import { Camera, CameraResultType, CameraSource, PermissionStatus } from "@capacitor/camera";
import { supabase } from "@/lib/supabase";

export type PickMediaMode = "camera" | "gallery";
export type BucketVisibility = "public" | "private";

async function blobFromWebPath(webPath: string): Promise<Blob> {
  const res = await fetch(webPath);
  if (!res.ok) throw new Error("Impossible de lire le fichier");
  return await res.blob();
}

function isGranted(v: any): boolean {
  return v === "granted" || v === true;
}

async function ensurePermissionsForMode(mode: PickMediaMode): Promise<PermissionStatus> {
  // ✅ Demande explicite (camera + photos) = plus robuste iOS/Android
  // Note: selon OS, "photos" peut être absent → on gère en fallback.
  const perm = await Camera.requestPermissions({ permissions: ["camera", "photos"] });

  // Camera obligatoire si mode camera
  if (mode === "camera") {
    if (!isGranted((perm as any).camera)) {
      throw new Error("Permission caméra refusée");
    }
  }

  // Galerie : sur iOS/Android récents, "photos" est souvent explicite.
  // Sur certains Android, l’accès galerie passe sans champ perm.photos => on ne bloque pas.
  if (mode === "gallery") {
    const photos = (perm as any).photos;
    // Si l'OS renvoie explicitement "denied" / "prompt-with-rationale", on bloque.
    if (photos && !isGranted(photos)) {
      throw new Error("Permission galerie refusée");
    }
  }

  return perm;
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
  await ensurePermissionsForMode(params.mode);

  const photo = await Camera.getPhoto({
    quality: params.quality ?? 85,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: params.mode === "camera" ? CameraSource.Camera : CameraSource.Photos,
  });

  if (!photo.webPath) throw new Error("Aucune image récupérée");

  const blob = await blobFromWebPath(photo.webPath);
  const contentType = blob.type || "image/jpeg";

  const { error } = await supabase.storage.from(params.bucket).upload(params.path, blob, {
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
  const { data, error: signErr } = await supabase.storage.from(params.bucket).createSignedUrl(params.path, expiresIn);

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
