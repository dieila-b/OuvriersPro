// src/components/AdsUploader.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdPlan = "FREE" | "MONTHLY" | "YEARLY";
type MediaType = "image" | "video" | "lottie";

type Props = {
  campaignId: string;             // uuid de ads_campaigns.id
  onUploaded?: () => void;        // refresh list
};

const RULES: Record<AdPlan, {
  maxFilesPerUpload: number;
  allow: MediaType[];
  maxBytes: Record<MediaType, number>;
  accept: Record<MediaType, string[]>;
}> = {
  FREE: {
    maxFilesPerUpload: 1,
    allow: ["image"],
    maxBytes: {
      image: 500 * 1024,          // 500 KB
      video: 0,
      lottie: 0,
    },
    accept: {
      image: ["image/jpeg", "image/png", "image/webp"],
      video: [],
      lottie: [],
    },
  },
  MONTHLY: {
    maxFilesPerUpload: 3,
    allow: ["image", "lottie"],
    maxBytes: {
      image: 2 * 1024 * 1024,     // 2 MB
      video: 0,
      lottie: 1 * 1024 * 1024,    // 1 MB
    },
    accept: {
      image: ["image/jpeg", "image/png", "image/webp"],
      video: [],
      lottie: ["application/json"],
    },
  },
  YEARLY: {
    maxFilesPerUpload: 10,
    allow: ["image", "lottie", "video"],
    maxBytes: {
      image: 5 * 1024 * 1024,     // 5 MB
      video: 25 * 1024 * 1024,    // 25 MB
      lottie: 2 * 1024 * 1024,    // 2 MB
    },
    accept: {
      image: ["image/jpeg", "image/png", "image/webp"],
      video: ["video/mp4"],
      lottie: ["application/json"],
    },
  },
};

function sanitizeFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.\-_]/g, "");
}

function inferMediaType(file: File): MediaType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/json") return "lottie";
  return null;
}

export default function AdsUploader({ campaignId, onUploaded }: Props) {
  const [plan, setPlan] = useState<AdPlan>("FREE");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const rules = useMemo(() => RULES[plan], [plan]);

  useEffect(() => {
    const loadPlan = async () => {
      setMsg(null);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from("ads_advertisers")
        .select("plan")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && data?.plan) {
        setPlan(data.plan as AdPlan);
      } else {
        // si pas inscrit comme annonceur, on reste FREE
        setPlan("FREE");
      }
    };

    loadPlan();
  }, []);

  const validateFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return { ok: false, error: "Aucun fichier." };

    if (files.length > rules.maxFilesPerUpload) {
      return {
        ok: false,
        error: `Trop de fichiers. Max: ${rules.maxFilesPerUpload} pour votre plan.`,
      };
    }

    for (const f of Array.from(files)) {
      const mt = inferMediaType(f);
      if (!mt || !rules.allow.includes(mt)) {
        return {
          ok: false,
          error: `Type non autorisé par votre plan: ${f.name}`,
        };
      }

      const allowedMimes = rules.accept[mt];
      if (!allowedMimes.includes(f.type)) {
        return {
          ok: false,
          error: `Format non autorisé: ${f.name} (${f.type}).`,
        };
      }

      const max = rules.maxBytes[mt];
      if (max > 0 && f.size > max) {
        return {
          ok: false,
          error: `Fichier trop lourd: ${f.name}. Max: ${(max / 1024 / 1024).toFixed(1)} MB.`,
        };
      }
    }

    return { ok: true as const };
  };

  const upload = async (files: FileList | null) => {
    setMsg(null);

    const v = validateFiles(files);
    if (!v.ok) {
      setMsg(v.error);
      return;
    }

    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setMsg("Vous devez être connecté.");
        return;
      }

      // upload each file
      for (const f of Array.from(files!)) {
        const mt = inferMediaType(f)!;
        const folder = mt === "image" ? "images" : mt === "video" ? "videos" : "lottie";
        const filename = `${Date.now()}-${sanitizeFilename(f.name)}`;

        // IMPORTANT: path = {folder}/{userId}/{campaignId}/{filename}
        const path = `${folder}/${userId}/${campaignId}/${filename}`;

        const { error: upErr } = await supabase.storage
          .from("ads-media")
          .upload(path, f, {
            cacheControl: "3600",
            upsert: false,
            contentType: f.type,
          });

        if (upErr) {
          throw new Error(`Upload failed: ${upErr.message}`);
        }

        const { error: insErr } = await supabase
          .from("ads_assets")
          .insert({
            campaign_id: campaignId,
            user_id: userId,
            media_type: mt,
            storage_path: path,
            mime_type: f.type,
            size_bytes: f.size,
          });

        if (insErr) {
          throw new Error(`DB insert failed: ${insErr.message}`);
        }
      }

      setMsg("Upload terminé.");
      onUploaded?.();
    } catch (e: any) {
      console.error(e);
      setMsg(e?.message ?? "Erreur upload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-2">
        <div className="text-sm font-semibold text-pro-gray">Médias publicitaires</div>
        <div className="text-xs text-gray-600">
          Plan: <span className="font-semibold">{plan}</span> — Autorisé: {rules.allow.join(", ")}
        </div>

        <Input
          type="file"
          multiple
          accept={[
            ...rules.accept.image,
            ...rules.accept.video,
            ...rules.accept.lottie,
          ].join(",")}
          onChange={(e) => upload(e.target.files)}
          disabled={loading}
        />

        {msg && (
          <div className="text-xs rounded-lg border px-3 py-2"
               style={{ borderColor: msg.includes("terminé") ? "#cce7cc" : "#f3c2c2" }}>
            {msg}
          </div>
        )}

        <Button
          type="button"
          className="bg-pro-blue hover:bg-blue-700"
          disabled
          title="Choisissez un fichier ci-dessus pour lancer l’upload"
        >
          Upload (via sélection)
        </Button>
      </div>
    </div>
  );
}
