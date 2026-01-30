// src/lib/kycMedia.ts
import { supabase } from "@/lib/supabase";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export type KycType = "cni_front" | "cni_back" | "selfie";
export type PickMode = "camera" | "gallery";

async function blobFromWebPath(webPath: string): Promise<Blob> {
  const res = await fetch(webPath);
  if (!res.ok) throw new Error("Impossible de lire le fichier");
  return await res.blob();
}

export async function pickAndUploadKyc(params: {
  userId: string;
  type: KycType;
  mode: PickMode;
  quality?: number;
}): Promise<{ storagePath: string; signedUrl: string }> {
  const perm = await Camera.requestPermissions();
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

  // ✅ Bucket privé: path OBLIGATOIREMENT dans users/<uid>/
  const storagePath = `users/${params.userId}/kyc/${params.type}.jpg`;

  const { error: upErr } = await supabase.storage
    .from("kyc")
    .upload(storagePath, blob, { upsert: true, contentType });

  if (upErr) throw upErr;

  // ✅ Signed URL pour prévisualiser
  const { data: sData, error: sErr } = await supabase.storage
    .from("kyc")
    .createSignedUrl(storagePath, 60 * 60); // 1h

  if (sErr || !sData?.signedUrl) throw new Error("Impossible de générer l’URL signée");

  return { storagePath, signedUrl: sData.signedUrl };
}

export async function upsertKycRow(params: {
  userId: string;
  type: KycType;
  storagePath: string;
}) {
  const { error } = await supabase
    .from("op_ouvrier_photos")
    .upsert(
      { user_id: params.userId, type: params.type, storage_path: params.storagePath },
      { onConflict: "user_id,type" }
    );

  if (error) throw error;
}

export async function signedUrlForKyc(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from("kyc").createSignedUrl(storagePath, 60 * 60);
  if (error || !data?.signedUrl) throw new Error("Signed URL indisponible");
  return data.signedUrl;
}
