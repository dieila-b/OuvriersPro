// src/lib/kycMedia.ts
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { supabase } from "@/lib/supabase";

export type KycType = "cni_front" | "cni_back" | "selfie";
export type PickMode = "camera" | "gallery";

const KYC_BUCKET = "kyc";

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
}): Promise<{
  storagePath: string;
  signedUrl: string;
}> {
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

  const ext = contentType.includes("png") ? "png" : "jpg";
  const storagePath = `${params.userId}/${params.type}.${ext}`;

  const { error } = await supabase.storage
    .from(KYC_BUCKET)
    .upload(storagePath, blob, {
      upsert: true,
      contentType,
    });

  if (error) throw error;

  // KYC is private, get signed URL
  const { data, error: signErr } = await supabase.storage
    .from(KYC_BUCKET)
    .createSignedUrl(storagePath, 600);

  if (signErr) throw signErr;

  return {
    storagePath,
    signedUrl: data?.signedUrl ?? "",
  };
}

export async function upsertKycRow(params: {
  userId: string;
  type: KycType;
  storagePath: string;
}): Promise<void> {
  const { error } = await supabase
    .from("op_ouvrier_kyc_files")
    .upsert(
      {
        worker_id: params.userId,
        type: params.type,
        storage_path: params.storagePath,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "worker_id,type" }
    );

  if (error) throw error;
}

export async function signedUrlForKyc(storagePath: string, expiresIn = 600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(KYC_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Signed URL indisponible");

  return data.signedUrl;
}
