// src/components/kyc/KycSection.tsx
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { pickAndUploadKyc, upsertKycRow, signedUrlForKyc, KycType, PickMode } from "@/lib/kycMedia";
import { useAuthProfile } from "@/hooks/useAuthProfile";

type KycRow = { type: KycType; storage_path: string };

const LABELS: Record<KycType, string> = {
  cni_front: "CNI - Recto",
  cni_back: "CNI - Verso",
  selfie: "Selfie (visage clair)",
};

export default function KycSection() {
  const { user } = useAuthProfile();
  const userId = user?.id;

  const [rows, setRows] = useState<Record<KycType, KycRow | null>>({
    cni_front: null,
    cni_back: null,
    selfie: null,
  });

  const [preview, setPreview] = useState<Record<KycType, string | null>>({
    cni_front: null,
    cni_back: null,
    selfie: null,
  });

  const [loading, setLoading] = useState<Record<KycType, PickMode | null>>({
    cni_front: null,
    cni_back: null,
    selfie: null,
  });

  // ✅ Charge existants + génère signedUrl
  useEffect(() => {
    if (!userId) return;

    (async () => {
      const { data, error } = await supabase
        .from("op_ouvrier_photos")
        .select("type, storage_path")
        .eq("user_id", userId);

      if (error) return;

      const map: any = { cni_front: null, cni_back: null, selfie: null };
      for (const r of (data ?? []) as any[]) {
        if (r.type in map) map[r.type] = r;
      }
      setRows(map);

      // previews
      for (const t of ["cni_front", "cni_back", "selfie"] as KycType[]) {
        const sp = map[t]?.storage_path;
        if (sp) {
          try {
            const url = await signedUrlForKyc(sp);
            setPreview((p) => ({ ...p, [t]: url }));
          } catch {}
        }
      }
    })();
  }, [userId]);

  const handle = async (type: KycType, mode: PickMode) => {
    if (!userId) return;

    try {
      setLoading((s) => ({ ...s, [type]: mode }));

      const { storagePath, signedUrl } = await pickAndUploadKyc({
        userId,
        type,
        mode,
        quality: 85,
      });

      // ✅ Enregistre DB
      await upsertKycRow({ userId, type, storagePath });

      // ✅ UI
      setRows((r) => ({ ...r, [type]: { type, storage_path: storagePath } }));
      setPreview((p) => ({ ...p, [type]: signedUrl }));
    } catch (e: any) {
      alert(e?.message ?? "Erreur KYC");
    } finally {
      setLoading((s) => ({ ...s, [type]: null }));
    }
  };

  if (!userId) return null;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xl font-semibold text-pro-gray">Vérification d’identité (KYC)</div>
        <div className="text-sm text-gray-600">
          Ajoute ta CNI (recto/verso) et un selfie. Les fichiers sont privés.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["cni_front", "cni_back", "selfie"] as KycType[]).map((type) => (
          <div key={type} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="font-semibold text-pro-gray">{LABELS[type]}</div>

            <div className="mt-3 rounded-xl border bg-gray-50 overflow-hidden">
              {preview[type] ? (
                <img src={preview[type] as string} className="w-full h-48 object-cover" alt={type} />
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-gray-500">
                  Aucune image
                </div>
              )}
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                className="rounded-full bg-pro-blue text-white hover:bg-pro-blue/90"
                onClick={() => handle(type, "camera")}
                disabled={!!loading[type]}
              >
                {loading[type] === "camera" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 mr-2" />
                )}
                Caméra
              </Button>

              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => handle(type, "gallery")}
                disabled={!!loading[type]}
              >
                {loading[type] === "gallery" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4 mr-2" />
                )}
                Galerie
              </Button>
            </div>

            <div className="mt-2 text-xs text-gray-500 break-all">
              {rows[type]?.storage_path ? `Stockage: ${rows[type]!.storage_path}` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
